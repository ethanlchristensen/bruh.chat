import json
from typing import Any, Dict
from .base_executor import NodeExecutor

from api.features.ai.services.factory import get_ai_service


class LLMExecutor(NodeExecutor):
    async def execute(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            provider = node_data.get("provider")
            model = node_data.get("model")
            prompt_template = node_data.get("userPromptTemplate", "{{input}}")

            service = get_ai_service(provider)

            if not await service.validate_model_id(model):
                return {"success": False, "error": f"Invalid model ID: {model}"}

            input_text = inputs.get("input", "")
            prompt = prompt_template.replace("{{input}}", str(input_text))
            
            # Validate prompt has content
            if not prompt.strip():
                return {
                    "success": False, 
                    "error": "Prompt is empty. Please provide input or configure the prompt template."
                }
            
            message = await service.format_message_payload(
                content=prompt,
                attachments=[],
                model=model
            )
            
            messages = [message]
            
            full_response = ""
            async for chunk in service.chat_with_messages_stream(
                messages=messages,
                model=model
            ):
                try:
                    chunk_data = json.loads(chunk)
                    delta = chunk_data.get("choices", [{}])[0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        full_response += content
                except json.JSONDecodeError:
                    continue
            
            return {
                "success": True,
                "output": full_response,
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
