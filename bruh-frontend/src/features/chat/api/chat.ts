import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { MutationConfig } from "@/lib/react-query";
import type {
  ChatRequest,
  ChatSuccessResponse,
  ChatErrorResponse,
} from "@/types/api";

export const createDiscussion = ({
  data,
}: {
  data: ChatRequest;
}): Promise<ChatSuccessResponse | ChatErrorResponse> => {
  return api.post(`/ai/chat`, data);
};

export const useCreateChat = ({
  mutationConfig,
}: {
  mutationConfig?: MutationConfig<typeof createDiscussion>;
} = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createDiscussion,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: ["conversations"],
        exact: true,
      });
      onSuccess?.(...args);
    },
    ...restConfig,
  });
};
