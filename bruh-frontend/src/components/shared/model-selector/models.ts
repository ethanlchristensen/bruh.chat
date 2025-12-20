import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type UserAddedModel = {
  id: number;
  model_id: string;
  provider: string;
  added_at: string;
};

export type OpenRouterModel = {
  id: string;
  name: string;
  provider: string;
  description?: string;
  supports_asepct_ratio?: boolean;
  pricing?: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
};

export type OllamaModel = {
  id: string;
  name: string;
  provider: string;
  model?: string;
  size?: number;
  modified_at?: string;
  description?: string;
  digest?: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
};

export const modelSupportsFileUploads = (
  model: OpenRouterModel | undefined,
): boolean => {
  if (!model?.architecture?.input_modalities) return false;
  const modalities = model.architecture.input_modalities;
  return modalities.includes("file") || modalities.includes("image");
};

export const modelSupportsImageGeneration = (
  model: OpenRouterModel | undefined,
): boolean => {
  if (!model?.architecture?.output_modalities) return false;
  return model.architecture.output_modalities.includes("image");
};

export const modelSupportsAspectRatio = (
  modelId: string | undefined,
): boolean => {
  if (!modelId) return false;
  return modelId.includes("google") && modelId.includes("gemini");
};

export const getModelSupportedModalities = (
  model: OpenRouterModel | undefined,
): string[] => {
  return model?.architecture?.input_modalities || [];
};

export const useUserAvailableModels = (options = {}) => {
  return useQuery({
    queryKey: ["user-available-models"],
    queryFn: async () => {
      const response = await api.get<{
        openrouter: OpenRouterModel[];
        ollama: OllamaModel[];
      }>("/users/me/models/available");

      const openrouterModels = (response?.openrouter || []).map((m) => ({
        ...m,
        provider: "openrouter",
      }));

      const ollamaModels = (response?.ollama || []).map((m) => ({
        ...m,
        provider: "ollama",
      }));

      return [...openrouterModels, ...ollamaModels];
    },
    ...options,
  });
};

export const useAllOpenRouterModels = (options = {}) => {
  return useQuery({
    queryKey: ["all-openrouter-models"],
    queryFn: async () => {
      const response = await api.get<OpenRouterModel[]>(
        "/ai/models/openrouter",
      );
      return response;
    },
    enabled: false,
    ...options,
  });
};

type AddModelParams = {
  modelId: string;
  provider: string;
};

export const useAddModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ modelId, provider }: AddModelParams) => {
      const response = await api.post<UserAddedModel>("/users/me/models", {
        model_id: modelId,
        provider: provider,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-available-models"] });
    },
  });
};

export const useRemoveModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modelId: string) => {
      await api.delete(`/users/me/models/${modelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-available-models"] });
    },
  });
};

export const useOpenRouterModelsByProvider = (options = {}) => {
  return useQuery({
    queryKey: ["openrouter-models-by-provider"],
    queryFn: async () => {
      const response = await api.get<Record<string, OpenRouterModel[]>>(
        "/ai/models/openrouter/by-provider",
      );
      return response;
    },
    enabled: false,
    ...options,
  });
};

export const useOpenRouterStructuredModels = (options = {}) => {
  return useQuery({
    queryKey: ["openrouter-structured-models"],
    queryFn: async () => {
      const response = await api.get<OpenRouterModel[]>(
        "/ai/models/openrouter/structured",
      );
      return response;
    },
    staleTime: 1000 * 60 * 5,
    enabled: false,
    ...options,
  });
};

export const useOpenRouterImageGenerationModels = (options = {}) => {
  return useQuery({
    queryKey: ["image-generation-models"],
    queryFn: async () => {
      const response = await api.get<OpenRouterModel[]>(
        "/ai/models/openrouter/image-generation",
      );
      return response;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useOpenRouterStructuredModelsByProvider = (options = {}) => {
  return useQuery({
    queryKey: ["openrouter-structured-models-by-provider"],
    queryFn: async () => {
      const response = await api.get<Record<string, OpenRouterModel[]>>(
        "/ai/models/openrouter/structured/by-provider",
      );
      return response;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useOpenRouterImageModelsByProvider = (options = {}) => {
  return useQuery({
    queryKey: ["openrouter-image-models-by-provider"],
    queryFn: async () => {
      const response = await api.get<Record<string, OpenRouterModel[]>>(
        "/ai/models/openrouter/image-generation/by-provider",
      );
      return response;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useOllamaModels = (options = {}) => {
  return useQuery({
    queryKey: ["ollama-models"],
    queryFn: async () => {
      const response = await api.get<any>("/ai/models/ollama");

      // If it returns empty, use flat list and organize by family
      if (!response || Object.keys(response).length === 0) {
        const flatResponse = await api.get<any[]>("/ai/models/ollama/flat");

        const organized: Record<string, OllamaModel[]> = {};

        flatResponse.forEach((model) => {
          const modelName = model.model;
          const family = modelName.split(":")[0] || modelName;

          if (!organized[family]) {
            organized[family] = [];
          }

          organized[family].push({
            id: modelName,
            name: modelName,
            provider: "ollama",
            size: model.size,
            modified_at: model.modified_at,
            description: model.details
              ? `${model.details.parameter_size || ""} - ${model.details.quantization_level || ""}`
                  .trim()
                  .replace(/^-\s*|-\s*$/g, "")
              : undefined,
            details: model.details,
          });
        });

        return organized;
      }

      return response as Record<string, OllamaModel[]>;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useOllamaModelsFlatList = (options = {}) => {
  return useQuery({
    queryKey: ["ollama-models-flat"],
    queryFn: async () => {
      const response = await api.get<any[]>("/ai/models/ollama/flat");

      // Transform the response to match our types
      return response.map((model) => ({
        id: model.model,
        name: model.model,
        size: model.size,
        modified_at: model.modified_at,
        description: model.details
          ? `${model.details.parameter_size || ""} - ${model.details.quantization_level || ""}`
              .trim()
              .replace(/^-\s*|-\s*$/g, "")
          : undefined,
        digest: model.digest,
        details: model.details,
      })) as OllamaModel[];
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useOllamaVisionModels = (options = {}) => {
  return useQuery({
    queryKey: ["ollama-vision-models"],
    queryFn: async () => {
      const response = await api.get<OllamaModel[]>("/ai/models/ollama/vision");
      return response;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useOllamaStructuredModels = (options = {}) => {
  return useQuery({
    queryKey: ["ollama-structured-models"],
    queryFn: async () => {
      const response = await api.get<OllamaModel[]>(
        "/ai/models/ollama/structured",
      );
      return response;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useOllamaStructuredModelsByFamily = (options = {}) => {
  return useQuery({
    queryKey: ["ollama-structured-models-by-family"],
    queryFn: async () => {
      const response = await api.get<any>(
        "/ai/models/ollama/structured/by-family",
      );

      // If empty, fall back to organizing all models
      if (!response || Object.keys(response).length === 0) {
        const flatResponse = await api.get<any[]>("/ai/models/ollama/flat");

        const organized: Record<string, OllamaModel[]> = {};

        // Filter out embedding models and very small models
        const filtered = flatResponse.filter((model) => {
          const modelName = model.model.toLowerCase();
          return (
            !modelName.includes("embed") &&
            !modelName.includes("1b") &&
            !modelName.includes("tiny")
          );
        });

        filtered.forEach((model) => {
          const modelName = model.model;
          const family = modelName.split(":")[0] || modelName;

          if (!organized[family]) {
            organized[family] = [];
          }

          organized[family].push({
            id: modelName,
            name: modelName,
            provider: "ollama",
            size: model.size,
            modified_at: model.modified_at,
            description: model.details
              ? `${model.details.parameter_size || ""} - ${model.details.quantization_level || ""}`
                  .trim()
                  .replace(/^-\s*|-\s*$/g, "")
              : undefined,
            details: model.details,
          });
        });

        return organized;
      }

      return response as Record<string, OllamaModel[]>;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const useOllamaStatus = (options = {}) => {
  return useQuery({
    queryKey: ["ollama-status"],
    queryFn: async () => {
      const response = await api.get<{ running: boolean }>("/ai/ollama/status");
      return response;
    },
    staleTime: 1000 * 30, // Check every 30 seconds
    ...options,
  });
};

export const usePullOllamaModel = () => {
  return useMutation({
    mutationFn: async (modelName: string) => {
      const formData = new FormData();
      formData.append("model_name", modelName);
      const response = await api.post("/ai/models/ollama/pull", formData);
      return response;
    },
  });
};

export const useDeleteOllamaModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modelName: string) => {
      await api.delete(`/ai/models/ollama/${modelName}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ollama-models"] });
      queryClient.invalidateQueries({ queryKey: ["ollama-models-flat"] });
    },
  });
};

export const getModelProvider = (modelId: string): "ollama" | "openrouter" => {
  if (!modelId.includes("/") || modelId.includes(":")) {
    return "ollama";
  }
  return "openrouter";
};
