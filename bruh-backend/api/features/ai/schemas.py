from ninja import Schema
from uuid import UUID


class ChatRequest(Schema):
    message: str
    conversation_id: UUID | None = None
    model: str | None = None


class ChatSuccessResponseSchema(Schema):
    success: bool = True
    conversation_id: UUID
    message: str
    usage: dict | None = None  # Optional token usage info


class ChatErrorResponseSchema(Schema):
    success: bool = False
    error: str
    conversation_id: UUID | None = None