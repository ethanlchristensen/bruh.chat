import { memo } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import { Brain, Zap, Info } from "lucide-react";
import type { LLMNodeData } from "@/types/flow.types";
import { ModelSelector } from "@/components/shared/model-selector/model-selector";
import { NodeContainer } from "./shared/node-container";
import { NodeHeader } from "./shared/node-header";
import { NodeStatusFooter } from "./shared/node-status-footer";

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
    <NodeContainer selected={selected}>
      {/* Added Callout Banner */}
      {!data.model && (
        <div className="text-xs text-amber-600 dark:text-amber-400 px-4 py-2 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900 rounded-t-xl">
          <Info className="w-3 h-3" />
          Please select a model to continue
        </div>
      )}

      <NodeHeader icon={Icon} label={data.label} />

      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Model</div>
          <ModelSelector
            selectedModelId={data.model}
            onModelSelect={handleModelSelect}
            variant="by-provider"
            provider={data.provider || "both"}
          />
        </div>

        {data.provider && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Provider
            </div>
            <div className="text-sm font-medium capitalize text-foreground">
              {data.provider}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Temperature
          </span>
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

      <NodeStatusFooter
        status={data.status}
        error={data.error}
        executionTime={data.executionTime}
        skipReason={data.skipReason}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="bg-primary! w-3.5! h-3.5! border-4! border-background! shadow-sm"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="bg-primary! w-3.5! h-3.5! border-4! border-background! shadow-sm"
      />
    </NodeContainer>
  );
});

LLMNode.displayName = "LLMNode";
