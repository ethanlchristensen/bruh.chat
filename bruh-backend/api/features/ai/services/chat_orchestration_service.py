import asyncio
import json
import logging
import re
from functools import lru_cache
from typing import List
from uuid import UUID

from asgiref.sync import sync_to_async
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from pydantic import BaseModel, Field

from api.features.ai.models import AIResponse
from api.features.ai.services.ai_title_service import get_title_generation_service
from api.features.ai.services.factory import get_ai_service
from api.features.conversations.models import (
    GeneratedImage,
    GeneratedReasoningImage,
    Message,
    MessageAttachment,
    Reasoning,
)
from api.features.conversations.services import ConversationService, MessageService

logger = logging.getLogger(__name__)


class ChatSuccessResponse(BaseModel):
    success: bool = Field(default=True)
    conversation_id: UUID
    user_message: Message
    assistant_message: Message
    api_response: AIResponse

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
    async def unified_stream(
        user,
        message: str,
        model: str,
        provider: str = "openrouter",
        conversation_id: UUID | None = None,
        files: List[UploadedFile] | None = None,
        intent: str = "chat",
        aspect_ratio: str = "1:1",
    ):
        """
        Unified streaming that routes to chat or image generation based on intent and provider.
        """
        try:
            # 1. Get the abstract service via Factory
            service = get_ai_service(provider)

            # 2. Validate Intent (Ollama doesn't support 'image' intent yet)
            if intent == "image" and provider == "ollama":
                raise ValueError("Ollama does not support image generation intent")

            # 3. Validate Aspect Ratio (if using OpenRouter image gen)
            if intent == "image" and provider == "openrouter":
                # We can access static methods on the class if needed, or just assume valid defaults
                pass

            # 4. Send intent confirmation event
            yield (
                json.dumps(
                    {
                        "type": "intent",
                        "intent": intent,
                        "model": model,
                        "provider": provider,
                        "aspect_ratio": aspect_ratio if intent == "image" else None,
                    }
                )
                + "\n"
            )

            # 5. Hand off to the execution logic
            async for chunk in ChatOrchestrationService._execute_stream(
                service=service,
                user=user,
                message_text=message,
                model=model,
                provider=provider,
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
    async def _execute_stream(
        service,
        user,
        message_text: str,
        model: str,
        provider: str,
        conversation_id: UUID | None = None,
        files: List[UploadedFile] | None = None,
        intent: str = "chat",
        aspect_ratio: str = "1:1",
    ):
        # 1. Create or get conversation
        if conversation_id is None:
            conversation = await ConversationService.create_conversation_from_message(
                user=user, first_message=message_text
            )
        else:
            conversation = await ConversationService.get_conversation(
                conversation_id=conversation_id, user=user
            )

        # 2. Create user message
        user_message = await MessageService.create_message(
            conversation=conversation, role="user", content=message_text
        )

        # 3. Save file attachments if any
        attachments = []
        if files:
            attachments = await ChatOrchestrationService._save_attachments(user_message, files)

        # 4. Send initial metadata
        yield (
            json.dumps(
                {
                    "type": "metadata",
                    "conversation_id": str(conversation.id),
                    "user_message_id": str(user_message.id),
                    "has_attachments": len(attachments) > 0,
                    "provider": provider,
                }
            )
            + "\n"
        )

        # 5. Get message history
        message_history = await MessageService.get_message_history_for_open_router(
            conversation=conversation, include_user_images=True, max_generated_images=1
        )

        # 6. Format the last message (Multimodal support)
        # We rely on the service to know how to format text + images
        if attachments:
            formatted_message = await service.format_message_payload(
                message_text, attachments, model
            )
            message_history[-1] = formatted_message

        # 7. Start the Unified Stream Processor
        async for chunk in ChatOrchestrationService._stream_processor(
            service=service,
            message_history=message_history,
            model=model,
            conversation=conversation,
            message_text=message_text,
            user=user,
            intent=intent,
            aspect_ratio=aspect_ratio,
            provider=provider,
        ):
            yield chunk

    @staticmethod
    async def _stream_processor(
        service,
        message_history: List[dict],
        model: str,
        conversation,
        message_text: str,
        user,
        intent: str,
        aspect_ratio: str,
        provider: str,
    ):
        modalities = ["text", "image"] if intent == "image" else ["text"]
        image_config = {"aspect_ratio": aspect_ratio} if intent == "image" else None

        full_content = ""
        reasoning_content = ""
        generated_images_data = []
        generated_reasoning_images_data = []
        reasoning_details_chunks = []
        finish_reason = None
        usage_data = {}
        request_id = ""
        model_used = model

        async for chunk_data in service.chat_with_messages_stream(
            messages=message_history,
            model=model,
            modalities=modalities,
            image_config=image_config,
        ):
            try:
                chunk = json.loads(chunk_data)
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

                    if (
                        "images" in delta
                        and not delta.get("reasoning")
                        and not delta.get("reasoning_details")
                    ):
                        generated_images_data.extend(delta["images"])

                    if choice.get("finish_reason"):
                        finish_reason = choice["finish_reason"]

                if chunk.get("id"):
                    request_id = chunk["id"]
                if chunk.get("model"):
                    model_used = chunk["model"]
                if chunk.get("usage"):
                    usage_data = chunk["usage"]

            except json.JSONDecodeError:
                continue

        if not generated_images_data and generated_reasoning_images_data and intent == "image":
            generated_images_data = generated_reasoning_images_data.copy()

        pricing_data = {}
        if provider == "openrouter":
            model_data = await service.get_model_by_id(model_id=model_used)
            if model_data:
                pricing_data = model_data.get("pricing", {})

        @sync_to_async
        def save_results(pricing):
            with transaction.atomic():
                final_content = full_content
                if intent == "image" and generated_images_data and not full_content:
                    final_content = "Here is your generated image."

                assistant_message = Message.objects.create(
                    conversation=conversation,
                    role="assistant",
                    content=final_content,
                    model_id=model_used,
                )

                reasoning = None
                if reasoning_content:
                    reasoning = Reasoning.objects.create(
                        message=assistant_message, content=reasoning_content
                    )

                saved_gen_images = []
                for img_data in generated_images_data:
                    base64_url = img_data["image_url"]["url"]
                    saved_gen_images.append(
                        GeneratedImage.save_from_base64(
                            message=assistant_message,
                            base64_data=base64_url,
                            prompt=message_text,
                            model_used=model_used,
                            aspect_ratio=aspect_ratio,
                        )
                    )

                saved_reasoning_images = []
                for img_data in generated_reasoning_images_data:
                    base64_url = img_data["image_url"]["url"]
                    saved_reasoning_images.append(
                        GeneratedReasoningImage.save_from_base64(
                            reasoning=reasoning, base64_data=base64_url, model_used=model_used
                        )
                    )

                prompt_cost = float(pricing.get("prompt", 0)) * usage_data.get("prompt_tokens", 0)
                completion_cost = float(pricing.get("completion", 0)) * usage_data.get(
                    "completion_tokens", 0
                )
                reasoning_cost = float(pricing.get("image", 0)) * usage_data.get(
                    "completion_tokens_details", {}
                ).get("reasoning_tokens", 0)

                cost_details = usage_data.get("cost_details", {})

                api_response = AIResponse.objects.create(
                    message=assistant_message,
                    provider=provider,
                    raw_payload={"streamed": True, "usage": usage_data, "provider": provider},
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
                    estimated_prompt_cost=prompt_cost,
                    estimated_completion_cost=completion_cost,
                    estimated_reasoning_cost=reasoning_cost,
                    cost=float(usage_data.get("cost", 0)),
                    upstream_inference_cost=float(cost_details.get("upstream_inference_cost", 0))
                    if cost_details.get("upstream_inference_cost")
                    else None,
                    upstream_inference_prompt_cost=float(
                        cost_details.get("upstream_inference_prompt_cost", 0)
                    )
                    if cost_details.get("upstream_inference_prompt_cost")
                    else None,
                    upstream_inference_completions_cost=float(
                        cost_details.get("upstream_inference_completions_cost", 0)
                    )
                    if cost_details.get("upstream_inference_completions_cost")
                    else None,
                )
                return assistant_message, saved_gen_images, saved_reasoning_images, api_response

        (
            assistant_message,
            saved_gen_images,
            saved_reasoning_images,
            api_response,
        ) = await save_results(pricing_data)

        await ConversationService.update_conversation_timestamp(conversation=conversation)

        if intent == "chat":
            title_service = get_title_generation_service()
            if await title_service.should_generate_title(user=user, conversation=conversation):
                asyncio.create_task(
                    title_service.generate_and_update_title(user=user, conversation=conversation)
                )

        if not full_content and saved_gen_images and intent == "image":
            yield json.dumps({"type": "content", "delta": "Here is your generated image."}) + "\n"

        completion_data = {
            "type": "done",
            "assistant_message_id": str(assistant_message.id),
            "provider": provider,
            "usage": usage_data,
        }

        if saved_gen_images:
            completion_data["generated_images"] = [
                {"id": str(img.id), "image_url": img.image.url} for img in saved_gen_images
            ]

        if saved_reasoning_images:
            completion_data["generated_reasoning_images"] = [
                {"id": str(img.id), "image_url": img.image.url} for img in saved_reasoning_images
            ]

        yield json.dumps(completion_data) + "\n"


@lru_cache()
def get_chat_orchestration_service() -> ChatOrchestrationService:
    return ChatOrchestrationService()
