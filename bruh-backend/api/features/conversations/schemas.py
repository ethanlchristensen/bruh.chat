from typing import List

from ninja import ModelSchema, Schema

from api.features.personas.schemas import PersonaLightSchema

from .models import (
    Conversation,
    GeneratedImage,
    GeneratedReasoningImage,
    Message,
    MessageAttachment,
    Reasoning,
)


class CreateConversationRequest(Schema):
    title: str


class ConversationSchema(ModelSchema):
    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at", "updated_at"]


class MessageAttachmentSchema(ModelSchema):
    file_url: str | None = None

    class Meta:
        model = MessageAttachment
        fields = ["id", "file_name", "file_size", "mime_type", "created_at"]

    @staticmethod
    def resolve_file_url(obj, context):
        request = context.get("request")
        if request and obj.file:
            return obj.file.url
        return None


class GeneratedImageSchema(ModelSchema):
    image_url: str | None = None

    class Meta:
        model = GeneratedImage
        fields = ["id", "prompt", "model_used", "aspect_ratio", "width", "height", "created_at"]

    @staticmethod
    def resolve_image_url(obj, context):
        if obj.image:
            return obj.image.url
        return None


class GeneratedReasoningImageSchema(ModelSchema):
    image_url: str | None = None

    class Meta:
        model = GeneratedReasoningImage
        fields = ["id", "model_used", "created_at"]

    @staticmethod
    def resolve_image_url(obj, context):
        if obj.image:
            return obj.image.url
        return None


class ReasoningSchema(ModelSchema):
    generated_reasoning_images: List[GeneratedReasoningImageSchema] = []

    class Meta:
        model = Reasoning
        fields = ["id", "content", "created_at"]


class MessageSchema(ModelSchema):
    attachments: List[MessageAttachmentSchema] = []
    generated_images: List[GeneratedImageSchema] = []
    reasoning: ReasoningSchema | None = None
    persona: PersonaLightSchema | None = None

    class Meta:
        model = Message
        fields = ["id", "role", "content", "created_at", "model_id"]


class ConversationDetailSchema(ModelSchema):
    messages: List[MessageSchema]

    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at", "updated_at"]


class ConversationListResponse(Schema):
    conversations: List[ConversationSchema]


class ConversationTitleUpdateRequest(Schema):
    title: str
