# api/features/ai/controller.py
import json
from typing import AsyncIterator, List, Optional
from uuid import UUID

from django.http import StreamingHttpResponse
from ninja import File, Form
from ninja.files import UploadedFile
from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth

from .schemas import (
    GetOpenRouterModelRequestSchema,
    OpenRouterModelSchema,
)
from .services import (
    get_chat_orchestration_service,
    get_ollama_service,
    get_open_router_service,
)


@api_controller("/ai", auth=JWTAuth(), tags=["AI"])
class AIController:
    def __init__(self):
        self.open_router_service = get_open_router_service()
        self.ollama_service = get_ollama_service()
        self.chat_orchestration_service = get_chat_orchestration_service()

    @route.post("/chat/stream")
    async def chat_stream(
        self,
        request,
        message: str = Form(...),  # type: ignore
        conversation_id: Optional[str] = Form(None),  # type: ignore
        model: Optional[str] = Form(None),  # type: ignore
        provider: Optional[str] = Form("openrouter"),  # type: ignore
        intent: Optional[str] = Form("chat"),  # type: ignore
        aspect_ratio: Optional[str] = Form("1:1"),  # type: ignore
        files: List[UploadedFile] = File(None),  # type: ignore
        persona_id: Optional[str] = Form(None),  # type: ignore
    ):
        """
        Unified streaming endpoint for chat and image generation.
        - provider: "openrouter" (default) or "ollama"
        - intent: "chat" (default) or "image"
        - aspect_ratio: Only used for image generation
        - persona_id: Optional UUID of persona to use
        """
        user = request.auth
        conv_id = UUID(conversation_id) if conversation_id else None
        pers_id = UUID(persona_id) if persona_id else None

        # Don't set defaults here - let the service handle persona-based model/provider
        async def async_event_generator() -> AsyncIterator[str]:
            async_gen = self.chat_orchestration_service.unified_stream(
                user=user,
                message=message,
                model=model,
                provider=provider,
                conversation_id=conv_id,
                files=files or [],  # type: ignore
                intent=intent or "chat",
                aspect_ratio=aspect_ratio or "1:1",
                persona_id=pers_id,
            )
            async for chunk in async_gen:
                yield f"data: {chunk}\n\n"

        response = StreamingHttpResponse(
            streaming_content=async_event_generator(), content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"

        return response

    # open router
    @route.get("/models")
    async def models(self, request):
        return await self.open_router_service.models()

    @route.get("/providers")
    async def providers(self, request):
        return await self.open_router_service.providers()

    @route.get("/models/openrouter", response=List[OpenRouterModelSchema])
    async def get_all_openrouter_models(self, request):
        """Get all available models from OpenRouter"""
        return await self.open_router_service.get_all_models_flat()

    @route.post("/models/openrouter")
    async def get_openrouter_model_by_id(self, request, data: GetOpenRouterModelRequestSchema):
        """Get a specific model from OpenRouter by its ID"""
        model_id = data.model_id
        return await self.open_router_service.get_model_by_id(model_id=model_id)

    @route.get("/models/openrouter/by-provider", response=dict)
    async def get_openrouter_models_by_provider(self, request):
        """Get all models organized by provider"""
        return await self.open_router_service.models()

    @route.get("/models/openrouter/structured", response=List[OpenRouterModelSchema])
    async def get_structured_output_models(self, request):
        """Get all models that support structured outputs"""
        return await self.open_router_service.get_all_structured_output_models()

    @route.get("/models/openrouter/image-generation", response=List[OpenRouterModelSchema])
    async def get_image_generation_models(self, request):
        """Get all models that support image generation"""
        return await self.open_router_service.get_all_image_generation_models()

    @route.get("/models/openrouter/image-generation/by-provider", response=dict)
    async def get_image_generation_models_by_provider(self, request):
        """Get image generation models organized by provider"""
        return await self.open_router_service.models_with_image_generation()

    @route.get("/models/openrouter/structured/by-provider", response=dict)
    async def get_structured_output_models_by_provider(self, request):
        """Get models with structured outputs organized by provider"""
        return await self.open_router_service.models_with_structured_outputs()

    # ollama
    @route.get("/models/ollama")
    async def get_ollama_models(self, request):
        """
        Get all locally available Ollama models organized by family.
        Example: {"llama2": [...], "mistral": [...]}
        """
        return await self.ollama_service.models()

    @route.get("/models/ollama/flat")
    async def get_all_ollama_models_flat(self, request):
        """Get all available Ollama models as a flat list"""
        return await self.ollama_service.get_all_models_flat()

    @route.post("/models/ollama/by-id")
    async def get_ollama_model_by_id(self, request, model_id: str = Form(...)):  # type: ignore
        """Get a specific Ollama model by its ID"""
        return await self.ollama_service.get_model_by_id(model_id=model_id)

    @route.post("/models/ollama/info")
    async def get_ollama_model_info(self, request, model_id: str = Form(...)):  # type: ignore
        """Get detailed information about a specific Ollama model"""
        return await self.ollama_service.get_model_info(model_id=model_id)

    @route.get("/models/ollama/vision")
    async def get_ollama_vision_models(self, request):
        """Get all Ollama models that support vision (image input)"""
        return await self.ollama_service.get_all_vision_models()

    @route.get("/models/ollama/structured")
    async def get_ollama_structured_output_models(self, request):
        """Get all Ollama models that support structured outputs"""
        return await self.ollama_service.get_all_structured_output_models()

    @route.get("/models/ollama/structured/by-family")
    async def get_ollama_structured_output_models_by_family(self, request):
        """Get Ollama models with structured outputs organized by family"""
        return await self.ollama_service.models_with_structured_outputs()

    @route.post("/models/ollama/pull")
    async def pull_ollama_model(self, request, model_id: str = Form(...)):  # type: ignore
        """Pull/download an Ollama model (streaming progress)"""

        async def progress_generator():
            async for chunk in self.ollama_service.pull_model(model_id):
                yield f"data: {json.dumps(chunk)}\n\n"

        return StreamingHttpResponse(
            streaming_content=progress_generator(), content_type="text/event-stream"
        )

    @route.delete("/models/ollama/{model_id}")
    async def delete_ollama_model(self, request, model_id: str):
        """Delete an Ollama model"""
        await self.ollama_service.delete_model(model_id)
        return {"success": True, "message": f"Model {model_id} deleted"}

    @route.post("/models/ollama/copy")
    async def copy_ollama_model(
        self,
        request,
        source: str = Form(...),  # type: ignore
        destination: str = Form(...),  # type: ignore
    ):
        """Copy an Ollama model to a new name"""
        await self.ollama_service.copy_model(source, destination)
        return {"success": True, "message": f"Model copied from {source} to {destination}"}

    @route.get("/ollama/status")
    async def check_ollama_status(self, request):
        """Check if Ollama service is running"""
        is_running = await self.ollama_service.is_running()
        return {"running": is_running}
