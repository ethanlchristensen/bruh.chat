from uuid import UUID
from typing import List

from ninja import ModelSchema, Schema

from .models import Conversation, Message


class CreateConversationRequest(Schema):
    title: str


class ConversationSchema(ModelSchema):
    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at", "updated_at"]


class MessageSchema(ModelSchema):
    class Meta:
        model = Message
        fields = ["id", "role", "content", "created_at"]


class ConversationDetailSchema(ModelSchema):
    messages: List[MessageSchema]

    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at", "updated_at"]


class ConversationListResponse(Schema):
    conversations: List[ConversationSchema]


class ConversationTitleUpdateRequest(Schema):
    title: str
    conversation_id: UUID
