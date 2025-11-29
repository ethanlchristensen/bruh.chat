import json
import asyncio
import logging
from functools import lru_cache
from uuid import UUID

from asgiref.sync import sync_to_async
from django.db import transaction
from pydantic import BaseModel, Field

from api.features.ai.models import OpenRouterResponse
from api.features.ai.services.open_router_service import get_open_router_service
from api.features.ai.services.ai_title_service import get_title_generation_service
from api.features.conversations.models import Message
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
    async def chat(
        user, user_content: str, model: str, conversation_id: UUID | None = None
    ):
        try:
            if conversation_id is None:
                conversation = (
                    await ConversationService.create_conversation_from_message(
                        user=user, first_message=user_content
                    )
                )
            else:
                conversation = await ConversationService.get_conversation(
                    conversation_id=conversation_id, user=user
                )

            user_message = await MessageService.create_message(
                conversation=conversation, role="user", content=user_content
            )

            message_history = await MessageService.get_message_history_for_open_router(
                conversation=conversation
            )

            open_router_service = get_open_router_service()
            open_router_response = await open_router_service.chat_with_messages(
                messages=message_history, model=model
            )

            assistant_content = open_router_response["choices"][0]["message"]["content"]

            @sync_to_async
            def create_assistant_response():
                with transaction.atomic():
                    assistant_message = Message.objects.create(
                        conversation=conversation,
                        role="assistant",
                        content=assistant_content,
                    )

                    usage = open_router_response.get("usage", {})
                    api_response = OpenRouterResponse.objects.create(
                        message=assistant_message,
                        raw_payload=open_router_response,
                        request_id=open_router_response.get("id", ""),
                        model_used=open_router_response.get("model", ""),
                        finish_reason=(
                            open_router_response["choices"][0].get("finish_reason")
                            if open_router_response.get("choices")
                            else None
                        ),
                        prompt_tokens=usage.get("prompt_tokens"),
                        completion_tokens=usage.get("completion_tokens"),
                        total_tokens=usage.get("total_tokens"),
                    )
                    return assistant_message, api_response

            assistant_message, api_response = await create_assistant_response()

            await ConversationService.update_conversation_timestamp(
                conversation=conversation
            )

            return ChatSuccessResponse(
                conversation_id=conversation.id,
                user_message=user_message,
                assistant_message=assistant_message,
                api_response=api_response,
            )

        except Exception as e:
            logger.error(f"Chat flow error: {str(e)}", exc_info=True)
            return ChatErrorResponse(conversation_id=conversation_id, error=str(e))

    @staticmethod
    async def chat_stream(
        user, user_content: str, model: str, conversation_id: UUID | None = None
    ):
        """
        Stream chat responses with incremental updates
        Yields JSON events: metadata, content chunks, and final summary
        """
        try:
            # Create or get conversation
            if conversation_id is None:
                conversation = (
                    await ConversationService.create_conversation_from_message(
                        user=user, first_message=user_content
                    )
                )
            else:
                conversation = await ConversationService.get_conversation(
                    conversation_id=conversation_id, user=user
                )

            # Create user message
            user_message = await MessageService.create_message(
                conversation=conversation, role="user", content=user_content
            )

            # Send initial metadata
            yield (
                json.dumps(
                    {
                        "type": "metadata",
                        "conversation_id": str(conversation.id),
                        "user_message_id": str(user_message.id),
                    }
                )
                + "\n"
            )

            # Get message history
            message_history = await MessageService.get_message_history_for_open_router(
                conversation=conversation
            )

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
                            yield json.dumps(
                                {"type": "content", "delta": content_chunk}
                            ) + "\n"

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

                    pricing_data = model_data.get("pricing")
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
            yield (
                json.dumps(
                    {
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
                            "completition_cost": (
                                api_response.estimated_completion_cost
                                if api_response.estimated_completion_cost
                                else None
                            ),
                        },
                    }
                )
                + "\n"
            )

        except Exception as e:
            logger.error(f"Chat stream error: {str(e)}", exc_info=True)
            yield (
                json.dumps(
                    {
                        "type": "error",
                        "error": str(e),
                        "conversation_id": (
                            str(conversation_id) if conversation_id else None
                        ),
                    }
                )
                + "\n"
            )


@lru_cache()
def get_chat_orchestration_service() -> ChatOrchestrationService:
    return ChatOrchestrationService()
