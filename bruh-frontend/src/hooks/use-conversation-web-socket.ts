import { useEffect } from "react";
import { useWebSocket } from "@/lib/websocket-context";
import { useQueryClient } from "@tanstack/react-query";
import type { ConversationsResponse } from "@/types/api";

interface ConversationUpdateHandlers {
  onTitleUpdate?: (conversationId: string, newTitle: string) => void;
  onNewMessage?: (conversationId: string, messageData: any) => void;
}

export function useConversationWebSocket(handlers?: ConversationUpdateHandlers) {
  const { onConversationUpdate, isConnected } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onConversationUpdate((data) => {
      const { type, conversation_id, data: payload } = data;

      switch (type) {
        case 'title_updated':
          console.log(`[WS] Title updated for conversation ${conversation_id}:`, payload.new_title);
          
          queryClient.setQueryData<ConversationsResponse>(
            ['conversations'],
            (old) => {
              if (!old) return old;
              
              return {
                conversations: old.conversations.map((conv) =>
                  conv.id === conversation_id
                    ? { ...conv, title: payload.new_title || conv.title, updated_at: new Date().toISOString() }
                    : conv
                ),
              };
            }
          );

          handlers?.onTitleUpdate?.(conversation_id, payload.new_title || '');
          break;

        case 'new_message':
          console.log(`[WS] New message in conversation ${conversation_id}:`, payload);
          
          queryClient.setQueryData<ConversationsResponse>(
            ['conversations'],
            (old) => {
              if (!old) return old;
              
              const updatedConversations = old.conversations.map((conv) =>
                conv.id === conversation_id
                  ? { ...conv, updated_at: new Date().toISOString() }
                  : conv
              );
              
              updatedConversations.sort((a, b) => 
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              );
              
              return { conversations: updatedConversations };
            }
          );

          handlers?.onNewMessage?.(conversation_id, payload);
          break;

        default:
          console.log(`[WS] Unknown conversation update type: ${type}`);
      }
    });

    return unsubscribe;
  }, [onConversationUpdate, handlers, queryClient]);

  return { isConnected };
}