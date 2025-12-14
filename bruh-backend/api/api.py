from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController

from .features.ai.controller import AIController
from .features.conversations.controller import ConversationController
from .features.users.controller import AuthController, UserController

api = NinjaExtraAPI()

api.register_controllers(
    NinjaJWTDefaultController, UserController, AIController, ConversationController, AuthController
)


@api.get("/hello")
async def hello(request):
    return {"message": "Hello, world!"}
