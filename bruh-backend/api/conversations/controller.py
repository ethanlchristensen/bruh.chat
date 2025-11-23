from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth
from ninja import Schema
from typing import List

class CreateConversationRequest(Schema):
    title: str
    