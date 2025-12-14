import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelListItem } from "./model-list-item";
import type { Model } from "../types";

type UserModelsDropdownProps = {
  models: Model[];
  selectedModelId?: string;
  onModelSelect: (modelId: string, provider: string) => void;
  onClose: () => void;
  onAddModels: () => void;
};

export const UserModelsDropdown = ({
  models,
  selectedModelId,
  onModelSelect,
  onClose,
  onAddModels,
}: UserModelsDropdownProps) => {
  return (
    <div className="absolute bottom-full mb-2 left-0 w-full min-w-[250px] bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
      <div className="p-1">
        {models.map((model) => (
          <ModelListItem
            key={model.id}
            model={model}
            isSelected={selectedModelId === model.id}
            onClick={() => {
              onModelSelect(model.id, model.provider);
              onClose();
            }}
          />
        ))}
      </div>
      <div className="border-t p-1">
        <Button
          type="button"
          variant="ghost"
          onClick={onAddModels}
          className="w-full justify-start gap-2 px-3 py-2 h-auto"
        >
          <Plus className="h-4 w-4" />
          Add more models
        </Button>
      </div>
    </div>
  );
};
