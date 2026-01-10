import { useState, useMemo } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
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
  const [searchQuery, setSearchQuery] = useState("");

  // Group models by provider and filter by search
  const { openrouterModels, ollamaModels, hasResults } = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const filtered = query
      ? models.filter(
          (model) =>
            model.name.toLowerCase().includes(query) ||
            model.id.toLowerCase().includes(query) ||
            model.provider.toLowerCase().includes(query),
        )
      : models;

    const openrouter = filtered.filter((m) => m.provider === "openrouter");
    const ollama = filtered.filter((m) => m.provider === "ollama");

    return {
      openrouterModels: openrouter,
      ollamaModels: ollama,
      hasResults: filtered.length > 0,
    };
  }, [models, searchQuery]);

  return (
    <div className="absolute bottom-full mb-2 left-0 w-96 bg-popover border rounded-lg shadow-lg z-50 flex flex-col max-h-96">
      {/* Header with Add Button and Search */}
      <div className="p-3 border-b space-y-2 bg-popover">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Your Models</h3>
            <p className="text-xs text-muted-foreground">
              {models.length} model{models.length !== 1 ? "s" : ""} added
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddModels}
            className="gap-1.5 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search your models..."
        />
      </div>

      {/* Scrollable Models List */}
      <div className="overflow-y-auto flex-1">
        {!hasResults ? (
          <div className="p-4 text-sm text-center text-muted-foreground">
            No models found
          </div>
        ) : (
          <div className="p-1">
            {/* OpenRouter Models */}
            {openrouterModels.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  OpenRouter ({openrouterModels.length})
                </div>
                <div className="space-y-0.5">
                  {openrouterModels.map((model) => (
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
              </div>
            )}

            {/* Ollama Models */}
            {ollamaModels.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Ollama ({ollamaModels.length})
                </div>
                <div className="space-y-0.5">
                  {ollamaModels.map((model) => (
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
