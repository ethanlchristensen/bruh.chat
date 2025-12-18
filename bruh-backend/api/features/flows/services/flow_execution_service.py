from typing import Optional, Tuple, Dict, Any, List, Set
from uuid import uuid4
from functools import lru_cache
from datetime import datetime
import logging

from asgiref.sync import sync_to_async
from django.contrib.auth.models import User

from ..models import Flow, FlowExecution, NodeExecutionLog
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
            
            # Execute flow
            result = await FlowExecutionService.execute_flow(
                execution=execution,
                nodes=nodes,
                edges=edges,
                initial_input=initial_input,
                variables=variables,
            )
            
            # Update execution with final result
            execution.execution_data["finalOutput"] = result.get("output")
            if result.get("success"):
                execution.status = "completed"
            else:
                execution.status = "failed"
                # Wrap error in dictionary format
                error_msg = result.get("error", "Unknown error")
                execution.execution_data["error"] = {
                    "message": error_msg,
                    "failedNodeId": result.get("failedNodeId"),
                }
            
            await sync_to_async(execution.mark_completed)(execution.execution_data)
            
        except Exception as e:
            logger.exception(f"Flow execution failed: {e}")
            execution.status = "failed"
            # Wrap exception in dictionary format
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
        """Execute flow nodes in topological order"""
        
        # Build execution order
        execution_order = FlowExecutionService._topological_sort(nodes, edges)
        
        if not execution_order:
            return {"success": False, "error": "Could not determine execution order (cycle detected?)"}
        
        # Store outputs from each node
        node_outputs: Dict[str, Any] = {}
        
        # Store input node values
        for node in nodes:
            if node["type"] == "input":
                node_id = node["id"]
                node_data = node.get("data", {})
                
                # Priority 1: Check if variableName matches initialInput key
                variable_name = node_data.get("variableName")
                if variable_name and variable_name in initial_input:
                    node_outputs[node_id] = initial_input[variable_name]
                # Priority 2: Check if variableName matches variables
                elif variable_name and variable_name in variables:
                    node_outputs[node_id] = variables[variable_name]
                # Priority 3: Use node's configured value
                elif "value" in node_data:
                    node_outputs[node_id] = node_data["value"]
                # Priority 4: Check if node ID is in initial_input (backward compatibility)
                elif node_id in initial_input:
                    node_outputs[node_id] = initial_input[node_id]
                # Priority 5: Default to empty
                else:
                    node_outputs[node_id] = ""
        
        # Execute nodes in order
        for node_id in execution_order:
            node = next((n for n in nodes if n["id"] == node_id), None)
            if not node:
                continue
            
            node_type = node["type"]

            # Track start time
            start_time = datetime.utcnow()
            
            # Skip input and output nodes
            if node_type == "input":
                # Input nodes just pass their value through
                output_value = node_outputs.get(node_id, "")
                end_time = datetime.utcnow()
                
                execution.execution_data.setdefault("nodeResults", []).append({
                    "nodeId": node_id,
                    "nodeType": node_type,
                    "status": "success",
                    "startTime": start_time.isoformat(),
                    "endTime": end_time.isoformat(),
                    "input": {},
                    "output": output_value,
                })
                await sync_to_async(execution.save)(update_fields=["execution_data"])
                continue
            
            # Handle OUTPUT nodes
            if node_type == "output":
                inputs = FlowExecutionService._get_node_inputs(node_id, edges, node_outputs)
                end_time = datetime.utcnow()
                
                execution.execution_data.setdefault("nodeResults", []).append({
                    "nodeId": node_id,
                    "nodeType": node_type,
                    "status": "success",
                    "startTime": start_time.isoformat(),
                    "endTime": end_time.isoformat(),
                    "input": inputs,
                    "output": inputs.get("input", inputs),  # Output = Input for display nodes
                })
                await sync_to_async(execution.save)(update_fields=["execution_data"])
                continue
            
            # Get inputs from connected nodes
            inputs = FlowExecutionService._get_node_inputs(node_id, edges, node_outputs)
            
            # Create execution log
            log = await FlowExecutionService.create_node_log(
                execution=execution,
                node_id=node_id,
                node_type=node_type,
                input_data=inputs,
            )
            
            try:
                # Execute node
                result = await FlowExecutionService.execute_node(
                    node_type=node_type,
                    node_data=node.get("data", {}),
                    inputs=inputs,
                )
                
                # Track end time
                end_time = datetime.utcnow()
                
                # Update log with result
                log.output_data = result.get("output")
                log.status = "completed" if result.get("success") else "failed"
                if not result.get("success"):
                    log.error_message = result.get("error")
                await sync_to_async(log.save)()
                
                # Add to nodeResults array matching NodeExecutionResult schema
                node_result = {
                    "nodeId": node_id,
                    "nodeType": node_type,
                    "status": "success" if result.get("success") else "error",
                    "startTime": start_time.isoformat(),
                    "endTime": end_time.isoformat(),
                    "input": inputs,
                    "output": result.get("output"),
                }
                
                if not result.get("success"):
                    # Ensure error is always a dictionary
                    error = result.get("error")
                    if isinstance(error, str):
                        node_result["error"] = {"message": error}
                    else:
                        node_result["error"] = error
                
                execution.execution_data.setdefault("nodeResults", []).append(node_result)
                await sync_to_async(execution.save)(update_fields=["execution_data"])
                
                # Store output for downstream nodes
                if result.get("success"):
                    node_outputs[node_id] = result.get("output")
                else:
                    # Fail fast on error
                    return {
                        "success": False,
                        "error": f"Node {node_id} failed: {result.get('error')}",
                        "failedNodeId": node_id,
                    }
                    
            except Exception as e:
                logger.exception(f"Node {node_id} execution error: {e}")
                end_time = datetime.utcnow()
                
                log.status = "failed"
                log.error_message = str(e)
                await sync_to_async(log.save)()
                
                # Add failed node to results
                execution.execution_data.setdefault("nodeResults", []).append({
                    "nodeId": node_id,
                    "nodeType": node_type,
                    "status": "error",
                    "startTime": start_time.isoformat(),
                    "endTime": end_time.isoformat(),
                    "input": inputs,
                     "error": {"message": str(e), "type": type(e).__name__},
                })
                await sync_to_async(execution.save)(update_fields=["execution_data"])
                
                return {
                    "success": False,
                    "error": f"Node {node_id} crashed: {str(e)}",
                    "failedNodeId": node_id,
                }
        # Get output from output nodes
        output_nodes = [n for n in nodes if n["type"] == "output"]
        final_output = {}

        for output_node in output_nodes:
            output_id = output_node["id"]
            # Get the value from connected input nodes
            inputs = FlowExecutionService._get_node_inputs(output_id, edges, node_outputs)
            
            if inputs:
                # Use the input value as the output
                final_output[output_id] = inputs.get("input", inputs)
            else:
                # No connected input
                final_output[output_id] = None

        # Return single output if only one output node
        if len(final_output) == 1:
            final_output = list(final_output.values())[0]

        return {
            "success": True,
            "output": final_output,
            "nodeOutputs": node_outputs,
        }

    @staticmethod
    async def execute_node(
        node_type: str,
        node_data: Dict[str, Any],
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a single node using registered executor"""
        try:
            if not NodeExecutorRegistry.is_registered(node_type):
                return {
                    "success": False,
                    "error": f"No executor registered for node type: {node_type}"
                }
            
            executor = NodeExecutorRegistry.get_executor(node_type)
            result = await executor.execute(node_data, inputs)
            return result
            
        except Exception as e:
            logger.exception(f"Node execution error: {e}")
            return {
                "success": False,
                "error": f"Execution failed: {str(e)}"
            }

    @staticmethod
    def _topological_sort(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Optional[List[str]]:
        """Sort nodes in execution order using topological sort"""
        
        # Build adjacency list and in-degree count
        graph: Dict[str, List[str]] = {node["id"]: [] for node in nodes}
        in_degree: Dict[str, int] = {node["id"]: 0 for node in nodes}
        
        for edge in edges:
            source = edge["source"]
            target = edge["target"]
            graph[source].append(target)
            in_degree[target] += 1
        
        # Find all nodes with no incoming edges (start nodes)
        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        result = []
        
        while queue:
            # Process node with no dependencies
            node_id = queue.pop(0)
            result.append(node_id)
            
            # Reduce in-degree for neighbors
            for neighbor in graph[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # If we processed all nodes, we have a valid order
        if len(result) == len(nodes):
            return result
        
        # Otherwise there's a cycle
        return None

    @staticmethod
    def _get_node_inputs(
        node_id: str,
        edges: List[Dict[str, Any]],
        node_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get input values for a node from connected upstream nodes"""
        inputs = {}
        
        # Find all edges targeting this node
        incoming_edges = [e for e in edges if e["target"] == node_id]
        
        for edge in incoming_edges:
            source_id = edge["source"]
            target_handle = edge.get("targetHandle", "input")
            
            # Get output from source node
            if source_id in node_outputs:
                inputs[target_handle] = node_outputs[source_id]
        
        # If single input, make it the default "input" key
        if len(inputs) == 1 and "input" not in inputs:
            inputs["input"] = list(inputs.values())[0]
        
        return inputs

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