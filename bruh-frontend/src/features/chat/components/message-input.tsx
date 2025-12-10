import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Image } from "lucide-react";
import { ModelSelector } from "../../../components/shared/model-selector/model-selector";
import { modelSupportsFileUploads } from "@/components/shared/model-selector/models";
import type { OpenRouterModel } from "@/components/shared/model-selector/models";
import { SlashCommandMenu } from "./slash-command-menu";
import { IntentParameters } from "./intent-parameters";
import {
  INTENTS,
  INTENT_METADATA,
  type Intent,
  isValidIntent,
  getIntentIcon,
} from "@/types/intent";
import {
  DEFAULT_ASPECT_RATIO,
  isValidAspectRatio,
  type AspectRatio,
} from "@/types/image";
import { type IntentCommand, getAvailableIntents } from "@/types/intent";

type MessageInputProps = {
  onSend: (
    message: string,
    files?: File[],
    intent?: Intent,
    aspectRatio?: AspectRatio
  ) => void;
  disabled?: boolean;
  selectedModelId: string | undefined;
  selectedModel: OpenRouterModel | undefined;
  onModelSelect: (modelId: string) => void;
  conversationId?: string;
};

const TEMP_INTENT_KEY = "temp-active-intent";
const TEMP_ASPECT_RATIO_KEY = "temp-aspect-ratio";

export const MessageInput = ({
  onSend,
  disabled,
  selectedModelId,
  selectedModel,
  onModelSelect,
  conversationId,
}: MessageInputProps) => {
  const [activeIntent, setActiveIntent] = useState<Intent>(() => {
    const saved = localStorage.getItem(TEMP_INTENT_KEY);
    if (saved && isValidIntent(saved)) {
      return saved;
    }
    return INTENTS.CHAT;
  });

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(() => {
    const saved = localStorage.getItem(TEMP_ASPECT_RATIO_KEY);
    if (saved && isValidAspectRatio(saved)) {
      return saved;
    }
    return DEFAULT_ASPECT_RATIO;
  });

  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasRestoredFromStorage = useRef(false);
  const mountTimeRef = useRef(Date.now());

  const supportsFiles = modelSupportsFileUploads(selectedModel);

  // Get available intents based on selected model
  const availableIntents = getAvailableIntents(selectedModel);

  // Clean up localStorage after component mounts and stabilizes
  useEffect(() => {
    if (conversationId && !hasRestoredFromStorage.current) {
      const timer = setTimeout(() => {
        localStorage.removeItem(TEMP_INTENT_KEY);
        localStorage.removeItem(TEMP_ASPECT_RATIO_KEY);
        hasRestoredFromStorage.current = true;
      }, 1000); // Increased to 1 second
      return () => clearTimeout(timer);
    }
  }, [conversationId]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Reset to chat intent if current intent is no longer supported
  // BUT skip this check for 2 seconds after mount to allow restoration
  useEffect(() => {
    const timeSinceMount = Date.now() - mountTimeRef.current;

    // Skip validation for 2 seconds after mount
    if (timeSinceMount < 2000) {
      return;
    }

    if (activeIntent !== INTENTS.CHAT && selectedModel) {
      const isSupported = availableIntents.some(
        (cmd) => cmd.intent === activeIntent
      );
      if (!isSupported) {
        setActiveIntent(INTENTS.CHAT);
        setAspectRatio(DEFAULT_ASPECT_RATIO);
      }
    }
  }, [selectedModel?.id, activeIntent, availableIntents]); // Include ALL dependencies

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    if (value === "/") {
      setShowSlashMenu(true);
      setSlashMenuIndex(0);
    } else if (showSlashMenu && !value.startsWith("/")) {
      setShowSlashMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showSlashMenu) {
        handleIntentSelect(availableIntents[slashMenuIndex]);
      } else {
        handleSubmit(e as any);
      }
      return;
    }

    if (showSlashMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashMenuIndex((prev) =>
          prev < availableIntents.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashMenuIndex((prev) =>
          prev > 0 ? prev - 1 : availableIntents.length - 1
        );
      } else if (e.key === "Escape") {
        setShowSlashMenu(false);
        setInput("");
      }
    }
  };

  const handleIntentSelect = (command: IntentCommand) => {
    setActiveIntent(command.intent);
    setInput("");
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  const handleRemoveIntent = () => {
    setActiveIntent(INTENTS.CHAT);
    setAspectRatio(DEFAULT_ASPECT_RATIO);
    localStorage.removeItem(TEMP_INTENT_KEY);
    localStorage.removeItem(TEMP_ASPECT_RATIO_KEY);
    textareaRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (input.trim() || selectedFiles.length > 0) &&
      !disabled &&
      selectedModelId
    ) {
      if (!conversationId && activeIntent !== INTENTS.CHAT) {
        localStorage.setItem(TEMP_INTENT_KEY, activeIntent);
        if (activeIntent === INTENTS.IMAGE) {
          localStorage.setItem(TEMP_ASPECT_RATIO_KEY, aspectRatio);
        }
      }

      onSend(
        input.trim(),
        selectedFiles,
        activeIntent,
        activeIntent === INTENTS.IMAGE ? aspectRatio : undefined
      );

      setInput("");
      setSelectedFiles([]);
      setShowSlashMenu(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image className="h-4 w-4" />;
    }
    return <Paperclip className="h-4 w-4" />;
  };

  const getActiveIntentIcon = () => {
    const Icon = getIntentIcon(activeIntent);
    return <Icon className="w-4 h-4" />;
  };

  const getPlaceholder = () => {
    if (!selectedModelId) return "Select a model first...";
    if (activeIntent === INTENTS.IMAGE)
      return "Describe the image you want to generate...";
    return "Type / for commands or enter a message...";
  };

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* File previews */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="relative flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm"
              >
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-12 w-12 object-cover rounded"
                  />
                ) : (
                  getFileIcon(file)
                )}
                <div className="flex flex-col min-w-0">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative space-y-2">
          {showSlashMenu && availableIntents.length > 0 && (
            <SlashCommandMenu
              commands={availableIntents}
              onSelect={handleIntentSelect}
              onClose={() => setShowSlashMenu(false)}
              selectedIndex={slashMenuIndex}
            />
          )}

          {/* Top row: file upload, text input, send button */}
          <div className="flex items-end gap-2 bg-muted rounded-lg p-2">
            {supportsFiles && selectedModelId && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="shrink-0 inline-flex items-center justify-center rounded-md hover:bg-muted-foreground/10 p-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 animate-in fade-in slide-in-from-left-2 duration-200"
                  title="Attach files"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
              </>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={disabled || !selectedModelId}
              rows={1}
              className="flex-1 bg-transparent text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none py-2 px-2 max-h-[200px]"
            />

            <button
              type="submit"
              disabled={
                disabled ||
                (!input.trim() && selectedFiles.length === 0) ||
                !selectedModelId
              }
              className="shrink-0 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Bottom row */}
        <div className="flex items-center gap-2 flex-wrap">
          <ModelSelector
            selectedModelId={selectedModelId}
            onModelSelect={onModelSelect}
          />

          {activeIntent !== INTENTS.CHAT && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-md px-3 py-1.5 text-sm font-medium border border-primary/20 animate-in fade-in slide-in-from-right-2 duration-200">
              <span className="flex items-center gap-1.5">
                {getActiveIntentIcon()}
                <span>{INTENT_METADATA[activeIntent].label}</span>
              </span>
              <button
                type="button"
                onClick={handleRemoveIntent}
                className="hover:bg-primary/20 rounded-sm p-0.5 transition-colors"
                title="Remove intent"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {activeIntent !== INTENTS.CHAT && (
            <IntentParameters
              modelId={selectedModelId}
              intent={activeIntent}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
            />
          )}
        </div>
      </div>
    </div>
  );
};
