import { User, Bot, Download, Users } from "lucide-react";
import type { Message as MessageType } from "@/types/api";
import { MarkdownRenderer } from "@/components/markdown/markdown";
import { ReasoningSection } from "./reasoning-section";

type MessageProps = {
  message: MessageType;
};

export const Message = ({ message }: MessageProps) => {
  const {
    content,
    role,
    id,
    model_id,
    created_at,
    isStreaming,
    attachments,
    generated_images,
    reasoning,
    persona,
  } = message;
  const isUser = role === "user";
  const hasPersona = !isUser && persona;

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

  const getAttachmentUrl = (fileUrl: string) => {
    if (fileUrl.startsWith("http") || fileUrl.startsWith("blob:")) {
      return fileUrl;
    }
    const baseUrl = window.location.origin;
    return `${baseUrl}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`;
  };

  const isImageAttachment = (mimeType?: string) => {
    if (!mimeType || typeof mimeType !== "string") return false;
    return mimeType.startsWith("image/");
  };

  return (
    <div
      key={id}
      className={`flex gap-3 mb-6 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div className="shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${
            isUser
              ? "bg-primary text-primary-foreground"
              : hasPersona
                ? "bg-purple-500 text-white"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : hasPersona && persona.persona_image ? (
            <img
              src={getAttachmentUrl(persona.persona_image)}
              alt={persona.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.innerHTML =
                  '<svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="m16 3.13a4 4 0 0 1 0 7.75"/></svg>';
              }}
            />
          ) : hasPersona ? (
            <Users className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div
        className={`flex flex-col gap-1 max-w-[70%] min-w-0 overflow-hidden ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`flex items-center gap-2 text-xs text-muted-foreground ${isUser ? "flex-row-reverse" : ""}`}
        >
          <span className="font-medium">
            {isUser
              ? "You"
              : hasPersona
                ? `${persona.name}${persona.model_id ? ` (${persona.model_id})` : ""}`
                : model_id || "Assistant"}
          </span>
          <span>
            {displayDate} at {displayTime}
          </span>
        </div>

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <div
            className={`flex flex-wrap gap-2 mb-2 ${isUser ? "self-end" : "self-start"}`}
          >
            {attachments.map((attachment, idx) => {
              if (!attachment) return null;

              return (
                <div
                  key={attachment.id || idx}
                  className="rounded-lg overflow-hidden border"
                >
                  {isImageAttachment(attachment.mime_type) ? (
                    <img
                      src={getAttachmentUrl(attachment.file_url)}
                      alt={attachment.file_name || "Attachment"}
                      className="max-w-xs max-h-64 object-contain bg-muted"
                      onError={(e) => {
                        console.error(
                          "Image failed to load:",
                          attachment.file_url,
                        );
                        console.error("Error event:", e);
                      }}
                    />
                  ) : (
                    <a
                      href={getAttachmentUrl(attachment.file_url)}
                      download={attachment.file_name}
                      className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">
                          {attachment.file_name || "Unknown file"}
                        </span>
                        {attachment.file_size && (
                          <span className="text-xs text-muted-foreground">
                            {(attachment.file_size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-lg py-2.5 flex flex-col gap-2 overflow-hidden ${
            isUser
              ? "bg-primary text-primary-foreground self-end px-2"
              : "bg-transparent text-foreground self-start w-full"
          }`}
        >
          {/* Reasoning Section - Show for assistant messages */}
          {!isUser && reasoning && (
            <ReasoningSection
              content={reasoning.content}
              images={reasoning.generated_reasoning_images}
              isActive={isStreaming}
            />
          )}

          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              <MarkdownRenderer content={content} />
            </p>
          ) : (
            <MarkdownRenderer content={content} />
          )}
          {isStreaming && (
            <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
          )}
        </div>

        {/* Generated Images - Now after content */}
        {generated_images && generated_images.length > 0 && (
          <div className="flex flex-col gap-2 mt-2 self-start">
            {generated_images.map((genImage) => {
              if (!genImage) return null;

              return (
                <div
                  key={genImage.id}
                  className="rounded-lg overflow-hidden border bg-muted"
                >
                  <img
                    src={getAttachmentUrl(genImage.image_url)}
                    alt={genImage.prompt || "Generated image"}
                    className="max-w-md max-h-96 object-contain"
                    onError={(e) => {
                      console.error(
                        "Generated image failed to load:",
                        genImage.image_url,
                      );
                      console.error("Error event:", e);
                    }}
                  />
                  {genImage.aspect_ratio && (
                    <p className="text-xs text-muted-foreground italic px-2 py-1">
                      Aspect Ratio: {genImage.aspect_ratio}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
