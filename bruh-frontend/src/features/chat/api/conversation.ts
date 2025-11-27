import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { QueryConfig } from "@/lib/react-query";
import type {
  ConversationsResponse,
  ConversationDetailResponse,
} from "@/types/api";
import { toast } from "sonner";

export const getConversations = (): Promise<ConversationsResponse> => {
  return api.get(`/conversations`);
};

export const getConversation = (
  conversationId: string,
): Promise<ConversationDetailResponse> => {
  return api.get(`/conversations/${conversationId}`);
};

export const updateConversationTitle = ({
  conversationId,
  title,
}: {
  conversationId: string;
  title: string;
}): Promise<ConversationDetailResponse> => {
  return api.patch(`/conversations/${conversationId}`, { title });
};

export const deleteConversation = (conversationId: string): Promise<void> => {
  return api.delete(`/conversations/${conversationId}`);
};

export const useConversations = ({
  queryConfig,
}: {
  queryConfig?: QueryConfig<typeof getConversations>;
} = {}) => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
    ...queryConfig,
  });
};

export const useConversation = ({
  conversationId,
  queryConfig,
}: {
  conversationId: string;
  queryConfig?: QueryConfig<typeof getConversation>;
}) => {
  return useQuery({
    queryKey: ["conversations", conversationId],
    queryFn: () => getConversation(conversationId),
    staleTime: 0,
    refetchOnMount: true,
    ...queryConfig,
  });
};

export const useUpdateConversationTitle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateConversationTitle,
    onSuccess: (_, variables) => {
      queryClient.setQueryData<ConversationsResponse>(
        ["conversations"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            conversations: old.conversations.map((conv) =>
              conv.id === variables.conversationId
                ? { ...conv, title: variables.title }
                : conv
            ),
          };
        }
      );
      toast.success("Conversation renamed successfully");
    },
    onError: () => {
      toast.error("Failed to rename conversation");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteConversation,
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const previousConversations = queryClient.getQueryData<ConversationsResponse>(
        ["conversations"]
      );

      queryClient.setQueryData<ConversationsResponse>(
        ["conversations"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            conversations: old.conversations.filter(
              (conv) => conv.id !== conversationId
            ),
          };
        }
      );

      return { previousConversations };
    },
    onSuccess: () => {
      toast.success("Conversation deleted successfully");
    },
    onError: (_, __, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(
          ["conversations"],
          context.previousConversations
        );
      }
      toast.error("Failed to delete conversation");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};