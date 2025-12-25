import { memo, useState, useMemo } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import { FileCode, Plus, Trash2, Info, Code2, AlertCircle } from "lucide-react";
import type { TemplateNodeData } from "@/types/flow.types";
import { NodeContainer } from "./shared/node-container";
import { NodeHeader } from "./shared/node-header";
import { NodeStatusFooter } from "./shared/node-status-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type TemplateNode = Node<TemplateNodeData>;

export const TemplateNode = memo(
  ({ data, selected, id }: NodeProps<TemplateNode>) => {
    const { updateNodeData } = useReactFlow();
    const [showVariables, setShowVariables] = useState(false);
    const [newVarKey, setNewVarKey] = useState("");
    const [newVarValue, setNewVarValue] = useState("");

    // Extract variables used in template
    const usedVariables = useMemo(() => {
      const matches = data.template.match(/\{\{([^}]+)\}\}/g);
      if (!matches) return [];
      return [...new Set(matches.map((m) => m.slice(2, -2).trim()))];
    }, [data.template]);

    // Check for undefined variables
    const undefinedVariables = useMemo(() => {
      return usedVariables.filter(
        (varName) =>
          varName !== "input" &&
          !varName.startsWith("input.") &&
          !Object.keys(data.variables).some(
            (key) => varName === key || varName.startsWith(`${key}.`),
          ),
      );
    }, [usedVariables, data.variables]);

    const handleTemplateChange = (
      e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
      updateNodeData(id, { template: e.target.value });
    };

    const handleEscapeHtmlChange = (checked: boolean) => {
      updateNodeData(id, { escapeHtml: checked });
    };

    const addVariable = () => {
      if (!newVarKey.trim()) return;

      const newVariables = { ...data.variables };

      // Try to parse value as JSON, fallback to string
      let value: any = newVarValue;
      try {
        value = JSON.parse(newVarValue);
      } catch {
        // Keep as string
      }

      newVariables[newVarKey.trim()] = value;
      updateNodeData(id, { variables: newVariables });
      setNewVarKey("");
      setNewVarValue("");
    };

    const removeVariable = (key: string) => {
      const newVariables = { ...data.variables };
      delete newVariables[key];
      updateNodeData(id, { variables: newVariables });
    };

    const updateVariable = (key: string, value: string) => {
      const newVariables = { ...data.variables };

      // Try to parse value as JSON, fallback to string
      let parsedValue: any = value;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // Keep as string
      }

      newVariables[key] = parsedValue;
      updateNodeData(id, { variables: newVariables });
    };

    const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
      e.stopPropagation();
    };

    return (
      <NodeContainer selected={selected}>
        <NodeHeader icon={FileCode} label={data.label} />

        <div
          className="p-4 space-y-3"
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        >
          {/* Template Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Template</Label>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Code2 className="w-3 h-3" />
                Use {`{{variable}}`}
              </div>
            </div>
            <Textarea
              value={data.template}
              onChange={handleTemplateChange}
              onPointerDown={stopPropagation}
              onMouseDown={stopPropagation}
              placeholder="Hello {{name}}, welcome to {{app.name}}!"
              className="text-xs font-mono min-h-[100px] resize-none"
            />
          </div>

          {/* Used Variables Info */}
          {usedVariables.length > 0 && (
            <div className="text-xs bg-muted rounded p-2">
              <div className="font-medium text-muted-foreground mb-1">
                Variables in template:
              </div>
              <div className="flex flex-wrap gap-1">
                {usedVariables.map((varName) => {
                  const isUndefined =
                    varName !== "input" &&
                    !varName.startsWith("input.") &&
                    !Object.keys(data.variables).some(
                      (key) => varName === key || varName.startsWith(`${key}.`),
                    );
                  return (
                    <span
                      key={varName}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono ${
                        isUndefined
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {isUndefined && <AlertCircle className="w-3 h-3" />}
                      {varName}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Undefined Variables Warning */}
          {undefinedVariables.length > 0 && (
            <div className="text-xs bg-destructive/10 text-destructive rounded p-2 flex items-start gap-2">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Undefined variables:</div>
                <div>{undefinedVariables.join(", ")}</div>
                <div className="text-muted-foreground mt-1">
                  These will be replaced with empty strings or looked up in flow
                  variables.
                </div>
              </div>
            </div>
          )}

          {/* HTML Escape Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor={`${id}-escape`} className="text-xs font-medium">
              Escape HTML
            </Label>
            <Switch
              id={`${id}-escape`}
              checked={data.escapeHtml}
              onCheckedChange={handleEscapeHtmlChange}
              onClick={stopPropagation}
              className="scale-75"
            />
          </div>

          {/* Variables Section */}
          <Collapsible open={showVariables} onOpenChange={setShowVariables}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs justify-between"
              >
                <span>Variables ({Object.keys(data.variables).length})</span>
                <Plus className="w-3 h-3" />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-2 mt-2">
              {/* Info */}
              <div className="text-xs text-muted-foreground bg-muted rounded p-2 flex items-start gap-1.5">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                <div>
                  Define custom variables here. Use {`{{variableName}}`} in your
                  template. Supports nested access like {`{{user.name}}`}.
                </div>
              </div>

              {/* Existing Variables */}
              {Object.entries(data.variables).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-start gap-2 p-2 border rounded bg-background"
                >
                  <div className="flex-1 space-y-1">
                    <div className="text-xs font-mono font-medium text-foreground">
                      {key}
                    </div>
                    <Input
                      value={
                        typeof value === "string"
                          ? value
                          : JSON.stringify(value)
                      }
                      onChange={(e) => updateVariable(key, e.target.value)}
                      onPointerDown={stopPropagation}
                      onMouseDown={stopPropagation}
                      placeholder="Value (JSON or string)"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <Button
                    onClick={() => removeVariable(key)}
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}

              {/* Add New Variable */}
              <div className="space-y-2 p-2 border border-dashed rounded">
                <div className="text-xs font-medium text-muted-foreground">
                  Add Variable
                </div>
                <Input
                  value={newVarKey}
                  onChange={(e) => setNewVarKey(e.target.value)}
                  onPointerDown={stopPropagation}
                  onMouseDown={stopPropagation}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addVariable();
                    }
                  }}
                  placeholder="Variable name"
                  className="h-7 text-xs"
                />
                <Input
                  value={newVarValue}
                  onChange={(e) => setNewVarValue(e.target.value)}
                  onPointerDown={stopPropagation}
                  onMouseDown={stopPropagation}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addVariable();
                    }
                  }}
                  placeholder='Value (e.g., "text" or {"key": "value"})'
                  className="h-7 text-xs font-mono"
                />
                <Button
                  onClick={addVariable}
                  disabled={!newVarKey.trim()}
                  size="sm"
                  className="w-full h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Variable
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Output Preview */}
          {data.output! && (
            <div className="border border-border rounded p-2 bg-muted">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Output Preview
              </div>
              <pre className="text-xs whitespace-pre-wrap text-foreground max-h-[100px] overflow-auto">
                {typeof data.output === "string"
                  ? data.output.slice(0, 300) +
                    (data.output.length > 300 ? "..." : "")
                  : JSON.stringify(data.output, null, 2).slice(0, 300)}
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

TemplateNode.displayName = "TemplateNode";
