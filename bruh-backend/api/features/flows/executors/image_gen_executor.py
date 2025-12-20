import json
from typing import Any, Dict
from .base_executor import NodeExecutor

from api.features.ai.services.factory import get_ai_service
from api.features.ai.services.open_router_service import OpenRouterService


class ImageGenExecutor(NodeExecutor):
    async def execute(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            provider = node_data.get("provider")
            model = node_data.get("model")
            prompt_template = node_data.get("promptTemplate", "{{input}}")
            aspect_ratio = node_data.get("aspectRatio", "1:1")

            service: OpenRouterService = get_ai_service(provider)

            if not await service.validate_model_id(model):
                return {"success": False, "error": f"Invalid model ID: {model}"}

            if not await service.supports_image_generation(model):
                return {
                    "success": False,
                    "error": f"Model {model} does not support image generation",
                }

            input_text = inputs.get("input", "")
            prompt = prompt_template.replace("{{input}}", str(input_text))

            if not prompt.strip():
                return {
                    "success": False,
                    "error": "Prompt is empty. Please provide input or configure the prompt template.",
                }

            message = await service.format_message_payload(
                content=prompt, attachments=[], model=model
            )

            messages = [message]

            image_config = None
            if await service.supports_aspect_ratio(model):
                dimensions = service.get_aspect_ratio_dimensions(aspect_ratio)
                if dimensions:
                    image_config = {
                        "aspect_ratio": aspect_ratio,
                        "width": dimensions["width"],
                        "height": dimensions["height"],
                    }

            full_response = ""
            image_data = None

            async for chunk in service.chat_with_messages_stream(
                messages=messages,
                model=model,
                modalities=["image"],
                image_config=image_config,
            ):
                try:
                    chunk_data = json.loads(chunk)
                    delta = chunk_data.get("choices", [{}])[0].get("delta", {})

                    content = delta.get("content", "")
                    if content:
                        full_response += content

                    if "images" in delta and delta["images"]:
                        image_data = delta["images"][0]["image_url"]["url"]

                except json.JSONDecodeError:
                    continue

            if not image_data and full_response:
                image_data = full_response

            if not image_data:
                return {
                    "success": False,
                    "error": "No image was generated. The model may not support image generation.",
                }

            return {
                "success": True,
                "output": {
                    "imageData": image_data,
                    "prompt": prompt,
                    "aspectRatio": aspect_ratio,
                    "model": model,
                },
            }

        except Exception as e:
            return {"success": False, "error": str(e)}
