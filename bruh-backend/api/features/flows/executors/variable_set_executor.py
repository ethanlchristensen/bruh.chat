from typing import Any, Dict
from .base_executor import NodeExecutor


class VariableSetExecutor(NodeExecutor):
    async def execute(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            variable_name = node_data.get("variableName")
            value_source = node_data.get("valueSource", "input")

            if not variable_name:
                return {
                    "success": False,
                    "error": "Variable name is required",
                }

            # Determine the value to set
            if value_source == "static":
                value = node_data.get("staticValue")
            else:  # "input"
                value = inputs.get("input")

            # Return the value to be set and signal to update variables
            return {
                "success": True,
                "output": value,
                "setVariable": {
                    "name": variable_name,
                    "value": value,
                },
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Variable set error: {str(e)}",
            }
