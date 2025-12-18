from typing import Dict, Type
from .base_executor import NodeExecutor
from .json_extractor_executor import JsonExtractorExecutor
from .llm_executor import LLMExecutor


class NodeExecutorRegistry:
    _executors: Dict[str, Type[NodeExecutor]] = {}

    @classmethod
    def register(cls, node_type: str, executor: Type[NodeExecutor]):
        """Register an executor for a node type"""
        cls._executors[node_type] = executor

    @classmethod
    def get_executor(cls, node_type: str) -> NodeExecutor:
        """Get executor instance for node type"""
        executor_class = cls._executors.get(node_type)
        if not executor_class:
            raise ValueError(f"No executor registered for node type: {node_type}")
        return executor_class()

    @classmethod
    def is_registered(cls, node_type: str) -> bool:
        """Check if node type has an executor"""
        return node_type in cls._executors


NodeExecutorRegistry.register("json_extractor", JsonExtractorExecutor)
NodeExecutorRegistry.register("llm", LLMExecutor)
