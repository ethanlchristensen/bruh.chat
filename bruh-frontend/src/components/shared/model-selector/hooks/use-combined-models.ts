import { useMemo } from "react";
import type { ModelProvider } from "../types";

export const useCombinedModels = ({
  allModelsByProvider,
  structuredModelsByProvider,
  imageModelsByProvider,
  ollamaModelsByFamily,
  provider,
  ollamaStatus,
  structuredOutputOnly,
  imageOnly,
  searchQuery,
}: {
  allModelsByProvider: any;
  structuredModelsByProvider: any;
  imageModelsByProvider: any;
  ollamaModelsByFamily: any;
  provider: ModelProvider;
  ollamaStatus: any;
  structuredOutputOnly: boolean;
  imageOnly: boolean;
  searchQuery: string;
}) => {
  const combinedModels = useMemo(() => {
    const combined: Record<string, any[]> = {};

    if (provider === "openrouter" || provider === "both") {
      let openRouterModels;
      if (imageOnly) {
        openRouterModels = imageModelsByProvider;
      } else if (structuredOutputOnly) {
        openRouterModels = structuredModelsByProvider;
      } else {
        openRouterModels = allModelsByProvider;
      }

      if (openRouterModels) {
        Object.entries(openRouterModels).forEach(([providerName, models]) => {
          combined[`OpenRouter / ${providerName}`] = (models as any[]).map(
            (model) => ({ ...model, provider: "openrouter" }),
          );
        });
      }
    }

    if (
      !imageOnly &&
      (provider === "ollama" || provider === "both") &&
      ollamaModelsByFamily &&
      ollamaStatus?.running
    ) {
      Object.entries(ollamaModelsByFamily).forEach(([family, models]) => {
        combined[`Ollama / ${family}`] = (models as any[]).map((model) => ({
          ...model,
          provider: "ollama",
        }));
      });
    }

    return combined;
  }, [
    allModelsByProvider,
    structuredModelsByProvider,
    imageModelsByProvider,
    ollamaModelsByFamily,
    provider,
    ollamaStatus,
    structuredOutputOnly,
    imageOnly,
  ]);

  const filteredModels = useMemo(() => {
    if (!combinedModels || !searchQuery.trim()) {
      return combinedModels;
    }

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, any[]> = {};

    Object.entries(combinedModels).forEach(([providerName, models]) => {
      const matchingModels = (models as any[]).filter((model) => {
        const nameMatch = model.name?.toLowerCase().includes(query);
        const providerMatch = providerName.toLowerCase().includes(query);
        const descMatch = model.description?.toLowerCase().includes(query);
        return nameMatch || providerMatch || descMatch;
      });

      if (matchingModels.length > 0) {
        filtered[providerName] = matchingModels;
      }
    });

    return filtered;
  }, [combinedModels, searchQuery]);

  return { combinedModels, filteredModels };
};
