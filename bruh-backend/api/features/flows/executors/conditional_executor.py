import re
from typing import Any, Dict
from .base_executor import NodeExecutor


class ConditionalExecutor(NodeExecutor):
    async def execute(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            input_value = inputs.get("input", "")
            conditions = node_data.get("conditions", [])
            default_handle = node_data.get("defaultOutputHandle", "default")
            case_sensitive = node_data.get("caseSensitive", False)

            input_str = str(input_value)
            if not case_sensitive:
                input_str = input_str.lower()

            for condition in conditions:
                operator = condition.get("operator")
                compare_value = str(condition.get("value", ""))
                output_handle = condition.get("outputHandle")

                if not case_sensitive:
                    compare_value = compare_value.lower()

                matched = False

                if operator == "contains":
                    matched = compare_value in input_str
                elif operator == "equals":
                    matched = input_str == compare_value
                elif operator == "starts_with":
                    matched = input_str.startswith(compare_value)
                elif operator == "ends_with":
                    matched = input_str.endswith(compare_value)
                elif operator == "regex":
                    try:
                        flags = 0 if case_sensitive else re.IGNORECASE
                        matched = bool(re.search(compare_value, input_str, flags))
                    except re.error as e:
                        return {"success": False, "error": f"Invalid regex: {str(e)}"}

                elif operator in ["greater_than", "less_than", "equals_number"]:
                    try:
                        input_num = float(input_value)
                        compare_num = float(compare_value)

                        if operator == "greater_than":
                            matched = input_num > compare_num
                        elif operator == "less_than":
                            matched = input_num < compare_num
                        elif operator == "equals_number":
                            matched = input_num == compare_num
                    except (ValueError, TypeError):
                        continue

                elif operator == "is_empty":
                    matched = not input_str.strip()
                elif operator == "is_not_empty":
                    matched = bool(input_str.strip())

                elif operator in ["length_greater_than", "length_less_than"]:
                    try:
                        compare_num = int(compare_value)
                        if operator == "length_greater_than":
                            matched = len(input_str) > compare_num
                        elif operator == "length_less_than":
                            matched = len(input_str) < compare_num
                    except (ValueError, TypeError):
                        continue

                if matched:
                    return {
                        "success": True,
                        "output": input_value,
                        "outputHandle": output_handle,
                        "matchedCondition": condition.get("label", output_handle),
                    }

            return {
                "success": True,
                "output": input_value,
                "outputHandle": default_handle,
                "matchedCondition": "default",
            }

        except Exception as e:
            return {"success": False, "error": str(e)}
