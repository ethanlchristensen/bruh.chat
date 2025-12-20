import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Image, Download, Loader2 } from "lucide-react";
import type { ImageOutputNodeData } from "@/types/flow.types";
import { NodeContainer } from "./shared/node-container";
import { NodeHeader } from "./shared/node-header";
import { NodeStatusFooter } from "./shared/node-status-footer";

type ImageOutputNode = Node<ImageOutputNodeData>;

interface ImageOutputData {
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  model?: string;
}

const ImageGenerationLoader = () => (
  <div className="relative w-full h-full min-h-60 overflow-hidden bg-muted/20">
    <div className="absolute inset-0 opacity-50 dark:opacity-40">
      <div className="copilot-blob blob-1" />
      <div className="copilot-blob blob-2" />
      <div className="copilot-blob blob-3" />
      <div className="copilot-blob blob-4" />
      <div className="copilot-blob blob-5" />
    </div>

    <div className="absolute inset-0 copilot-grain opacity-20 pointer-events-none" />

    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-primary/80">
      <div className="relative">
        <div className="absolute inset-0 bg-background/50 blur-xl rounded-full" />
        <Loader2 className="w-8 h-8 animate-spin relative z-10" />
      </div>
      <span className="mt-3 text-xs font-medium tracking-wide animate-pulse">
        GENERATING...
      </span>
    </div>
  </div>
);

export const ImageOutputNode = memo(
  ({ data, selected }: NodeProps<ImageOutputNode>) => {
    const imageData =
      typeof data.output === "object" && data.output !== null
        ? (data.output as ImageOutputData)
        : null;

    const imageUrl = imageData?.imageUrl;
    const prompt = imageData?.prompt;
    const aspectRatio = imageData?.aspectRatio;

    const handleDownload = async () => {
      if (!imageUrl) return;
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.downloadFilename || `image-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to download image:", error);
      }
    };

    return (
      <NodeContainer selected={selected}>
        <NodeHeader icon={Image} label={data.label} />

        <div className="p-4">
          {imageUrl ? (
            <div className="space-y-3 animate-in fade-in duration-500">
              <div className="relative group rounded-lg overflow-hidden border border-border shadow-sm bg-muted/50">
                <img
                  src={imageUrl}
                  alt={data.alt || "Generated image"}
                  className="w-full h-auto object-cover"
                  style={{
                    maxWidth: data.maxWidth ? `${data.maxWidth}px` : undefined,
                    maxHeight: data.maxHeight
                      ? `${data.maxHeight}px`
                      : undefined,
                  }}
                />
                {data.downloadable && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={handleDownload}
                      className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-md backdrop-blur-sm transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {(data.showPrompt && prompt) || aspectRatio ? (
                <div className="space-y-2">
                  {data.showPrompt && prompt && (
                    <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md border border-border/50">
                      <span className="font-semibold text-foreground/80">
                        Prompt:
                      </span>{" "}
                      {prompt}
                    </div>
                  )}
                  {aspectRatio && (
                    <div className="flex gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {aspectRatio}
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="border border-border/50 rounded-lg overflow-hidden min-h-60">
              {data.status === "running" ? (
                <ImageGenerationLoader />
              ) : (
                <div className="bg-muted/30 h-full min-h-60 flex items-center justify-center text-sm text-muted-foreground/60 italic">
                  No image generated
                </div>
              )}
            </div>
          )}
        </div>

        <NodeStatusFooter
          status={data.status}
          error={data.error}
          executionTime={data.executionTime}
          runningText="Processing..."
          successText="Generation Complete"
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
  },
);

ImageOutputNode.displayName = "ImageOutputNode";
