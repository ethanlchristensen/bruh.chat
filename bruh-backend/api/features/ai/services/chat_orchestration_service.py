import logging
from functools import lru_cache
from uuid import UUID
from pydantic import BaseModel, Field
from asgiref.sync import sync_to_async

from django.db import transaction

from api.features.conversations.services import ConversationService, MessageService
from api.features.ai.services import get_open_router_service

from api.features.conversations.models import Message
from api.features.ai.models import OpenRouterResponse


logger = logging.getLogger(__name__)


class ChatSuccessResponse(BaseModel):
    """Internal service response - contains Django models"""
    success: bool = Field(default=True)
    conversation_id: UUID
    user_message: Message
    assistant_message: Message
    api_response: OpenRouterResponse

    class Config:
        arbitrary_types_allowed = True


class ChatErrorResponse(BaseModel):
    """Internal service response"""
    success: bool = Field(default=False)
    conversation_id: UUID | None = None
    user_message: Message | None = None
    error: str

    class Config:
        arbitrary_types_allowed = True


class ChatOrchestrationService:
    @staticmethod
    async def chat(user, user_content: str, model: str, conversation_id: UUID | None = None):
        try:
            if conversation_id is None:
                conversation = await ConversationService.create_conversation_from_message(
                    user=user,
                    first_message=user_content
                )
            else:
                conversation = await ConversationService.get_conversation(
                    conversation_id=conversation_id, 
                    user=user
                )
            
            user_message = await MessageService.create_message(
                conversation=conversation, 
                role="user", 
                content=user_content
            )

            message_history = await MessageService.get_message_history_for_open_router(
                conversation=conversation
            )

            open_router_service = get_open_router_service()
            open_router_response = await open_router_service.chat_with_messages(
                messages=message_history, 
                model=model
            )

            assistant_content = open_router_response["choices"][0]["message"]["content"]

            # Create a sync function that wraps the transaction
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

            await ConversationService.update_conversation_timestamp(conversation=conversation)

            return ChatSuccessResponse(
                conversation_id=conversation.id,
                user_message=user_message,
                assistant_message=assistant_message,
                api_response=api_response,
            )

        except Exception as e:
            logger.error(f"Chat flow error: {str(e)}", exc_info=True)
            return ChatErrorResponse(conversation_id=conversation_id, error=str(e))


@lru_cache()
def get_chat_orchestration_service() -> ChatOrchestrationService:
    return ChatOrchestrationService()