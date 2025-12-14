import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelListItem } from "./model-list-item";
import type { Model } from "../types";

type ModelProviderSectionProps = {
  providerName: string;
  models: Model[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedModelId?: string;
  onModelSelect: (modelId: string, provider: string) => void;
  disabled?: boolean;
};

export const ModelProviderSection = ({
  providerName,
  models,
  isExpanded,
  onToggle,
  selectedModelId,
  onModelSelect,
  disabled = false,
}: ModelProviderSectionProps) => {
  return (
    <div className="mb-1">
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        className="w-full justify-between px-3 py-2 h-auto font-medium"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>{providerName}</span>
          <span className="text-xs text-muted-foreground">
            ({models.length})
          </span>
        </div>
      </Button>

      {isExpanded && (
        <div className="ml-6 mt-1 space-y-0.5">
          {models.map((model) => (
            <ModelListItem
              key={model.id}
              model={model}
              isSelected={selectedModelId === model.id}
              onClick={() => onModelSelect(model.id, model.provider)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};
