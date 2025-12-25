import re
import html
from typing import Any, Dict
from .base_executor import NodeExecutor


class TemplateExecutor(NodeExecutor):
    async def execute(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            template = node_data.get("template", "")
            variables = node_data.get("variables", {})
            escape_html = node_data.get("escapeHtml", False)

            if not template:
                return {
                    "success": False,
                    "error": "Template is empty",
                }

            # Get input from connected node
            input_value = inputs.get("input", "")

            # Build the context with variables
            context = variables.copy()
            context["input"] = input_value

            # Get flow variables if available
            flow_variables = inputs.get("__variables__", {})
            context.update(flow_variables)

            # Render the template
            result = self._render_template(template, context, escape_html)

            return {
                "success": True,
                "output": result,
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Template error: {str(e)}",
            }

    def _render_template(self, template: str, context: Dict[str, Any], escape_html: bool) -> str:
        """Render template by replacing {{variable}} placeholders"""

        def replace_var(match):
            var_name = match.group(1).strip()

            # Handle nested keys like {{user.name}}
            value = self._get_nested_value(context, var_name)

            # Convert to string
            if value is None:
                return ""

            str_value = str(value)

            # Escape HTML if needed
            if escape_html:
                str_value = html.escape(str_value)

            return str_value

        # Replace all {{variable}} patterns
        result = re.sub(r"\{\{([^}]+)\}\}", replace_var, template)

        return result

    def _get_nested_value(self, context: Dict[str, Any], key: str) -> Any:
        """Get value from context, supporting nested keys like 'user.name'"""

        # Split on dots for nested access
        parts = key.split(".")
        value = context

        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
                if value is None:
                    return None
            else:
                return None

        return value
