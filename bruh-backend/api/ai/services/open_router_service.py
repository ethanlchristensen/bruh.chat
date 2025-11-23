from openrouter import OpenRouter
from openrouter.components import UserMessage

from core.services import get_config

class OpenRouterService:
    def __init__(self):
        config = get_config()

        if config is None:
            raise ValueError("Config was 'None', value was expected.")
        
        self.default_model = config.open_router.open_router_default_model
        self.router = OpenRouter(api_key=config.open_router.open_router_api_key)
    
    async def chat(self, content: str):
        with self.router as router:
            chat_response = await router.chat.send_async(messages=[UserMessage(content=content)], stream=False)
            return chat_response.choices[0].message.content
        
    async def models(self):
        models = []
        with self.router as router:
            models_list_response = await router.models.list_async()
            print(models_list_response.model_dump())
