import { useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateStreamingChat } from "../api/chat";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";
import type { ConversationsResponse, Conversation } from "@/types/api";

type Message = {
  role: string;
  content: string;
  id: string;
  isStreaming?: boolean;
};

export const NewChatLanding = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);

  const createChatMutation = useCreateStreamingChat();

  const handleSendMessage = (message: string) => {
    if (!selectedModelId) return;

    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;

    // Add user message immediately
    setMessages((prev) => [
      ...prev,
      { role: "user", content: message, id: tempUserId },
    ]);

    // Add empty assistant message that will be filled via streaming
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", id: tempAssistantId, isStreaming: true },
    ]);

    setStreamingMessageId(tempAssistantId);

    createChatMutation.mutate({
      data: {
        conversation_id: undefined,
        message,
        model: selectedModelId
      },
      callbacks: {
        onMetadata: (data) => {
          // Optimistically add the new conversation to the sidebar
          queryClient.setQueryData<ConversationsResponse>(
            ["conversations"],
            (old) => {
              if (!old) return old;

              // Create title from first message (truncate if too long)
              const title = message.length > 50 
                ? message.substring(0, 50) + "..." 
                : message;

              const newConversation: Conversation = {
                id: data.conversation_id,
                title,
                created_at: Date.now(),
                updated_at: new Date().toISOString(),
              };

              return {
                conversations: [newConversation, ...old.conversations],
              };
            }
          );

          flushSync(() => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempUserId
                  ? { ...msg, id: data.user_message_id }
                  : msg
              )
            );
          });

          // Navigate to the new conversation
          if (data.conversation_id) {
            navigate({
              to: "/chat/$conversationId",
              params: { conversationId: data.conversation_id },
            });
          }
        },
        onContent: (data) => {
          flushSync(() => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempAssistantId
                  ? { ...msg, content: msg.content + data.delta }
                  : msg
              )
            );
          });
        },
        onDone: (data) => {
          flushSync(() => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempAssistantId
                  ? {
                      ...msg,
                      id: data.assistant_message_id,
                      isStreaming: false,
                    }
                  : msg
              )
            );
            setStreamingMessageId(null);
          });
        },
        onError: (data) => {
          console.error("Streaming error:", data.error);
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== tempAssistantId)
          );
          setStreamingMessageId(null);
        },
      },
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          isLoading={createChatMutation.isPending && streamingMessageId === null}
        />
      </div>
      <div className="shrink-0">
        <MessageInput
          onSend={handleSendMessage}
          disabled={createChatMutation.isPending}
          selectedModelId={selectedModelId}
          onModelSelect={setSelectedModelId}
        />
      </div>
    </div>
  );
};