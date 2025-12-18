import { useEffect } from "react";
import { useWebSocket } from "./use-websocket";
import { useQueryClient } from "@tanstack/react-query";
import type { ConversationsResponse } from "@/types/api.types";

interface ConversationUpdateHandlers {
  onTitleUpdate?: (conversationId: string, newTitle: string) => void;
  onNewMessage?: (conversationId: string, messageData: any) => void;
}

export function useConversationWebSocket(
  handlers?: ConversationUpdateHandlers,
) {
  const { onConversationUpdate, isConnected } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onConversationUpdate((data) => {
      const { type, conversation_id, data: payload } = data;

      switch (type) {
        case "title_updated":
          console.log(
            `[WS] Title updated for conversation ${conversation_id}:`,
            payload.new_title,
          );

          queryClient.setQueryData<ConversationsResponse>(
            ["conversations"],
            (old) => {
              if (!old) return old;

              return {
                conversations: old.conversations.map((conv) =>
                  conv.id === conversation_id
                    ? {
                        ...conv,
                        title: payload.new_title || conv.title,
                        updated_at: new Date().toISOString(),
                      }
                    : conv,
                ),
              };
            },
          );

          handlers?.onTitleUpdate?.(conversation_id, payload.new_title || "");
          break;

        default:
          console.log(`[WS] Unknown conversation update type: ${type}`);
      }
    });

    return unsubscribe;
  }, [onConversationUpdate, handlers, queryClient]);

  return { isConnected };
}
