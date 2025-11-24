from functools import lru_cache
from typing import Optional
import httpx

from core.services import get_config

class OpenRouterService:
    def __init__(self):
        config = get_config()

        if config is None:
            raise ValueError("Config was 'None', value was expected.")
        
        self.default_model = config.open_router.open_router_default_model
        self.api_key = config.open_router.open_router_api_key
        self.base_url = "https://openrouter.ai/api/v1"
        
    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def chat(
        self, 
        content: str, 
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Send a chat completion request to OpenRouter API
        
        Args:
            content: The user message content
            model: Optional model override (uses default_model if not specified)
            temperature: Optional temperature parameter
            max_tokens: Optional max tokens parameter
            
        Returns:
            The assistant's response content
        """
        url = f"{self.base_url}/chat/completions"
        
        payload = {
            "model": model or self.default_model,
            "messages": [
                {
                    "role": "user",
                    "content": content
                }
            ]
        }
        
        # Add optional parameters if provided
        if temperature is not None:
            payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=payload,
                headers=self._get_headers(),
                timeout=60.0
            )
            response.raise_for_status()
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    async def chat_with_messages(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> dict:
        url = f"{self.base_url}/chat/completions"
        
        payload = {
            "model": model or self.default_model,
            "messages": messages,
            "stream": stream
        }
        
        if temperature is not None:
            payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=payload,
                headers=self._get_headers(),
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()
    
    async def models(self) -> dict:
        url = f"{self.base_url}/models"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers(),
                timeout=30.0
            )
            response.raise_for_status()
            
            data = response.json()

            models = {}

            for model in data.get("data", []):
                model_id = model.get("id")
                model_name = model.get("name")

                if model_id:
                    provider = model_id.split("/")[0]
                    if provider:
                        if provider in models:
                            models[provider].append({"id": model_id, "name": model_name})
                        else:
                            models[provider] = [{"id": model_id, "name": model_name}]
                    else:
                        print(f"Provider not found for model_id of '{model_id}'")
                

            return models
        
    async def providers(self) -> list[dict]:
        url = f"{self.base_url}/providers"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers(),
                timeout=30.0
            )
            response.raise_for_status()
            
            data = response.json()
            return data.get("data", [])

@lru_cache()
def get_open_router_service() -> OpenRouterService:
    return OpenRouterService()