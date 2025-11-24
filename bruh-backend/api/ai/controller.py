from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth
from ninja import Schema
from typing import List
from openrouter.types import UNSET

from .services import get_open_router_service

class ChatRequest(Schema):
    message: str
    conseration_id: int | None = None

class ChatResponse(Schema):
    response: str
    conversation_id: int | None = None

@api_controller("/ai", auth=JWTAuth(), tags=["AI"])
class AIController:
    def __init__(self):
        self.open_router_service = get_open_router_service()

    @route.post("/chat", response=ChatResponse)
    async def chat(self, request, data: ChatRequest):
        user = request.auth
        open_router_response = await self.open_router_service.chat(content=data.message)

        response_text = ""

        if open_router_response is None or open_router_response == UNSET:
            response_text = ""
        elif isinstance(open_router_response, str):
            response_text = open_router_response
        else:
            response_text = str(open_router_response)

        return ChatResponse(
            response=response_text,
            conversation_id=data.conseration_id
        )
    
    @route.get("/models")
    async def models(self, request):
        return await self.open_router_service.models()

    @route.get("/provders")
    async def providers(self, request):
        return await self.open_router_service.providers()
