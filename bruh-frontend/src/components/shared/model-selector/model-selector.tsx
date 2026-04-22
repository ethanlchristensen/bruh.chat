import { useEffect } from "react";
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
import { ProviderModelsDropdown } from "./components/provider-models-dropdown";
import { UnifiedModelsDropdown } from "./components/unified-models-dropdown";
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

  const selectedModel = Array.isArray(userModels)
    ? userModels.find((m) => m.id === selectedModelId)
    : undefined;

  const isMissingModel = Boolean(
    selectedModelId && userModels && !selectedModel,
  );

  const { data: ollamaStatus } = useOllamaStatus({
    enabled: provider === "ollama" || provider === "both",
  });

  const { data: allModelsByProvider, isLoading: isLoadingAllModels } =
    useOpenRouterModelsByProvider({
      enabled:
        (variant === "by-provider" || state.isOpen || isMissingModel) &&
        !structuredOutputOnly &&
        !imageOnly &&
        (provider === "openrouter" || provider === "both"),
    });

  const {
    data: structuredModelsByProvider,
    isLoading: isLoadingStructuredModels,
  } = useOpenRouterStructuredModelsByProvider({
    enabled:
      (variant === "by-provider" || state.isOpen || isMissingModel) &&
      structuredOutputOnly &&
      !imageOnly &&
      (provider === "openrouter" || provider === "both"),
  });

  const { data: imageModelsByProvider, isLoading: isLoadingImageModels } =
    useOpenRouterImageModelsByProvider({
      enabled:
        (variant === "by-provider" || state.isOpen || isMissingModel) &&
        imageOnly &&
        (provider === "openrouter" || provider === "both"),
    });

  const { data: ollamaStructuredModels, isLoading: isLoadingOllamaStructured } =
    useOllamaStructuredModelsByFamily({
      enabled:
        structuredOutputOnly &&
        ollamaStatus?.running &&
        !imageOnly &&
        (variant === "by-provider" || state.isOpen || isMissingModel) &&
        (provider === "ollama" || provider === "both"),
    });

  const { data: ollamaRegularModels, isLoading: isLoadingOllamaRegular } =
    useOllamaModels({
      enabled:
        !structuredOutputOnly &&
        ollamaStatus?.running &&
        !imageOnly &&
        (variant === "by-provider" || state.isOpen || isMissingModel) &&
        (provider === "ollama" || provider === "both"),
    });

  const ollamaModelsByFamily = structuredOutputOnly
    ? ollamaStructuredModels
    : ollamaRegularModels;
  const isLoadingOllamaModels = structuredOutputOnly
    ? isLoadingOllamaStructured
    : isLoadingOllamaRegular;

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

  const getLabel = () => {
    if (selectedModel) return selectedModel.name;

    if (selectedModelId) {
      // Helper function to find a model by exact ID or base alias
      const findModel = (models: any[]) => {
        let found = models.find(
          (m) => m.id === selectedModelId || m.model === selectedModelId,
        );
        if (!found) {
          const parts = selectedModelId.split("-");
          for (let i = parts.length - 1; i > 0; i--) {
            const baseAlias = parts.slice(0, i).join("-");
            found = models.find(
              (m) => m.id === baseAlias || m.model === baseAlias,
            );
            if (found) break;
          }
        }
        return found;
      };

      if (allModelsByProvider) {
        for (const models of Object.values(allModelsByProvider)) {
          const found = findModel(models as any[]);
          if (found) return found.name;
        }
      }
      if (imageModelsByProvider) {
        for (const models of Object.values(imageModelsByProvider)) {
          const found = findModel(models as any[]);
          if (found) return found.name;
        }
      }
      if (structuredModelsByProvider) {
        for (const models of Object.values(structuredModelsByProvider)) {
          const found = findModel(models as any[]);
          if (found) return found.name;
        }
      }
      if (ollamaModelsByFamily) {
        for (const models of Object.values(ollamaModelsByFamily)) {
          const found = findModel(models as any[]);
          if (found) return found.name;
        }
      }

      // If we have an ID but no model object yet, fallback to a nicely formatted version of the ID.
      const parts = selectedModelId.split("/");
      if (parts.length > 1) {
        const rawProvider = parts[0].toLowerCase();
        const providerName =
          {
            openai: "OpenAI",
            anthropic: "Anthropic",
            google: "Google",
            meta: "Meta",
            mistral: "Mistral",
            cohere: "Cohere",
          }[rawProvider] ||
          rawProvider.charAt(0).toUpperCase() + rawProvider.slice(1);

        const modelName = parts.slice(1).join("/").replace(/-/g, " ");
        // capitalize words in model name roughly
        const formattedModelName = modelName.replace(/\b\w/g, (l) =>
          l.toUpperCase(),
        );
        return `${providerName}: ${formattedModelName}`;
      }
      return selectedModelId;
    }
    return "Select a model";
  };

  const handleModelSelectAndAdd = (modelId: string, modelProvider: string) => {
    // If it's already in userModels, just select it
    if (userModels?.some((m) => m.id === modelId)) {
      onModelSelect(modelId, modelProvider);
      state.setIsOpen(false);
      state.resetState();
      return;
    }

    // Otherwise, mutate to pin it, then select it
    addModelMutation.mutate(
      { modelId, provider: modelProvider },
      {
        onSuccess: () => {
          onModelSelect(modelId, modelProvider);
          state.setIsOpen(false);
          state.resetState();
        },
      },
    );
  };

  if (variant === "by-provider") {
    return (
      <div className="relative">
        <ModelSelectorButton
          label={getLabel()}
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
              onModelSelect={handleModelSelectAndAdd}
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

  return (
    <div className="relative">
      <ModelSelectorButton
        label={getLabel()}
        onClick={() => state.setIsOpen(!state.isOpen)}
      />

      {state.isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => state.setIsOpen(false)}
          />
          <UnifiedModelsDropdown
            userModels={userModels}
            searchQuery={state.searchQuery}
            onSearchChange={state.setSearchQuery}
            expandedProviders={state.expandedProviders}
            onToggleProvider={state.toggleProvider}
            filteredModels={filteredModels}
            isLoading={isLoading || isLoadingUserModels}
            selectedModelId={selectedModelId}
            onModelSelect={handleModelSelectAndAdd}
            onClose={() => {
              state.setIsOpen(false);
              state.resetState();
            }}
            ollamaStatus={ollamaStatus}
            provider={provider}
            imageOnly={imageOnly}
            isAddingModel={addModelMutation.isPending}
          />
        </>
      )}
    </div>
  );
};
