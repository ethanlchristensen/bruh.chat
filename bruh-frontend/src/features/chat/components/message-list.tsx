import { useEffect, useRef } from "react";
import { Message } from "./message";

type Message = {
  role: string;
  content: string;
  id: string;
  isStreaming?: boolean;
};

type MessageListProps = {
  messages: Message[];
  isLoading?: boolean;
};

export const MessageList = ({ messages, isLoading }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Start a conversation by sending a message
          </div>
        )}

        {messages.map((message) => (
          <Message
            key={message.id}
            content={message.content}
            role={message.role}
            id={message.id}
            isStreaming={message.isStreaming}
          />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3 text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="animate-bounce">.</span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                >
                  .
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                >
                  .
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};