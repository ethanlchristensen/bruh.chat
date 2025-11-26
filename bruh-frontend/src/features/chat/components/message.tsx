type MessageProps = {
  content: string;
  role: string;
  id: string;
  isStreaming?: boolean;
};

export const Message = ({ content, role, id, isStreaming }: MessageProps) => {
  return (
    <div
      key={id}
      className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          role === "user"
            ? "bg-primary text-primary-foreground ml-auto"
            : "bg-muted mr-auto"
        }`}
      >
        <div className="whitespace-pre-wrap wrap-break-word text-sm">
          {content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};