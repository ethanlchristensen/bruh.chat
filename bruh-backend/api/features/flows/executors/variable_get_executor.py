from typing import Any, Dict
from .base_executor import NodeExecutor


class VariableGetExecutor(NodeExecutor):
    async def execute(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            variable_name = node_data.get("variableName")
            fallback_value = node_data.get("fallbackValue")

            if not variable_name:
                return {
                    "success": False,
                    "error": "Variable name is required",
                }

            # Variables are passed in inputs under the special key '__variables__'
            variables = inputs.get("__variables__", {})

            # Get value from variables or use fallback
            value = variables.get(variable_name, fallback_value)

            return {
                "success": True,
                "output": value,
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Variable get error: {str(e)}",
            }
