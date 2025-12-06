import re
import json
import asyncio
import logging
from functools import lru_cache
from uuid import UUID
from typing import List

from asgiref.sync import sync_to_async
from django.db import transaction
from django.core.files.uploadedfile import UploadedFile
from pydantic import BaseModel, Field

from api.features.ai.models import OpenRouterResponse
from api.features.ai.services.open_router_service import get_open_router_service
from api.features.ai.services.ai_title_service import get_title_generation_service
from api.features.conversations.models import Message, MessageAttachment, GeneratedImage
from api.features.conversations.services import ConversationService, MessageService

logger = logging.getLogger(__name__)


class ChatSuccessResponse(BaseModel):
    success: bool = Field(default=True)
    conversation_id: UUID
    user_message: Message
    assistant_message: Message
    api_response: OpenRouterResponse

    class Config:
        arbitrary_types_allowed = True


class ChatErrorResponse(BaseModel):
    success: bool = Field(default=False)
    conversation_id: UUID | None = None
    user_message: Message | None = None
    error: str

    class Config:
        arbitrary_types_allowed = True


class ChatOrchestrationService:
    @staticmethod
    def _sanitize_file_name(filename: str | None) -> str | None:
        if filename:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            name = re.sub(r'[^a-zA-Z0-9]+', ' ', name)
            name = name.replace(' ', '_')
            name = re.sub(r'_+', '_', name)
            name = name.strip('_')
            return f"{name}.{ext}" if ext else name
        return None

    @staticmethod
    async def _save_attachments(message: Message, files: List[UploadedFile]):
        """Save uploaded files as message attachments"""
        @sync_to_async
        def save_files():
            attachments = []
            for file in files:
                attachment = MessageAttachment.objects.create(
                    message=message,
                    file=file,
                    file_name=ChatOrchestrationService._sanitize_file_name(file.name),
                    file_size=file.size,
                    mime_type=file.content_type or 'application/octet-stream',
                )
                attachments.append(attachment)
            return attachments
        
        return await save_files()

    @staticmethod
    async def _build_message_with_attachments(
        content: str, attachments: List[MessageAttachment]
    ) -> dict:
        """Build OpenAI-compatible message with text and images"""
        open_router_service = get_open_router_service()
        
        # If no attachments, return simple text message
        if not attachments:
            return {"role": "user", "content": content}
        
        # Build multimodal content
        content_parts = []
        
        # Add text content if provided
        if content and content.strip():
            content_parts.append({"type": "text", "text": content})
        
        # Add images
        for attachment in attachments:
            if attachment.mime_type.startswith('image/'):
                # Read file and create image content
                attachment.file.seek(0)
                base64_image = open_router_service.encode_image_to_base64(attachment.file)
                content_parts.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{attachment.mime_type};base64,{base64_image}"
                    }
                })
        
        return {"role": "user", "content": content_parts}

    @staticmethod
    async def unified_stream(
        user,
        message: str,
        model: str,
        conversation_id: UUID | None = None,
        files: List[UploadedFile] | None = None,
        intent: str = "chat",  # "chat" or "image"
        aspect_ratio: str = "1:1",
    ):
        """
        Unified streaming that routes to chat or image generation based on intent.
        """
        try:
            open_router_service = get_open_router_service()
            
            # Validate aspect ratio for image generation
            if intent == "image" and not open_router_service.validate_aspect_ratio(aspect_ratio):
                logger.warning(f"Invalid aspect ratio '{aspect_ratio}', using default")
                aspect_ratio = open_router_service.DEFAULT_ASPECT_RATIO
            
            # Send intent confirmation
            yield json.dumps({
                "type": "intent",
                "intent": intent,
                "model": model,
                "aspect_ratio": aspect_ratio if intent == "image" else None,
            }) + "\n"
            
            # Route based on intent
            if intent == "image":
                logger.info("Routing to image generation, image intent was recieved.")
                async for chunk in ChatOrchestrationService._image_generation_stream(
                    user=user,
                    prompt=message,
                    model=model,
                    conversation_id=conversation_id,
                    aspect_ratio=aspect_ratio,
                ):
                    yield chunk
            else:
                # Use chat flow
                async for chunk in ChatOrchestrationService._chat_stream(
                    user=user,
                    message=message,
                    model=model,
                    conversation_id=conversation_id,
                    files=files,
                ):
                    yield chunk
                    
        except Exception as e:
            logger.error(f"Unified stream error: {str(e)}", exc_info=True)
            yield json.dumps({
                "type": "error",
                "error": str(e),
                "conversation_id": str(conversation_id) if conversation_id else None,
            }) + "\n"

    @staticmethod
    async def _chat_stream(
        user,
        message: str,
        model: str,
        conversation_id: UUID | None = None,
        files: List[UploadedFile] | None = None,
    ):
        """Internal chat streaming logic"""
        # Create or get conversation
        if conversation_id is None:
            conversation = (
                await ConversationService.create_conversation_from_message(
                    user=user, first_message=message
                )
            )
        else:
            conversation = await ConversationService.get_conversation(
                conversation_id=conversation_id, user=user
            )

        # Create user message
        user_message = await MessageService.create_message(
            conversation=conversation, role="user", content=message
        )

        # Save file attachments if any
        attachments = []
        if files:
            attachments = await ChatOrchestrationService._save_attachments(
                user_message, files
            )

        # Send initial metadata
        yield json.dumps({
            "type": "metadata",
            "conversation_id": str(conversation.id),
            "user_message_id": str(user_message.id),
            "has_attachments": len(attachments) > 0,
        }) + "\n"

        # Get message history
        message_history = await MessageService.get_message_history_for_open_router(
            conversation=conversation
        )

        # Replace last user message with multimodal version if attachments exist
        if attachments:
            message_with_files = await ChatOrchestrationService._build_message_with_attachments(
                message, attachments
            )
            message_history[-1] = message_with_files

        # Stream the response
        open_router_service = get_open_router_service()
        full_content = ""
        finish_reason = None
        usage_data = {}
        request_id = ""
        model_used = ""

        async for chunk_data in open_router_service.chat_with_messages_stream(
            messages=message_history, model=model
        ):
            try:
                chunk = json.loads(chunk_data)

                # Extract content delta
                if chunk.get("choices") and len(chunk["choices"]) > 0:
                    choice = chunk["choices"][0]
                    delta = choice.get("delta", {})

                    if "content" in delta and delta["content"]:
                        content_chunk = delta["content"]
                        full_content += content_chunk

                        # Send content chunk
                        yield json.dumps({
                            "type": "content",
                            "delta": content_chunk
                        }) + "\n"

                    # Check for finish reason
                    if choice.get("finish_reason"):
                        finish_reason = choice["finish_reason"]

                # Capture metadata
                if chunk.get("id"):
                    request_id = chunk["id"]
                if chunk.get("model"):
                    model_used = chunk["model"]
                if chunk.get("usage"):
                    usage_data = chunk["usage"]

            except json.JSONDecodeError:
                logger.warning(f"Failed to parse streaming chunk: {chunk_data}")
                continue

        # Save assistant message and response
        @sync_to_async
        def create_assistant_response(model_data):
            with transaction.atomic():
                assistant_message = Message.objects.create(
                    conversation=conversation,
                    role="assistant",
                    content=full_content,
                    model_id=model_used,
                )

                pricing_data = model_data.get("pricing", {})
                prompt_cost = float(pricing_data.get("prompt", 0)) * usage_data.get(
                    "prompt_tokens", 0
                )
                completion_cost = float(
                    pricing_data.get("completion", 0)
                ) * usage_data.get("completion_tokens", 0)

                api_response = OpenRouterResponse.objects.create(
                    message=assistant_message,
                    raw_payload={"streamed": True, "usage": usage_data},
                    request_id=request_id,
                    model_used=model_used,
                    finish_reason=finish_reason,
                    prompt_tokens=usage_data.get("prompt_tokens"),
                    completion_tokens=usage_data.get("completion_tokens"),
                    total_tokens=usage_data.get("total_tokens"),
                    estimated_prompt_cost=prompt_cost,
                    estimated_completion_cost=completion_cost,
                )
                return assistant_message, api_response

        model_data = await open_router_service.get_model_by_id(model_id=model_used)
        assistant_message, api_response = await create_assistant_response(
            model_data=model_data
        )
        await ConversationService.update_conversation_timestamp(
            conversation=conversation
        )

        title_service = get_title_generation_service()
        if await title_service.should_generate_title(user=user, conversation=conversation):
            asyncio.create_task(
                title_service.generate_and_update_title(
                    user=user, conversation=conversation
                )
            )

        # Send completion metadata
        yield json.dumps({
            "type": "done",
            "assistant_message_id": str(assistant_message.id),
            "usage": {
                "prompt_tokens": api_response.prompt_tokens,
                "completion_tokens": api_response.completion_tokens,
                "total_tokens": api_response.total_tokens,
                "prompt_cost": (
                    api_response.estimated_prompt_cost
                    if api_response.estimated_prompt_cost
                    else None
                ),
                "completion_cost": (
                    api_response.estimated_completion_cost
                    if api_response.estimated_completion_cost
                    else None
                ),
            },
        }) + "\n"

    @staticmethod
    async def _image_generation_stream(
        user,
        prompt: str,
        model: str,
        conversation_id: UUID | None = None,
        aspect_ratio: str = "1:1",
    ):
        """Internal image generation streaming logic"""
        # Create or get conversation
        if conversation_id is None:
            conversation = (
                await ConversationService.create_conversation_from_message(
                    user=user, first_message=f"Generate: {prompt}"
                )
            )
        else:
            conversation = await ConversationService.get_conversation(
                conversation_id=conversation_id, user=user
            )

        # Create user message
        user_message = await MessageService.create_message(
            conversation=conversation, role="user", content=prompt
        )

        # Send metadata
        yield json.dumps({
            "type": "metadata",
            "conversation_id": str(conversation.id),
            "user_message_id": str(user_message.id),
        }) + "\n"

        # Stream image generation
        open_router_service = get_open_router_service()
        assistant_content = ""
        images_data = []
        usage_data = {}
        model_used = model

        async for chunk_data in open_router_service.generate_image_stream(
            prompt=prompt, model=model, aspect_ratio=aspect_ratio
        ):
            try:
                chunk = json.loads(chunk_data)

                if chunk.get("choices") and len(chunk["choices"]) > 0:
                    choice = chunk["choices"][0]
                    delta = choice.get("delta", {})

                    # Handle text content
                    if "content" in delta and delta["content"]:
                        content_chunk = delta["content"]
                        assistant_content += content_chunk
                        yield json.dumps({
                            "type": "content",
                            "delta": content_chunk
                        }) + "\n"

                    # Handle images
                    if "images" in delta:
                        images_data.extend(delta["images"])
                        yield json.dumps({
                            "type": "image_progress",
                            "message": "Image being generated..."
                        }) + "\n"

                if chunk.get("model"):
                    model_used = chunk["model"]
                if chunk.get("usage"):
                    usage_data = chunk["usage"]

            except json.JSONDecodeError:
                logger.warning(f"Failed to parse chunk: {chunk_data}")
                continue

        # Save results
        @sync_to_async
        def save_results():
            with transaction.atomic():
                assistant_message = Message.objects.create(
                    conversation=conversation,
                    role="assistant",
                    content=assistant_content or "Image generated successfully",
                    model_id=model_used,
                )

                generated_images = []
                for img_data in images_data:
                    base64_url = img_data["image_url"]["url"]
                    generated_image = GeneratedImage.save_from_base64(
                        message=assistant_message,
                        base64_data=base64_url,
                        prompt=prompt,
                        model_used=model_used,
                        aspect_ratio=aspect_ratio,
                    )
                    generated_images.append(generated_image)

                api_response = OpenRouterResponse.objects.create(
                    message=assistant_message,
                    raw_payload={"streamed": True, "usage": usage_data},
                    request_id="",
                    model_used=model_used,
                    prompt_tokens=usage_data.get("prompt_tokens"),
                    completion_tokens=usage_data.get("completion_tokens"),
                    total_tokens=usage_data.get("total_tokens"),
                )

                return assistant_message, generated_images, api_response

        assistant_message, generated_images, api_response = await save_results()
        await ConversationService.update_conversation_timestamp(conversation)

        # Send completion
        yield json.dumps({
            "type": "done",
            "assistant_message_id": str(assistant_message.id),
            "generated_images": [
                {
                    "id": str(img.id),
                    "image_url": img.image.url,
                }
                for img in generated_images
            ],
            "usage": {
                "prompt_tokens": api_response.prompt_tokens,
                "completion_tokens": api_response.completion_tokens,
                "total_tokens": api_response.total_tokens,
            },
        }) + "\n"


@lru_cache()
def get_chat_orchestration_service() -> ChatOrchestrationService:
    return ChatOrchestrationService()