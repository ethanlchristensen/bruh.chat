from uuid import UUID

from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth

from .schemas import (
    ConversationDetailSchema,
    ConversationListResponse,
    ConversationSchema,
    ConversationTitleUpdateRequest,
    CreateConversationRequest,
)
from .services import ConversationService


@api_controller("/conversations", auth=JWTAuth(), tags=["Conversations"])
class ConversationController:
    @route.post("", response={201: ConversationSchema})
    async def create_conversation(self, request, payload: CreateConversationRequest):
        conversation = await ConversationService.create_conversation(
            user=request.auth, title=payload.title
        )
        return 201, conversation

    @route.get("", response=ConversationListResponse)
    async def get_conversations(self, request):
        conversations = await ConversationService.get_user_conversations(
            user=request.auth, include_deleted=False
        )
        return {"conversations": conversations}

    @route.get("/{conversation_id}", response=ConversationDetailSchema)
    async def get_conversation(self, request, conversation_id: UUID):
        conversation = await ConversationService.get_conversation(
            conversation_id=conversation_id, user=request.auth
        )

        return conversation

    @route.delete("/{conversation_id}", response={204: None})
    async def delete_conversation(self, request, conversation_id: UUID):
        user = request.auth

        deleted = await ConversationService.mark_conversation_as_deleted(
            conversation_id=conversation_id, user=user
        )

        if not deleted:
            return 404, {"detail": "Conversation not found"}
        else:
            return 204, None

    @route.patch("/{conversation_id}", response=ConversationSchema)
    async def update_conversation_title(
        self, request, conversation_id: UUID, data: ConversationTitleUpdateRequest
    ):
        user = request.auth

        updated, conversation = await ConversationService.update_conversation_title(
            conversation_id=conversation_id, user=user, title=data.title
        )

        if not updated:
            return 404, {"detail": "Conversation not found"}
        else:
            return 200, conversation
