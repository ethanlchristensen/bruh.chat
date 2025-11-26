import { useState } from "react";
import { Send } from "lucide-react";
import { ModelSelector } from "./model-selector";

type MessageInputProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
  selectedModelId: string | undefined;
  onModelSelect: (modelId: string) => void;
};

export const MessageInput = ({
  onSend,
  disabled,
  selectedModelId,
  onModelSelect,
}: MessageInputProps) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled && selectedModelId) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <div className="p-2">
      <div className="max-w-4xl mx-auto space-y-2 p-2 rounded-lg bg-sidebar">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 items-center bg-transparent rounded-lg p-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedModelId
                ? "Type a message..."
                : "Select a model first..."
            }
            disabled={disabled || !selectedModelId}
            className="flex-1 bg-transparent pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !input.trim() || !selectedModelId}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="flex justify-start">
          <ModelSelector
            selectedModelId={selectedModelId}
            onModelSelect={onModelSelect}
          />
        </div>
      </div>
    </div>
  );
};