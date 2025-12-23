import datetime
import json
import logging
from functools import lru_cache
from uuid import UUID

from asgiref.sync import sync_to_async
from django.core.files.uploadedfile import UploadedFile

from api.features.ai.services.factory import get_ai_service

from ..models import Persona
from ..schemas import (
    PersonaCreateSchema,
    PersonaGenerationRequestSchema,
    PersonaUpdateSchema,
)

logger = logging.getLogger(__name__)


class PersonaService:
    @staticmethod
    @sync_to_async
    def get_user_personas(user, include_deleted=False):
        queryset = Persona.objects.filter(user=user)
        if not include_deleted:
            queryset = queryset.filter(deleted=False)
        return list(queryset)

    @staticmethod
    @sync_to_async
    def get_user_persona(user, persona_id):
        return Persona.objects.filter(id=persona_id, user=user, deleted=False).first()

    @staticmethod
    @sync_to_async
    def create_user_persona(user, data: PersonaCreateSchema):
        provider = data.provider

        service = get_ai_service(data.provider)

        valid_model_id = service.validate_model_id(data.model_id)

        if not valid_model_id:
            raise ValueError(f"Invalid model ID: {data.model_id}")

        return Persona.objects.create(
            user=user,
            name=data.name,
            description=data.description,
            instructions=data.instructions,
            example_dialogue=data.example_dialogue,
            model_id=data.model_id,
            provider=provider,
            is_public=data.is_public,
            is_active=data.is_active,
        )

    @staticmethod
    @sync_to_async
    def update_user_persona(user, persona_id, data: PersonaUpdateSchema):
        persona = Persona.objects.filter(id=persona_id, user=user).first()
        if not persona:
            raise ValueError("Persona not found")

        if data.model_id and data.provider:
            service = get_ai_service(data.provider)
            valid_model_id = service.validate_model_id(data.model_id)
            if not valid_model_id:
                raise ValueError(f"Invalid model ID: {data.model_id}")

        for attr, value in data.dict(exclude_unset=True).items():
            setattr(persona, attr, value)

        persona.save()
        return persona

    @staticmethod
    @sync_to_async
    def delete_user_persona(user, persona_id):
        persona = Persona.objects.filter(id=persona_id, user=user).first()

        if persona is None:
            return False

        persona.deleted = True
        persona.deleted_at = datetime.datetime.now(datetime.timezone.utc)
        persona.save(update_fields=["deleted", "deleted_at"])

        return {"message": "Persona deleted successfully"}

    @staticmethod
    async def generate_persona_with_ai(
        user,
        prompt: str,
        aux_model: str,
        aux_provider: str,
        target_provider: str = "openrouter",
        suggested_model: str = None,
    ) -> dict:
        """
        Generate a persona using AI with structured output

        Args:
            user: The user creating the persona
            prompt: Description of the persona to create
            aux_model: The model to use for generation (from user's default_aux_model)
            aux_provider: The provider for the aux model
            target_provider: The provider the persona will use (openrouter/ollama)
            suggested_model: Optional specific model for the persona to use
        """
        service = get_ai_service(aux_provider)

        supports_structured = await service.supports_structured_outputs(aux_model, use_cache=True)

        if not supports_structured:
            raise ValueError(
                f"Model {aux_model} does not support structured outputs. "
                "Please set a different default AUX model in your profile."
            )

        system_prompt = f"""You are an expert AI persona designer. Your task is to create a detailed AI persona based on the user's description.

The persona should be designed to work with {target_provider} as its provider.

Create a persona with:
- A short, memorable name (2-4 words)
- A clear description of what the persona is about
- Detailed instructions on how the AI should behave, speak, and interact
- Example dialogue showing the persona's style (at least 3 exchanges)
- A reasoning explanation of your design choices

Make the persona engaging, consistent, and true to the user's vision."""

        user_prompt = f"""Create an AI persona based on this description:

{prompt}

Target provider: {target_provider}
{f"Suggested model: {suggested_model}" if suggested_model else "Choose an appropriate model for this persona."}

Generate a complete persona specification."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response_schema = {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "A short, memorable name for the persona (2-4 words)",
                },
                "description": {
                    "type": "string",
                    "description": "A brief description of what this persona is about",
                },
                "instructions": {
                    "type": "string",
                    "description": "Detailed instructions for the LLM on how to behave as this persona",
                },
                "example_dialogue": {
                    "type": "string",
                    "description": "Example dialogue showing the persona's style and responses (at least 3 exchanges)",
                },
                "reasoning": {
                    "type": "string",
                    "description": "Explanation of the design choices made for this persona",
                },
            },
            "required": ["name", "description", "instructions", "example_dialogue"],
        }

        if aux_provider == "openrouter":
            response_schema = {
                "type": "json_schema",
                "json_schema": {
                    "name": "persona_generation",
                    "strict": True,
                    "schema": response_schema,
                },
            }

        persona_data = await service.chat_with_structured_output(
            messages=messages,
            response_format=response_schema,
            model=aux_model,
        )

        target_service = get_ai_service(target_provider)

        if suggested_model:
            is_valid = await target_service.validate_model_id(suggested_model)
            if not is_valid:
                logger.warning(f"Suggested model {suggested_model} is invalid, using default")
                model_id = target_service.default_model
            else:
                model_id = suggested_model
        else:
            model_id = target_service.default_model

        return {
            "name": persona_data["name"],
            "description": persona_data["description"],
            "instructions": persona_data["instructions"],
            "example_dialogue": persona_data["example_dialogue"],
            "model_id": model_id,
            "provider": target_provider,
            "reasoning": persona_data.get("reasoning", ""),
        }

    @staticmethod
    async def generate_and_create_persona(
        user,
        request_data: PersonaGenerationRequestSchema,
        aux_model: str,
        aux_provider: str,
    ) -> Persona:
        """
        Generate a persona with AI and create it in the database
        """
        # Generate the persona data
        persona_data = await PersonaService.generate_persona_with_ai(
            user=user,
            prompt=request_data.prompt,
            aux_model=aux_model,
            aux_provider=aux_provider,
            target_provider=request_data.target_provider,
            suggested_model=request_data.suggested_model,
        )

        # Create the persona
        create_schema = PersonaCreateSchema(
            name=persona_data["name"],
            description=persona_data["description"],
            instructions=persona_data["instructions"],
            example_dialogue=persona_data["example_dialogue"],
            model_id=persona_data["model_id"],
            provider=persona_data["provider"],
            is_public=False,
            is_active=True,
        )

        persona = await PersonaService.create_user_persona(user, create_schema)

        # Include reasoning in response (not stored in DB)
        return persona, persona_data.get("reasoning", "")

    @staticmethod
    @sync_to_async
    def update_persona_image(user, persona_id: UUID, image_file: UploadedFile):
        """Update persona's profile image"""
        persona = Persona.objects.filter(id=persona_id, user=user, deleted=False).first()
        if not persona:
            raise ValueError("Persona not found")

        if persona.persona_image:
            persona.persona_image.delete(save=False)

        persona.persona_image = image_file
        persona.save()

        return persona

    @staticmethod
    @sync_to_async
    def delete_persona_image(user, persona_id: UUID):
        """Delete persona's profile image"""
        persona = Persona.objects.filter(id=persona_id, user=user, deleted=False).first()
        if not persona:
            raise ValueError("Persona not found")

        if persona.persona_image:
            persona.persona_image.delete(save=False)
            persona.persona_image = None
            persona.save()

        return persona


@lru_cache()
def get_persona_service() -> PersonaService:
    return PersonaService()
