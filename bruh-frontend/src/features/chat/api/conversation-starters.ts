import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  GenerateConversationStartersRequest,
  GenerateConversationStartersResponse,
} from "@/types/api.types";
import { toast } from "sonner";

const CACHE_DURATION = 1000 * 60 * 60;

export const useGenerateConversationStarters = () => {
  return useMutation({
    mutationFn: async (request: GenerateConversationStartersRequest) => {
      return await api.post<GenerateConversationStartersResponse>(
        "/ai/conversation-starters/generate",
        request,
      );
    },
    onError: (error: any) => {
      const errorMessage = error.data?.error || error.message;

      if (errorMessage?.includes("default AUX model")) {
        toast.error("Default AUX Model Required", {
          description:
            "Please set a default AUX model in your profile settings to generate conversation starters.",
          action: {
            label: "Go to Settings",
            onClick: () => {
              window.location.href = "/profile";
            },
          },
          duration: 6000,
        });
      } else {
        toast.error("Failed to Generate Starters", {
          description:
            errorMessage || "Something went wrong. Please try again.",
        });
      }
    },
  });
};

export const useConversationStarters = (topics: string[]) => {
  const generateMutation = useGenerateConversationStarters();

  return useQuery({
    queryKey: ["conversation-starters", topics],
    queryFn: async () => {
      const response = await generateMutation.mutateAsync({
        topics,
        num_questions: 5,
      });

      return response.starters;
    },
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION,
  });
};

export const useRefreshConversationStarters = () => {
  const generateMutation = useGenerateConversationStarters();

  return useMutation({
    mutationFn: async (topics: string[]) => {
      const response = await generateMutation.mutateAsync({
        topics,
        num_questions: 3,
      });

      return response.starters;
    },
  });
};
