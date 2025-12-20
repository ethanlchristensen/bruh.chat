import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useUserAvailableModels,
  useOpenRouterModelsByProvider,
  useOpenRouterStructuredModelsByProvider,
  useOpenRouterImageModelsByProvider,
  useAddModel,
  useOllamaModels,
  useOllamaStructuredModelsByFamily,
  useOllamaStatus,
} from "./models";
import { useModelSelectorState } from "./hooks/use-model-selector-state";
import { useCombinedModels } from "./hooks/use-combined-models";
import { ModelSelectorButton } from "./components/model-selector-button";
import { UserModelsDropdown } from "./components/user-models-dropdown";
import { ProviderModelsDropdown } from "./components/provider-models-dropdown";
import { AddModelsDialog } from "./components/add-models-dialog";
import type { ModelSelectorProps } from "./types";

export const ModelSelector = ({
  selectedModelId,
  onModelSelect,
  variant = "user-models",
  structuredOutputOnly = false,
  imageOnly = false,
  provider = "both",
}: ModelSelectorProps) => {
  const state = useModelSelectorState();
  const addModelMutation = useAddModel();

  const { data: userModels, isLoading: isLoadingUserModels } =
    useUserAvailableModels({ enabled: variant === "user-models" });

  const { data: ollamaStatus } = useOllamaStatus({
    enabled: provider === "ollama" || provider === "both",
  });

  const {
    data: allModelsByProvider,
    isLoading: isLoadingAllModels,
    refetch: fetchAllModels,
  } = useOpenRouterModelsByProvider({
    enabled:
      (variant === "by-provider" || state.showAddModel) &&
      !structuredOutputOnly &&
      !imageOnly &&
      (provider === "openrouter" || provider === "both"),
  });

  const {
    data: structuredModelsByProvider,
    isLoading: isLoadingStructuredModels,
  } = useOpenRouterStructuredModelsByProvider({
    enabled:
      (variant === "by-provider" || state.showAddModel) &&
      structuredOutputOnly &&
      !imageOnly &&
      (provider === "openrouter" || provider === "both"),
  });

  const {
    data: imageModelsByProvider,
    isLoading: isLoadingImageModels,
    refetch: fetchImageModels,
  } = useOpenRouterImageModelsByProvider({
    enabled:
      (variant === "by-provider" || state.showAddModel) &&
      imageOnly &&
      (provider === "openrouter" || provider === "both"),
  });

  const { data: ollamaModelsByFamily, isLoading: isLoadingOllamaModels } =
    structuredOutputOnly
      ? useOllamaStructuredModelsByFamily({
          enabled:
            ollamaStatus?.running &&
            !imageOnly &&
            (variant === "by-provider" || state.showAddModel) &&
            (provider === "ollama" || provider === "both"),
        })
      : useOllamaModels({
          enabled:
            ollamaStatus?.running &&
            !imageOnly &&
            (variant === "by-provider" || state.showAddModel) &&
            (provider === "ollama" || provider === "both"),
        });

  const { filteredModels } = useCombinedModels({
    allModelsByProvider,
    structuredModelsByProvider,
    imageModelsByProvider,
    ollamaModelsByFamily,
    provider,
    ollamaStatus,
    structuredOutputOnly,
    imageOnly,
    searchQuery: state.searchQuery,
  });

  const isLoading = imageOnly
    ? isLoadingImageModels
    : structuredOutputOnly
      ? isLoadingStructuredModels || isLoadingOllamaModels
      : isLoadingAllModels || isLoadingOllamaModels;

  useEffect(() => {
    if (state.searchQuery.trim() && filteredModels) {
      state.setExpandedProviders(new Set(Object.keys(filteredModels)));
    }
  }, [state.searchQuery, filteredModels]);

  const selectedModel = Array.isArray(userModels)
    ? userModels.find((m) => m.id === selectedModelId)
    : undefined;

  const handleShowAddModels = () => {
    state.setShowAddModel(true);
    state.setIsOpen(false);
    if (provider === "openrouter" || provider === "both") {
      if (imageOnly) {
        fetchImageModels();
      } else if (!structuredOutputOnly) {
        fetchAllModels();
      }
    }
  };

  const handleAddModel = (modelId: string, modelProvider: string) => {
    if (variant === "user-models") {
      addModelMutation.mutate(
        { modelId, provider: modelProvider },
        {
          onSuccess: () => {
            onModelSelect(modelId, modelProvider);
            state.setShowAddModel(false);
            state.resetState();
          },
        },
      );
    } else {
      onModelSelect(modelId, modelProvider);
      state.setIsOpen(false);
      state.resetState();
    }
  };

  if (variant === "by-provider") {
    return (
      <div className="relative">
        <ModelSelectorButton
          label={selectedModelId || "Select a model"}
          onClick={() => state.setIsOpen(!state.isOpen)}
        />

        {state.isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => state.setIsOpen(false)}
            />
            <ProviderModelsDropdown
              searchQuery={state.searchQuery}
              onSearchChange={state.setSearchQuery}
              expandedProviders={state.expandedProviders}
              onToggleProvider={state.toggleProvider}
              filteredModels={filteredModels}
              isLoading={isLoading}
              selectedModelId={selectedModelId}
              onModelSelect={handleAddModel}
              onClose={() => state.setIsOpen(false)}
              structuredOutputOnly={structuredOutputOnly}
              ollamaStatus={ollamaStatus}
              provider={provider}
              imageOnly={imageOnly}
            />
          </>
        )}
      </div>
    );
  }

  if (isLoadingUserModels) {
    return (
      <div className="text-sm text-muted-foreground">Loading models...</div>
    );
  }

  if (!userModels || userModels.length === 0) {
    return (
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={handleShowAddModels}
          className="flex items-center gap-2 px-3 py-1.5 h-auto"
        >
          <Plus className="h-4 w-4" />
          Add a model
        </Button>

        {state.showAddModel && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => state.setShowAddModel(false)}
            />
            <AddModelsDialog
              searchQuery={state.searchQuery}
              onSearchChange={state.setSearchQuery}
              expandedProviders={state.expandedProviders}
              onToggleProvider={state.toggleProvider}
              filteredModels={filteredModels}
              isLoading={isLoading}
              onAddModel={handleAddModel}
              addModelMutation={addModelMutation}
              onClose={() => state.setShowAddModel(false)}
              ollamaStatus={ollamaStatus}
              provider={provider}
              imageOnly={imageOnly}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <ModelSelectorButton
        label={selectedModel ? selectedModel.name : "Select a model"}
        onClick={() => state.setIsOpen(!state.isOpen)}
      />

      {state.isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => state.setIsOpen(false)}
          />
          <UserModelsDropdown
            models={userModels}
            selectedModelId={selectedModelId}
            onModelSelect={onModelSelect}
            onClose={() => state.setIsOpen(false)}
            onAddModels={handleShowAddModels}
          />
        </>
      )}

      {state.showAddModel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => state.setShowAddModel(false)}
          />
          <AddModelsDialog
            searchQuery={state.searchQuery}
            onSearchChange={state.setSearchQuery}
            expandedProviders={state.expandedProviders}
            onToggleProvider={state.toggleProvider}
            filteredModels={filteredModels}
            isLoading={isLoading}
            onAddModel={handleAddModel}
            addModelMutation={addModelMutation}
            onClose={() => state.setShowAddModel(false)}
            ollamaStatus={ollamaStatus}
            provider={provider}
            imageOnly={imageOnly}
          />
        </>
      )}
    </div>
  );
};
