import asyncio
from uuid import UUID
from typing import AsyncIterator, List, Optional

from django.http import StreamingHttpResponse
from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth
from ninja import Form, File
from ninja.files import UploadedFile

from .schemas import (
    ChatErrorResponseSchema,
    ChatRequest,
    ChatSuccessResponseSchema,
    OpenRouterModelSchema,
    GetOpenRouterModelRequestSchema,
    MessageAttachmentSchema,
    ImageGenerationRequest,
    ImageGenerationResponseSchema,
    GeneratedImageSchema
)
from .services import (
    ChatErrorResponse,
    ChatSuccessResponse,
    get_chat_orchestration_service,
    get_open_router_service,
    get_image_generation_service
)


@api_controller("/ai", auth=JWTAuth(), tags=["AI"])
class AIController:
    def __init__(self):
        self.open_router_service = get_open_router_service()
        self.chat_orchestration_service = get_chat_orchestration_service()
        self.image_generation_service = get_image_generation_service()

    @route.post("/chat/stream")
    async def chat_stream(
        self,
        request,
        message: str = Form(...), # type: ignore
        conversation_id: Optional[str] = Form(None), # type: ignore
        model: Optional[str] = Form(None), # type: ignore
        intent: Optional[str] = Form("chat"),  # type: ignore - "chat" or "image"
        aspect_ratio: Optional[str] = Form("1:1"), # type: ignore
        files: List[UploadedFile] = File(None), # type: ignore
    ):
        """
        Unified streaming endpoint for chat and image generation.
        - intent: "chat" (default) or "image"
        - aspect_ratio: Only used for image generation
        """
        user = request.auth
        conv_id = UUID(conversation_id) if conversation_id else None

        async def async_event_generator() -> AsyncIterator[str]:
            async_gen = self.chat_orchestration_service.unified_stream(
                user=user,
                message=message,
                model=model or self.open_router_service.default_model,
                conversation_id=conv_id,
                files=files or [], # type: ignore
                intent=intent or "chat",
                aspect_ratio=aspect_ratio or "1:1",
            )
            async for chunk in async_gen:
                yield f"data: {chunk}\n\n"

        response = StreamingHttpResponse(
            streaming_content=async_event_generator(), 
            content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"

        return response
    
    @route.get("/models")
    async def models(self, request):
        return await self.open_router_service.models()

    @route.get("/providers")
    async def providers(self, request):
        return await self.open_router_service.providers()

    @route.get("/models/openrouter", response=List[OpenRouterModelSchema])
    async def get_all_openrouter_models(self, request):
        """Get all available models from OpenRouter"""
        service = get_open_router_service()
        return await service.get_all_models_flat()

    @route.post("/models/openrouter")
    async def get_openrouter_model_by_id(
        self, request, data: GetOpenRouterModelRequestSchema
    ):
        """Get a specific model from OpenRouter by its ID"""
        model_id = data.model_id
        service = get_open_router_service()
        return await service.get_model_by_id(model_id=model_id)

    @route.get("/models/openrouter/by-provider", response=dict)
    async def get_openrouter_models_by_provider(self, request):
        """Get all models organized by provider"""
        service = get_open_router_service()
        return await service.models()

    @route.get("/models/openrouter/structured", response=List[OpenRouterModelSchema])
    async def get_structured_output_models(self, request):
        """Get all models that support structured outputs"""
        service = get_open_router_service()
        return await service.get_all_structured_output_models()

    @route.get("/models/openrouter/image-generation", response=List[OpenRouterModelSchema])
    async def get_image_generation_models(self, request):
        """Get all models that support image generation"""
        return await self.open_router_service.get_all_image_generation_models()

    @route.get("/models/openrouter/structured/by-provider", response=dict)
    async def get_structured_output_models_by_provider(self, request):
        """Get models with structured outputs organized by provider"""
        service = get_open_router_service()
        return await service.models_with_structured_outputs()
