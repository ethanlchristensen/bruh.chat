import base64
from functools import lru_cache
from typing import Optional
from io import BytesIO

import httpx
from django.core.cache import cache
from django.core.files.uploadedfile import UploadedFile

from core.services import get_config

import logging

logger = logging.getLogger(__name__)


class OpenRouterService:
    MODELS_CACHE_KEY = "openrouter_all_models_data"
    STRUCTURED_MODELS_CACHE_KEY = "openrouter_structured_models_data"
    IMAGE_GEN_MODELS_CACHE_KEY = "openrouter_image_gen_models_data"
    CACHE_TIMEOUT = 60 * 60

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
            "Content-Type": "application/json",
            "HTTP-Referer": "bruh.chat",
            "X-Title": "bruh.chat",
        }

    @staticmethod
    def encode_image_to_base64(file: UploadedFile) -> str:
        """Encode an uploaded file to base64 string"""
        file.seek(0)
        return base64.b64encode(file.read()).decode("utf-8")

    @staticmethod
    def create_image_content(file: UploadedFile, mime_type: str) -> dict:
        """Create OpenAI-compatible image content block"""
        base64_image = OpenRouterService.encode_image_to_base64(file)
        return {
            "type": "image_url",
            "image_url": {"url": f"data:{mime_type};base64,{base64_image}"},
        }

    async def chat(
        self,
        content: str,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        url = f"{self.base_url}/chat/completions"

        payload = {
            "model": model or self.default_model,
            "messages": [{"role": "user", "content": content}],
        }

        if temperature is not None:
            payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, json=payload, headers=self._get_headers(), timeout=60.0
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
        stream: bool = False,
    ) -> dict:
        url = f"{self.base_url}/chat/completions"

        payload = {
            "model": model or self.default_model,
            "messages": messages,
            "stream": stream,
        }

        if temperature is not None:
            payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, json=payload, headers=self._get_headers(), timeout=60.0
            )
            response.raise_for_status()
            return response.json()

    async def chat_with_messages_stream(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ):
        """Stream chat completions as Server-Sent Events"""
        url = f"{self.base_url}/chat/completions"

        payload = {
            "model": model or self.default_model,
            "messages": messages,
            "stream": True,
        }

        if temperature is not None:
            payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", url, json=payload, headers=self._get_headers(), timeout=60.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        yield data

    async def chat_with_structured_output(
        self,
        messages: list[dict],
        response_format: dict,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> dict:
        """
        Chat with structured output using JSON schema

        Args:
            messages: List of message dicts
            response_format: JSON schema definition for structured output
            model: Model ID (should support structured outputs)
            temperature: Optional temperature
            max_tokens: Optional max tokens
        """
        url = f"{self.base_url}/chat/completions"

        payload = {
            "model": model or self.default_model,
            "messages": messages,
            "response_format": response_format,
        }

        if temperature is not None:
            payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, json=payload, headers=self._get_headers(), timeout=60.0
            )
            response.raise_for_status()
            return response.json()

    async def generate_image(
        self,
        prompt: str,
        model: Optional[str] = None,
        aspect_ratio: Optional[str] = None,
        stream: bool = False,
    ) -> dict:
        url = f"{self.base_url}/chat/completions"

        payload = {
            "model": model or self.default_model,
            "messages": [{"role": "user", "content": "prompt"}],
            "modalities": ["image", "text"],
            "stream": stream,
        }

        if aspect_ratio:
            payload["image_config"] = {"aspect_ratio": aspect_ratio}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, json=payload, headers=self._get_headers(), timeout=120.0
            )

            response.raise_for_status()

            return response.json()

    async def generate_image_stream(
        self,
        prompt: str,
        model: Optional[str] = None,
        aspect_ratio: Optional[str] = None,
    ):
        """Stream image generation responses"""
        url = f"{self.base_url}/chat/completions"

        payload = {
            "model": model or self.default_model,
            "messages": [{"role": "user", "content": prompt}],
            "modalities": ["image", "text"],
            "stream": True,
        }

        if aspect_ratio:
            payload["image_config"] = {"aspect_ratio": aspect_ratio}

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", url, json=payload, headers=self._get_headers(), timeout=120.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        yield data

    async def get_all_image_generation_models(
        self, use_cache: bool = True
    ) -> list[dict]:
        """Get all models that support image generation"""
        if use_cache:
            cached_image_models = cache.get(self.IMAGE_GEN_MODELS_CACHE_KEY)
            if cached_image_models:
                return cached_image_models

        all_models = await self.get_all_models_flat(use_cache=use_cache)

        image_models = [
            model
            for model in all_models
            if "image" in model.get("output_modalities", [])
        ]

        if use_cache:
            cache.set(self.IMAGE_GEN_MODELS_CACHE_KEY, image_models, self.CACHE_TIMEOUT)

        return image_models

    async def supports_image_generation(
        self, model_id: str, use_cache: bool = True
    ) -> bool:
        """Check if a model supports image generation"""
        model = await self.get_model_by_id(model_id=model_id, use_cache=use_cache)
        if not model:
            return False

        return "image" in model.get("output_modalities", [])

    async def get_all_models_flat(self, use_cache: bool = True) -> list[dict]:
        """
        Get all models as a flat list with full details
        This is the core method that fetches from OpenRouter or cache
        """
        if use_cache:
            cached_models = cache.get(self.MODELS_CACHE_KEY)
            if cached_models:
                return cached_models

        url = f"{self.base_url}/models"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._get_headers(), timeout=30.0)
            response.raise_for_status()

            models_data = response.json().get("data", [])

            if use_cache:
                cache.set(self.MODELS_CACHE_KEY, models_data, self.CACHE_TIMEOUT)

            return models_data

    async def get_all_structured_output_models(
        self, use_cache: bool = True
    ) -> list[dict]:
        """Get all models that support structured outputs"""
        if use_cache:
            cached_structured_models = cache.get(self.STRUCTURED_MODELS_CACHE_KEY)
            if cached_structured_models:
                return cached_structured_models

        all_models = await self.get_all_models_flat(use_cache=use_cache)

        structueed_models = [
            model
            for model in all_models
            if "structured_outputs" in model.get("supported_parameters", [])
        ]

        if use_cache:
            cache.set(
                self.STRUCTURED_MODELS_CACHE_KEY, structueed_models, self.CACHE_TIMEOUT
            )

        return structueed_models

    async def models(self, use_cache: bool = True) -> dict:
        """
        Get all models organized by provider
        Uses cached data from get_all_models_flat
        """
        all_models = await self.get_all_models_flat(use_cache=use_cache)

        models = {}

        for model in all_models:
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

    async def get_models_by_ids(
        self, model_ids: list[str], use_cache: bool = True
    ) -> list[dict]:
        """
        Get specific models by their IDs
        Uses cached data from get_all_models_flat
        """
        all_models = await self.get_all_models_flat(use_cache=use_cache)
        model_ids_set = set(model_ids)

        return [model for model in all_models if model.get("id") in model_ids_set]

    async def get_model_by_id(
        self, model_id: str, use_cache: bool = True
    ) -> dict | None:
        """Get a model by it's id"""
        all_models = await self.get_all_models_flat(use_cache=use_cache)

        for model in all_models:
            if model.get("id") == model_id:
                return model

    async def get_valid_model_ids(self, use_cache: bool = True) -> set[str]:
        """
        Get a set of all valid model IDs for validation purposes
        Uses cached data from get_all_models_flat
        """
        all_models = await self.get_all_models_flat(use_cache=use_cache)
        model_ids: set[str] = set()

        for model in all_models:
            model_id = model.get("id")
            if model_id and isinstance(model_id, str):
                model_ids.add(model_id)

        return model_ids

    async def validate_model_id(self, model_id: str, use_cache: bool = True) -> bool:
        """
        Check if a model ID is valid
        Uses cached data
        """
        valid_ids = await self.get_valid_model_ids(use_cache=use_cache)
        return model_id in valid_ids

    async def validate_model_ids(
        self, model_ids: list[str], use_cache: bool = True
    ) -> tuple[list[str], list[str]]:
        """
        Validate multiple model IDs
        Returns (valid_ids, invalid_ids)
        Uses cached data
        """
        valid_ids_set = await self.get_valid_model_ids(use_cache=use_cache)
        valid = []
        invalid = []

        for model_id in model_ids:
            if model_id in valid_ids_set:
                valid.append(model_id)
            else:
                invalid.append(model_id)

        return valid, invalid

    async def models_with_structured_outputs(self, use_cache: bool = True) -> dict:
        """
        Get models organized by provider, filtered to only those supporting structured outputs
        """
        structured_models = await self.get_all_structured_output_models(
            use_cache=use_cache
        )

        models = {}

        for model in structured_models:
            model_id = model.get("id")
            model_name = model.get("name")

            if model_id:
                provider = model_id.split("/")[0]
                if provider:
                    if provider in models:
                        models[provider].append({"id": model_id, "name": model_name})
                    else:
                        models[provider] = [{"id": model_id, "name": model_name}]

        return models

    async def supports_structured_outputs(
        self, model_id: str, use_cache: bool = True
    ) -> bool:
        model = await self.get_model_by_id(model_id=model_id, use_cache=use_cache)
        if not model:
            return False

        return "structured_outputs" in model.get("supported_parameters", [])

    def clear_cache(self):
        """Clear the models cache"""
        cache.delete(self.MODELS_CACHE_KEY)
        cache.delete(self.STRUCTURED_MODELS_CACHE_KEY)
        cache.delete(self.IMAGE_GEN_MODELS_CACHE_KEY)

    async def providers(self) -> list[dict]:
        url = f"{self.base_url}/providers"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._get_headers(), timeout=30.0)
            response.raise_for_status()

            data = response.json()
            return data.get("data", [])


@lru_cache()
def get_open_router_service() -> OpenRouterService:
    return OpenRouterService()
