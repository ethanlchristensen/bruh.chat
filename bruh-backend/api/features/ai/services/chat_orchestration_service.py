import re
import uuid
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
from api.features.conversations.models import (
    Message,
    MessageAttachment,
    GeneratedImage,
    Reasoning,
    GeneratedReasoningImage,
)
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
            name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
            name = re.sub(r"[^a-zA-Z0-9]+", " ", name)
            name = name.replace(" ", "_")
            name = re.sub(r"_+", "_", name)
            name = name.strip("_")
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
                    mime_type=file.content_type or "application/octet-stream",
                )
                attachments.append(attachment)
            return attachments

        return await save_files()

    @staticmethod
    async def _build_message_with_attachments(
        content: str, attachments: List[MessageAttachment], model: str = None
    ) -> dict:
        """Build OpenAI-compatible message with text and images"""
        open_router_service = get_open_router_service()

        # If no attachments, return simple text message
        if not attachments:
            return {"role": "user", "content": content}

        # Build multimodal content
        content_parts = []

        # Check if this is a Gemini model (requires thought_signature)
        is_gemini = model and "gemini" in model.lower()

        # Add text content if provided
        if content and content.strip():
            text_part = {"type": "text", "text": content}
            # Add thought_signature for Gemini models
            if is_gemini:
                text_part["thought_signature"] = True
            content_parts.append(text_part)

        # Add attachments
        for attachment in attachments:
            if attachment.mime_type.startswith("image/"):
                # Read file and create image content
                attachment.file.seek(0)
                base64_image = open_router_service.encode_image_to_base64(attachment.file)
                content_parts.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{attachment.mime_type};base64,{base64_image}"},
                    }
                )

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
            yield (
                json.dumps(
                    {
                        "type": "intent",
                        "intent": intent,
                        "model": model,
                        "aspect_ratio": aspect_ratio if intent == "image" else None,
                    }
                )
                + "\n"
            )

            # Use unified stream logic
            async for chunk in ChatOrchestrationService._unified_stream_logic(
                user=user,
                message=message,
                model=model,
                conversation_id=conversation_id,
                files=files,
                intent=intent,
                aspect_ratio=aspect_ratio,
            ):
                yield chunk

        except Exception as e:
            logger.error(f"Unified stream error: {str(e)}", exc_info=True)
            yield (
                json.dumps(
                    {
                        "type": "error",
                        "error": str(e),
                        "conversation_id": str(conversation_id) if conversation_id else None,
                    }
                )
                + "\n"
            )

    @staticmethod
    async def _unified_stream_logic(
        user,
        message: str,
        model: str,
        conversation_id: UUID | None = None,
        files: List[UploadedFile] | None = None,
        intent: str = "chat",
        aspect_ratio: str = "1:1",
    ):
        # Create or get conversation
        if conversation_id is None:
            conversation = await ConversationService.create_conversation_from_message(
                user=user, first_message=message
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
            attachments = await ChatOrchestrationService._save_attachments(user_message, files)

        # Send initial metadata
        yield (
            json.dumps(
                {
                    "type": "metadata",
                    "conversation_id": str(conversation.id),
                    "user_message_id": str(user_message.id),
                    "has_attachments": len(attachments) > 0,
                }
            )
            + "\n"
        )

        # Get message history
        message_history = await MessageService.get_message_history_for_open_router(
            conversation=conversation, include_user_images=True, max_generated_images=1
        )

        # Replace last user message with multimodal version if attachments exist
        if attachments:
            message_with_files = await ChatOrchestrationService._build_message_with_attachments(
                message, attachments, model
            )
            message_history[-1] = message_with_files

        # Prepare streaming parameters based on intent
        open_router_service = get_open_router_service()
        modalities = ["text", "image"] if intent == "image" else ["text"]
        image_config = {"aspect_ratio": aspect_ratio} if intent == "image" else None

        # Stream the response
        full_content = ""
        reasoning_content = ""
        generated_images_data = []
        generated_reasoning_images_data = []
        reasoning_details_chunks = []
        finish_reason = None
        usage_data = {}
        request_id = ""
        model_used = ""

        async for chunk_data in open_router_service.chat_with_messages_stream(
            messages=message_history,
            model=model,
            modalities=modalities,
            image_config=image_config,
        ):
            try:
                chunk = json.loads(chunk_data)

                # Extract content delta
                if chunk.get("choices") and len(chunk["choices"]) > 0:
                    choice = chunk["choices"][0]
                    delta = choice.get("delta", {})

                    if "reasoning_details" in delta and delta["reasoning_details"]:
                        reasoning_details_chunks.extend(delta["reasoning_details"])

                    if "content" in delta and delta["content"]:
                        content_chunk = delta["content"]
                        full_content += content_chunk
                        yield json.dumps({"type": "content", "delta": content_chunk}) + "\n"
                    elif "reasoning" in delta and delta["reasoning"]:
                        reasoning_chunk = delta["reasoning"]
                        reasoning_content += reasoning_chunk
                        yield json.dumps({"type": "reasoning", "delta": reasoning_chunk}) + "\n"
                    elif "reasoning_details" in delta and delta["reasoning_details"]:
                        if "images" in delta and delta["images"]:
                            for img_data in delta["images"]:
                                yield (
                                    json.dumps(
                                        {
                                            "type": "reasoning_image",
                                            "image_data": img_data["image_url"]["url"],
                                        }
                                    )
                                    + "\n"
                                )
                            generated_reasoning_images_data.extend(delta["images"])

                    # Handle images for image generation
                    if (
                        "images" in delta
                        and not delta.get("reasoning")
                        and not delta.get("reasoning_details")
                    ):
                        generated_images_data.extend(delta["images"])

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

        if not generated_images_data and generated_reasoning_images_data and intent == "image":
            logger.info(
                "Using reasoning images as generated images (no regular image delta received)"
            )
            generated_images_data = generated_reasoning_images_data.copy()

        # Save assistant message and response
        @sync_to_async
        def create_assistant_response(model_data):
            with transaction.atomic():
                # Use default message for images if no content provided
                message_content = full_content or (
                    "Here is your generated image."
                    if intent == "image" and generated_images_data
                    else full_content
                )

                assistant_message = Message.objects.create(
                    conversation=conversation,
                    role="assistant",
                    content=message_content,
                    model_id=model_used,
                )

                reasoning = None
                if reasoning_content:
                    reasoning = Reasoning.objects.create(
                        message=assistant_message, content=reasoning_content
                    )

                # Save generated images if any
                generated_images = []
                for img_data in generated_images_data:
                    base64_url = img_data["image_url"]["url"]
                    generated_image = GeneratedImage.save_from_base64(
                        message=assistant_message,
                        base64_data=base64_url,
                        prompt=message,
                        model_used=model_used,
                        aspect_ratio=aspect_ratio,
                    )
                    generated_images.append(generated_image)

                generated_reasoning_images = []
                for img_data in generated_reasoning_images_data:
                    base64_url = img_data["image_url"]["url"]
                    generated_reasoning_image = GeneratedReasoningImage.save_from_base64(
                        reasoning=reasoning, base64_data=base64_url, model_used=model_used
                    )
                    generated_reasoning_images.append(generated_reasoning_image)

                pricing_data = model_data.get("pricing", {})

                prompt_cost = float(pricing_data.get("prompt", 0)) * usage_data.get(
                    "prompt_tokens", 0
                )
                completion_cost = float(pricing_data.get("completion", 0)) * usage_data.get(
                    "completion_tokens", 0
                )

                reasoning_cost = float(pricing_data.get("image", 0)) * usage_data.get(
                    "completion_tokens_details", {}
                ).get("reasoning_tokens", 0)

                cost_details = usage_data.get("cost_details", {})

                raw_payload = {"streamed": True, "usage": usage_data}

                if reasoning_details_chunks:
                    raw_payload["reasoning_details"] = reasoning_details_chunks

                api_response = OpenRouterResponse.objects.create(
                    message=assistant_message,
                    raw_payload=raw_payload,
                    request_id=request_id,
                    model_used=model_used,
                    finish_reason=finish_reason,
                    prompt_tokens=usage_data.get("prompt_tokens"),
                    completion_tokens=usage_data.get("completion_tokens"),
                    image_tokens=usage_data.get("completion_tokens_details", {}).get(
                        "image_tokens"
                    ),
                    reasoning_tokens=usage_data.get("completion_tokens_details", {}).get(
                        "reasoning_tokens"
                    ),
                    total_tokens=usage_data.get("total_tokens"),
                    cost=float(usage_data.get("cost", 0)),
                    estimated_prompt_cost=prompt_cost,
                    estimated_completion_cost=completion_cost,
                    estimated_reasoning_cost=reasoning_cost,
                    upstream_inference_cost=None
                    if not cost_details.get("upstream_inference_cost", 0)
                    else float(cost_details.get("upstream_inference_cost", 0)),
                    upstream_inference_prompt_cost=None
                    if not cost_details.get("upstream_inference_prompt_cost", 0)
                    else float(cost_details.get("upstream_inference_prompt_cost", 0)),
                    upstream_inference_completions_cost=None
                    if not cost_details.get("upstream_inference_completions_cost", 0)
                    else float(cost_details.get("upstream_inference_completions_cost", 0)),
                )
                return assistant_message, generated_images, generated_reasoning_images, api_response

        model_data = await open_router_service.get_model_by_id(model_id=model_used)
        (
            assistant_message,
            generated_images,
            generated_reasoning_images,
            api_response,
        ) = await create_assistant_response(model_data=model_data)
        await ConversationService.update_conversation_timestamp(conversation=conversation)

        # Generate title if needed (only for chat, not image generation)
        if intent == "chat":
            title_service = get_title_generation_service()
            if await title_service.should_generate_title(user=user, conversation=conversation):
                asyncio.create_task(
                    title_service.generate_and_update_title(user=user, conversation=conversation)
                )

        if not full_content and generated_images and intent == "image":
            yield {"type": "content", "delta": "Here is your generated image."}

        # Send completion metadata
        completion_data = {
            "type": "done",
            "assistant_message_id": str(assistant_message.id),
            "usage": {
                "prompt_tokens": api_response.prompt_tokens,
                "completion_tokens": api_response.completion_tokens,
                "total_tokens": api_response.total_tokens,
                "prompt_cost": api_response.estimated_prompt_cost,
                "completion_cost": api_response.estimated_completion_cost,
            },
        }

        # Add generated images to completion data if any
        if generated_images:
            completion_data["generated_images"] = [
                {
                    "id": str(img.id),
                    "image_url": img.image.url,
                }
                for img in generated_images
            ]

        # Add generated images to completion data from reasoning stage
        if generated_reasoning_images:
            completion_data["generated_reasoning_images"] = [
                {
                    "id": str(img.id),
                    "image_url": img.image.url,
                }
                for img in generated_reasoning_images
            ]

        yield json.dumps(completion_data) + "\n"


@lru_cache()
def get_chat_orchestration_service() -> ChatOrchestrationService:
    return ChatOrchestrationService()
