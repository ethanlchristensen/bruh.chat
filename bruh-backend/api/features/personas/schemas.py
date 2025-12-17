from typing import Optional

from ninja import ModelSchema, Schema

from .models import Persona


class PersonaCreateSchema(Schema):
    name: str
    description: Optional[str] = None
    instructions: str
    example_dialogue: Optional[str] = None
    model_id: Optional[str] = None
    provider: str
    is_public: bool = False
    is_active: bool = True


class PersonaUpdateSchema(Schema):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    example_dialogue: Optional[str] = None
    model_id: Optional[str] = None
    provider: Optional[str] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None


class PersonaOutSchema(ModelSchema):
    owner_username: str
    persona_image: Optional[str] = None

    class Meta:
        model = Persona
        fields = [
            "id",
            "name",
            "description",
            "instructions",
            "example_dialogue",
            "model_id",
            "provider",
            "created_at",
            "updated_at",
            "is_public",
            "is_active",
        ]

    @staticmethod
    def resolve_owner_username(obj, context):
        request = context.get("request")
        if request and obj.user:
            return obj.user.username
        return None

    @staticmethod
    def resolve_persona_image(obj):
        if obj.persona_image:
            return obj.persona_image.url
        return None


class PersonaLightSchema(ModelSchema):
    persona_image: Optional[str] = None

    class Meta:
        model = Persona
        fields = ["id", "name", "model_id"]

    @staticmethod
    def resolve_persona_image(obj):
        if obj.persona_image:
            return obj.persona_image.url
        return None


class PersonaGenerationRequestSchema(Schema):
    prompt: str
    target_provider: Optional[str] = "openrouter"
    suggested_model: Optional[str] = None


class PersonaGenerationStructuredSchema(Schema):
    name: str
    description: str
    instructions: str
    example_dialogue: str
    reasoning: Optional[str] = None


class DeleteResponseSchema(Schema):
    message: str
