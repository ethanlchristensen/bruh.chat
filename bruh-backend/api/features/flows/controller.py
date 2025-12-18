from typing import List, Optional
from uuid import UUID

from asgiref.sync import sync_to_async
from django.shortcuts import get_object_or_404
from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth

from .models import Flow, FlowExecution, FlowTemplate, NodeTemplate
from .schemas import (
    FlowCreate,
    FlowUpdate,
    FlowResponse,
    FlowListItem,
    FlowValidationResult,
    FlowExecutionRequest,
    FlowExecutionResponse,
    PaginatedFlowList,
    NodeTemplateResponse,
)
from .services.flow_service import FlowService
from .services.flow_validation_service import FlowValidationService
from .services.flow_execution_service import FlowExecutionService
from .tasks import execute_flow_task  # Import the task


@api_controller("/flows", auth=JWTAuth(), tags=["Flows"])
class FlowController:
    @route.get("/", response=PaginatedFlowList)
    async def list_flows(
        self,
        request,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
    ):
        return await FlowService.list_user_flows(
            user=request.user,
            page=page,
            page_size=page_size,
            search=search,
        )

    @route.get("/{flow_id}", response={200: FlowResponse, 404: dict})
    async def get_flow(self, request, flow_id: UUID):
        flow = await sync_to_async(lambda: get_object_or_404(Flow, id=flow_id, user=request.user))()
        return 200, await FlowService.flow_to_response(flow)

    @route.post("/", response={201: FlowResponse, 400: dict})
    async def create_flow(self, request, data: FlowCreate):
        validation = await FlowValidationService.validate_flow(nodes=data.nodes, edges=data.edges)

        if not validation.valid:
            return 400, {
                "detail": "Flow validation failed",
                "errors": [error.model_dump() for error in validation.errors],
            }

        flow, error = await FlowService.create_flow(user=request.user, data=data)

        if error:
            return 400, {"detail": error}

        return 201, await FlowService.flow_to_response(flow)

    @route.patch("/{flow_id}", response={200: FlowResponse, 400: dict, 404: dict})
    async def update_flow(self, request, flow_id: UUID, data: FlowUpdate):
        flow = await sync_to_async(lambda: get_object_or_404(Flow, id=flow_id, user=request.user))()

        if data.nodes is not None or data.edges is not None:
            validation = await FlowValidationService.validate_flow(
                nodes=data.nodes or flow.flow_data.get("nodes", []),
                edges=data.edges or flow.flow_data.get("edges", []),
            )

            if not validation.valid:
                return 400, {
                    "detail": "Flow validation failed",
                    "errors": [error.model_dump() for error in validation.errors],
                }

        updated_flow, error = await FlowService.update_flow(flow=flow, data=data)

        if error:
            return 400, {"detail": error}

        return 200, await FlowService.flow_to_response(updated_flow)

    @route.delete("/{flow_id}", response={200: dict, 404: dict})
    async def delete_flow(self, request, flow_id: UUID):
        flow = await sync_to_async(lambda: get_object_or_404(Flow, id=flow_id, user=request.user))()
        await sync_to_async(flow.delete)()
        return 200, {"message": "Flow deleted successfully"}

    @route.post("/{flow_id}/duplicate", response={201: FlowResponse, 404: dict})
    async def duplicate_flow(self, request, flow_id: UUID):
        source_flow = await sync_to_async(
            lambda: get_object_or_404(Flow, id=flow_id, user=request.user)
        )()

        duplicated_flow = await FlowService.duplicate_flow(
            source_flow=source_flow, user=request.user
        )

        return 201, await FlowService.flow_to_response(duplicated_flow)

    @route.post("/{flow_id}/validate", response=FlowValidationResult)
    async def validate_flow(self, request, flow_id: UUID):
        """Validate a flow's structure and configuration"""
        flow = await sync_to_async(lambda: get_object_or_404(Flow, id=flow_id, user=request.user))()

        return await FlowValidationService.validate_flow(
            nodes=flow.flow_data.get("nodes", []),
            edges=flow.flow_data.get("edges", []),
        )

    @route.get("/{flow_id}/executions", response=List[FlowExecutionResponse])
    async def list_flow_executions(
        self,
        request,
        flow_id: UUID,
        limit: int = 10,
        status: Optional[str] = None,
    ):
        flow = await sync_to_async(lambda: get_object_or_404(Flow, id=flow_id, user=request.user))()
        return await FlowService.get_flow_executions(flow=flow, limit=limit, status=status)

    @route.post(
        "/{flow_id}/execute",
        response={202: FlowExecutionResponse, 400: dict, 404: dict},
    )
    async def execute_flow(self, request, flow_id: UUID, data: FlowExecutionRequest):
        """Execute a flow in the background"""
        flow = await sync_to_async(lambda: get_object_or_404(Flow, id=flow_id, user=request.user))()

        validation = await FlowValidationService.validate_flow(
            nodes=flow.flow_data.get("nodes", []),
            edges=flow.flow_data.get("edges", []),
        )

        if not validation.valid:
            return 400, {
                "detail": "Cannot execute invalid flow",
                "errors": [error.model_dump() for error in validation.errors],
            }

        execution, error = await FlowExecutionService.create_execution(
            flow=flow,
            user=request.user,
            initial_input=data.initialInput,
            variables=data.variables,
        )

        if error:
            return 400, {"detail": error}

        # Dispatch to Celery worker and store task ID
        task = execute_flow_task.delay(str(execution.id))
        execution.celery_task_id = task.id
        await sync_to_async(execution.save)(update_fields=["celery_task_id"])

        return 202, await FlowService.execution_to_response(execution)


@api_controller("/flow-templates", auth=JWTAuth(), tags=["Flow Templates"])
class FlowTemplateController:
    @route.get("/", response=List[FlowResponse])
    async def list_templates(
        self,
        request,
        category: Optional[str] = None,
        public_only: bool = True,
    ):
        queryset = FlowTemplate.objects.all()

        if public_only:
            queryset = queryset.filter(is_public=True)

        if category:
            queryset = queryset.filter(category=category)

        templates = await sync_to_async(list)(queryset)

        return [
            FlowResponse(
                id=str(template.id),
                name=template.name,
                description=template.description,
                nodes=template.template_data.get("nodes", []),
                edges=template.template_data.get("edges", []),
                variables=template.template_data.get("variables", {}),
                createdAt=template.created_at,
                updatedAt=template.updated_at,
                version=1,
            )
            for template in templates
        ]

    @route.post("/{template_id}/clone", response={201: FlowResponse, 404: dict})
    async def clone_template(self, request, template_id: UUID, name: Optional[str] = None):
        template = await sync_to_async(lambda: get_object_or_404(FlowTemplate, id=template_id))()

        if not template.is_public and template.created_by != request.user:
            return 404, {"detail": "Template not found"}

        flow = await sync_to_async(template.clone_to_flow)(request.user, name)

        return 201, await FlowService.flow_to_response(flow)


@api_controller("/flow-executions", auth=JWTAuth(), tags=["Flow Executions"])
class FlowExecutionController:
    @route.get("/{execution_id}", response={200: FlowExecutionResponse, 404: dict})
    async def get_execution(self, request, execution_id: UUID):
        execution = await sync_to_async(
            lambda: get_object_or_404(
                FlowExecution.objects.select_related("flow"), id=execution_id, user=request.user
            )
        )()

        return 200, await FlowService.execution_to_response(execution)

    @route.post("/{execution_id}/cancel", response={200: dict, 400: dict, 404: dict})
    async def cancel_execution(self, request, execution_id: UUID):
        execution = await sync_to_async(
            lambda: get_object_or_404(
                FlowExecution.objects.select_related("flow"), id=execution_id, user=request.user
            )
        )()

        if execution.status not in ["pending", "running"]:
            return 400, {"detail": f"Cannot cancel execution with status: {execution.status}"}

        success, error = await FlowExecutionService.cancel_execution(execution)

        if not success:
            return 400, {"detail": error}

        return 200, {"message": "Execution cancelled successfully"}

    @route.get("/{execution_id}/logs", response=List[dict])
    async def get_execution_logs(self, request, execution_id: UUID):
        execution = await sync_to_async(
            lambda: get_object_or_404(FlowExecution, id=execution_id, user=request.user)
        )()

        logs = await sync_to_async(list)(execution.node_logs.all())

        return [
            {
                "nodeId": log.node_id,
                "nodeType": log.node_type,
                "status": log.status,
                "input": log.input_data,
                "output": log.output_data,
                "error": (
                    {
                        "message": log.error_message,
                        "code": log.error_code,
                        "details": log.error_details,
                    }
                    if log.error_message
                    else None
                ),
                "startTime": log.start_time.isoformat(),
                "endTime": log.end_time.isoformat() if log.end_time else None,
                "executionTime": log.execution_time,
                "modelUsed": log.model_used,
                "tokensUsed": log.tokens_used,
            }
            for log in logs
        ]


@api_controller("/node-templates", auth=JWTAuth(), tags=["Node Templates"])
class NodeTemplateController:
    @route.get("/", response=List[NodeTemplateResponse])
    async def list_templates(
        self,
        request,
        category: Optional[str] = None,
        type: Optional[str] = None,
    ):
        """Get all available node templates"""
        queryset = NodeTemplate.objects.filter(is_active=True)

        if category:
            queryset = queryset.filter(category=category)

        if type:
            queryset = queryset.filter(type=type)

        templates = await sync_to_async(list)(queryset)

        return [
            NodeTemplateResponse(
                id=str(template.id),
                name=template.name,
                description=template.description,
                type=template.type,
                icon=template.icon,
                color=template.color,
                defaultConfig=template.default_config,
                category=template.category,
                isPremium=template.is_premium,
            )
            for template in templates
        ]
