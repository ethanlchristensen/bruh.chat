from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth
from ninja import Schema
from typing import List

class ChatRequest(Schema):
    message: str
    conseration_id: int | None = None

class ChatResponse(Schema):
    response: str
    conversation_id: int

@api_controller("/ai", auth=JWTAuth(), tags=["AI"])
class AIController:
    @route.post("/chat", response=ChatResponse)
    async def chat(self, request, data: ChatRequest):
        user = request.auth
        return {
            "response": f"Echo: {data.message}",
            "conversation_id": data.conseration_id or 1
        }