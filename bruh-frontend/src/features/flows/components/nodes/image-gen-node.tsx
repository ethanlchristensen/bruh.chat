import { memo } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import { Zap, Info } from "lucide-react";
import type { ImageGenNodeData } from "@/types/flow.types";
import type { AspectRatio } from "@/types/image.types";
import { ModelSelector } from "@/components/shared/model-selector/model-selector";
import { modelSupportsAspectRatio } from "@/components/shared/model-selector/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeContainer } from "./shared/node-container";
import { NodeHeader } from "./shared/node-header";
import { NodeStatusFooter } from "./shared/node-status-footer";

type ImageGenNode = Node<ImageGenNodeData>;

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "4:3", label: "4:3 (Standard)" },
  { value: "3:4", label: "3:4 (Portrait)" },
  { value: "21:9", label: "21:9 (Ultrawide)" },
];

export const ImageGenNode = memo(
  ({ data, selected, id }: NodeProps<ImageGenNode>) => {
    const { updateNodeData } = useReactFlow();
    const supportsAspectRatio = modelSupportsAspectRatio(data.model);

    const handleModelSelect = (modelId: string, provider: string) => {
      updateNodeData(id, {
        model: modelId,
        provider: provider as "openrouter",
      });
    };

    const handleAspectRatioChange = (aspectRatio: AspectRatio) => {
      updateNodeData(id, { aspectRatio });
    };

    return (
      <NodeContainer selected={selected}>
        {!data.model && (
          <div className="text-xs text-amber-600 dark:text-amber-400 px-4 py-2 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900 rounded-t-xl">
            <Info className="w-3 h-3" />
            Please select a model to continue
          </div>
        )}

        <NodeHeader icon={Zap} label={data.label} />

        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Model
            </div>
            <ModelSelector
              selectedModelId={data.model}
              onModelSelect={handleModelSelect}
              variant="by-provider"
              imageOnly={true}
              provider="openrouter"
            />
          </div>

          {supportsAspectRatio && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Aspect Ratio
              </div>
              <Select
                value={(data.aspectRatio as string) ?? "1:1"}
                onValueChange={handleAspectRatioChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {data.provider && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Provider
              </div>
              <div className="text-sm font-medium capitalize text-foreground">
                {data.provider}
              </div>
            </div>
          )}
        </div>

        <NodeStatusFooter
          status={data.status}
          error={data.error}
          executionTime={data.executionTime}
          runningText="Processing..."
          successText="Complete"
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

ImageGenNode.displayName = "ImageGenNode";
