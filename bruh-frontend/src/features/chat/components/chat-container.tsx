import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { useConversation } from "../api/conversation";
import { useCreateStreamingChat } from "../api/chat";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";

type ChatContainerProps = {
  conversationId: string;
};

type Message = {
  role: string;
  content: string;
  id: string;
  isStreaming?: boolean;
};

export const ChatContainer = ({ conversationId }: ChatContainerProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);


  const { data: conversationData, isLoading } = useConversation({
    conversationId,
  });

  useEffect(() => {
    if (conversationData?.messages) {
      setMessages(
        conversationData.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          id: msg.id,
        })),
      );
    }
  }, [conversationData]);

  const createChatMutation = useCreateStreamingChat();

  const handleSendMessage = (message: string) => {
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
        conversation_id: conversationId,
        message,
        model: selectedModelId
      },
      callbacks: {
        onMetadata: (data) => {
          flushSync(() => {
            setMessages((prev) =>
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