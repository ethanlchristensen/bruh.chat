import { memo, useCallback } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import {
  GitBranch,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { ConditionalNodeData } from "@/types/flow.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type ConditionalNode = Node<ConditionalNodeData>;

const operatorLabels = {
  contains: "Contains",
  equals: "Equals",
  starts_with: "Starts with",
  ends_with: "Ends with",
  regex: "Regex",
  greater_than: "Greater than",
  less_than: "Less than",
  equals_number: "Equals (number)",
  is_empty: "Is empty",
  is_not_empty: "Is not empty",
  length_greater_than: "Length >",
  length_less_than: "Length <",
};

export const ConditionalNode = memo(
  ({ data, selected, id }: NodeProps<ConditionalNode>) => {
    const { updateNodeData } = useReactFlow();

    const handleAddCondition = useCallback(() => {
      const conditions = data.conditions || [];
      const newConditions = [
        ...conditions,
        {
          id: `condition-${Date.now()}`,
          operator: "equals" as const,
          value: "",
          outputHandle: `output-${conditions.length + 1}`,
          label: `Condition ${conditions.length + 1}`,
        },
      ];
      updateNodeData(id, { conditions: newConditions });
    }, [id, data.conditions, updateNodeData]);

    const handleRemoveCondition = useCallback(
      (conditionId: string) => {
        const newConditions = (data.conditions || []).filter(
          (c) => c.id !== conditionId,
        );
        updateNodeData(id, { conditions: newConditions });
      },
      [id, data.conditions, updateNodeData],
    );

    const handleConditionChange = useCallback(
      (
        conditionId: string,
        field: keyof ConditionalNodeData["conditions"][0],
        value: string,
      ) => {
        const newConditions = (data.conditions || []).map((condition) =>
          condition.id === conditionId
            ? { ...condition, [field]: value }
            : condition,
        );
        updateNodeData(id, { conditions: newConditions });
      },
      [id, data.conditions, updateNodeData],
    );

    const handleCaseSensitiveToggle = useCallback(
      (checked: boolean) => {
        updateNodeData(id, { caseSensitive: checked });
      },
      [id, updateNodeData],
    );

    const conditions = data.conditions || [];

    return (
      <div
        className={`
          bg-card rounded-lg shadow-lg text-left min-w-[300px]
          ${selected ? "border-2 border-purple-500" : "border-2 border-border"}
        `}
      >
        <div className="bg-purple-500 text-white px-4 py-2 rounded-t-md font-medium flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          <span>{data.label}</span>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                Conditions
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddCondition}
                className="h-7 text-xs gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {conditions.map((condition, index) => (
                <div
                  key={condition.id}
                  className="border border-border rounded-md p-3 space-y-3 bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={condition.label || ""}
                      onChange={(e) =>
                        handleConditionChange(
                          condition.id,
                          "label",
                          e.target.value,
                        )
                      }
                      placeholder={`Condition ${index + 1}`}
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCondition(condition.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Operator
                    </Label>
                    <Select
                      value={condition.operator}
                      onValueChange={(value) =>
                        handleConditionChange(condition.id, "operator", value)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(operatorLabels).map(
                          ([value, label]) => (
                            <SelectItem
                              key={value}
                              value={value}
                              className="text-xs"
                            >
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {!["is_empty", "is_not_empty"].includes(
                    condition.operator,
                  ) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Value
                      </Label>
                      <Input
                        type="text"
                        value={condition.value}
                        onChange={(e) =>
                          handleConditionChange(
                            condition.id,
                            "value",
                            e.target.value,
                          )
                        }
                        placeholder="Value to compare"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Output Handle ID
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={condition.outputHandle}
                        onChange={(e) =>
                          handleConditionChange(
                            condition.id,
                            "outputHandle",
                            e.target.value,
                          )
                        }
                        placeholder="output-1"
                        className="h-8 text-xs font-mono flex-1"
                      />
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        Port {index + 1}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}

              {conditions.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
                  No conditions configured. Click "Add" to create one.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <Label
              htmlFor="case-sensitive"
              className="text-xs font-medium text-muted-foreground cursor-pointer"
            >
              Case Sensitive
            </Label>
            <Switch
              id="case-sensitive"
              checked={data.caseSensitive || false}
              onCheckedChange={handleCaseSensitiveToggle}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Default Output Handle
            </Label>
            <Input
              type="text"
              value={data.defaultOutputHandle || "default"}
              onChange={(e) =>
                updateNodeData(id, { defaultOutputHandle: e.target.value })
              }
              placeholder="default"
              className="h-8 text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Used when no conditions match
            </p>
          </div>
        </div>

        {data.status !== "idle" && (
          <div
            className={`px-4 py-2 text-xs border-t border-border flex items-center gap-1.5 rounded-b-lg ${
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
                Evaluating...
              </>
            ) : data.status === "success" ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                Complete
                {data.executionTime && (
                  <Badge
                    variant="secondary"
                    className="ml-auto text-[10px] h-4"
                  >
                    {data.executionTime}ms
                  </Badge>
                )}
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
          className="bg-purple-500! w-3! h-3!"
        />

        {conditions.map((condition, index) => {
          const totalHandles = conditions.length + 1;
          const step = 100 / (totalHandles + 1);
          const topPercent = step * (index + 1);

          return (
            <Handle
              key={condition.outputHandle}
              type="source"
              position={Position.Right}
              id={condition.outputHandle}
              className="bg-purple-500! w-3! h-3!"
              style={{ top: `${topPercent}%` }}
            />
          );
        })}

        <Handle
          type="source"
          position={Position.Right}
          id={data.defaultOutputHandle || "default"}
          className="bg-gray-500! w-3! h-3!"
          style={{
            top: `${(100 / (conditions.length + 2)) * (conditions.length + 1)}%`,
          }}
        />
      </div>
    );
  },
);

ConditionalNode.displayName = "ConditionalNode";
