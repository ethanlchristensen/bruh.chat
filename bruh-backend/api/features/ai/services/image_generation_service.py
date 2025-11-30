import json
import logging
from functools import lru_cache
from uuid import UUID
from typing import Optional

from asgiref.sync import sync_to_async
from django.db import transaction

from api.features.ai.models import OpenRouterResponse
from api.features.ai.services.open_router_service import get_open_router_service
from api.features.conversations.models import GeneratedImage, Message
from api.features.conversations.services import ConversationService, MessageService

logger = logging.getLogger(__name__)


class ImageGenerationService:
    @staticmethod
    async def generate_image(
        user,
        prompt: str,
        model: str,
        conversation_id: UUID | None = None,
        aspect_ratio: Optional[str] = None,
    ):
        """Generate an image and save it to the conversation"""
        try:
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

            # Create user message with the prompt
            user_message = await MessageService.create_message(
                conversation=conversation, role="user", content=prompt
            )

            # Generate image via OpenRouter
            open_router_service = get_open_router_service()
            response = await open_router_service.generate_image(
                prompt=prompt, model=model, aspect_ratio=aspect_ratio
            )

            # Extract generated images and assistant message
            assistant_content = response["choices"][0]["message"].get("content", "")
            images_data = response["choices"][0]["message"].get("images", [])

            @sync_to_async
            def save_generated_images():
                with transaction.atomic():
                    # Create assistant message
                    assistant_message = Message.objects.create(
                        conversation=conversation,
                        role="assistant",
                        content=assistant_content or "Image generated successfully",
                        model_id=model,
                    )

                    # Save generated images
                    generated_images = []
                    for img_data in images_data:
                        base64_url = img_data["image_url"]["url"]
                        generated_image = GeneratedImage.save_from_base64(
                            message=assistant_message,
                            base64_data=base64_url,
                            prompt=prompt,
                            model_used=response.get("model", model),
                            aspect_ratio=aspect_ratio,
                        )
                        generated_images.append(generated_image)

                    # Save API response metadata
                    usage = response.get("usage", {})
                    api_response = OpenRouterResponse.objects.create(
                        message=assistant_message,
                        raw_payload=response,
                        request_id=response.get("id", ""),
                        model_used=response.get("model", model),
                        finish_reason=(
                            response["choices"][0].get("finish_reason")
                            if response.get("choices")
                            else None
                        ),
                        prompt_tokens=usage.get("prompt_tokens"),
                        completion_tokens=usage.get("completion_tokens"),
                        total_tokens=usage.get("total_tokens"),
                    )

                    return assistant_message, generated_images, api_response

            assistant_message, generated_images, api_response = (
                await save_generated_images()
            )

            await ConversationService.update_conversation_timestamp(
                conversation=conversation
            )

            return {
                "success": True,
                "conversation_id": conversation.id,
                "user_message_id": user_message.id,
                "assistant_message_id": assistant_message.id,
                "generated_images": generated_images,
                "api_response": api_response,
            }

        except Exception as e:
            logger.error(f"Image generation error: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "conversation_id": conversation_id,
            }

    @staticmethod
    async def generate_image_stream(
        user,
        prompt: str,
        model: str,
        conversation_id: UUID | None = None,
        aspect_ratio: Optional[str] = None,
    ):
        """Stream image generation with progress updates"""
        try:
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

        except Exception as e:
            logger.error(f"Image generation stream error: {str(e)}", exc_info=True)
            yield json.dumps({
                "type": "error",
                "error": str(e),
                "conversation_id": str(conversation_id) if conversation_id else None,
            }) + "\n"


@lru_cache()
def get_image_generation_service() -> ImageGenerationService:
    return ImageGenerationService()