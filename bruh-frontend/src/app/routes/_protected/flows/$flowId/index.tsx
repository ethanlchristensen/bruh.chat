import { useState, useCallback, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  Background,
  Controls,
  type Connection,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Save, Play, ArrowLeft, Trash2, Loader2, History } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { NodeTemplateSelector } from "@/features/flows/components/node-selector";
import { InputNode } from "@/features/flows/components/nodes/input-node";
import { LLMNode } from "@/features/flows/components/nodes/llm-node";
import { OutputNode } from "@/features/flows/components/nodes/output-node";
import { JSONExtractorNode } from "@/features/flows/components/nodes";
import { ExecutionDialog } from "@/features/flows/components/execution-dialog";
import { ExecutionStatusPanel } from "@/features/flows/components/execution-status-panel";
import {
  useFlow,
  useUpdateFlow,
  useDeleteFlow,
} from "@/features/flows/api/flows";

import type { FlowNode, NodeTemplate } from "@/types/flow.types";
import {
  useExecuteFlow,
  useFlowExecution,
  useCancelFlowExecution,
} from "@/features/flows/api/flows";

export const Route = createFileRoute("/_protected/flows/$flowId/")({
  component: FlowWrapper,
});

const nodeTypes = {
  input: InputNode,
  llm: LLMNode,
  output: OutputNode,
  json_extractor: JSONExtractorNode,
};

const normalizeNode = (node: FlowNode) => {
  const { status, output, error, ...dataWithoutRuntime } = node.data;
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: dataWithoutRuntime,
  };
};

const normalizeNodes = (nodes: FlowNode[]) => nodes.map(normalizeNode);

const normalizeEdge = (edge: Edge) => {
  const { animated, ...edgeWithoutRuntime } = edge;
  return {
    id: edgeWithoutRuntime.id,
    source: edgeWithoutRuntime.source,
    target: edgeWithoutRuntime.target,
    sourceHandle: edgeWithoutRuntime.sourceHandle,
    targetHandle: edgeWithoutRuntime.targetHandle,
  };
};

const normalizeEdges = (edges: Edge[]) => edges.map(normalizeEdge);

let id = 0;
const getId = () => `dndnode_${id++}_${Date.now()}`;

function FlowBuilder() {
  const { flowId } = Route.useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [flowName, setFlowName] = useState("Untitled Flow");
  const [isEditingName, setIsEditingName] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const originalNodesRef = useRef<FlowNode[]>([]);
  const originalEdgesRef = useRef<Edge[]>([]);
  const originalNameRef = useRef("");

  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(
    null,
  );
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);

  const { data: flow, isLoading } = useFlow({ flowId });
  const updateMutation = useUpdateFlow();
  const deleteMutation = useDeleteFlow();

  const executeMutation = useExecuteFlow();
  const { data: execution } = useFlowExecution(
    currentExecutionId,
    !!currentExecutionId,
  );
  const cancelMutation = useCancelFlowExecution();
  const isSavingRef = useRef(false);
  const isExecutingRef = useRef(false);

  useEffect(() => {
    isExecutingRef.current =
      execution?.status === "pending" || execution?.status === "running";
  }, [execution?.status]);

  useEffect(() => {
    if (flow) {
      setNodes(flow.nodes);
      setEdges(flow.edges);
      setFlowName(flow.name);
      originalNodesRef.current = normalizeNodes(flow.nodes) as FlowNode[];
      originalEdgesRef.current = normalizeEdges(flow.edges) as Edge[];
      originalNameRef.current = flow.name;
    }
  }, [flow?.id]);

  useEffect(() => {
    if (isSavingRef.current || isExecutingRef.current || showExecutionPanel) {
      return;
    }

    if (originalNodesRef.current.length > 0) {
      const normalizedCurrent = normalizeNodes(nodes);
      const normalizedOriginal = originalNodesRef.current;
      const normalizedCurrentEdges = normalizeEdges(edges);
      const normalizedOriginalEdges = originalEdgesRef.current;

      const nodesChanged =
        JSON.stringify(normalizedCurrent) !==
        JSON.stringify(normalizedOriginal);
      const edgesChanged =
        JSON.stringify(normalizedCurrentEdges) !==
        JSON.stringify(normalizedOriginalEdges);
      const nameChanged = flowName !== originalNameRef.current;
      const hasChanges = nodesChanged || edgesChanged || nameChanged;

      setHasUnsavedChanges(hasChanges);
    }
  }, [nodes, edges, flowName, showExecutionPanel]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes(
        (nodesSnapshot) =>
          applyNodeChanges(changes, nodesSnapshot) as FlowNode[],
      ),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const templateStr = event.dataTransfer.getData("application/reactflow");

      if (!templateStr) return;

      try {
        const template: NodeTemplate = JSON.parse(templateStr);

        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode: FlowNode = {
          id: getId(),
          type: template.type,
          position,
          data: {
            ...template.defaultConfig,
            label: template.name,
            status: "idle",
            handles: template.defaultConfig.handles || [],
          } as any,
        };

        setNodes((nds) => nds.concat(newNode));
      } catch (err) {
        console.error("Failed to drop node:", err);
      }
    },
    [screenToFlowPosition],
  );

  const onSelectTemplate = useCallback((template: NodeTemplate) => {
    const newNode: FlowNode = {
      id: getId(),
      type: template.type,
      position: { x: 100, y: 100 },
      data: {
        ...template.defaultConfig,
        label: template.name,
        status: "idle",
        handles: template.defaultConfig.handles || [],
      } as any,
    };
    setNodes((nds) => nds.concat(newNode));
  }, []);

  const handleSave = () => {
    isSavingRef.current = true;

    const normalizedNodes = normalizeNodes(nodes) as FlowNode[];
    const normalizedEdges = normalizeEdges(edges) as Edge[];

    updateMutation.mutate(
      {
        flowId,
        data: {
          name: flowName,
          nodes: normalizedNodes,
          edges: normalizedEdges,
        },
      },
      {
        onSuccess: () => {
          originalNodesRef.current = JSON.parse(
            JSON.stringify(normalizedNodes),
          );
          originalEdgesRef.current = JSON.parse(
            JSON.stringify(normalizedEdges),
          );
          originalNameRef.current = flowName;

          setHasUnsavedChanges(false);

          setTimeout(() => {
            isSavingRef.current = false;
          }, 100);
        },
        onError: (error) => {
          console.error("❌ Save failed:", error);
          isSavingRef.current = false;
        },
      },
    );
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(flowId);
    navigate({ to: "/flows" });
    setDeleteDialogOpen(false);
  };

  const handleExecute = (initialInput: Record<string, any>) => {
    executeMutation.mutate(
      {
        flowId,
        data: { initialInput },
      },
      {
        onSuccess: (data) => {
          setCurrentExecutionId(data.executionId);
          setShowExecutionPanel(true);
          setExecutionDialogOpen(false);
        },
        onError: (error) => {
          console.error("Execution failed to start:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
        },
      },
    );
  };

  const handleCancelExecution = () => {
    if (currentExecutionId) {
      cancelMutation.mutate(currentExecutionId);
    }
  };

  const handleCloseExecutionPanel = () => {
    setShowExecutionPanel(false);
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: "idle",
          output: undefined,
          error: undefined,
        },
      })),
    );
    setEdges((edges) =>
      edges.map((edge) => ({
        ...edge,
        animated: false,
      })),
    );

    setTimeout(() => {
      setHasUnsavedChanges(false);
    }, 50);
  };

  const isExecuting =
    execution?.status === "pending" || execution?.status === "running";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading flow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/flows" })}
            disabled={isExecuting}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {isEditingName ? (
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setIsEditingName(false);
              }}
              className="px-2 py-1 border border-input rounded text-lg font-semibold"
              autoFocus
              disabled={isExecuting}
            />
          ) : (
            <h1
              onClick={() => !isExecuting && setIsEditingName(true)}
              className={`text-lg font-semibold ${!isExecuting ? `cursor-pointer hover:text-primary` : `cursor-not-allowed opacity-50`}`}
            >
              {flowName}
            </h1>
          )}

          {isExecuting && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Executing...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              Unsaved changes
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={
              !hasUnsavedChanges || updateMutation.isPending || isExecuting
            }
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>

          <Button
            variant="outline"
            onClick={() => setExecutionDialogOpen(true)}
            disabled={isExecuting || nodes.length === 0}
          >
            <Play className="w-4 h-4" />
            Run
          </Button>

          <button
            onClick={() =>
              navigate({
                to: "/flows/$flowId/executions",
                params: { flowId },
              })
            }
            className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg hover:bg-accent"
          >
            <History className="w-4 h-4" />
            History
          </button>

          <button
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteMutation.isPending || isExecuting}
            className="p-2 hover:bg-accent rounded-lg text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-border bg-background flex flex-col">
          <NodeTemplateSelector onSelectTemplate={onSelectTemplate} />
        </aside>

        <div
          className="flex-1 h-full relative"
          ref={reactFlowWrapper}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={!isExecuting}
            nodesConnectable={!isExecuting}
            elementsSelectable={!isExecuting}
          >
            <Background />
            <Controls />
          </ReactFlow>

          {showExecutionPanel && execution && (
            <ExecutionStatusPanel
              execution={execution}
              onClose={handleCloseExecutionPanel}
              onCancel={handleCancelExecution}
              isCancelling={cancelMutation.isPending}
            />
          )}
        </div>
      </div>

      <ExecutionDialog
        open={executionDialogOpen}
        onOpenChange={setExecutionDialogOpen}
        onExecute={handleExecute}
        nodes={nodes}
        isExecuting={executeMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{flowName}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FlowWrapper() {
  return (
    <ReactFlowProvider>
      <FlowBuilder />
    </ReactFlowProvider>
  );
}
