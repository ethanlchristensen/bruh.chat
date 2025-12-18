import { useState } from "react";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FlowNode } from "@/types/flow.types";

interface ExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecute: (initialInput: Record<string, any>) => void;
  nodes: FlowNode[];
  isExecuting: boolean;
}

export function ExecutionDialog({
  open,
  onOpenChange,
  onExecute,
  nodes,
  isExecuting,
}: ExecutionDialogProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const inputNodes = nodes.filter((node) => node.type === "input");

  const handleExecute = () => {
    const initialInput: Record<string, any> = {};

    inputNodes.forEach((node) => {
      const variableName = (node.data as any).variableName || node.id;
      initialInput[variableName] =
        inputValues[node.id] || (node.data as any).value || "";
    });

    onExecute(initialInput);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Execute Flow</DialogTitle>
          <DialogDescription>
            {inputNodes.length > 0
              ? "Provide input values to start the flow execution."
              : "Ready to execute this flow."}
          </DialogDescription>
        </DialogHeader>

        {inputNodes.length > 0 && (
          <div className="space-y-4 py-4">
            {inputNodes.map((node) => {
              const nodeData = node.data as any;
              return (
                <div key={node.id} className="space-y-2">
                  <Label htmlFor={node.id}>
                    {nodeData.label || "Input"}{" "}
                    {nodeData.variableName && (
                      <span className="text-muted-foreground text-xs">
                        ({nodeData.variableName})
                      </span>
                    )}
                  </Label>
                  <Textarea
                    id={node.id}
                    placeholder={nodeData.placeholder || "Enter value..."}
                    value={inputValues[node.id] || nodeData.value || ""}
                    onChange={(e) =>
                      setInputValues((prev) => ({
                        ...prev,
                        [node.id]: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button onClick={handleExecute} disabled={isExecuting}>
            <Play className="w-4 h-4 mr-2" />
            {isExecuting ? "Starting..." : "Execute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
