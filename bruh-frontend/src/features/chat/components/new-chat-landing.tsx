import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCreateChat } from "../api/chat";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";
import type { ChatSuccessResponse } from "@/types/api";

export const NewChatLanding = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);

  const createChatMutation = useCreateChat({
    mutationConfig: {
      onSuccess: (data) => {
        if ("message" in data) {
          const response = data as ChatSuccessResponse;
          const newConversationId = response.conversation_id;

          if (newConversationId) {
            navigate({
              to: "/chat/$conversationId",
              params: { conversationId: newConversationId },
            });
          }
        }
      },
    },
  });

  const handleSendMessage = (message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    createChatMutation.mutate({
      data: {
        conversation_id: undefined,
        message,
        model: "openai/gpt-5-nano",
      },
    });
  };

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
