from typing import Optional, Tuple, Dict, Any
from uuid import uuid4
from functools import lru_cache

from asgiref.sync import sync_to_async
from django.contrib.auth.models import User

from ..models import Flow, FlowExecution, NodeExecutionLog


class FlowExecutionService:
    @staticmethod
    async def create_execution(
        flow: Flow,
        user: User,
        initial_input: Optional[Dict[str, Any]] = None,
        variables: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Optional[FlowExecution], Optional[str]]:
        try:
            execution = await sync_to_async(FlowExecution.objects.create)(
                flow=flow,
                user=user,
                status="pending",
                execution_data={
                    "initialInput": initial_input or {},
                    "variables": variables or {},
                    "nodeResults": [],
                },
            )

            return execution, None

        except Exception as e:
            return None, str(e)

    @staticmethod
    async def execute_flow_async(execution: FlowExecution):
        await sync_to_async(execution.mark_running)()
        # TODO: Dispatch to background task queue
        pass

    @staticmethod
    async def cancel_execution(
        execution: FlowExecution,
    ) -> Tuple[bool, Optional[str]]:
        try:
            execution.status = "cancelled"
            await sync_to_async(execution.save)(update_fields=["status"])

            return True, None

        except Exception as e:
            return False, str(e)

    @staticmethod
    async def create_node_log(
        execution: FlowExecution,
        node_id: str,
        node_type: str,
        input_data: Optional[Any] = None,
    ) -> NodeExecutionLog:
        log = await sync_to_async(NodeExecutionLog.objects.create)(
            execution=execution,
            node_id=node_id,
            node_type=node_type,
            input_data=input_data,
            status="running",
        )

        return log


@lru_cache()
def get_flow_execution_service() -> FlowExecutionService:
    return FlowExecutionService()
