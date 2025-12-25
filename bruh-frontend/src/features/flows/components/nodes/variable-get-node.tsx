import { memo } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import { Database, Info, AlertCircle } from "lucide-react";
import type { VariableGetNodeData } from "@/types/flow.types";
import { NodeContainer } from "./shared/node-container";
import { NodeHeader } from "./shared/node-header";
import { NodeStatusFooter } from "./shared/node-status-footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VariableGetNode = Node<VariableGetNodeData>;

export const VariableGetNode = memo(
  ({ data, selected, id }: NodeProps<VariableGetNode>) => {
    const { updateNodeData } = useReactFlow();

    const handleVariableNameChange = (
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      updateNodeData(id, { variableName: e.target.value });
    };

    const handleFallbackValueChange = (
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      updateNodeData(id, {
        fallbackValue: e.target.value || undefined,
      });
    };

    const isVariableNameEmpty = !data.variableName?.trim();

    return (
      <NodeContainer selected={selected}>
        <NodeHeader icon={Database} label={data.label} />

        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-variable`} className="text-xs font-medium">
              Variable Name *
            </Label>
            <Input
              id={`${id}-variable`}
              value={data.variableName}
              onChange={handleVariableNameChange}
              placeholder="myVariable"
              className={`h-8 text-sm ${
                isVariableNameEmpty ? "border-destructive" : ""
              }`}
            />
            {isVariableNameEmpty && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                <span>Variable name is required</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-fallback`} className="text-xs font-medium">
              Fallback Value (Optional)
            </Label>
            <Input
              id={`${id}-fallback`}
              value={data.fallbackValue ?? ""}
              onChange={handleFallbackValueChange}
              placeholder="Default value if not found"
              className="h-8 text-sm"
            />
          </div>

          {data.variableName && !isVariableNameEmpty && (
            <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              Reading: {data.variableName}
            </div>
          )}

          {data.output !== undefined && (
            <div className="border border-border rounded p-2 bg-muted">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Current Value
              </div>
              <pre className="text-xs whitespace-pre-wrap text-foreground">
                {typeof data.output === "string"
                  ? data.output
                  : JSON.stringify(data.output, null, 2)}
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
          type="source"
          position={Position.Right}
          id="output"
          className="bg-primary! w-3.5! h-3.5! border-4! border-background! shadow-sm"
        />
      </NodeContainer>
    );
  },
);

VariableGetNode.displayName = "VariableGetNode";
