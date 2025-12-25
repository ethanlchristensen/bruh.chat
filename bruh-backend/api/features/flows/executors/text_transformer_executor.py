import re
from typing import Any, Dict, List
from .base_executor import NodeExecutor


class TextTransformerExecutor(NodeExecutor):
    async def execute(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            operations = node_data.get("operations", [])
            input_value = inputs.get("input", "")

            # Convert input to string if it isn't already
            if not isinstance(input_value, str):
                input_value = str(input_value)

            if not operations:
                return {
                    "success": False,
                    "error": "No operations configured",
                }

            # Apply each enabled operation in sequence
            result = input_value
            for operation in operations:
                if not operation.get("enabled", True):
                    continue

                op_type = operation.get("type")
                config = operation.get("config", {})

                try:
                    result = self._apply_operation(result, op_type, config)
                except Exception as e:
                    return {
                        "success": False,
                        "error": f"Operation '{op_type}' failed: {str(e)}",
                    }

            return {
                "success": True,
                "output": result,
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Text transformer error: {str(e)}",
            }

    def _apply_operation(self, text: str, op_type: str, config: Dict[str, Any]) -> str:
        """Apply a single transformation operation"""

        if op_type == "trim":
            return text.strip()

        elif op_type == "uppercase":
            return text.upper()

        elif op_type == "lowercase":
            return text.lower()

        elif op_type == "capitalize":
            # Capitalize first letter of each word
            return text.title()

        elif op_type == "replace":
            find = config.get("find", "")
            replace = config.get("replace", "")
            if not find:
                raise ValueError("'find' value is required for replace operation")
            return text.replace(find, replace)

        elif op_type == "regex_replace":
            pattern = config.get("pattern", "")
            replace = config.get("replace", "")
            flags = config.get("flags", "")

            if not pattern:
                raise ValueError("'pattern' is required for regex_replace operation")

            # Parse flags (i=IGNORECASE, m=MULTILINE, s=DOTALL)
            regex_flags = 0
            if "i" in flags:
                regex_flags |= re.IGNORECASE
            if "m" in flags:
                regex_flags |= re.MULTILINE
            if "s" in flags:
                regex_flags |= re.DOTALL

            return re.sub(pattern, replace, text, flags=regex_flags)

        elif op_type == "split":
            delimiter = config.get("delimiter", ",")
            max_splits = config.get("maxSplits")

            if max_splits is not None:
                parts = text.split(delimiter, max_splits)
            else:
                parts = text.split(delimiter)

            # Return as joined string with newlines or as-is based on config
            output_format = config.get("outputFormat", "array")
            if output_format == "lines":
                return "\n".join(parts)
            elif output_format == "array":
                # Return array as string representation
                return str(parts)
            else:
                return "\n".join(parts)

        elif op_type == "join":
            delimiter = config.get("delimiter", "")
            # Assume text is already split somehow (by newlines)
            parts = text.split("\n")
            return delimiter.join(parts)

        elif op_type == "substring":
            start = config.get("start", 0)
            end = config.get("end")

            if end is not None:
                return text[start:end]
            else:
                return text[start:]

        elif op_type == "prefix":
            prefix = config.get("value", "")
            return prefix + text

        elif op_type == "suffix":
            suffix = config.get("value", "")
            return text + suffix

        elif op_type == "remove_whitespace":
            mode = config.get("mode", "all")

            if mode == "all":
                # Remove all whitespace
                return re.sub(r"\s+", "", text)
            elif mode == "extra":
                # Replace multiple spaces with single space
                return re.sub(r"\s+", " ", text).strip()
            elif mode == "leading":
                return text.lstrip()
            elif mode == "trailing":
                return text.rstrip()
            else:
                return text.strip()

        else:
            raise ValueError(f"Unknown operation type: {op_type}")
