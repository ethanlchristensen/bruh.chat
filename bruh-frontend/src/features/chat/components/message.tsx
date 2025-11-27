import { User, Bot } from "lucide-react";
import type { Message as MessageType } from "@/types/api";

type MessageProps = {
  message: MessageType;
};

export const Message = ({ message }: MessageProps) => {
  const { content, role, id, model_id, created_at, isStreaming } = message;
  const isUser = role === "user";

  const displayDate = created_at
    ? new Date(created_at).toLocaleDateString([], {
        dateStyle: "full",
      })
    : "";

  const displayTime = created_at
    ? new Date(created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      key={id}
      className={`flex gap-3 mb-6 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div className="shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
      </div>

      {/* Message Content */}
      <div className="flex flex-col gap-1 max-w-[70%] items-start">
        <div
          className={`flex items-center gap-2 text-xs text-muted-foreground ${isUser ? "flex-row-reverse self-end" : "self-start"}`}
        >
          <span className="font-medium">
            {isUser ? "You" : model_id || "Assistant"}
          </span>
          <span>
            {displayDate} at {displayTime}
          </span>
        </div>

        <div
          className={`rounded-lg px-4 py-2.5 ${
            isUser
              ? "bg-primary text-primary-foreground self-end"
              : "bg-muted text-foreground self-start"
          }`}
        >
          <p className="text-sm leading-relaxed">{content}</p>
          {isStreaming && (
            <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};
