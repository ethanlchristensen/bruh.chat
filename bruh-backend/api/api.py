from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController

from .features.ai.controller import AIController
from .features.conversations.controller import ConversationController
from .features.personas.controller import PersonaController
from .features.users.controller import AuthController, UserController
from .features.flows.controller import (
    FlowController,
    FlowExecutionController,
    FlowTemplateController,
    NodeTemplateController,
)

api = NinjaExtraAPI()

api.register_controllers(
    NinjaJWTDefaultController,
    UserController,
    AIController,
    ConversationController,
    PersonaController,
    AuthController,
    FlowController,
    FlowExecutionController,
    FlowTemplateController,
    NodeTemplateController,
)


@api.get("/hello")
async def hello(request):
    return {"message": "Hello, world!"}
