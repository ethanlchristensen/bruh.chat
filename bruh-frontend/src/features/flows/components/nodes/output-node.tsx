import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  FileOutput,
  FileText,
  Braces,
  Code,
  Copy,
  Download,
} from "lucide-react";
import type { OutputNodeData } from "@/types/flow.types";
import { MarkdownRenderer } from "@/components/markdown/markdown";
import { NodeContainer } from "./shared/node-container";
import { NodeHeader } from "./shared/node-header";
import { NodeStatusFooter } from "./shared/node-status-footer";

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
    <NodeContainer selected={selected}>
      <NodeHeader icon={Icon} label={data.label} />

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

      <NodeStatusFooter
        status={data.status}
        error={data.error}
        executionTime={data.executionTime}
        runningText="Running..."
        successText="Complete"
        skipReason={data.skipReason}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="bg-primary! w-3.5! h-3.5! border-4! border-background! shadow-sm"
      />
    </NodeContainer>
  );
});

OutputNode.displayName = "OutputNode";
