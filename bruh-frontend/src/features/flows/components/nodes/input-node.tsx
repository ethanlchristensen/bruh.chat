import { memo, useCallback } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import { TextCursorInput, Info } from "lucide-react";
import type { InputNodeData } from "@/types/flow.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NodeContainer } from "./shared/node-container";
import { NodeHeader } from "./shared/node-header";
import { NodeStatusFooter } from "./shared/node-status-footer";

type InputNode = Node<InputNodeData>;

export const InputNode = memo(
  ({ data, selected, id }: NodeProps<InputNode>) => {
    const { updateNodeData } = useReactFlow();

    const handleVariableNameChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newValue) || newValue === "") {
          updateNodeData(id, { variableName: newValue });
        }
      },
      [id, updateNodeData],
    );

    const handleValueChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        updateNodeData(id, { value: e.target.value });
      },
      [id, updateNodeData],
    );

    const handlePlaceholderChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(id, { placeholder: e.target.value });
      },
      [id, updateNodeData],
    );

    return (
      <NodeContainer selected={selected}>
        {/* Added Callout Banner */}
        {!data.variableName && (
          <div className="text-xs text-amber-600 dark:text-amber-400 px-4 py-2 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900 rounded-t-xl">
            <Info className="w-3 h-3" />
            Please set a variable name to continue
          </div>
        )}

        <NodeHeader icon={TextCursorInput} label={data.label} />

        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="variable-name"
              className="text-xs font-medium text-muted-foreground"
            >
              Variable Name
            </Label>
            <Input
              id="variable-name"
              type="text"
              value={data.variableName || ""}
              onChange={handleVariableNameChange}
              placeholder="e.g., userInput"
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Use alphanumeric characters and underscores only
            </p>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="placeholder"
              className="text-xs font-medium text-muted-foreground"
            >
              Placeholder Text
            </Label>
            <Input
              id="placeholder"
              type="text"
              value={data.placeholder || ""}
              onChange={handlePlaceholderChange}
              placeholder="Enter placeholder..."
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="value-preview"
              className="text-xs font-medium text-muted-foreground"
            >
              Value Preview
            </Label>
            {data.multiline ? (
              <Textarea
                id="value-preview"
                value={data.value || ""}
                onChange={handleValueChange}
                placeholder={data.placeholder}
                className="text-sm resize-none min-h-20"
                rows={4}
              />
            ) : (
              <Input
                id="value-preview"
                type="text"
                value={data.value || ""}
                onChange={handleValueChange}
                placeholder={data.placeholder}
                className="h-9 text-sm"
              />
            )}
          </div>
        </div>

        <NodeStatusFooter
          status={data.status}
          error={data.error}
          executionTime={data.executionTime}
          runningText="Running..."
          successText="Complete"
          skipReason={data.skipReason}
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

InputNode.displayName = "InputNode";
