from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth
from ninja import Schema
from typing import List
from uuid import UUID
from datetime import datetime

from .services import ConversationService, MessageService
from .schemas import (
    CreateConversationRequest,
    ConversationSchema,
    ConversationListResponse,
    ConversationDetailSchema,
)


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
            conversation_id=conversation_id,
            user=request.auth
        )
        
        return conversation