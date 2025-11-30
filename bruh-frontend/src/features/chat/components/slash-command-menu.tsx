import { Image } from "lucide-react";
import { useEffect, useRef } from "react";
import { modelSupportsImageGeneration } from "@/components/shared/model-selector/models";

export type SlashCommand = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  insertText: string;
  requiresModel?: (model: any) => boolean;
};

type SlashCommandMenuProps = {
  commands: SlashCommand[];
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  selectedIndex: number;
  position?: { top: number; left: number };
};

export const SlashCommandMenu = ({
  commands,
  onSelect,
  onClose,
  selectedIndex,
  position,
}: SlashCommandMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (commands.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full mb-2 left-0 w-80 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden"
      style={position}
    >
      <div className="p-2 border-b bg-muted/50">
        <p className="text-xs font-medium text-muted-foreground">
          Slash Commands
        </p>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {commands.map((command, index) => (
          <button
            key={command.id}
            onClick={() => onSelect(command)}
            className={`w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${
              index === selectedIndex ? "bg-muted" : ""
            }`}
          >
            <div className="shrink-0 mt-0.5 text-muted-foreground">
              {command.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{command.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {command.description}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="p-2 border-t bg-muted/50">
        <p className="text-xs text-muted-foreground">
          Use{" "}
          <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">↑</kbd>{" "}
          <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">↓</kbd>{" "}
          to navigate,{" "}
          <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">
            Enter
          </kbd>{" "}
          to select
        </p>
      </div>
    </div>
  );
};

export const getAvailableCommands = (selectedModel: any): SlashCommand[] => {
  const commands: SlashCommand[] = [];

  if (modelSupportsImageGeneration(selectedModel)) {
    commands.push({
      id: "image",
      label: "/image",
      description: "Generate an image from a text prompt",
      icon: <Image className="h-4 w-4" />,
      insertText: "/image ",
      requiresModel: (model) => {
        return modelSupportsImageGeneration(model);
      },
    });
  }

  // commands.push({
  //   id: "prompt",
  //   label: "/prompt",
  //   description: "Use a saved prompt template",
  //   icon: <Sparkles className="h-4 w-4" />,
  //   insertText: "/prompt ",
  // });

  return commands;
};
