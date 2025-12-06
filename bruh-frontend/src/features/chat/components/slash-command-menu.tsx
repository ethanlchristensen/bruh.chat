import { useEffect, useRef } from "react";
import { INTENTS, INTENT_METADATA, type Intent } from "@/types/intent";
import { modelSupportsImageGeneration } from "@/components/shared/model-selector/models";
import type { OpenRouterModel } from "@/components/shared/model-selector/models";

export type IntentCommand = {
  intent: Intent;
  label: string;
  description: string;
  icon: React.ReactNode;
  requiresModel?: (model: OpenRouterModel | undefined) => boolean;
};

type SlashCommandMenuProps = {
  commands: IntentCommand[];
  onSelect: (command: IntentCommand) => void;
  onClose: () => void;
  selectedIndex: number;
};

export const SlashCommandMenu = ({
  commands,
  onSelect,
  onClose,
  selectedIndex,
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
    >
      <div className="p-2 border-b bg-muted/50">
        <p className="text-xs font-medium text-muted-foreground">
          Slash Commands
        </p>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {commands.map((command, index) => (
          <button
            key={command.intent}
            onClick={() => onSelect(command)}
            className={`w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${
              index === selectedIndex ? "bg-muted" : ""
            }`}
          >
            <div className="shrink-0 mt-0.5 text-lg">
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

export const getAvailableIntents = (
  selectedModel: OpenRouterModel | undefined
): IntentCommand[] => {
  const commands: IntentCommand[] = [];

  // Only show non-default intents
  Object.values(INTENTS).forEach((intent) => {
    if (intent === INTENTS.CHAT) return; // Skip default intent

    const metadata = INTENT_METADATA[intent];
    
    // Check if model supports this intent
    if (intent === INTENTS.IMAGE) {
      if (!modelSupportsImageGeneration(selectedModel)) return;
    }

    commands.push({
      intent,
      label: `/${intent}`,
      description: metadata.description,
      icon: metadata.icon,
      requiresModel: intent === INTENTS.IMAGE 
        ? (model) => modelSupportsImageGeneration(model)
        : undefined,
    });
  });

  return commands;
};