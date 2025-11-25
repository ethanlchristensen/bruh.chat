import { useState, useEffect } from "react";
import { useConversation } from "../api/conversation";
import { useCreateChat } from "../api/chat";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import type { ChatSuccessResponse } from "@/types/api";

type ChatContainerProps = {
  conversationId: string;
};

export const ChatContainer = ({ conversationId }: ChatContainerProps) => {
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);

  const { data: conversationData, isLoading } = useConversation({
    conversationId,
  });

  useEffect(() => {
    if (conversationData?.messages) {
      setMessages(
        conversationData.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      );
    }
  }, [conversationData]);

  const createChatMutation = useCreateChat({
    mutationConfig: {
      onSuccess: (data) => {
        if ("message" in data) {
          const response = data as ChatSuccessResponse;
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: response.message },
          ]);
        }
      },
    },
  });

  const handleSendMessage = (message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    createChatMutation.mutate({
      data: {
        conversation_id: conversationId,
        message,
        model: "openai/gpt-5-nano",
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
          isLoading={createChatMutation.isPending}
        />
      </div>
      <div className="shrink-0">
        <MessageInput
          onSend={handleSendMessage}
          disabled={createChatMutation.isPending}
        />
      </div>
    </div>
  );
};
