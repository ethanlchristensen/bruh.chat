from typing import Optional, Tuple, List
from uuid import uuid4
from functools import lru_cache

from asgiref.sync import sync_to_async
from django.contrib.auth.models import User
from django.db.models import Count, Q

from ..models import Flow, FlowExecution
from ..schemas import (
    FlowCreate,
    FlowUpdate,
    FlowResponse,
    FlowListItem,
    FlowExecutionResponse,
    PaginatedFlowList,
    NodeExecutionResult,
)


class FlowService:
    @staticmethod
    async def list_user_flows(
        user: User,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
    ) -> PaginatedFlowList:
        queryset = Flow.objects.filter(user=user)

        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))

        total = await sync_to_async(queryset.count)()

        offset = (page - 1) * page_size
        has_next = total > (page * page_size)
        has_prev = page > 1

        queryset = queryset.annotate(execution_count=Count("executions"))

        flows = await sync_to_async(list)(queryset[offset : offset + page_size])

        items = [
            FlowListItem(
                id=str(flow.id),
                name=flow.name,
                description=flow.description,
                nodeCount=flow.get_node_count(),
                executionCount=flow.execution_count,
                createdAt=flow.created_at,
                updatedAt=flow.updated_at,
            )
            for flow in flows
        ]

        return PaginatedFlowList(
            items=items,
            total=total,
            page=page,
            pageSize=page_size,
            hasNext=has_next,
            hasPrev=has_prev,
        )

    @staticmethod
    async def create_flow(user: User, data: FlowCreate) -> Tuple[Optional[Flow], Optional[str]]:
        try:
            flow_data = {
                "nodes": [node.model_dump() for node in data.nodes],
                "edges": [edge.model_dump() for edge in data.edges],
                "variables": data.variables,
            }

            flow = await sync_to_async(Flow.objects.create)(
                user=user,
                name=data.name,
                description=data.description,
                flow_data=flow_data,
            )

            return flow, None

        except Exception as e:
            return None, str(e)

    @staticmethod
    async def update_flow(flow: Flow, data: FlowUpdate) -> Tuple[Optional[Flow], Optional[str]]:
        try:
            data_dict = data.model_dump(exclude_unset=True)

            if "name" in data_dict:
                flow.name = data_dict["name"]
            if "description" in data_dict:
                flow.description = data_dict["description"]

            flow_data = flow.flow_data.copy()

            if "nodes" in data_dict:
                flow_data["nodes"] = [node for node in data_dict["nodes"]]
            if "edges" in data_dict:
                flow_data["edges"] = [edge for edge in data_dict["edges"]]
            if "variables" in data_dict:
                flow_data["variables"] = data_dict["variables"]

            flow.flow_data = flow_data
            flow.version += 1

            await sync_to_async(flow.save)()

            return flow, None

        except Exception as e:
            return None, str(e)

    @staticmethod
    async def duplicate_flow(source_flow: Flow, user: User) -> Flow:
        duplicate = await sync_to_async(Flow.objects.create)(
            user=user,
            name=f"{source_flow.name} (Copy)",
            description=source_flow.description,
            flow_data=source_flow.flow_data.copy(),
        )

        return duplicate

    @staticmethod
    async def flow_to_response(flow: Flow) -> FlowResponse:
        flow_data = flow.flow_data

        return FlowResponse(
            id=str(flow.id),
            name=flow.name,
            description=flow.description,
            nodes=flow_data.get("nodes", []),
            edges=flow_data.get("edges", []),
            variables=flow_data.get("variables", {}),
            createdAt=flow.created_at,
            updatedAt=flow.updated_at,
            version=flow.version,
        )

    @staticmethod
    async def get_flow_executions(
        flow: Flow,
        limit: int = 10,
        status: Optional[str] = None,
    ) -> List[FlowExecutionResponse]:
        queryset = flow.executions.all()

        if status:
            queryset = queryset.filter(status=status)

        executions = await sync_to_async(list)(queryset[:limit])

        return [await FlowService.execution_to_response(execution) for execution in executions]

    @staticmethod
    async def execution_to_response(execution: FlowExecution) -> FlowExecutionResponse:
        execution_data = execution.execution_data
        node_results = execution_data.get("nodeResults", [])

        return FlowExecutionResponse(
            flowId=str(execution.flow.id),
            executionId=str(execution.id),
            status=execution.status,
            startTime=execution.start_time,
            endTime=execution.end_time,
            totalExecutionTime=execution.total_execution_time,
            nodeResults=[NodeExecutionResult(**result) for result in node_results],
            finalOutput=execution_data.get("finalOutput"),
            error=execution_data.get("error"),
        )


@lru_cache()
def get_flow_service() -> FlowService:
    return FlowService()
