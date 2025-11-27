import asyncio
from typing import AsyncIterator, List, Iterator

from django.http import StreamingHttpResponse
from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth

from .schemas import (
    ChatErrorResponseSchema,
    ChatRequest,
    ChatSuccessResponseSchema,
    OpenRouterModelSchema,
    GetOpenRouterModelRequestSchema
)
from .services import (
    ChatErrorResponse,
    ChatSuccessResponse,
    get_chat_orchestration_service,
    get_open_router_service,
)


@api_controller("/ai", auth=JWTAuth(), tags=["AI"])
class AIController:
    def __init__(self):
        self.open_router_service = get_open_router_service()
        self.chat_orchestration_service = get_chat_orchestration_service()

    @route.post(
        "/chat", response={200: ChatSuccessResponseSchema, 500: ChatErrorResponseSchema}
    )
    async def chat(self, request, data: ChatRequest):
        user = request.auth

        result = await self.chat_orchestration_service.chat(
            user=user,
            user_content=data.message,
            model=data.model or self.open_router_service.default_model,
            conversation_id=data.conversation_id,
        )

        if result.success and isinstance(result, ChatSuccessResponse):
            return 200, ChatSuccessResponseSchema(
                conversation_id=result.conversation_id,
                message=result.assistant_message.content,
                user_mesasge_id=result.user_message.id,
                assistant_message_id=result.assistant_message.id,
                usage={
                    "prompt_tokens": result.api_response.prompt_tokens,
                    "completion_tokens": result.api_response.completion_tokens,
                    "total_tokens": result.api_response.total_tokens,
                    "estimated_prompt_cost": result.api_response.estimated_prompt_cost if result.api_response.estimated_prompt_cost else None,
                    "estimated_completition_cost": result.api_response.estimated_completion_cost if result.api_response.estimated_completion_cost else None
                },
            )
        elif isinstance(result, ChatErrorResponse):
            return 500, ChatErrorResponseSchema(
                error=result.error, conversation_id=result.conversation_id
            )

    @route.post("/chat/stream")
    async def chat_stream(self, request, data: ChatRequest):
        """
        Stream chat responses with real-time updates.
        Returns Server-Sent Events with metadata, content chunks, and completion info.
        """
        user = request.auth

        def sync_event_generator() -> Iterator[str]:
            """Synchronous wrapper for the async generator"""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                async_gen = self.chat_orchestration_service.chat_stream(
                    user=user,
                    user_content=data.message,
                    model=data.model or self.open_router_service.default_model,
                    conversation_id=data.conversation_id,
                )
                while True:
                    try:
                        chunk = loop.run_until_complete(async_gen.__anext__())
                        yield f"data: {chunk}\n\n"
                    except StopAsyncIteration:
                        break
            finally:
                loop.close()

        response = StreamingHttpResponse(
            streaming_content=sync_event_generator(), content_type="text/event-stream"
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
    async def get_openrouter_model_by_id(self, request, data: GetOpenRouterModelRequestSchema):
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
    
    @route.get("/models/openrouter/structured/by-provider", response=dict)
    async def get_structured_output_models_by_provider(self, request):
        """Get models with structured outputs organized by provider"""
        service = get_open_router_service()
        return await service.models_with_structured_outputs()