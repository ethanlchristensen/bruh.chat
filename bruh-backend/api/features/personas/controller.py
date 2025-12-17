import logging
from typing import List
from uuid import UUID

from asgiref.sync import sync_to_async
from ninja import File, UploadedFile
from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth

from .schemas import (
    DeleteResponseSchema,
    PersonaCreateSchema,
    PersonaGenerationRequestSchema,
    PersonaOutSchema,
    PersonaUpdateSchema,
)
from .services import get_persona_service

logger = logging.getLogger(__name__)


@api_controller("/personas", auth=JWTAuth(), tags=["Personas"])
class PersonaController:
    @route.get("/", response=List[PersonaOutSchema])
    async def get_personas(self, request):
        return await get_persona_service().get_user_personas(user=request.auth)

    @route.get("/{persona_id}", response=PersonaOutSchema)
    async def get_persona(self, request, persona_id: UUID):
        return await get_persona_service().get_user_persona(request.auth, persona_id)

    @route.post("/", response=PersonaOutSchema)
    async def create_persona(self, request, data: PersonaCreateSchema):
        return await get_persona_service().create_user_persona(user=request.auth, data=data)

    @route.put("/{persona_id}", response=PersonaOutSchema)
    async def update_persona(self, request, persona_id: UUID, data: PersonaUpdateSchema):
        return await get_persona_service().update_user_persona(request.auth, persona_id, data)

    @route.delete("/{persona_id}", response=DeleteResponseSchema)
    async def delete_persona(self, request, persona_id: UUID):
        return await get_persona_service().delete_user_persona(request.auth, persona_id)

    @route.post("/persona/generate", response=dict)
    async def generate_persona(self, request, data: PersonaGenerationRequestSchema):
        """
        Generate a persona using AI based on a description.
        Uses the user's default AUX model for structured output generation.

        - prompt: Description of the persona you want to create
        - target_provider: Provider the persona will use (openrouter/ollama)
        - suggested_model: Optional specific model for the persona
        """
        user = request.auth

        @sync_to_async
        def get_user_profile():
            return user.profile

        profile = await get_user_profile()

        if not profile.default_aux_model:
            return {
                "success": False,
                "error": "No default AUX model set. Please configure your default AUX model in your profile settings.",
            }

        aux_model = profile.default_aux_model
        aux_provider = profile.default_provider or "openrouter"

        try:
            persona_service = get_persona_service()

            persona, reasoning = await persona_service.generate_and_create_persona(
                user=user,
                request_data=data,
                aux_model=aux_model,
                aux_provider=aux_provider,
            )

            @sync_to_async
            def serialize_persona():
                return {
                    "id": str(persona.id),
                    "name": persona.name,
                    "description": persona.description,
                    "instructions": persona.instructions,
                    "example_dialogue": persona.example_dialogue,
                    "model_id": persona.model_id,
                    "provider": persona.provider,
                    "created_at": persona.created_at.isoformat(),
                    "updated_at": persona.updated_at.isoformat(),
                    "is_public": persona.is_public,
                    "is_active": persona.is_active,
                    "owner_username": user.username,
                }

            persona_dict = await serialize_persona()

            return {
                "success": True,
                "persona": persona_dict,
                "reasoning": reasoning,
                "message": f"Successfully generated persona '{persona.name}'",
            }

        except ValueError as e:
            logger.error(f"Persona generation error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }
        except Exception as e:
            logger.error(f"Unexpected error during persona generation: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": "An unexpected error occurred during persona generation. Please try again.",
            }

    @route.post("/{persona_id}/image", response=PersonaOutSchema)
    async def update_persona_image(
        self,
        request,
        persona_id: UUID,
        profile_image: UploadedFile = File(...),  # type: ignore
    ):
        return await get_persona_service().update_persona_image(
            user=request.auth, persona_id=persona_id, image_file=profile_image
        )

    @route.delete("/{persona_id}/image", response=PersonaOutSchema)
    async def delete_persona_image(self, request, persona_id: UUID):
        return await get_persona_service().delete_persona_image(
            user=request.auth, persona_id=persona_id
        )
