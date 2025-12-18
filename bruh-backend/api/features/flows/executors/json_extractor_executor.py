import json
import jsonpath_ng.ext as jp
from typing import Any, Dict
from .base_executor import NodeExecutor


class JsonExtractorExecutor(NodeExecutor):
    async def execute(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            json_input = inputs.get("input", "")
            extractions = node_data.get("extractions", [])
            strict_mode = node_data.get("strictMode", False)
            output_format = node_data.get("outputFormat", "object")
            
            data = json.loads(json_input)
            results = {}
            errors = []

            for extraction in extractions:
                key = extraction.get("key")
                path = extraction.get("path", "$")
                fallback = extraction.get("fallback")

                try:
                    jsonpath_expr = jp.parse(path)
                    matches = jsonpath_expr.find(data)

                    if matches:
                        if output_format == "array":
                            results[key] = [match.value for match in matches]
                        else:
                            results[key] = matches[0].value
                    elif fallback is not None:
                        results[key] = fallback
                    elif strict_mode:
                        errors.append(f"Path '{path}' not found for key '{key}'")
                    else:
                        results[key] = None

                except Exception as e:
                    if strict_mode:
                        errors.append(f"Error extracting '{key}': {str(e)}")
                    else:
                        results[key] = fallback

            if errors:
                return {
                    "success": False,
                    "error": "; ".join(errors),
                    "output": results,
                }

            return {
                "success": True,
                "output": results if output_format != "flat" or len(results) > 1 else list(results.values())[0],
            }

        except json.JSONDecodeError as e:
            return {"success": False, "error": f"Invalid JSON: {str(e)}"}
        except Exception as e:
            return {"success": False, "error": str(e)}