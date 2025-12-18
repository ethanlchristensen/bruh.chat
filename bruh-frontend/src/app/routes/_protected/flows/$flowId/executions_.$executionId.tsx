import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
} from "lucide-react";
import { useFlowExecution } from "@/features/flows/api/flows";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute(
  "/_protected/flows/$flowId/executions_/$executionId",
)({
  component: ExecutionDetailPage,
});

const statusConfig = {
  pending: { icon: Clock, label: "Pending", color: "bg-amber-500" },
  running: { icon: Loader2, label: "Running", color: "bg-blue-500" },
  success: { icon: CheckCircle2, label: "Success", color: "bg-green-500" },
  error: { icon: XCircle, label: "Error", color: "bg-red-500" },
  completed: { icon: CheckCircle2, label: "Completed", color: "bg-green-500" },
  failed: { icon: XCircle, label: "Failed", color: "bg-red-500" },
  cancelled: { icon: XCircle, label: "Cancelled", color: "bg-gray-500" },
};

const nodeTypeLabels = {
  input: "Input",
  llm: "LLM",
  output: "Output",
  json_extractor: "JSON Extractor",
  conditional: "Conditional",
};

const formatValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  try {
    const stringified = JSON.stringify(value, null, 2);
    return stringified ?? "";
  } catch {
    return String(value);
  }
};

function ExecutionDetailPage() {
  const { flowId, executionId } = Route.useParams();
  const navigate = useNavigate();
  const { data: execution, isLoading } = useFlowExecution(executionId, true);

  const downloadResults = () => {
    const dataStr = JSON.stringify(execution, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `execution-${executionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading execution...</p>
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Execution not found</p>
      </div>
    );
  }

  const statusInfo = statusConfig[execution.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;
  const duration = execution.totalExecutionTime
    ? `${(execution.totalExecutionTime / 1000).toFixed(2)}s`
    : "N/A";

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="container mx-auto max-w-6xl py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                navigate({
                  to: "/flows/$flowId/executions",
                  params: { flowId },
                })
              }
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Execution Details
              </h1>
              <p className="text-muted-foreground">
                {executionId.slice(0, 8)}... • Started{" "}
                {formatDistanceToNow(new Date(execution.startTime), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadResults}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <StatusIcon
                  className={`w-5 h-5 ${execution.status === "running" ? "animate-spin" : ""}`}
                />
                <span className="text-2xl font-bold">{statusInfo.label}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Duration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{duration}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Nodes Executed</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {execution.nodeResults.length}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Success Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {execution.nodeResults.length > 0
                  ? Math.round(
                      (execution.nodeResults.filter(
                        (n) => n.status === "success",
                      ).length /
                        execution.nodeResults.length) *
                        100,
                    )
                  : 0}
                %
              </span>
            </CardContent>
          </Card>
        </div>

        {execution.finalOutput && (
          <Card>
            <CardHeader>
              <CardTitle>Final Output</CardTitle>
              <CardDescription>
                The final result of the flow execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 overflow-hidden">
                <pre className="text-sm font-mono overflow-x-auto max-w-full whitespace-pre-wrap wrap-break-word">
                  {typeof execution.finalOutput === "string"
                    ? execution.finalOutput
                    : JSON.stringify(execution.finalOutput, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {execution.error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">
                Execution Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">{execution.error.message}</p>
                {execution.error.nodeId && (
                  <p className="text-xs text-muted-foreground">
                    Failed at node: {execution.error.nodeId}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Execution Timeline</CardTitle>
            <CardDescription>
              Step-by-step execution of each node
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {execution.nodeResults.map((result, index) => {
              const nodeStatus = statusConfig[result.status];
              const NodeIcon = nodeStatus.icon;

              return (
                <div key={result.nodeId}>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`rounded-full p-2 ${nodeStatus.color} text-white`}
                      >
                        <NodeIcon className="w-4 h-4" />
                      </div>
                      {index < execution.nodeResults.length - 1 && (
                        <div className="w-px h-full bg-border mt-2" />
                      )}
                    </div>

                    <div className="flex-1 pb-8">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {nodeTypeLabels[result.nodeType] ||
                                result.nodeType}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {result.nodeId.slice(0, 8)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(result.startTime).toLocaleTimeString()}
                            {result.executionTime &&
                              ` • ${result.executionTime}ms`}
                          </p>
                        </div>
                        <Badge
                          variant={
                            result.status === "success"
                              ? "default"
                              : result.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {nodeStatus.label}
                        </Badge>
                      </div>

                      {result.input && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Input
                          </p>
                          <div className="bg-muted rounded p-3 overflow-hidden">
                            <pre className="text-xs font-mono overflow-x-auto max-w-full whitespace-pre-wrap wrap-break-word">
                              {formatValue(result.input) as string}
                            </pre>
                          </div>
                        </div>
                      )}

                      {result.output && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Output
                          </p>
                          <div className="bg-muted rounded p-3 overflow-hidden">
                            <pre className="text-xs font-mono overflow-x-auto max-w-full whitespace-pre-wrap wrap-break-word">
                              {formatValue(result.output) as string}
                            </pre>
                          </div>
                        </div>
                      )}

                      {result.matchedCondition && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Matched Condition
                          </p>
                          <div className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 rounded p-3">
                            <p className="text-xs">{result.matchedCondition}</p>
                            {result.outputHandle && (
                              <p className="text-xs mt-1">
                                Output Handle:{" "}
                                <code className="font-mono">
                                  {result.outputHandle}
                                </code>
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {result.error && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-destructive mb-1">
                            Error
                          </p>
                          <div className="bg-destructive/10 text-destructive rounded p-3">
                            <p className="text-xs">{result.error.message}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
