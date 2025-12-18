// src/features/flows/components/nodes/output-node.tsx
import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  FileOutput,
  FileText,
  Braces,
  Code,
  Copy,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { OutputNodeData } from "@/types/flow.types";
import { MarkdownRenderer } from "@/components/markdown/markdown";

type OutputNode = Node<OutputNodeData>;

export const OutputNode = memo(({ data, selected }: NodeProps<OutputNode>) => {
  const Icon =
    data.format === "markdown"
      ? FileText
      : data.format === "json"
        ? Braces
        : data.format === "code"
          ? Code
          : FileOutput;

  const outputContent =
    typeof data.output === "string"
      ? data.output
      : JSON.stringify(data.output, null, 2);

  const handleCopy = () => {
    if (data.output) {
      navigator.clipboard.writeText(outputContent);
    }
  };

  const handleDownload = () => {
    if (data.output) {
      const blob = new Blob([outputContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.downloadFilename || "output.txt";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      className={`
      bg-card rounded-lg shadow-lg text-left
      ${selected ? "border-2 border-primary" : "border-2 border-border"}
      ${data.status === "running" ? "node-running" : ""}
      ${data.status === "success" ? "node-success" : ""}
      ${data.status === "error" ? "node-error" : ""}
    `}
    >
      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-t-md font-medium flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span>{data.label}</span>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground">
            Format:{" "}
            <span className="font-medium capitalize text-foreground">
              {data.format}
            </span>
          </div>
          {data.copyable && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              onClick={handleCopy}
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          )}
        </div>

        <div className="border border-border rounded p-3 bg-muted min-h-20 max-h-[200px] overflow-auto text-sm">
          {data.output ? (
            data.format === "markdown" ? (
              <MarkdownRenderer content={outputContent} />
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">
                {outputContent}
              </pre>
            )
          ) : (
            <span className="text-muted-foreground">Waiting for input...</span>
          )}
        </div>

        {!!data.downloadable && !!data.output && (
          <button
            className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            onClick={handleDownload}
          >
            <Download className="w-3 h-3" />
            Download
          </button>
        )}
      </div>

      {data.status !== "idle" && (
        <div
          className={`px-4 py-2 text-xs border-t border-border flex items-center gap-1.5 rounded-b ${
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
        type="target"
        position={Position.Left}
        id="input"
        className="bg-primary! w-3! h-3!"
      />
    </div>
  );
});

OutputNode.displayName = "OutputNode";
