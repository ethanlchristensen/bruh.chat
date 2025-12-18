import { memo, useCallback } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import { TextCursorInput, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { InputNodeData } from "@/types/flow.types";

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
      <>
        <div
          className={`
      bg-card rounded-lg shadow-lg text-left
      ${selected ? "border-2 border-primary" : "border-2 border-border"}
      ${selected ? "border-2 border-primary" : "border border-border"}
      ${data.status === "running" ? "node-running" : ""}
      ${data.status === "success" ? "node-success" : ""}
      ${data.status === "error" ? "node-error" : ""}
    `}
        >
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-t-md font-medium flex items-center gap-2">
            <TextCursorInput className="w-4 h-4" />
            <span>{data.label}</span>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Variable Name
              </label>
              <input
                type="text"
                value={data.variableName || ""}
                onChange={handleVariableNameChange}
                placeholder="e.g., userInput"
                className="w-full border border-input bg-background rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Use alphanumeric characters and underscores only
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Placeholder Text
              </label>
              <input
                type="text"
                value={data.placeholder || ""}
                onChange={handlePlaceholderChange}
                placeholder="Enter placeholder..."
                className="w-full border border-input bg-background rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Value Preview
              </label>
              {data.multiline ? (
                <textarea
                  value={data.value || ""}
                  onChange={handleValueChange}
                  placeholder={data.placeholder}
                  className="w-full border border-input bg-background rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={4}
                />
              ) : (
                <input
                  type="text"
                  value={data.value || ""}
                  onChange={handleValueChange}
                  placeholder={data.placeholder}
                  className="w-full border border-input bg-background rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
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
                  Running...
                </>
              ) : data.status === "success" ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Complete
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
            type="source"
            position={Position.Right}
            id="output"
            className="bg-primary! w-3! h-3!"
          />
        </div>
      </>
    );
  },
);

InputNode.displayName = "InputNode";
