import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useConversation } from "../api/conversation";
import { useCreateStreamingChat } from "../api/chat";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import type { ConversationsResponse, Conversation, Message } from "@/types/api";

type ChatContainerProps = {
  conversationId: string | undefined;
};

const NEW_CHAT_MODEL_KEY = "new-chat-model";

export const ChatContainer = ({ conversationId }: ChatContainerProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    () => {
      if (!conversationId) {
        const saved = localStorage.getItem(NEW_CHAT_MODEL_KEY);
        return saved || user?.profile?.default_model;
      }
      return user?.profile?.default_model;
    }
  );

  const { data: conversationData, isLoading } = useConversation({
    conversationId: conversationId!,
    queryConfig: {
      enabled: !!conversationId,
    },
  });

  useEffect(() => {
    if (conversationData?.messages) {
      setMessages(conversationData.messages);

      const lastAssistantMessage = [...conversationData.messages]
        .reverse()
        .find((msg) => msg.role === "assistant");

      if (lastAssistantMessage?.model_id) {
        setSelectedModelId(lastAssistantMessage.model_id);
      } else if (user?.profile?.default_model) {
        setSelectedModelId(user.profile.default_model);
      }
    } else if (!conversationId) {
      setMessages([]);
      const saved = localStorage.getItem(NEW_CHAT_MODEL_KEY);
      setSelectedModelId(saved || user?.profile?.default_model);
    }
  }, [conversationData, conversationId, user?.profile?.default_model]);

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    if (!conversationId) {
      localStorage.setItem(NEW_CHAT_MODEL_KEY, modelId);
    }
  };

  const createChatMutation = useCreateStreamingChat();

  const handleSendMessage = (message: string) => {
    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    let newConversationId: string | undefined = undefined;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: message,
        id: tempUserId,
        conversation_id: conversationId || "",
        created_at: Date.now(),
      },
    ]);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
        id: tempAssistantId,
        conversation_id: conversationId || "",
        created_at: Date.now(),
        model_id: selectedModelId,
        isStreaming: true,
      },
    ]);

    setStreamingMessageId(tempAssistantId);

    createChatMutation.mutate({
      data: {
        conversation_id: conversationId,
        message,
        model: selectedModelId,
      },
      callbacks: {
        onMetadata: (data) => {
          // store the id to navigate to later
          if (!conversationId && data.conversation_id) {
            newConversationId = data.conversation_id;

            localStorage.removeItem(NEW_CHAT_MODEL_KEY);

            queryClient.setQueryData<ConversationsResponse>(
              ["conversations"],
              (old) => {
                if (!old) return old;

                const title =
                  message.length > 50
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
          }

          flushSync(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg) =>
                msg.id === tempUserId
                  ? { ...msg, id: data.user_message_id }
                  : msg
              )
            );
          });
        },
        onContent: (data) => {
          flushSync(() => {
            setMessages((prev: Message[]) =>
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
            setMessages((prev: Message[]) => {
              const updatedMessages = prev.map((msg) =>
                msg.id === tempAssistantId
                  ? {
                      ...msg,
                      id: data.assistant_message_id,
                      isStreaming: false,
                    }
                  : msg
              );

              setStreamingMessageId(null);

              if (!conversationId && newConversationId) {
                queryClient.setQueryData(["conversations", newConversationId], {
                  id: newConversationId,
                  messages: updatedMessages,
                });

                navigate({
                  to: "/chat/$conversationId",
                  params: { conversationId: newConversationId },
                  replace: true,
                });
              }

              return updatedMessages;
            });
          });
        },
        onError: (data) => {
          console.error("Streaming error:", data.error);
          setMessages((prev: Message[]) =>
            prev.filter((msg) => msg.id !== tempAssistantId)
          );
          setStreamingMessageId(null);
        },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading conversation...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          isLoading={
            createChatMutation.isPending && streamingMessageId === null
          }
        />
      </div>
      <div className="shrink-0">
        <MessageInput
          onSend={handleSendMessage}
          disabled={createChatMutation.isPending}
          selectedModelId={selectedModelId}
          onModelSelect={handleModelSelect}
        />
      </div>
    </div>
  );
};
