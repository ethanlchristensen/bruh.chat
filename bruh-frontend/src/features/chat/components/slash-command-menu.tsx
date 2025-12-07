import { useEffect, useRef } from "react";
import { type Intent, type IntentCommand, getIntentIcon } from "@/types/intent";

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

  const getCommandIntentIcon = (intent: Intent) => {
    const Icon = getIntentIcon(intent);
    return <Icon className="w-4 h-4" />;
  };

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
              {getCommandIntentIcon(command.intent)}
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
