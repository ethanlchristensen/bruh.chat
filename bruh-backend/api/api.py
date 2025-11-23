from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController
from .users.controller import UserController
from .ai.controller import AIController


api = NinjaExtraAPI()

api.register_controllers(
    NinjaJWTDefaultController,
    UserController,
    AIController
)


@api.get("/hello")
async def hello(request):
    return {"message": "Hello, world!"}
