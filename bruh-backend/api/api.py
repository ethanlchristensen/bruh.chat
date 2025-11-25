from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController
from .features.users.controller import UserController
from .features.ai.controller import AIController
from .features.conversations.controller import ConversationController


api = NinjaExtraAPI()

api.register_controllers(
    NinjaJWTDefaultController,
    UserController,
    AIController,
    ConversationController
)


@api.get("/hello")
async def hello(request):
    return {"message": "Hello, world!"}
