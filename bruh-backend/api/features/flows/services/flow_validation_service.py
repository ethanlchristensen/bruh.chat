from typing import List, Set, Dict, Any
from functools import lru_cache
import logging

from ..schemas import (
    FlowValidationResult,
    ValidationError,
    FlowNode,
    FlowEdge,
)

logger = logging.getLogger(__name__)


class FlowValidationService:
    @staticmethod
    async def validate_flow(nodes: List[Any], edges: List[Any]) -> FlowValidationResult:
        errors: List[ValidationError] = []
        warnings: List[str] = []

        if nodes and isinstance(nodes[0], dict):
            nodes = [FlowNode(**node) for node in nodes]
        if edges and isinstance(edges[0], dict):
            edges = [FlowEdge(**edge) for edge in edges]

        if not nodes:
            errors.append(
                ValidationError(
                    nodeId="",
                    field="nodes",
                    message="Flow must have at least one node",
                )
            )
            return FlowValidationResult(valid=False, errors=errors)

        node_ids: Set[str] = set()
        node_types: Dict[str, str] = {}
        input_nodes: List[str] = []
        output_nodes: List[str] = []

        for node in nodes:
            node_ids.add(node.id)
            node_types[node.id] = node.type

            if node.type == "input":
                input_nodes.append(node.id)
            elif node.type == "output":
                output_nodes.append(node.id)

        if not input_nodes:
            errors.append(
                ValidationError(
                    nodeId="",
                    field="nodes",
                    message="Flow must have at least one input node",
                )
            )

        if not output_nodes:
            errors.append(
                ValidationError(
                    nodeId="",
                    field="nodes",
                    message="Flow must have at least one output node",
                )
            )

        for edge in edges:
            if edge.source not in node_ids:
                errors.append(
                    ValidationError(
                        nodeId=edge.source,
                        field="edges",
                        message=f"Edge source '{edge.source}' references non-existent node",
                    )
                )

            if edge.target not in node_ids:
                errors.append(
                    ValidationError(
                        nodeId=edge.target,
                        field="edges",
                        message=f"Edge target '{edge.target}' references non-existent node",
                    )
                )

        for node in nodes:
            node_errors = FlowValidationService._validate_node(node)
            errors.extend(node_errors)

        connected_nodes = set()
        for edge in edges:
            connected_nodes.add(edge.source)
            connected_nodes.add(edge.target)

        disconnected = node_ids - connected_nodes
        if disconnected:
            for node_id in disconnected:
                if node_types.get(node_id) not in ["input", "output"]:
                    warnings.append(f"Node '{node_id}' is not connected to any other nodes")

        if FlowValidationService._has_cycle(nodes, edges):
            errors.append(
                ValidationError(
                    nodeId="",
                    field="flow",
                    message="Flow contains a cycle - execution may loop indefinitely",
                )
            )

        return FlowValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
        )

    @staticmethod
    def _validate_node(node: FlowNode) -> List[ValidationError]:
        errors: List[ValidationError] = []

        if node.type == "input":
            if not getattr(node.data, "value", None) and not getattr(
                node.data, "variableName", None
            ):
                errors.append(
                    ValidationError(
                        nodeId=node.id,
                        field="value",
                        message="Input node must have either a value or variable name",
                    )
                )

        elif node.type == "llm":
            if not getattr(node.data, "provider", None):
                errors.append(
                    ValidationError(
                        nodeId=node.id,
                        field="provider",
                        message="LLM node must specify a provider",
                    )
                )

            if not getattr(node.data, "model", None):
                errors.append(
                    ValidationError(
                        nodeId=node.id,
                        field="model",
                        message="LLM node must specify a model",
                    )
                )

            if not getattr(node.data, "userPromptTemplate", None):
                errors.append(
                    ValidationError(
                        nodeId=node.id,
                        field="userPromptTemplate",
                        message="LLM node must have a prompt template",
                    )
                )

            temp = getattr(node.data, "temperature", 1.0)
            if not (0.0 <= temp <= 2.0):
                errors.append(
                    ValidationError(
                        nodeId=node.id,
                        field="temperature",
                        message="Temperature must be between 0.0 and 2.0",
                    )
                )

        elif node.type == "output":
            if not getattr(node.data, "format", None):
                errors.append(
                    ValidationError(
                        nodeId=node.id,
                        field="format",
                        message="Output node must specify a format",
                    )
                )

        return errors

    @staticmethod
    def _has_cycle(nodes: List[FlowNode], edges: List[FlowEdge]) -> bool:
        graph: Dict[str, List[str]] = {node.id: [] for node in nodes}
        for edge in edges:
            graph[edge.source].append(edge.target)

        visited = set()
        rec_stack = set()

        def dfs(node_id: str) -> bool:
            visited.add(node_id)
            rec_stack.add(node_id)

            for neighbor in graph.get(node_id, []):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True

            rec_stack.remove(node_id)
            return False

        for node in nodes:
            if node.id not in visited:
                if dfs(node.id):
                    return True

        return False


@lru_cache()
def get_flow_validation_service() -> FlowValidationService:
    return FlowValidationService()
