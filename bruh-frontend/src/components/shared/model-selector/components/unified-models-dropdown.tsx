import { useMemo, useState } from "react";
import { X, ChevronDown, Pin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { OllamaStatusIndicator } from "./ollama-status-indicator";
import { ModelProviderSection } from "./model-provider-section";
import { ModelListItem } from "./model-list-item";
import type { ModelProvider, Model } from "../types";
import { useRemoveModel, useAddModel } from "../models";
import { cn } from "@/lib/utils";

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

const SectionHeader = ({
  label,
  count,
  open,
  onToggle,
  extra,
}: {
  label: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground tracking-wider uppercase hover:text-foreground transition-colors rounded-sm"
  >
    <ChevronDown
      className={cn("h-3 w-3 transition-transform duration-150", !open && "-rotate-90")}
    />
    <span>{label}</span>
    {count !== undefined && (
      <span className="font-normal normal-case">({count})</span>
    )}
    {extra && <span className="ml-auto">{extra}</span>}
  </button>
);

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
  const addModelMutation = useAddModel();

  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [allModelsOpen, setAllModelsOpen] = useState(false);

  const pinnedIds = useMemo(
    () => new Set(userModels?.map((m) => m.id) ?? []),
    [userModels],
  );

  const pinPendingId =
    (addModelMutation.isPending
      ? addModelMutation.variables?.modelId
      : removeModelMutation.isPending
        ? removeModelMutation.variables?.modelId
        : null) ?? null;

  // Filter pinned models by search
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

  const handlePinToggle = (
    modelId: string,
    modelProvider: string,
    isPinned: boolean,
  ) => {
    if (isPinned) {
      removeModelMutation.mutate({ modelId, provider: modelProvider });
    } else {
      addModelMutation.mutate({ modelId, provider: modelProvider });
    }
  };

  return (
    <div className="absolute bottom-full mb-2 left-0 w-96 bg-popover border rounded-lg shadow-xl z-50 flex flex-col max-h-[28rem]">
      {/* Header & Search */}
      <div className="p-3 border-b space-y-3 bg-card/50 rounded-t-lg shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">
              {imageOnly ? "Select Image Model" : "Select Model"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pinned models appear at the top for quick access
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
      <div className="overflow-y-auto overflow-x-hidden flex-1 p-2 space-y-1">
        {/* ── Pinned Models ── */}
        <div>
          <SectionHeader
            label="Pinned"
            count={filteredUserModels.length}
            open={pinnedOpen}
            onToggle={() => setPinnedOpen(!pinnedOpen)}
          />

          {pinnedOpen && (
            <div className="mt-0.5">
              {filteredUserModels.length === 0 ? (
                <p className="text-xs text-muted-foreground px-4 py-3 italic">
                  No pinned models yet — expand All Models and click{" "}
                  <Pin className="h-3 w-3 inline-block" /> to pin one.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {filteredUserModels.map((model) => (
                    <ModelListItem
                      key={`pinned-${model.id}`}
                      model={model}
                      isSelected={selectedModelId === model.id}
                      onClick={() => onModelSelect(model.id, model.provider)}
                      disabled={isAddingModel}
                      isPinned={true}
                      onPinToggle={(e) => {
                        e.stopPropagation();
                        removeModelMutation.mutate({
                          modelId: model.id,
                          provider: model.provider,
                        });
                      }}
                      pinLoading={
                        removeModelMutation.isPending &&
                        removeModelMutation.variables?.modelId === model.id
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-border mx-2" />

        {/* ── All Models ── */}
        <div>
          <SectionHeader
            label="All Models"
            open={allModelsOpen}
            onToggle={() => setAllModelsOpen(!allModelsOpen)}
            extra={
              isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : undefined
            }
          />

          {allModelsOpen && (
            <div className="mt-0.5">
              <p className="text-xs text-muted-foreground px-4 pb-2">
                Hover a model to pin/unpin it. Selecting a model will also pin
                it.
              </p>

              {isLoading && !filteredModels ? (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  Loading models...
                </div>
              ) : !filteredModels ||
                Object.keys(filteredModels).length === 0 ? (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  No models found
                </div>
              ) : (
                <div className="space-y-1">
                  {Object.entries(filteredModels).map(
                    ([providerName, models]) => (
                      <ModelProviderSection
                        key={`provider-${providerName}`}
                        providerName={providerName}
                        models={models as Model[]}
                        isExpanded={expandedProviders.has(providerName)}
                        onToggle={() => onToggleProvider(providerName)}
                        selectedModelId={selectedModelId}
                        onModelSelect={onModelSelect}
                        disabled={
                          isAddingModel ||
                          addModelMutation.isPending ||
                          removeModelMutation.isPending
                        }
                        pinnedIds={pinnedIds}
                        onPinToggle={handlePinToggle}
                        pinPendingId={pinPendingId}
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
