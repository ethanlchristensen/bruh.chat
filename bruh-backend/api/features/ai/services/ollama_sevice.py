# api/features/ai/services/ollama_service.py
import base64
import json
import logging
from functools import lru_cache
from typing import AsyncGenerator, Optional

import ollama
from django.core.cache import cache
from django.core.files.uploadedfile import UploadedFile

from core.services import get_config

logger = logging.getLogger(__name__)


class OllamaService:
    MODELS_CACHE_KEY = "ollama_all_models_data"
    STRUCTURED_MODELS_CACHE_KEY = "ollama_structured_models_data"
    VISION_MODELS_CACHE_KEY = "ollama_vision_models_data"
    CACHE_TIMEOUT = 60 * 5  # 5 minutes for local models

    def __init__(self):
        config = get_config()
        if config is None:
            raise ValueError("Config was 'None', value was expected.")

        self.default_model = config.ollama.ollama_default_model
        self.host = config.ollama.ollama_host
        self.client = ollama.AsyncClient(host=self.host)

    @staticmethod
    def encode_image_to_base64(file: UploadedFile) -> str:
        """Encode an uploaded file to base64 string"""
        file.seek(0)
        return base64.b64encode(file.read()).decode("utf-8")

    @staticmethod
    def create_image_content(file: UploadedFile) -> str:
        """Create Ollama-compatible image content (base64 string)"""
        return OllamaService.encode_image_to_base64(file)

    async def chat(
        self,
        content: str,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        images: Optional[list[str]] = None,
    ) -> str:
        """Simple chat completion"""
        if not model and not self.default_model:
            raise ValueError("No model provided and no default model set")

        options = {}
        if temperature is not None:
            options["temperature"] = temperature

        messages = [{"role": "user", "content": content}]

        if images:
            messages[0]["images"] = images

        response = await self.client.chat(
            model=model or self.default_model,
            messages=messages,
            options=options if options else None,
        )
        return response["message"]["content"]

    async def chat_with_messages(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        format: Optional[str] = None,
    ) -> str:
        """Chat with full message history"""
        if not model and not self.default_model:
            raise ValueError("No model provided and no default model set")

        options = {}
        if temperature is not None:
            options["temperature"] = temperature

        response = await self.client.chat(
            model=model or self.default_model,
            messages=messages,
            options=options if options else None,
            format=format,
        )
        return response["message"]["content"]

    async def chat_with_messages_stream(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        format: Optional[str] = None,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """Stream chat completions"""
        if not model and not self.default_model:
            raise ValueError("No model provided and no default model set")

        options = {}
        if temperature is not None:
            options["temperature"] = temperature

        stream = await self.client.chat(
            model=model or self.default_model,
            messages=messages,
            options=options if options else None,
            format=format,
            stream=True,
        )

        async for chunk in stream:
            if "message" in chunk:
                msg = chunk["message"]

                # map thinking to open router format
                if "thinking" in msg and msg["thinking"]:
                    yield json.dumps({"choices": [{"delta": {"reasoning": msg["thinking"]}}]})

                # map content to open router format
                if "content" in msg and msg["content"]:
                    yield json.dumps({"choices": [{"delta": {"content": msg["content"]}}]})

            if chunk.get("done") is True:
                prompt_tokens = chunk.get("prompt_eval_count", 0)
                completion_tokens = chunk.get("eval_count", 0)

                usage_data = {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": prompt_tokens + completion_tokens,
                }

                yield json.dumps(
                    {
                        "id": "ollama-final",
                        "choices": [],
                        "usage": usage_data,
                        "model": chunk.get("model"),
                    }
                )

    async def chat_with_structured_output(
        self,
        messages: list[dict],
        response_schema: dict,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> dict:
        """Chat with structured JSON output"""
        if not model and not self.default_model:
            raise ValueError("No model provided and no default model set")

        options = {}
        if temperature is not None:
            options["temperature"] = temperature

        schema_instruction = (
            f"\nRespond with valid JSON matching this schema: {json.dumps(response_schema)}"
        )

        modified_messages = messages.copy()
        has_system = any(msg.get("role") == "system" for msg in modified_messages)

        if has_system:
            for msg in modified_messages:
                if msg.get("role") == "system":
                    msg["content"] += schema_instruction
                    break
        else:
            modified_messages.insert(
                0,
                {
                    "role": "system",
                    "content": f"You are a helpful assistant that responds in JSON format.{schema_instruction}",
                },
            )

        response = await self.client.chat(
            model=model or self.default_model,
            messages=modified_messages,
            options=options if options else None,
            format="json",
        )

        content = response["message"]["content"]

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {content}")
            raise ValueError(f"Invalid JSON response from model: {e}")

    async def format_message_payload(
        self, content: str, attachments: list, model: str = None
    ) -> dict:
        """Build Ollama-compatible message (images separate from content)"""
        message = {"role": "user", "content": content}

        if attachments:
            images = []
            for attachment in attachments:
                if attachment.mime_type.startswith("image/"):
                    attachment.file.seek(0)
                    # Reuse existing static method
                    base64_image = self.encode_image_to_base64(attachment.file)
                    images.append(base64_image)

            if images:
                message["images"] = images
                logger.info(f"Added {len(images)} images to Ollama message")

        return message

    async def get_all_models_flat(self, use_cache: bool = True) -> list[dict]:
        if use_cache:
            cached_models = cache.get(self.MODELS_CACHE_KEY)
            if cached_models:
                logger.debug(f"Returning {len(cached_models)} models from cache")
                return cached_models

        try:
            response = await self.client.list()
            raw_models = response.get("models", [])

            logger.info(f"Fetched {len(raw_models)} models from Ollama")

            # Convert Ollama model objects to dictionaries
            models_data = []
            for model_obj in raw_models:
                # Convert Pydantic model to dict
                if hasattr(model_obj, "model_dump"):
                    # Pydantic v2
                    model_dict = model_obj.model_dump()
                elif hasattr(model_obj, "dict"):
                    # Pydantic v1
                    model_dict = model_obj.dict()
                else:
                    # Already a dict
                    model_dict = dict(model_obj)

                # Get model name from 'model' field (Ollama uses this, not 'name')
                model_name = model_dict.get("model", "")

                if model_name:
                    # Add 'id' field for unified interface
                    model_dict["id"] = model_name
                    # Ensure 'name' field exists
                    if "name" not in model_dict:
                        model_dict["name"] = model_name
                else:
                    logger.warning(f"Model without 'model' field: {model_dict}")

                models_data.append(model_dict)

            if use_cache:
                cache.set(self.MODELS_CACHE_KEY, models_data, self.CACHE_TIMEOUT)
                logger.debug(f"Cached {len(models_data)} models")

            return models_data

        except Exception as e:
            logger.error(f"Failed to fetch Ollama models: {e}", exc_info=True)
            return []

    async def get_all_vision_models(self, use_cache: bool = True) -> list[dict]:
        """Get all models that support vision (image input)"""
        if use_cache:
            cached_vision_models = cache.get(self.VISION_MODELS_CACHE_KEY)
            if cached_vision_models:
                return cached_vision_models

        all_models = await self.get_all_models_flat(use_cache=use_cache)

        vision_models = []
        for model in all_models:
            model_id = model.get("id", "")
            # Common vision model patterns
            if any(
                keyword in model_id.lower()
                for keyword in ["vision", "llava", "bakllava", "minicpm"]
            ):
                vision_models.append(model)

        if use_cache:
            cache.set(self.VISION_MODELS_CACHE_KEY, vision_models, self.CACHE_TIMEOUT)

        return vision_models

    async def supports_vision(self, model_id: str, use_cache: bool = True) -> bool:
        """Check if a model supports vision/image input"""
        vision_models = await self.get_all_vision_models(use_cache=use_cache)
        return any(model.get("id") == model_id for model in vision_models)

    async def get_all_structured_output_models(self, use_cache: bool = True) -> list[dict]:
        """Get all models that support structured outputs (JSON mode)"""
        if use_cache:
            cached_structured_models = cache.get(self.STRUCTURED_MODELS_CACHE_KEY)
            if cached_structured_models:
                return cached_structured_models

        all_models = await self.get_all_models_flat(use_cache=use_cache)

        # Most models support JSON format, but exclude tiny models
        structured_models = [
            model
            for model in all_models
            if not any(exclude in model.get("id", "").lower() for exclude in ["tiny", "1b"])
        ]

        if use_cache:
            cache.set(self.STRUCTURED_MODELS_CACHE_KEY, structured_models, self.CACHE_TIMEOUT)

        return structured_models

    async def models(self, use_cache: bool = True) -> dict:
        """
        Get all models organized by family/provider.
        Returns dict like: {"llama2": [{...}], "mistral": [{...}]}
        """
        all_models = await self.get_all_models_flat(use_cache=use_cache)

        if not all_models:
            logger.warning("No models found in get_all_models_flat()")
            return {}

        models = {}

        for model in all_models:
            model_id = model.get("id", "")

            if not model_id:
                logger.warning(f"Skipping model without id: {model}")
                continue

            # Extract family from model name (e.g., "llama2" from "llama2:7b")
            family = model_id.split(":")[0] if ":" in model_id else model_id

            if family:
                if family not in models:
                    models[family] = []

                models[family].append(
                    {
                        "id": model_id,
                        "name": model.get("name", model_id),
                        "size": model.get("size", 0),
                        "modified_at": str(model.get("modified_at", "")),
                        "digest": model.get("digest", ""),
                    }
                )

        logger.info(f"Organized {len(all_models)} models into {len(models)} families")
        return models

    async def get_models_by_ids(self, model_ids: list[str], use_cache: bool = True) -> list[dict]:
        """Get specific models by their IDs (unified interface)"""
        all_models = await self.get_all_models_flat(use_cache=use_cache)
        model_ids_set = set(model_ids)
        return [model for model in all_models if model.get("id") in model_ids_set]

    async def get_model_by_id(self, model_id: str, use_cache: bool = True) -> dict | None:
        """Get a model by its ID (unified interface)"""
        all_models = await self.get_all_models_flat(use_cache=use_cache)

        for model in all_models:
            if model.get("id") == model_id:
                logger.debug(f"Found model: {model_id}")
                return model

        logger.warning(f"Model not found: {model_id}")
        logger.debug(f"Available models: {[m.get('id') for m in all_models]}")
        return None

    async def get_valid_model_ids(self, use_cache: bool = True) -> set[str]:
        """Get a set of all valid model IDs for validation (unified interface)"""
        all_models = await self.get_all_models_flat(use_cache=use_cache)
        return {model.get("id") for model in all_models if model.get("id")}

    async def validate_model_id(self, model_id: str, use_cache: bool = True) -> bool:
        """Check if a model ID is valid (unified interface)"""
        valid_ids = await self.get_valid_model_ids(use_cache=use_cache)
        is_valid = model_id in valid_ids

        if not is_valid:
            logger.warning(f"Model validation failed: '{model_id}'")
        else:
            logger.info(f"Model validated: '{model_id}'")

        return is_valid

    async def validate_model_ids(
        self, model_ids: list[str], use_cache: bool = True
    ) -> tuple[list[str], list[str]]:
        """
        Validate multiple model IDs (unified interface)
        Returns (valid_ids, invalid_ids)
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
        """Get models organized by family, filtered to those supporting structured outputs"""
        structured_models = await self.get_all_structured_output_models(use_cache=use_cache)

        models = {}

        for model in structured_models:
            model_id = model.get("id", "")
            family = model_id.split(":")[0] if ":" in model_id else model_id

            if family:
                if family not in models:
                    models[family] = []

                models[family].append(
                    {
                        "id": model_id,
                        "name": model.get("name", model_id),
                    }
                )

        return models

    async def supports_structured_outputs(self, model_id: str, use_cache: bool = True) -> bool:
        """Check if a model supports structured outputs"""
        structured_models = await self.get_all_structured_output_models(use_cache=use_cache)
        return any(model.get("id") == model_id for model in structured_models)

    async def get_model_info(self, model_id: str) -> dict:
        """Get detailed information about a specific model"""
        return await self.client.show(model_id)

    async def pull_model(self, model_id: str) -> AsyncGenerator[dict, None]:
        """Pull/download a model from Ollama registry"""
        stream = await self.client.pull(model_id, stream=True)
        async for chunk in stream:
            yield chunk

    async def delete_model(self, model_id: str) -> None:
        """Delete a model from local storage"""
        await self.client.delete(model_id)

    async def copy_model(self, source: str, destination: str) -> None:
        """Copy a model to a new name"""
        await self.client.copy(source, destination)

    async def generate_embeddings(
        self, model: str, prompt: str, options: Optional[dict] = None
    ) -> list[float]:
        """Generate embeddings for a prompt"""
        response = await self.client.embeddings(model=model, prompt=prompt, options=options)
        return response.get("embedding", [])

    def clear_cache(self):
        """Clear all caches"""
        cache.delete(self.MODELS_CACHE_KEY)
        cache.delete(self.STRUCTURED_MODELS_CACHE_KEY)
        cache.delete(self.VISION_MODELS_CACHE_KEY)
        logger.info("🧹 Cleared Ollama cache")

    async def is_running(self) -> bool:
        """Check if Ollama service is running"""
        try:
            await self.client.list()
            return True
        except Exception as e:
            logger.error(f"Ollama service not available: {e}")
            return False


@lru_cache()
def get_ollama_service() -> OllamaService:
    return OllamaService()
