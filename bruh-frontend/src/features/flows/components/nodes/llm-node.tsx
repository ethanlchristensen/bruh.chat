import { memo } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import { Brain, Zap, Info, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { LLMNodeData } from "@/types/flow.types";
import { ModelSelector } from "@/components/shared/model-selector/model-selector";

type LLMNode = Node<LLMNodeData>;

export const LLMNode = memo(({ data, selected, id }: NodeProps<LLMNode>) => {
  const { updateNodeData } = useReactFlow();
  const Icon = data.provider === "ollama" ? Brain : Zap;

  const handleModelSelect = (modelId: string, provider: string) => {
    updateNodeData(id, {
      model: modelId,
      provider: provider as "openrouter" | "ollama",
    });
  };

  return (
    <div
      className={`flex flex-col rounded-lg shadow-lg bg-card text-left
      ${selected ? "border-2 border-primary" : "border border-border"}
      ${selected ? "border-2 border-primary" : "border border-border"}
      ${data.status === "running" ? "node-running" : ""}
      ${data.status === "success" ? "node-success" : ""}
      ${data.status === "error" ? "node-error" : ""}
    `}
    >
      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-t-md font-medium flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span>{data.label}</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Model</div>
          <ModelSelector
            selectedModelId={data.model}
            onModelSelect={handleModelSelect}
            variant="by-provider"
            provider={data.provider || "both"}
          />
        </div>

        {data.provider && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Provider</div>
            <div className="text-sm font-medium capitalize text-foreground">
              {data.provider}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Temperature</span>
          <span className="text-sm font-medium text-foreground">
            {data.temperature}
          </span>
        </div>

        {!!data.systemPrompt && (
          <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            System prompt configured
          </div>
        )}

        {!!data.stream && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            <span>Streaming enabled</span>
          </div>
        )}

        {!!data.output && (
          <div className="border border-border rounded p-2 bg-muted max-h-[100px] overflow-auto">
            <pre className="text-xs whitespace-pre-wrap text-foreground">
              {typeof data.output === "string"
                ? data.output.slice(0, 200) +
                  (data.output.length > 200 ? "..." : "")
                : JSON.stringify(data.output, null, 2).slice(0, 200)}
            </pre>
          </div>
        )}
      </div>

      {data.status !== "idle" && (
        <div
          className={`px-4 py-2 text-xs border-t border-border flex items-center gap-1.5 ${
            data.status === "success"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              : data.status === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          }`}
        >
          {data.status === "running" ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing...
            </>
          ) : data.status === "success" ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              Complete{data.executionTime ? ` (${data.executionTime}ms)` : ""}
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3" />
              {data.error || "Error"}
            </>
          )}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="bg-primary! w-3! h-3!"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="bg-primary! w-3! h-3!"
      />
    </div>
  );
});

LLMNode.displayName = "LLMNode";
