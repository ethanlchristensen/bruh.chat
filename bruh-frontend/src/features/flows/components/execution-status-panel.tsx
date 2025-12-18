import { useEffect } from "react";
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  StopCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { FlowExecution } from "@/types/flow.types";
import { useReactFlow } from "@xyflow/react";

interface ExecutionStatusPanelProps {
  execution: FlowExecution | undefined;
  onClose: () => void;
  onCancel: () => void;
  isCancelling: boolean;
}

export function ExecutionStatusPanel({
  execution,
  onClose,
  onCancel,
  isCancelling,
}: ExecutionStatusPanelProps) {
  const { setNodes, setEdges, getNodes } = useReactFlow();

  useEffect(() => {
    if (!execution) return;

    setNodes((nodes) =>
      nodes.map((node) => {
        const result = execution.nodeResults.find((r) => r.nodeId === node.id);

        if (result) {
          let visualStatus = "idle";

          if (result.status === "success") {
            visualStatus = "success";
          } else if (result.status === "error") {
            visualStatus = "error";
          } else if (result.status === "running") {
            visualStatus = "running";
          }

          return {
            ...node,
            data: {
              ...node.data,
              status: visualStatus,
              output: result.output,
              input: result.input,
              error: result.error?.message,
              executionTime: result.executionTime,
            },
          };
        }
        return node;
      }),
    );

    setEdges((edges) =>
      edges.map((edge) => {
        const sourceResult = execution.nodeResults.find(
          (r) => r.nodeId === edge.source,
        );
        const targetResult = execution.nodeResults.find(
          (r) => r.nodeId === edge.target,
        );

        const shouldAnimate =
          sourceResult?.status === "success" ||
          targetResult?.status === "running";

        return {
          ...edge,
          animated: shouldAnimate,
          style: shouldAnimate
            ? {
                ...edge.style,
                stroke: "var(--color-primary)",
                strokeWidth: 2,
              }
            : edge.style,
        };
      }),
    );
  }, [execution, setNodes, setEdges]);

  if (!execution) return null;

  const totalNodes = getNodes().length;

  const completedNodes = execution.nodeResults.filter(
    (r) => r.status === "success" || r.status === "error",
  ).length;

  const progress = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;
  const canCancel =
    execution.status === "pending" || execution.status === "running";

  return (
    <div className="absolute top-4 right-4 w-96 bg-card border border-border rounded-lg shadow-lg z-50">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {execution.status === "pending" && (
            <>
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="font-medium">Queued</span>
            </>
          )}
          {execution.status === "running" && (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="font-medium">Executing</span>
            </>
          )}
          {execution.status === "completed" && (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="font-medium">Completed</span>
            </>
          )}
          {execution.status === "failed" && (
            <>
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="font-medium">Failed</span>
            </>
          )}
          {execution.status === "cancelled" && (
            <>
              <StopCircle className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Cancelled</span>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">
            {completedNodes} of {totalNodes} nodes complete
          </p>
        </div>

        {execution.status === "completed" && execution.finalOutput && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Final Output</div>
            <div className="bg-muted rounded p-3 max-h-40 overflow-auto">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {typeof execution.finalOutput === "string"
                  ? execution.finalOutput
                  : JSON.stringify(execution.finalOutput, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {execution.error && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-destructive">Error</div>
            <div className="bg-destructive/10 text-destructive rounded p-3">
              <p className="text-xs">{execution.error.message}</p>
              {execution.error.nodeId && (
                <p className="text-xs mt-1 opacity-70">
                  Node: {execution.error.nodeId}
                </p>
              )}
            </div>
          </div>
        )}

        {execution.totalExecutionTime && (
          <div className="text-xs text-muted-foreground">
            Execution time: {(execution.totalExecutionTime / 1000).toFixed(2)}s
          </div>
        )}

        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onCancel}
            disabled={isCancelling}
            className="w-full"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <StopCircle className="w-4 h-4 mr-2" />
                Cancel Execution
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
