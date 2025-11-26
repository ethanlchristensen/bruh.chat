import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { QueryConfig } from "@/lib/react-query";
import type {
  ConversationsResponse,
  ConversationDetailResponse,
} from "@/types/api";

export const getConversations = (): Promise<ConversationsResponse> => {
  return api.get(`/conversations`);
};

export const getConversation = (
  conversationId: string,
): Promise<ConversationDetailResponse> => {
  return api.get(`/conversations/${conversationId}`);
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
    ...queryConfig,
  });
};

