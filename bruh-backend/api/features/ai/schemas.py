from typing import Literal, Optional
from uuid import UUID

from ninja import Schema


class ChatRequest(Schema):
    message: str
    conversation_id: UUID | None = None
    model: str | None = None


class ImageGenerationRequest(Schema):
    prompt: str
    conversation_id: UUID | None = None
    model: str | None = None
    aspect_ratio: Optional[
        Literal["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]
    ] = None


class GeneratedImageSchema(Schema):
    id: UUID
    image_url: str
    prompt: str
    model_used: str
    aspect_ratio: str | None = None
    width: int | None = None
    height: int | None = None
    created_at: str


class MessageAttachmentSchema(Schema):
    id: UUID
    file_name: str
    file_size: int
    mime_type: str
    file_url: str


class ChatSuccessResponseSchema(Schema):
    success: bool = True
    conversation_id: UUID
    message: str
    user_mesasge_id: UUID
    assistant_message_id: UUID
    attachments: list[MessageAttachmentSchema] | None = None
    usage: dict | None = None


class ImageGenerationResponseSchema(Schema):
    success: bool = True
    conversation_id: UUID
    user_message_id: UUID
    assistant_message_id: UUID
    generated_images: list[GeneratedImageSchema]
    usage: dict | None = None


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
    supported_parameters: Optional[list[str]] = None
    output_modalities: Optional[list[str]] = None
    default_parameters: Optional[dict] = None
    canonical_slug: Optional[str] = None
    created: Optional[int] = None


class GetOpenRouterModelRequestSchema(Schema):
    model_id: str


class ConversationStarterSchema(Schema):
    question: str
    category: str


class GenerateConversationStartersRequest(Schema):
    topics: list[str]
    num_questions: int = 5


class GenerateConversationStartersResponse(Schema):
    success: bool = True
    starters: list[ConversationStarterSchema]


class GenerateConversationStartersErrorResponse(Schema):
    success: bool = False
    error: str
