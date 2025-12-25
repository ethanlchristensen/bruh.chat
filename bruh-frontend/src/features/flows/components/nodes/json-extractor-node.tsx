import { memo, useCallback } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import { Braces, Plus, Trash2 } from "lucide-react";
import type { JSONExtractorNodeData } from "@/types/flow.types";
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
import { NodeContainer } from "./shared/node-container";
import { NodeHeader } from "./shared/node-header";
import { NodeStatusFooter } from "./shared/node-status-footer";

type JSONExtractorNode = Node<JSONExtractorNodeData>;

export const JSONExtractorNode = memo(
  ({ data, selected, id }: NodeProps<JSONExtractorNode>) => {
    const { updateNodeData } = useReactFlow();

    const handleAddExtraction = useCallback(() => {
      const newExtractions = [
        ...(data.extractions || []),
        { key: "", path: "$", fallback: null },
      ];
      updateNodeData(id, { extractions: newExtractions });
    }, [id, data.extractions, updateNodeData]);

    const handleRemoveExtraction = useCallback(
      (index: number) => {
        const newExtractions = data.extractions?.filter((_, i) => i !== index);
        updateNodeData(id, { extractions: newExtractions });
      },
      [id, data.extractions, updateNodeData],
    );

    const handleExtractionChange = useCallback(
      (index: number, field: "key" | "path" | "fallback", value: string) => {
        const newExtractions = data.extractions?.map((extraction, i) =>
          i === index ? { ...extraction, [field]: value || null } : extraction,
        );
        updateNodeData(id, { extractions: newExtractions });
      },
      [id, data.extractions, updateNodeData],
    );

    const handleStrictModeToggle = useCallback(
      (checked: boolean) => {
        updateNodeData(id, { strictMode: checked });
      },
      [id, updateNodeData],
    );

    const handleSetAsVariablesToggle = useCallback(
      (checked: boolean) => {
        updateNodeData(id, { setAsVariables: checked });
      },
      [id, updateNodeData],
    );

    const handleOutputFormatChange = useCallback(
      (value: string) => {
        updateNodeData(id, {
          outputFormat: value as "object" | "array" | "flat" | "singleValue",
        });
      },
      [id, updateNodeData],
    );

    return (
      <NodeContainer selected={selected} ringColor="ring-orange-500">
        <NodeHeader
          icon={Braces}
          label={data.label}
          iconColor="text-orange-500"
        />

        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                Extractions
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddExtraction}
                className="h-7 text-xs gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {data.extractions?.map((extraction, index) => (
                <div
                  key={index}
                  className="border border-border rounded-md p-3 space-y-3 bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={extraction.key || ""}
                      onChange={(e) =>
                        handleExtractionChange(index, "key", e.target.value)
                      }
                      placeholder="Key name"
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveExtraction(index)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      JSONPath
                    </Label>
                    <Input
                      type="text"
                      value={extraction.path || ""}
                      onChange={(e) =>
                        handleExtractionChange(index, "path", e.target.value)
                      }
                      placeholder="$.path.to.value"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Fallback Value
                    </Label>
                    <Input
                      type="text"
                      value={extraction.fallback || ""}
                      onChange={(e) =>
                        handleExtractionChange(
                          index,
                          "fallback",
                          e.target.value,
                        )
                      }
                      placeholder="Optional fallback value"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ))}

              {(!data.extractions || data.extractions.length === 0) && (
                <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
                  No extractions configured. Click "Add" to create one.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Output Format
            </Label>
            <Select
              value={data.outputFormat || "object"}
              onValueChange={handleOutputFormatChange}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="object" className="text-xs">
                  Object (Key-Value Pairs)
                </SelectItem>
                <SelectItem value="array" className="text-xs">
                  Array (Values Only)
                </SelectItem>
                <SelectItem value="singleValue" className="text-xs">
                  Single Value (First Extraction)
                </SelectItem>
              </SelectContent>
            </Select>
            {data.outputFormat === "singleValue" && (
              <p className="text-xs text-muted-foreground mt-1">
                Only the first extraction will be returned as a single value
              </p>
            )}
          </div>

          <div className="flex items-center justify-between py-2">
            <Label
              htmlFor="strict-mode"
              className="text-xs font-medium text-muted-foreground cursor-pointer"
            >
              Strict Mode
            </Label>
            <Switch
              id="strict-mode"
              checked={data.strictMode || false}
              onCheckedChange={handleStrictModeToggle}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <Label
              htmlFor="set-as-variables"
              className="text-xs font-medium text-muted-foreground cursor-pointer"
            >
              Set to Variables
            </Label>
            <Switch
              id="set-as-variables"
              checked={data.setAsVariables || false}
              onCheckedChange={handleSetAsVariablesToggle}
            />
          </div>

          {data.output && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Output Preview
              </Label>
              <div className="border border-border rounded-md p-2 bg-muted max-h-[120px] overflow-auto">
                <pre className="text-xs whitespace-pre font-mono text-foreground min-w-0">
                  {typeof data.output === "string"
                    ? data.output
                    : JSON.stringify(data.output, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <NodeStatusFooter
          status={data.status}
          error={data.error}
          executionTime={data.executionTime}
          runningText="Extracting..."
          successText="Complete"
          skipReason={data.skipReason}
        />

        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="bg-orange-500! w-3.5! h-3.5! border-4! border-background! shadow-sm"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="bg-orange-500! w-3.5! h-3.5! border-4! border-background! shadow-sm"
        />
      </NodeContainer>
    );
  },
);

JSONExtractorNode.displayName = "JSONExtractorNode";
