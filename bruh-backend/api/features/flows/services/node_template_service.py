from typing import Dict, Any, Tuple, Optional
from uuid import uuid4
from functools import lru_cache

from ..models import NodeTemplate


class NodeTemplateService:
    @staticmethod
    def create_node_from_template(
        template: NodeTemplate,
        position: Dict[str, float],
        custom_config: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        try:
            node_data = template.default_config.copy()

            if custom_config:
                node_data.update(custom_config)

            node = {
                "id": f"{template.type}-{str(uuid4())[:8]}",
                "type": template.type,
                "position": position,
                "data": node_data,
            }

            return node, None

        except Exception as e:
            return None, str(e)

    @staticmethod
    def get_default_handles(node_type: str) -> list:
        if node_type == "input":
            return [{"id": "output", "type": "source", "position": "right"}]
        elif node_type == "output":
            return [{"id": "input", "type": "target", "position": "left"}]
        elif node_type in ["llm", "json_extractor"]:
            return [
                {"id": "input", "type": "target", "position": "left"},
                {"id": "output", "type": "source", "position": "right"},
            ]
        else:
            return []


@lru_cache
def get_node_template_service() -> NodeTemplateService:
    return NodeTemplateService()
