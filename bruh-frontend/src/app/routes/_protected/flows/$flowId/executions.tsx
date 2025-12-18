import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useFlow, useFlowExecutions } from "@/features/flows/api/flows";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_protected/flows/$flowId/executions")({
  component: FlowExecutionsPage,
});

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Pending",
    variant: "secondary" as const,
    color: "text-gray-500",
  },
  running: {
    icon: Loader2,
    label: "Running",
    variant: "default" as const,
    color: "text-blue-500",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    variant: "default" as const,
    color: "text-green-500",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    variant: "destructive" as const,
    color: "text-red-500",
  },
  cancelled: {
    icon: AlertCircle,
    label: "Cancelled",
    variant: "outline" as const,
    color: "text-orange-500",
  },
};

function FlowExecutionsPage() {
  const { flowId } = Route.useParams();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [limit, setLimit] = useState(20);

  const { data: flow, isLoading: flowLoading } = useFlow({ flowId });
  const {
    data: executions,
    isLoading: executionsLoading,
    refetch,
  } = useFlowExecutions({
    flowId,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const isLoading = flowLoading || executionsLoading;

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="container mx-auto max-w-6xl h-full flex flex-col py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                navigate({ to: "/flows/$flowId", params: { flowId } })
              }
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Executions</h1>
              <p className="text-muted-foreground">
                {flow?.name || "Loading..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? `animate-spin` : ``}`}
              />
            </Button>
            <Button
              onClick={() =>
                navigate({ to: "/flows/$flowId", params: { flowId } })
              }
            >
              <Play className="w-4 h-4 mr-2" />
              New Run
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={limit.toString()}
            onValueChange={(v) => setLimit(Number(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 runs</SelectItem>
              <SelectItem value="20">20 runs</SelectItem>
              <SelectItem value="50">50 runs</SelectItem>
              <SelectItem value="100">100 runs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          {isLoading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Loading executions...
                </p>
              </div>
            </div>
          )}

          {!isLoading && executions?.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Play className="h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">No executions yet</CardTitle>
                <CardDescription className="mb-4">
                  Run this flow to see execution history
                </CardDescription>
                <Button
                  onClick={() =>
                    navigate({ to: "/flows/$flowId", params: { flowId } })
                  }
                >
                  <Play className="w-4 h-4 mr-2" />
                  Run Flow
                </Button>
              </CardContent>
            </Card>
          )}

          {!isLoading && executions && executions.length > 0 && (
            <div className="flex flex-col gap-2 pb-4">
              {executions.map((execution) => {
                const effectiveStatus = execution.error
                  ? "failed"
                  : execution.status;
                const config = statusConfig[effectiveStatus];
                const StatusIcon = config.icon;

                return (
                  <Link
                    key={execution.executionId}
                    to="/flows/$flowId/executions/$executionId"
                    params={{ flowId, executionId: execution.executionId }}
                  >
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <StatusIcon
                              className={`w-5 h-5 ${config.color} ${
                                execution.status === "running"
                                  ? "animate-spin"
                                  : ""
                              }`}
                            />
                            <div>
                              <CardTitle className="text-base">
                                Execution {execution.executionId.slice(0, 8)}
                              </CardTitle>
                              <CardDescription>
                                Started{" "}
                                {formatDistanceToNow(
                                  new Date(execution.startTime),
                                  {
                                    addSuffix: true,
                                  },
                                )}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {formatDuration(execution.totalExecutionTime)}
                            </span>
                          </div>
                          {execution.error && (
                            <div className="flex items-center gap-1 text-destructive">
                              <AlertCircle className="w-4 h-4" />
                              <span className="truncate max-w-md">
                                {execution.error.message}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
