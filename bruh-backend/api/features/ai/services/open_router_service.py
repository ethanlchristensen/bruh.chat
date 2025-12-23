import json
import base64
import logging
from functools import lru_cache
from typing import Optional

import httpx
from asgiref.sync import sync_to_async
from django.core.cache import cache
from django.core.files.uploadedfile import UploadedFile

from core.services import get_config
from api.features.ai.models import AIResponse
from .base import AIServiceBase

logger = logging.getLogger(__name__)


class OpenRouterService(AIServiceBase):
    MODELS_CACHE_KEY = "openrouter_all_models_data"
    STRUCTURED_MODELS_CACHE_KEY = "openrouter_structured_models_data"
    IMAGE_GEN_MODELS_CACHE_KEY = "openrouter_image_gen_models_data"
    CACHE_TIMEOUT = 60 * 60

    VALID_ASPECT_RATIOS = {
        "1:1": {"width": 1024, "height": 1024},
        "2:3": {"width": 832, "height": 1248},
        "3:2": {"width": 1248, "height": 832},
        "3:4": {"width": 864, "height": 1184},
        "4:3": {"width": 1184, "height": 864},
        "4:5": {"width": 896, "height": 1152},
        "5:4": {"width": 1152, "height": 896},
        "9:16": {"width": 768, "height": 1344},
        "16:9": {"width": 1344, "height": 768},
        "21:9": {"width": 1536, "height": 672},
    }

    DEFAULT_ASPECT_RATIO = "1:1"

    def __init__(self):
        config = get_config()

        if config is None:
            raise ValueError("Config was 'None', value was expected.")

        self.default_model = config.open_router.open_router_default_model
        self.api_key = config.open_router.open_router_api_key
        self.base_url = "https://openrouter.ai/api/v1"

    def _get_conversation_starters_schema(self) -> dict:
        """Get OpenRouter-style schema"""
        return {
            "type": "json_schema",
            "json_schema": {
                "name": "conversation_starters",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "starters": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "question": {
                                        "type": "string",
                                        "description": "The generated question related to the topic.",
                                    },
                                    "category": {
                                        "type": "string",
                                        "description": "The topic category the question belongs to.",
                                    },
                                },
                                "required": ["question", "category"],
                                "additionalProperties": False,
                            },
                        }
                    },
                    "required": ["starters"],
                    "additionalProperties": False,
                },
            },
        }

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

    async def format_message_payload(
        self, content: str, attachments: list, model: str = None
    ) -> dict:
        """Build OpenAI-compatible message with text and images"""
        # If no attachments, return simple text message
        if not attachments:
            return {"role": "user", "content": content}

        # Build multimodal content
        content_parts = []
        is_gemini = model and "gemini" in model.lower()

        # Add text content if provided
        if content and content.strip():
            text_part = {"type": "text", "text": content}
            if is_gemini:
                text_part["thought_signature"] = True
            content_parts.append(text_part)

        # Add attachments
        for attachment in attachments:
            if attachment.mime_type.startswith("image/"):
                attachment.file.seek(0)
                base64_image = self.encode_image_to_base64(attachment.file)
                content_parts.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{attachment.mime_type};base64,{base64_image}"},
                    }
                )

        return {"role": "user", "content": content_parts}

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

    async def chat_with_messages_stream(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        modalities: Optional[list[str]] = None,
        image_config: Optional[dict] = None,
        **kwargs,
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
        if modalities is not None:
            payload["modalities"] = modalities
        if image_config is not None:
            payload["image_config"] = image_config

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", url, json=payload, headers=self._get_headers(), timeout=60.0
            ) as response:
                logger.info(f"Response status: {response.status_code}")

                if response.status_code != 200:
                    error_text = await response.aread()
                    logger.error(f"OpenRouter API error: {error_text.decode()}")
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
        message_instance=None,
    ) -> dict:
        """
        Chat with structured output using JSON schema

        Args:
            messages: List of message dicts
            response_format: JSON schema definition for structured output
            model: Model ID (should support structured outputs)
            temperature: Optional temperature
            max_tokens: Optional max tokens
            message_instance: Optional Message instance to link AIResponse to
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

        logger.info(f"🔄 [OpenRouter Structured] Starting request - Model: {payload['model']}")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, json=payload, headers=self._get_headers(), timeout=60.0
            )
            response.raise_for_status()

            data = response.json()

            await self._log_structured_response(data, message_instance)

            content = data["choices"][0]["message"]["content"]

            try:
                parsed_response = json.loads(content)
                logger.info(
                    f"[OpenRouter Structured] Success - Tokens: {data.get('usage', {}).get('total_tokens', 0)}"
                )
                return parsed_response
            except json.JSONDecodeError as e:
                logger.error(f"[OpenRouter Structured] JSON parse failed: {content}")
                raise ValueError(f"Invalid JSON response from model: {e}")

    async def _log_structured_response(self, data: dict, message_instance=None):
        """Extract and log metrics from structured output response"""

        usage = data.get("usage", {})
        model_used = data.get("model", "unknown")
        request_id = data.get("id", "unknown")

        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        image_tokens = usage.get("completion_tokens_details", {}).get("image_tokens", 0)
        reasoning_tokens = usage.get("completion_tokens_details", {}).get("reasoning_tokens", 0)
        total_tokens = usage.get("total_tokens", 0)

        pricing_data = {}
        model_data = await self.get_model_by_id(model_id=model_used)
        if model_data:
            pricing_data = model_data.get("pricing", {})

        prompt_cost = float(pricing_data.get("prompt", 0)) * prompt_tokens
        completion_cost = float(pricing_data.get("completion", 0)) * completion_tokens
        reasoning_cost = float(pricing_data.get("image", 0)) * reasoning_tokens

        cost_details = usage.get("cost_details", {})
        actual_cost = usage.get("cost", 0)

        @sync_to_async
        def save_ai_response():
            """Save AIResponse in sync context"""
            return AIResponse.objects.create(
                message=message_instance,
                provider="openrouter",
                raw_payload=data,
                request_id=request_id,
                model_used=model_used,
                finish_reason=data.get("choices", [{}])[0].get("finish_reason"),
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                image_tokens=image_tokens,
                reasoning_tokens=reasoning_tokens,
                total_tokens=total_tokens,
                estimated_prompt_cost=prompt_cost,
                estimated_completion_cost=completion_cost,
                estimated_reasoning_cost=reasoning_cost,
                cost=float(actual_cost),
                upstream_inference_cost=(
                    float(cost_details.get("upstream_inference_cost", 0))
                    if cost_details.get("upstream_inference_cost")
                    else None
                ),
                upstream_inference_prompt_cost=(
                    float(cost_details.get("upstream_inference_prompt_cost", 0))
                    if cost_details.get("upstream_inference_prompt_cost")
                    else None
                ),
                upstream_inference_completions_cost=(
                    float(cost_details.get("upstream_inference_completions_cost", 0))
                    if cost_details.get("upstream_inference_completions_cost")
                    else None
                ),
                is_structured_output=True,
            )

        try:
            ai_response = await save_ai_response()
            logger.debug(f"Saved AIResponse: {ai_response.id} (Structured Output)")
        except Exception as e:
            logger.error(f"Failed to save AIResponse: {e}", exc_info=True)

    async def get_all_image_generation_models(self, use_cache: bool = True) -> list[dict]:
        """Get all models that support image generation"""
        if use_cache:
            cached_image_models = cache.get(self.IMAGE_GEN_MODELS_CACHE_KEY)
            if cached_image_models:
                return cached_image_models

        all_models = await self.get_all_models_flat(use_cache=use_cache)

        image_models = [
            model
            for model in all_models
            if "image" in model.get("architecture", {}).get("output_modalities", [])
        ]

        if use_cache:
            cache.set(self.IMAGE_GEN_MODELS_CACHE_KEY, image_models, self.CACHE_TIMEOUT)

        return image_models

    async def supports_image_generation(self, model_id: str, use_cache: bool = True) -> bool:
        """Check if a model supports image generation"""
        model = await self.get_model_by_id(model_id=model_id, use_cache=use_cache)
        if not model:
            return False

        return "image" in model.get("architecture", {}).get("output_modalities", [])

    async def supports_aspect_ratio(self, model_id: str, use_cache: bool = True) -> bool:
        """Check if an image generation model supports aspect ratios. Only Gemini does at the moment."""
        return model_id.startswith("google") and "gemini" in model_id

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

    async def get_all_structured_output_models(self, use_cache: bool = True) -> list[dict]:
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
            cache.set(self.STRUCTURED_MODELS_CACHE_KEY, structueed_models, self.CACHE_TIMEOUT)

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

    async def get_models_by_ids(self, model_ids: list[str], use_cache: bool = True) -> list[dict]:
        """
        Get specific models by their IDs
        Uses cached data from get_all_models_flat
        """
        all_models = await self.get_all_models_flat(use_cache=use_cache)
        model_ids_set = set(model_ids)

        return [model for model in all_models if model.get("id") in model_ids_set]

    async def get_model_by_id(self, model_id: str, use_cache: bool = True) -> dict | None:
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
        structured_models = await self.get_all_structured_output_models(use_cache=use_cache)

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

    async def supports_structured_outputs(self, model_id: str, use_cache: bool = True) -> bool:
        model = await self.get_model_by_id(model_id=model_id, use_cache=use_cache)
        if not model:
            return False

        return "structured_outputs" in model.get("supported_parameters", [])

    async def models_with_image_generation(self, use_cache: bool = True) -> dict:
        """
        Get models organized by provider, filtered to only those supporting image generation
        """
        image_models = await self.get_all_image_generation_models(use_cache=use_cache)

        models = {}

        for model in image_models:
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

    @classmethod
    def validate_aspect_ratio(cls, aspect_ratio: str) -> bool:
        return aspect_ratio in cls.VALID_ASPECT_RATIOS

    @classmethod
    def get_aspect_ratio_dimensions(cls, aspect_ratio: str) -> dict[str, int] | None:
        return cls.VALID_ASPECT_RATIOS.get(aspect_ratio)

    @classmethod
    def get_valid_aspect_ratios(cls) -> list[str]:
        return list(cls.VALID_ASPECT_RATIOS.keys())


@lru_cache()
def get_open_router_service() -> OpenRouterService:
    return OpenRouterService()
