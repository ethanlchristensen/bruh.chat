import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type UserAddedModel = {
  id: number;
  model_id: string;
  added_at: string;
};

export type OpenRouterModel = {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
};

export const useUserAvailableModels = () => {
  return useQuery({
    queryKey: ["user-available-models"],
    queryFn: async () => {
      const response = await api.get<OpenRouterModel[]>("/users/me/models/available");
      return response;
    },
  });
};

export const useAllOpenRouterModels = () => {
  return useQuery({
    queryKey: ["all-openrouter-models"],
    queryFn: async () => {
      const response = await api.get<OpenRouterModel[]>("/ai/models/openrouter");
      return response;
    },
    enabled: false,
  });
};

export const useAddModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modelId: string) => {
      const response = await api.post<UserAddedModel>("/users/me/models", {
        model_id: modelId,
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

export const useOpenRouterModelsByProvider = () => {
  return useQuery({
    queryKey: ["openrouter-models-by-provider"],
    queryFn: async () => {
      const response = await api.get<Record<string, OpenRouterModel[]>>(
        "/ai/models/openrouter/by-provider"
      );
      return response;
    },
    enabled: false,
  });
};