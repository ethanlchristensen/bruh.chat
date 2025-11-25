from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth
from ninja import Schema
from typing import List
from uuid import UUID
from openrouter.types import UNSET

from .services import get_open_router_service, get_chat_orchestration_service, ChatSuccessResponse, ChatErrorResponse
from .schemas import ChatRequest, ChatSuccessResponseSchema, ChatErrorResponseSchema


@api_controller("/ai", auth=JWTAuth(), tags=["AI"])
class AIController:
    def __init__(self):
        self.open_router_service = get_open_router_service()
        self.chat_orchestration_service = get_chat_orchestration_service()

    @route.post("/chat", response={
        200: ChatSuccessResponseSchema,
        500: ChatErrorResponseSchema
    })
    async def chat(self, request, data: ChatRequest):
        user = request.auth

        result = await self.chat_orchestration_service.chat(
            user=user,
            user_content=data.message,
            model=data.model or self.open_router_service.default_model,
            conversation_id=data.conversation_id
        )

        if result.success and isinstance(result, ChatSuccessResponse):
            return 200, ChatSuccessResponseSchema(
                conversation_id=result.conversation_id,
                message=result.assistant_message.content,
                usage={
                    "prompt_tokens": result.api_response.prompt_tokens,
                    "completion_tokens": result.api_response.completion_tokens,
                    "total_tokens": result.api_response.total_tokens,
                    "estimated_cost": str(result.api_response.estimated_cost) if result.api_response.estimated_cost else None
                }
            )
        elif isinstance(result, ChatErrorResponse):
            return 500, ChatErrorResponseSchema(
                error=result.error,
                conversation_id=result.conversation_id
            )
    
    @route.get("/models")
    async def models(self, request):
        return await self.open_router_service.models()

    @route.get("/providers")
    async def providers(self, request):
        return await self.open_router_service.providers()
