from typing import Any, Dict
from .base_executor import NodeExecutor


class MergeExecutor(NodeExecutor):
    async def execute(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            merge_strategy = node_data.get("mergeStrategy", "object")

            # Remove special keys from inputs
            input_data = {k: v for k, v in inputs.items() if not k.startswith("__")}

            if not input_data:
                return {
                    "success": False,
                    "error": "No inputs to merge",
                }

            # Merge based on strategy
            if merge_strategy == "object":
                # Combine all inputs into a single object
                result = {}
                for key, value in input_data.items():
                    result[key] = value

            elif merge_strategy == "flatten":
                # Merge all dict values into one flat object
                result = {}
                for value in input_data.values():
                    if isinstance(value, dict):
                        result.update(value)
                    else:
                        # If not a dict, can't flatten
                        return {
                            "success": False,
                            "error": "flatten strategy requires all inputs to be objects",
                        }

            elif merge_strategy == "array":
                # Combine all inputs into an array
                result = list(input_data.values())

            elif merge_strategy == "concat":
                # Concatenate string values
                result = ""
                for value in input_data.values():
                    result += str(value)

            elif merge_strategy == "first":
                # Return first input (by key order)
                result = next(iter(input_data.values()))

            elif merge_strategy == "last":
                # Return last input (by key order)
                result = list(input_data.values())[-1]

            else:
                return {
                    "success": False,
                    "error": f"Unknown merge strategy: {merge_strategy}",
                }

            return {
                "success": True,
                "output": result,
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Merge error: {str(e)}",
            }
