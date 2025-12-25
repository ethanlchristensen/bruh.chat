from typing import Optional, Tuple, Dict, Any, List, Set
from uuid import uuid4
from functools import lru_cache
from datetime import datetime
import logging
import asyncio

from asgiref.sync import sync_to_async
from django.contrib.auth.models import User
from celery.result import AsyncResult

from ..models import Flow, FlowExecution, NodeExecutionLog, FlowGeneratedImage
from ..executors.registry import NodeExecutorRegistry

logger = logging.getLogger(__name__)


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
        """Execute the flow with proper node orchestration"""
        await sync_to_async(execution.mark_running)()

        try:
            flow_data = execution.flow.flow_data
            nodes = flow_data.get("nodes", [])
            edges = flow_data.get("edges", [])
            initial_input = execution.execution_data.get("initialInput", {})
            variables = execution.execution_data.get("variables", {})

            result = await FlowExecutionService.execute_flow(
                execution=execution,
                nodes=nodes,
                edges=edges,
                initial_input=initial_input,
                variables=variables,
            )

            if result.get("cancelled"):
                execution.status = "cancelled"
                execution.execution_data["error"] = {
                    "message": "Execution cancelled by user",
                    "cancelledAt": datetime.utcnow().isoformat(),
                }
                await sync_to_async(execution.save)()
                return

            execution.execution_data["finalOutput"] = result.get("output")
            if result.get("success"):
                execution.status = "completed"
            else:
                execution.status = "failed"
                error_msg = result.get("error", "Unknown error")
                execution.execution_data["error"] = {
                    "message": error_msg,
                    "failedNodeId": result.get("failedNodeId"),
                }

            await sync_to_async(execution.mark_completed)(execution.execution_data)

        except Exception as e:
            logger.exception(f"Flow execution failed: {e}")
            execution.status = "failed"
            execution.execution_data["error"] = {
                "message": str(e),
                "type": type(e).__name__,
            }
            await sync_to_async(execution.save)()

    @staticmethod
    async def execute_flow(
        execution: FlowExecution,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        initial_input: Dict[str, Any],
        variables: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute flow nodes in parallel by depth level"""

        # Group nodes by depth level
        execution_levels = FlowExecutionService._group_nodes_by_depth(nodes, edges)

        if not execution_levels:
            return {
                "success": False,
                "error": "Could not determine execution order (cycle detected?)",
            }

        node_outputs: Dict[str, Any] = {}
        nodes_dict = {node["id"]: node for node in nodes}
        executed_nodes: Set[str] = set()
        skipped_nodes: Set[str] = set()

        flow_variables = variables.copy()

        for node in nodes:
            if node["type"] == "input":
                node_id = node["id"]
                node_data = node.get("data", {})

                variable_name = node_data.get("variableName")
                if variable_name and variable_name in initial_input:
                    node_outputs[node_id] = initial_input[variable_name]
                elif variable_name and variable_name in flow_variables:
                    node_outputs[node_id] = flow_variables[variable_name]
                elif "value" in node_data:
                    node_outputs[node_id] = node_data["value"]
                elif node_id in initial_input:
                    node_outputs[node_id] = initial_input[node_id]
                else:
                    node_outputs[node_id] = ""

                executed_nodes.add(node_id)

                execution.execution_data.setdefault("nodeResults", []).append(
                    {
                        "nodeId": node_id,
                        "nodeType": "input",
                        "status": "success",
                        "startTime": datetime.utcnow().isoformat(),
                        "endTime": datetime.utcnow().isoformat(),
                        "input": None,
                        "output": node_outputs[node_id],
                    }
                )

        await sync_to_async(execution.save)(update_fields=["execution_data"])

        for level_idx, level_nodes in enumerate(execution_levels):
            await sync_to_async(execution.refresh_from_db)(fields=["status"])
            if execution.status == "cancelled":
                logger.info(f"Execution {execution.id} was cancelled, stopping execution")

                all_nodes = {n["id"] for n in nodes}
                remaining_nodes = all_nodes - executed_nodes - skipped_nodes
                for node_id in remaining_nodes:
                    await FlowExecutionService._mark_node_skipped(
                        execution, nodes_dict[node_id], "Execution cancelled"
                    )

                return {
                    "success": False,
                    "error": "Execution cancelled by user",
                    "cancelled": True,
                }

            logger.info(f"Executing level {level_idx} with {len(level_nodes)} nodes: {level_nodes}")

            tasks = []
            nodes_to_skip = []

            for node_id in level_nodes:
                node = nodes_dict.get(node_id)
                if not node:
                    continue

                if node["type"] == "input":
                    continue

                inputs = FlowExecutionService._get_node_inputs(node_id, edges, node_outputs)

                inputs["__variables__"] = flow_variables

                if not inputs and node["type"] not in ["output", "image_output"]:
                    logger.info(f"Skipping node {node_id} - no inputs (conditional path not taken)")
                    nodes_to_skip.append((node_id, "No input data - conditional branch not taken"))
                    skipped_nodes.add(node_id)
                    continue

                task = FlowExecutionService._execute_single_node(
                    execution=execution,
                    node=node,
                    inputs=inputs,
                    edges=edges,
                    node_outputs=node_outputs,
                    flow_variables=flow_variables,
                )
                tasks.append((node_id, task))

            for node_id, reason in nodes_to_skip:
                await FlowExecutionService._mark_node_skipped(
                    execution, nodes_dict[node_id], reason
                )

            if tasks:
                results = await asyncio.gather(*[task for _, task in tasks], return_exceptions=True)

                for (node_id, _), result in zip(tasks, results):
                    if isinstance(result, Exception):
                        logger.exception(f"Node {node_id} failed with exception: {result}")

                        downstream = FlowExecutionService._get_downstream_nodes(
                            node_id, edges, nodes_dict, executed_nodes | skipped_nodes
                        )
                        for downstream_id in downstream:
                            await FlowExecutionService._mark_node_skipped(
                                execution,
                                nodes_dict[downstream_id],
                                f"Upstream node {node_id} failed",
                            )
                            skipped_nodes.add(downstream_id)

                        return {
                            "success": False,
                            "error": f"Node {node_id} crashed: {str(result)}",
                            "failedNodeId": node_id,
                        }

                    if not result.get("success"):
                        downstream = FlowExecutionService._get_downstream_nodes(
                            node_id, edges, nodes_dict, executed_nodes | skipped_nodes
                        )
                        for downstream_id in downstream:
                            await FlowExecutionService._mark_node_skipped(
                                execution,
                                nodes_dict[downstream_id],
                                f"Upstream node {node_id} failed",
                            )
                            skipped_nodes.add(downstream_id)

                        return {
                            "success": False,
                            "error": f"Node {node_id} failed: {result.get('error')}",
                            "failedNodeId": node_id,
                        }

                    node = nodes_dict[node_id]
                    executed_nodes.add(node_id)

                    if "setVariable" in result:
                        var_info = result["setVariable"]
                        flow_variables[var_info["name"]] = var_info["value"]
                        logger.info(f"Updated variable '{var_info['name']}' = {var_info['value']}")

                    if "setVariables" in result:
                        variables_dict = result["setVariables"]
                        for var_name, var_value in variables_dict.items():
                            flow_variables[var_name] = var_value
                            logger.info(f"Updated variable '{var_name}' = {var_value}")

                    if node["type"] == "conditional":
                        node_outputs[node_id] = result
                    else:
                        node_outputs[node_id] = result.get("output")

        execution.execution_data["variables"] = flow_variables
        await sync_to_async(execution.save)(update_fields=["execution_data"])

        output_nodes = [n for n in nodes if n["type"] in ["output", "image_output"]]
        final_output = {}

        for output_node in output_nodes:
            output_id = output_node["id"]

            if output_id in skipped_nodes:
                continue

            inputs = FlowExecutionService._get_node_inputs(output_id, edges, node_outputs)

            if inputs:
                final_output[output_id] = inputs.get("input", inputs)

        if len(final_output) == 1:
            final_output = list(final_output.values())[0]

        return {
            "success": True,
            "output": final_output,
            "nodeOutputs": node_outputs,
        }

    @staticmethod
    async def _mark_node_skipped(
        execution: FlowExecution,
        node: Dict[str, Any],
        reason: str,
    ):
        """Mark a node as skipped in the execution results"""
        node_id = node["id"]
        node_type = node["type"]

        skip_result = {
            "nodeId": node_id,
            "nodeType": node_type,
            "status": "skipped",
            "skipReason": reason,
            "startTime": None,
            "endTime": None,
            "input": None,
            "output": None,
        }

        execution.execution_data.setdefault("nodeResults", []).append(skip_result)
        await sync_to_async(execution.save)(update_fields=["execution_data"])

    @staticmethod
    def _get_downstream_nodes(
        node_id: str,
        edges: List[Dict[str, Any]],
        nodes_dict: Dict[str, Dict[str, Any]],
        exclude_nodes: Set[str],
    ) -> Set[str]:
        """Get all downstream nodes from a given node"""
        downstream = set()
        to_visit = [node_id]
        visited = set()

        while to_visit:
            current = to_visit.pop(0)
            if current in visited:
                continue
            visited.add(current)

            for edge in edges:
                if edge["source"] == current:
                    target = edge["target"]
                    if target not in exclude_nodes:
                        downstream.add(target)
                        to_visit.append(target)

        return downstream

    @staticmethod
    async def _execute_single_node(
        execution: FlowExecution,
        node: Dict[str, Any],
        inputs: Dict[str, Any],
        edges: List[Dict[str, Any]],
        node_outputs: Dict[str, Any],
        flow_variables: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute a single node and update execution data"""
        node_id = node["id"]
        node_type = node["type"]
        start_time = datetime.utcnow()

        if node_type in ["output", "image_output"]:
            end_time = datetime.utcnow()

            execution.execution_data.setdefault("nodeResults", []).append(
                {
                    "nodeId": node_id,
                    "nodeType": node_type,
                    "status": "success",
                    "startTime": start_time.isoformat(),
                    "endTime": end_time.isoformat(),
                    "input": inputs,
                    "output": inputs.get("input", inputs),
                }
            )
            await sync_to_async(execution.save)(update_fields=["execution_data"])
            return {"success": True, "output": inputs.get("input", inputs)}

        log = await FlowExecutionService.create_node_log(
            execution=execution,
            node_id=node_id,
            node_type=node_type,
            input_data=inputs,
        )

        initial_result = {
            "nodeId": node_id,
            "nodeType": node_type,
            "status": "running",
            "startTime": start_time.isoformat(),
            "endTime": None,
            "input": inputs,
            "output": None,
        }
        execution.execution_data.setdefault("nodeResults", []).append(initial_result)
        await sync_to_async(execution.save)(update_fields=["execution_data"])

        try:
            result = await FlowExecutionService.execute_node(
                node_type=node_type,
                node_data=node.get("data", {}),
                inputs=inputs,
            )

            end_time = datetime.utcnow()

            log.output_data = result.get("output")
            log.status = "completed" if result.get("success") else "failed"
            if not result.get("success"):
                log.error_message = result.get("error")
            await sync_to_async(log.save)()

            node_result = {
                "nodeId": node_id,
                "nodeType": node_type,
                "status": "success" if result.get("success") else "error",
                "startTime": start_time.isoformat(),
                "endTime": end_time.isoformat(),
                "input": inputs,
                "output": result.get("output"),
            }

            if node_type == "conditional":
                node_result["matchedCondition"] = result.get("matchedCondition")
                node_result["outputHandle"] = result.get("outputHandle")

            if not result.get("success"):
                error = result.get("error")
                if isinstance(error, str):
                    node_result["error"] = {"message": error}
                else:
                    node_result["error"] = error

            node_results = execution.execution_data.get("nodeResults", [])
            for i, nr in enumerate(node_results):
                if nr["nodeId"] == node_id:
                    node_results[i] = node_result
                    break

            execution.execution_data["nodeResults"] = node_results
            await sync_to_async(execution.save)(update_fields=["execution_data"])

            if result.get("success"):
                output = result.get("output")

                if node_type == "image_gen" and isinstance(output, dict) and "imageData" in output:
                    image_data = output["imageData"]

                    saved_image = await sync_to_async(FlowGeneratedImage.save_from_base64)(
                        execution=execution,
                        node_id=node_id,
                        base64_data=image_data,
                        prompt=output.get("prompt", ""),
                        model_used=output.get("model", ""),
                        aspect_ratio=output.get("aspectRatio"),
                    )

                    output["imageUrl"] = saved_image.image.url
                    del output["imageData"]
                    result["output"] = output

            return result

        except Exception as e:
            logger.exception(f"Node {node_id} execution error: {e}")
            end_time = datetime.utcnow()

            log.status = "failed"
            log.error_message = str(e)
            await sync_to_async(log.save)()

            node_results = execution.execution_data.get("nodeResults", [])
            for i, nr in enumerate(node_results):
                if nr["nodeId"] == node_id:
                    node_results[i] = {
                        "nodeId": node_id,
                        "nodeType": node_type,
                        "status": "error",
                        "startTime": start_time.isoformat(),
                        "endTime": end_time.isoformat(),
                        "input": inputs,
                        "error": {"message": str(e), "type": type(e).__name__},
                    }
                    break

            execution.execution_data["nodeResults"] = node_results
            await sync_to_async(execution.save)(update_fields=["execution_data"])

            return {
                "success": False,
                "error": str(e),
            }

    @staticmethod
    async def execute_node(
        node_type: str, node_data: Dict[str, Any], inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a single node using registered executor"""
        try:
            if not NodeExecutorRegistry.is_registered(node_type):
                return {
                    "success": False,
                    "error": f"No executor registered for node type: {node_type}",
                }

            executor = NodeExecutorRegistry.get_executor(node_type)
            result = await executor.execute(node_data, inputs)
            return result

        except Exception as e:
            logger.exception(f"Node execution error: {e}")
            return {"success": False, "error": f"Execution failed: {str(e)}"}

    @staticmethod
    def _group_nodes_by_depth(
        nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]
    ) -> Optional[List[List[str]]]:
        """Group nodes by depth level for parallel execution"""

        graph: Dict[str, List[str]] = {node["id"]: [] for node in nodes}
        in_degree: Dict[str, int] = {node["id"]: 0 for node in nodes}

        for edge in edges:
            source = edge["source"]
            target = edge["target"]
            graph[source].append(target)
            in_degree[target] += 1

        levels: List[List[str]] = []
        current_level = [node_id for node_id, degree in in_degree.items() if degree == 0]
        processed = set()

        while current_level:
            levels.append(current_level)
            processed.update(current_level)

            next_level = []
            for node_id in current_level:
                for neighbor in graph[node_id]:
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        next_level.append(neighbor)

            current_level = list(dict.fromkeys(next_level))

        if len(processed) != len(nodes):
            return None

        return levels

    @staticmethod
    def _topological_sort(
        nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]
    ) -> Optional[List[str]]:
        """Sort nodes in execution order using topological sort (legacy method)"""

        graph: Dict[str, List[str]] = {node["id"]: [] for node in nodes}
        in_degree: Dict[str, int] = {node["id"]: 0 for node in nodes}

        for edge in edges:
            source = edge["source"]
            target = edge["target"]
            graph[source].append(target)
            in_degree[target] += 1

        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        result = []

        while queue:
            node_id = queue.pop(0)
            result.append(node_id)

            for neighbor in graph[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(result) == len(nodes):
            return result

        return None

    @staticmethod
    def _get_node_inputs(
        node_id: str, edges: List[Dict[str, Any]], node_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get input values for a node from connected upstream nodes"""
        inputs = {}

        incoming_edges = [e for e in edges if e["target"] == node_id]

        for edge in incoming_edges:
            source_id = edge["source"]
            source_handle = edge.get("sourceHandle", "output")
            target_handle = edge.get("targetHandle", "input")

            if source_id in node_outputs:
                output_data = node_outputs[source_id]

                if isinstance(output_data, dict) and "outputHandle" in output_data:
                    if source_handle == output_data["outputHandle"]:
                        inputs[target_handle] = output_data["output"]
                else:
                    inputs[target_handle] = output_data

        if len(inputs) == 1 and "input" not in inputs:
            inputs["input"] = list(inputs.values())[0]

        return inputs

    @staticmethod
    async def cancel_execution(
        execution: FlowExecution,
    ) -> Tuple[bool, Optional[str]]:
        try:
            await sync_to_async(execution.refresh_from_db)(fields=["execution_data", "status"])

            flow_data = await sync_to_async(lambda: execution.flow.flow_data)()
            nodes = flow_data.get("nodes", [])

            node_results = execution.execution_data.get("nodeResults", [])
            executed_node_ids = {result["nodeId"] for result in node_results}

            nodes_dict = {node["id"]: node for node in nodes}
            remaining_nodes = set(nodes_dict.keys()) - executed_node_ids

            for node_id in remaining_nodes:
                await FlowExecutionService._mark_node_skipped(
                    execution,
                    nodes_dict[node_id],
                    "Execution cancelled by user",
                )

            for result in node_results:
                if result.get("status") == "running":
                    result["status"] = "cancelled"
                    result["endTime"] = datetime.utcnow().isoformat()
                    result["error"] = {"message": "Execution cancelled by user"}

            execution.status = "cancelled"
            execution.execution_data["error"] = {
                "message": "Execution cancelled by user",
                "cancelledAt": datetime.utcnow().isoformat(),
            }
            execution.execution_data["nodeResults"] = node_results
            await sync_to_async(execution.save)(update_fields=["status", "execution_data"])

            if execution.celery_task_id:
                AsyncResult(execution.celery_task_id).revoke(terminate=True)
                logger.info(
                    f"Revoked Celery task {execution.celery_task_id} for execution {execution.id}"
                )

            return True, None

        except Exception as e:
            logger.exception(f"Failed to cancel execution {execution.id}: {e}")
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
