from abc import ABC, abstractmethod
from typing import Any, Dict


class NodeExecutor(ABC):
    """Base class for all node executors"""

    @abstractmethod
    async def execute(self, node_data: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute node logic

        Args:
            node_data: Node configuration from flow_data
            inputs: Input values from connected nodes

        Returns:
            Dict with 'success', 'output', and optional 'error'
        """
        pass

    def validate_inputs(self, inputs: Dict[str, Any]) -> None:
        """Override to add custom input validation"""
        pass
