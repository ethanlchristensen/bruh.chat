import { memo, useCallback } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import {
  Braces,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { JSONExtractorNodeData } from "@/types/flow.types";

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

    const handleStrictModeToggle = useCallback(() => {
      updateNodeData(id, { strictMode: !data.strictMode });
    }, [id, data.strictMode, updateNodeData]);

    const handleOutputFormatChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateNodeData(id, {
          outputFormat: e.target.value as "object" | "array",
        });
      },
      [id, updateNodeData],
    );

    return (
      <div
        className={`
      bg-card rounded-lg shadow-lg text-left overflow-hidden
      ${selected ? "border-2 border-orange-500" : "border-2 border-border"}
    `}
      >
        <div className="bg-orange-500 text-white px-4 py-2 rounded-t-md font-medium flex items-center gap-2">
          <Braces className="w-4 h-4" />
          <span>{data.label}</span>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Extractions
              </label>
              <button
                onClick={handleAddExtraction}
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {data.extractions?.map((extraction, index) => (
                <div
                  key={index}
                  className="border border-border rounded p-2 space-y-2 bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={extraction.key || ""}
                      onChange={(e) =>
                        handleExtractionChange(index, "key", e.target.value)
                      }
                      placeholder="Key name"
                      className="flex-1 border border-input bg-background rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      onClick={() => handleRemoveExtraction(index)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={extraction.path || ""}
                    onChange={(e) =>
                      handleExtractionChange(index, "path", e.target.value)
                    }
                    placeholder="$.path.to.value"
                    className="w-full border border-input bg-background rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                  />
                  <input
                    type="text"
                    value={extraction.fallback || ""}
                    onChange={(e) =>
                      handleExtractionChange(index, "fallback", e.target.value)
                    }
                    placeholder="Fallback value (optional)"
                    className="w-full border border-input bg-background rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              ))}

              {(!data.extractions || data.extractions.length === 0) && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No extractions configured. Click "Add" to create one.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Output Format
            </label>
            <select
              value={data.outputFormat || "object"}
              onChange={handleOutputFormatChange}
              className="w-full border border-input bg-background rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="object">Object</option>
              <option value="array">Array</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Strict Mode
            </label>
            <button
              onClick={handleStrictModeToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                data.strictMode ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  data.strictMode ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {data.output && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Output Preview
              </label>
              <div className="border border-border rounded p-2 bg-muted max-h-[120px] overflow-auto">
                <pre className="text-xs whitespace-pre font-mono text-foreground min-w-0">
                  {typeof data.output === "string"
                    ? data.output
                    : JSON.stringify(data.output, null, 2)}
                </pre>
              </div>
            </div>
          )}
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
                Extracting...
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
          className="bg-orange-500! w-3! h-3!"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="bg-orange-500! w-3! h-3!"
        />
      </div>
    );
  },
);

JSONExtractorNode.displayName = "JSONExtractorNode";
