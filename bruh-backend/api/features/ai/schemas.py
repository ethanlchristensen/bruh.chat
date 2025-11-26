from uuid import UUID
from typing import Optional

from ninja import Schema


class ChatRequest(Schema):
    message: str
    conversation_id: UUID | None = None
    model: str | None = None


class ChatSuccessResponseSchema(Schema):
    success: bool = True
    conversation_id: UUID
    message: str
    user_mesasge_id: UUID
    assistant_message_id: UUID
    usage: dict | None = None  # Optional token usage info


class ChatErrorResponseSchema(Schema):
    success: bool = False
    error: str
    conversation_id: UUID | None = None


class ChatStreamMetadataEvent(Schema):
    """First event sent with conversation and message IDs"""

    type: str = "metadata"
    conversation_id: UUID
    user_message_id: UUID


class ChatStreamContentEvent(Schema):
    """Content chunks as they arrive"""

    type: str = "content"
    delta: str


class ChatStreamDoneEvent(Schema):
    """Final event with completion metadata"""

    type: str = "done"
    assistant_message_id: UUID
    usage: dict


class ChatStreamErrorEvent(Schema):
    """Error event if something goes wrong"""

    type: str = "error"
    error: str
    conversation_id: UUID | None = None


class OpenRouterModelSchema(Schema):
    id: str
    name: Optional[str] = None
    description: Optional[str] = None
    pricing: Optional[dict] = None
    context_length: Optional[int] = None
    architecture: Optional[dict] = None
    top_provider: Optional[dict] = None


class GetOpenRouterModelRequestSchema(Schema):
    model_id: str