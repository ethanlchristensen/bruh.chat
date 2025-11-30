import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Image } from "lucide-react";
import { ModelSelector } from "../../../components/shared/model-selector/model-selector";
import {
  modelSupportsFileUploads,
  modelSupportsImageGeneration,
} from "@/components/shared/model-selector/models";
import type { OpenRouterModel } from "@/components/shared/model-selector/models";
import {
  SlashCommandMenu,
  getAvailableCommands,
  type SlashCommand,
} from "./slash-command-menu";

type MessageInputProps = {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
  selectedModelId: string | undefined;
  selectedModel: OpenRouterModel | undefined;
  onModelSelect: (modelId: string) => void;
};

export const MessageInput = ({
  onSend,
  disabled,
  selectedModelId,
  selectedModel,
  onModelSelect,
}: MessageInputProps) => {
  const [activeCommand, setActiveCommand] = useState<SlashCommand | null>(null);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const supportsFiles = modelSupportsFileUploads(selectedModel);
  const supportsImageGeneration = modelSupportsImageGeneration(selectedModel);
  const supportedModalities =
    selectedModel?.architecture?.input_modalities || [];

  // Get available commands based on selected model
  const availableCommands = getAvailableCommands(selectedModel).filter(
    (cmd) => !cmd.requiresModel || cmd.requiresModel(selectedModel),
  );

  // Parse input to detect command
  useEffect(() => {
    const fullText = activeCommand
      ? `${activeCommand.insertText}${input}`
      : input;

    if (fullText.startsWith("/image ")) {
      const imageCmd = availableCommands.find((cmd) => cmd.id === "image");
      if (imageCmd && !activeCommand) {
        setActiveCommand(imageCmd);
        setInput(fullText.slice(imageCmd.insertText.length));
      }
    } else if (!fullText.startsWith("/")) {
      setActiveCommand(null);
    }
  }, [input, activeCommand, availableCommands]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // Show slash menu when user types "/" at the start (only if no active command)
    if (value === "/" && !activeCommand) {
      setShowSlashMenu(true);
      setSlashMenuIndex(0);
    } else if (showSlashMenu && value !== "/") {
      setShowSlashMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace when cursor is at the start and there's an active command
    if (
      e.key === "Backspace" &&
      activeCommand &&
      input.length === 0 &&
      inputRef.current?.selectionStart === 0
    ) {
      e.preventDefault();
      setActiveCommand(null);
      setInput("");
      return;
    }

    if (!showSlashMenu) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlashMenuIndex((prev) =>
        prev < availableCommands.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlashMenuIndex((prev) =>
        prev > 0 ? prev - 1 : availableCommands.length - 1,
      );
    } else if (e.key === "Enter" && showSlashMenu) {
      e.preventDefault();
      handleCommandSelect(availableCommands[slashMenuIndex]);
    } else if (e.key === "Escape") {
      setShowSlashMenu(false);
    }
  };

  const handleCommandSelect = (command: SlashCommand) => {
    setActiveCommand(command);
    setInput("");
    setShowSlashMenu(false);
    inputRef.current?.focus();
  };

  const handleRemoveCommand = () => {
    setActiveCommand(null);
    setInput("");
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (input.trim() || activeCommand || selectedFiles.length > 0) &&
      !disabled &&
      selectedModelId
    ) {
      const fullMessage = activeCommand
        ? `${activeCommand.insertText}${input}`
        : input;
      onSend(fullMessage, selectedFiles);
      setInput("");
      setActiveCommand(null);
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

  return (
    <div className="p-2">
      <div className="max-w-4xl mx-auto space-y-2 p-2 rounded-lg bg-sidebar">
        {activeCommand &&
          activeCommand.id === "image" &&
          supportsImageGeneration && (
            <div className="px-3 py-2 text-xs bg-muted rounded-lg text-muted-foreground">
              <span className="font-semibold">Image Generation Mode:</span> Type
              your prompt after the command
            </div>
          )}

        {/* File previews */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2">
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

        <form
          onSubmit={handleSubmit}
          className="relative flex gap-2 items-center bg-transparent rounded-lg p-2"
        >
          {showSlashMenu && availableCommands.length > 0 && (
            <SlashCommandMenu
              commands={availableCommands}
              onSelect={handleCommandSelect}
              onClose={() => setShowSlashMenu(false)}
              selectedIndex={slashMenuIndex}
            />
          )}

          <div className="flex-1 flex items-center gap-2 bg-background border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
            {/* Command chip */}
            {activeCommand && (
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-md px-2 py-1 text-sm font-medium shrink-0 border border-primary/20">
                <span className="flex items-center gap-1">
                  {activeCommand.icon}
                  {activeCommand.label}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCommand}
                  className="hover:bg-primary/20 rounded-sm p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedModelId
                  ? activeCommand
                    ? `Enter ${activeCommand.description.toLowerCase()}...`
                    : "Type / for commands or enter a message..."
                  : "Select a model first..."
              }
              disabled={disabled || !selectedModelId}
              className="flex-1 bg-transparent text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={
              disabled ||
              (!input.trim() && !activeCommand && selectedFiles.length === 0) ||
              !selectedModelId
            }
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <div className="flex justify-between items-center">
          <ModelSelector
            selectedModelId={selectedModelId}
            onModelSelect={onModelSelect}
          />

          {/* File upload button - hide when in image generation mode */}
          {supportsFiles && selectedModelId && !activeCommand && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={
                  supportedModalities.includes("image") ? "image/*" : undefined
                }
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="inline-flex items-center justify-center gap-2 rounded-lg hover:bg-muted px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
