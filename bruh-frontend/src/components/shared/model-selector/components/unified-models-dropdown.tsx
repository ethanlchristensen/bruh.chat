import { useMemo } from "react";
import { X, PinOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { OllamaStatusIndicator } from "./ollama-status-indicator";
import { ModelProviderSection } from "./model-provider-section";
import { ModelListItem } from "./model-list-item";
import type { ModelProvider, Model } from "../types";
import { useRemoveModel } from "../models";

type UnifiedModelsDropdownProps = {
  userModels: Model[] | undefined;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  expandedProviders: Set<string>;
  onToggleProvider: (provider: string) => void;
  filteredModels: Record<string, any[]> | undefined;
  isLoading: boolean;
  selectedModelId?: string;
  onModelSelect: (modelId: string, provider: string) => void;
  onClose: () => void;
  ollamaStatus: { running: boolean } | undefined;
  provider: ModelProvider;
  imageOnly: boolean;
  isAddingModel: boolean;
};

export const UnifiedModelsDropdown = ({
  userModels,
  searchQuery,
  onSearchChange,
  expandedProviders,
  onToggleProvider,
  filteredModels,
  isLoading,
  selectedModelId,
  onModelSelect,
  onClose,
  ollamaStatus,
  provider,
  imageOnly,
  isAddingModel,
}: UnifiedModelsDropdownProps) => {
  const removeModelMutation = useRemoveModel();

  // Filter pinned models if there is a search query
  const filteredUserModels = useMemo(() => {
    if (!userModels) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return userModels;

    return userModels.filter(
      (model) =>
        model.name.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query),
    );
  }, [userModels, searchQuery]);

  return (
    <div className="absolute bottom-full mb-2 left-0 w-96 bg-popover border rounded-lg shadow-xl z-50 flex flex-col max-h-[32rem]">
      {/* Header & Search */}
      <div className="p-3 border-b space-y-3 bg-card/50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">
              {imageOnly ? "Select Image Model" : "Select Model"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Search or browse all available models
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {(provider === "ollama" || provider === "both") && !imageOnly && (
          <OllamaStatusIndicator status={ollamaStatus} />
        )}

        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search models or providers..."
        />
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto flex-1 p-2 space-y-4">
        {/* Pinned Models Section */}
        {filteredUserModels.length > 0 && (
          <div>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Pinned Models
            </div>
            <div className="space-y-0.5">
              {filteredUserModels.map((model) => (
                <div key={`pinned-${model.id}`} className="relative group">
                  <ModelListItem
                    model={model}
                    isSelected={selectedModelId === model.id}
                    onClick={() => onModelSelect(model.id, model.provider)}
                    disabled={isAddingModel}
                  />
                  {/* Unpin Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-8 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-destructive hover:text-destructive-foreground backdrop-blur-sm"
                    title="Unpin model"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeModelMutation.mutate({
                        modelId: model.id,
                        provider: model.provider,
                      });
                    }}
                    disabled={removeModelMutation.isPending}
                  >
                    {removeModelMutation.isPending &&
                    removeModelMutation.variables?.modelId === model.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <PinOff className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Separator if both sections have content and no search query (search query implies unified list view) */}
        {filteredUserModels.length > 0 &&
          filteredModels &&
          Object.keys(filteredModels).length > 0 && (
            <div className="h-px bg-border mx-2" />
          )}

        {/* All Models Section */}
        <div>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground tracking-wider uppercase flex items-center justify-between">
            <span>All Models</span>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>

          {isLoading && !filteredModels ? (
            <div className="p-4 text-sm text-center text-muted-foreground">
              Loading models...
            </div>
          ) : !filteredModels || Object.keys(filteredModels).length === 0 ? (
            <div className="p-4 text-sm text-center text-muted-foreground">
              No other models found
            </div>
          ) : (
            <div className="space-y-1">
              {Object.entries(filteredModels).map(([providerName, models]) => {
                // Filter out models that are already pinned to avoid duplication in the search results
                const unpinnedModels = (models as any[]).filter(
                  (m) => !userModels?.some((um) => um.id === m.id),
                );

                if (unpinnedModels.length === 0) return null;

                return (
                  <ModelProviderSection
                    key={`provider-${providerName}`}
                    providerName={providerName}
                    models={unpinnedModels}
                    isExpanded={expandedProviders.has(providerName)}
                    onToggle={() => onToggleProvider(providerName)}
                    selectedModelId={selectedModelId}
                    onModelSelect={onModelSelect}
                    disabled={isAddingModel}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
