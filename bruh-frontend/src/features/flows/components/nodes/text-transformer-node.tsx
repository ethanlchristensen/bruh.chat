import { memo, useState } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import {
  Wand2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import type {
  TextTransformerNodeData,
  TextTransformOperation,
  TextTransformOperationType,
} from "@/types/flow.types";
import { NodeContainer } from "./shared/node-container";
import { NodeHeader } from "./shared/node-header";
import { NodeStatusFooter } from "./shared/node-status-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type TextTransformerNode = Node<TextTransformerNodeData>;

const OPERATION_LABELS: Record<TextTransformOperationType, string> = {
  trim: "Trim Whitespace",
  uppercase: "Uppercase",
  lowercase: "Lowercase",
  capitalize: "Capitalize",
  replace: "Replace",
  regex_replace: "Regex Replace",
  split: "Split",
  join: "Join",
  substring: "Substring",
  prefix: "Add Prefix",
  suffix: "Add Suffix",
  remove_whitespace: "Remove Whitespace",
};

export const TextTransformerNode = memo(
  ({ data, selected, id }: NodeProps<TextTransformerNode>) => {
    const { updateNodeData } = useReactFlow();
    const [expandedOps, setExpandedOps] = useState<Set<string>>(new Set());

    const addOperation = () => {
      const newOp: TextTransformOperation = {
        id: `op_${Date.now()}`,
        type: "trim",
        enabled: true,
      };
      updateNodeData(id, {
        operations: [...data.operations, newOp],
      });
      setExpandedOps((prev) => new Set([...prev, newOp.id]));
    };

    const removeOperation = (opId: string) => {
      updateNodeData(id, {
        operations: data.operations.filter((op) => op.id !== opId),
      });
      setExpandedOps((prev) => {
        const newSet = new Set(prev);
        newSet.delete(opId);
        return newSet;
      });
    };

    const updateOperation = (
      opId: string,
      updates: Partial<TextTransformOperation>,
    ) => {
      updateNodeData(id, {
        operations: data.operations.map((op) =>
          op.id === opId ? { ...op, ...updates } : op,
        ),
      });
    };

    const toggleExpanded = (opId: string) => {
      setExpandedOps((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(opId)) {
          newSet.delete(opId);
        } else {
          newSet.add(opId);
        }
        return newSet;
      });
    };

    const moveOperation = (index: number, direction: "up" | "down") => {
      const newOperations = [...data.operations];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newOperations.length) return;

      [newOperations[index], newOperations[targetIndex]] = [
        newOperations[targetIndex],
        newOperations[index],
      ];
      updateNodeData(id, { operations: newOperations });
    };

    return (
      <NodeContainer selected={selected}>
        <NodeHeader icon={Wand2} label={data.label} />

        <div
          className="p-4 space-y-3 max-h-[500px] overflow-y-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Operations ({data.operations.length})
            </span>
            <Button
              onClick={addOperation}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>

          {data.operations.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded">
              No operations configured
            </div>
          )}

          <div className="space-y-2">
            {data.operations.map((operation, index) => (
              <OperationItem
                key={operation.id}
                operation={operation}
                index={index}
                totalOps={data.operations.length}
                isExpanded={expandedOps.has(operation.id)}
                onToggleExpanded={() => toggleExpanded(operation.id)}
                onUpdate={(updates) => updateOperation(operation.id, updates)}
                onRemove={() => removeOperation(operation.id)}
                onMove={moveOperation}
              />
            ))}
          </div>

          {data.output! && (
            <div className="border border-border rounded p-2 bg-muted mt-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Output Preview
              </div>
              <pre className="text-xs whitespace-pre-wrap text-foreground max-h-[100px] overflow-auto">
                {typeof data.output === "string"
                  ? data.output.slice(0, 300) +
                    (data.output.length > 300 ? "..." : "")
                  : JSON.stringify(data.output, null, 2).slice(0, 300)}
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
  },
);

TextTransformerNode.displayName = "TextTransformerNode";

interface OperationItemProps {
  operation: TextTransformOperation;
  index: number;
  totalOps: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onUpdate: (updates: Partial<TextTransformOperation>) => void;
  onRemove: () => void;
  onMove: (index: number, direction: "up" | "down") => void;
}

const OperationItem = memo(
  ({
    operation,
    index,
    totalOps,
    isExpanded,
    onToggleExpanded,
    onUpdate,
    onRemove,
    onMove,
  }: OperationItemProps) => {
    return (
      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        <div
          className="border border-border rounded bg-background"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50">
              <div className="flex flex-col gap-0.5">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(index, "up");
                  }}
                  disabled={index === 0}
                  size="sm"
                  variant="ghost"
                  className="h-3 w-4 p-0"
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(index, "down");
                  }}
                  disabled={index === totalOps - 1}
                  size="sm"
                  variant="ghost"
                  className="h-3 w-4 p-0"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </div>

              <GripVertical className="w-3 h-3 text-muted-foreground" />

              <Switch
                checked={operation.enabled}
                onCheckedChange={(checked) => onUpdate({ enabled: checked })}
                onClick={(e) => e.stopPropagation()}
                className="scale-75"
              />

              <span className="text-xs font-medium flex-1">
                {OPERATION_LABELS[operation.type]}
              </span>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="p-2 pt-0 space-y-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs">Operation Type</Label>
                <Select
                  value={operation.type}
                  onValueChange={(value: TextTransformOperationType) =>
                    onUpdate({ type: value, config: {} as any })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OPERATION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <OperationConfig operation={operation} onUpdate={onUpdate} />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  },
);

OperationItem.displayName = "OperationItem";

interface OperationConfigProps {
  operation: TextTransformOperation;
  onUpdate: (updates: Partial<TextTransformOperation>) => void;
}

const OperationConfig = memo(
  ({ operation, onUpdate }: OperationConfigProps) => {
    const updateConfig = (configUpdates: any) => {
      onUpdate({
        config: { ...operation.config, ...configUpdates } as any,
      });
    };

    // Stop propagation helper for all inputs
    const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
      e.stopPropagation();
    };

    switch (operation.type) {
      case "replace":
        return (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Find</Label>
              <Input
                value={operation.config?.find || ""}
                onChange={(e) => updateConfig({ find: e.target.value })}
                onPointerDown={stopPropagation}
                onMouseDown={stopPropagation}
                placeholder="Text to find"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Replace With</Label>
              <Input
                value={operation.config?.replace || ""}
                onChange={(e) => updateConfig({ replace: e.target.value })}
                onPointerDown={stopPropagation}
                onMouseDown={stopPropagation}
                placeholder="Replacement text"
                className="h-7 text-xs"
              />
            </div>
          </>
        );

      case "regex_replace":
        return (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Pattern</Label>
              <Input
                value={operation.config?.pattern || ""}
                onChange={(e) => updateConfig({ pattern: e.target.value })}
                onPointerDown={stopPropagation}
                onMouseDown={stopPropagation}
                placeholder="Regular expression"
                className="h-7 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Replace With</Label>
              <Input
                value={operation.config?.replace || ""}
                onChange={(e) => updateConfig({ replace: e.target.value })}
                onPointerDown={stopPropagation}
                onMouseDown={stopPropagation}
                placeholder="Replacement text"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Flags (optional)</Label>
              <Input
                value={operation.config?.flags || ""}
                onChange={(e) => updateConfig({ flags: e.target.value })}
                onPointerDown={stopPropagation}
                onMouseDown={stopPropagation}
                placeholder="i, m, s"
                className="h-7 text-xs"
              />
            </div>
          </>
        );

      case "split":
        return (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Delimiter</Label>
              <Input
                value={operation.config?.delimiter || ","}
                onChange={(e) => updateConfig({ delimiter: e.target.value })}
                onPointerDown={stopPropagation}
                onMouseDown={stopPropagation}
                placeholder=","
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Splits (optional)</Label>
              <Input
                type="number"
                value={operation.config?.maxSplits ?? ""}
                onChange={(e) =>
                  updateConfig({
                    maxSplits: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                onPointerDown={stopPropagation}
                onMouseDown={stopPropagation}
                placeholder="Unlimited"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Output Format</Label>
              <Select
                value={operation.config?.outputFormat || "lines"}
                onValueChange={(value) => updateConfig({ outputFormat: value })}
              >
                <SelectTrigger
                  className="h-7 text-xs"
                  onPointerDown={stopPropagation}
                  onMouseDown={stopPropagation}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lines">Lines</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "join":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Delimiter</Label>
            <Input
              value={operation.config?.delimiter || ""}
              onChange={(e) => updateConfig({ delimiter: e.target.value })}
              onPointerDown={stopPropagation}
              onMouseDown={stopPropagation}
              placeholder="Joining character"
              className="h-7 text-xs"
            />
          </div>
        );

      case "substring":
        return (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Start Index</Label>
              <Input
                type="number"
                value={operation.config?.start ?? 0}
                onChange={(e) =>
                  updateConfig({ start: Number(e.target.value) })
                }
                onPointerDown={stopPropagation}
                onMouseDown={stopPropagation}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Index (optional)</Label>
              <Input
                type="number"
                value={operation.config?.end ?? ""}
                onChange={(e) =>
                  updateConfig({
                    end: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                onPointerDown={stopPropagation}
                onMouseDown={stopPropagation}
                placeholder="End of string"
                className="h-7 text-xs"
              />
            </div>
          </>
        );

      case "prefix":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Prefix Text</Label>
            <Input
              value={operation.config?.value || ""}
              onChange={(e) => updateConfig({ value: e.target.value })}
              onPointerDown={stopPropagation}
              onMouseDown={stopPropagation}
              placeholder="Text to add at start"
              className="h-7 text-xs"
            />
          </div>
        );

      case "suffix":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Suffix Text</Label>
            <Input
              value={operation.config?.value || ""}
              onChange={(e) => updateConfig({ value: e.target.value })}
              onPointerDown={stopPropagation}
              onMouseDown={stopPropagation}
              placeholder="Text to add at end"
              className="h-7 text-xs"
            />
          </div>
        );

      case "remove_whitespace":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Mode</Label>
            <Select
              value={operation.config?.mode || "all"}
              onValueChange={(value) => updateConfig({ mode: value })}
            >
              <SelectTrigger
                className="h-7 text-xs"
                onPointerDown={stopPropagation}
                onMouseDown={stopPropagation}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Remove All</SelectItem>
                <SelectItem value="extra">Remove Extra</SelectItem>
                <SelectItem value="leading">Remove Leading</SelectItem>
                <SelectItem value="trailing">Remove Trailing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  },
);

OperationConfig.displayName = "OperationConfig";
