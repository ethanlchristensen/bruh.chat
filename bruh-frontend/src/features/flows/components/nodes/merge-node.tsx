import { memo, useCallback } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import { GitMerge, Info, Plus, Minus } from "lucide-react";
import type { MergeNodeData } from "@/types/flow.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NodeContainer } from "./shared/node-container";
import { NodeHeader } from "./shared/node-header";
import { NodeStatusFooter } from "./shared/node-status-footer";

type MergeNode = Node<MergeNodeData>;

const MERGE_STRATEGIES = [
  { value: "object", label: "Object", description: "Combine inputs as object" },
  {
    value: "flatten",
    label: "Flatten",
    description: "Combine the keys from each input into a single object",
  },
  { value: "array", label: "Array", description: "Combine inputs as array" },
  { value: "concat", label: "Concatenate", description: "Join as strings" },
  { value: "first", label: "First", description: "Use first input only" },
  { value: "last", label: "Last", description: "Use last input only" },
] as const;

export const MergeNode = memo(
  ({ data, selected, id }: NodeProps<MergeNode>) => {
    const { updateNodeData, getEdges } = useReactFlow();

    const inputCount = data.inputCount ?? 2;

    const handleStrategyChange = useCallback(
      (value: string) => {
        updateNodeData(id, {
          mergeStrategy: value as MergeNodeData["mergeStrategy"],
        });
      },
      [id, updateNodeData],
    );

    const handleWaitForAllChange = useCallback(
      (checked: boolean) => {
        updateNodeData(id, { waitForAll: checked });
      },
      [id, updateNodeData],
    );

    const handleTimeoutChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 1000 && value <= 300000) {
          updateNodeData(id, { timeout: value });
        }
      },
      [id, updateNodeData],
    );

    const handleAddInput = useCallback(() => {
      updateNodeData(id, { inputCount: inputCount + 1 });
    }, [id, inputCount, updateNodeData]);

    const handleRemoveInput = useCallback(() => {
      if (inputCount <= 2) return;

      // Check if the last input has any connections
      const edges = getEdges();
      const lastInputHandle = `input_${inputCount}`;
      const hasConnection = edges.some(
        (edge) => edge.target === id && edge.targetHandle === lastInputHandle,
      );

      if (hasConnection) {
        alert(
          "Cannot remove input: it has an active connection. Please disconnect it first.",
        );
        return;
      }

      updateNodeData(id, { inputCount: inputCount - 1 });
    }, [id, inputCount, updateNodeData, getEdges]);

    const selectedStrategy = MERGE_STRATEGIES.find(
      (s) => s.value === data.mergeStrategy,
    );

    return (
      <NodeContainer selected={selected}>
        {!data.mergeStrategy && (
          <div className="text-xs text-amber-600 dark:text-amber-400 px-4 py-2 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900 rounded-t-xl">
            <Info className="w-3 h-3" />
            Please select a merge strategy
          </div>
        )}

        <NodeHeader icon={GitMerge} label={data.label} />

        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                Input Handles
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveInput}
                  disabled={inputCount <= 2}
                  className="h-6 w-6"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {inputCount}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAddInput}
                  disabled={inputCount >= 10}
                  className="h-6 w-6"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="merge-strategy"
              className="text-xs font-medium text-muted-foreground"
            >
              Merge Strategy
            </Label>
            <Select
              value={data.mergeStrategy || "object"}
              onValueChange={handleStrategyChange}
            >
              <SelectTrigger id="merge-strategy" className="w-full h-8 text-xs">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                {MERGE_STRATEGIES.map((strategy) => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{strategy.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {strategy.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStrategy && (
              <p className="text-[10px] text-muted-foreground">
                {selectedStrategy.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="wait-for-all"
                className="text-xs font-medium text-foreground"
              >
                Wait for All Inputs
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Wait for all connected inputs before merging
              </p>
            </div>
            <Switch
              id="wait-for-all"
              checked={data.waitForAll ?? true}
              onCheckedChange={handleWaitForAllChange}
            />
          </div>

          {data.waitForAll && (
            <div className="space-y-1.5">
              <Label
                htmlFor="timeout"
                className="text-xs font-medium text-muted-foreground"
              >
                Timeout (ms)
              </Label>
              <Input
                id="timeout"
                type="number"
                value={data.timeout ?? 30000}
                onChange={handleTimeoutChange}
                min={1000}
                max={300000}
                step={1000}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Range: 1,000ms - 300,000ms
              </p>
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
          runningText="Merging..."
          successText="Merged"
          skipReason={data.skipReason}
        />

        {/* Dynamic input handles */}
        {Array.from({ length: inputCount }, (_, i) => {
          const handleId = `input_${i + 1}`;

          return (
            <Handle
              key={handleId}
              type="target"
              position={Position.Left}
              id={handleId}
              className="bg-primary! w-3.5! h-3.5! border-4! border-background! shadow-sm"
            />
          );
        })}

        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="bg-primary! w-3.5! h-3.5! border-4! border-background! shadow-sm"
        />
      </NodeContainer>
    );
  },
);

MergeNode.displayName = "MergeNode";
