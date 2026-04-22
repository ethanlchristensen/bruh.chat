import { Check, Box, Pin, PinOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Model } from "../types";
import type { LucideIcon } from "lucide-react";

type ModelListItemProps = {
  model: Model;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  showCheckmark?: boolean;
  icon?: LucideIcon;
  isPinned?: boolean;
  onPinToggle?: (e: React.MouseEvent) => void;
  pinLoading?: boolean;
};

export const ModelListItem = ({
  model,
  isSelected,
  onClick,
  disabled = false,
  showCheckmark = true,
  icon: Icon = Box,
  isPinned,
  onPinToggle,
  pinLoading,
}: ModelListItemProps) => {
  return (
    <div className="relative group/item min-w-0 rounded-md hover:bg-accent transition-colors">
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        disabled={disabled}
        className="w-full justify-start gap-3 px-2 py-1.5 h-auto text-left hover:bg-transparent min-w-0"
      >
        <div className="shrink-0 flex items-center gap-1.5">
          {isPinned && <Pin className="h-3 w-3 text-primary fill-primary" />}
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm leading-tight truncate">
              {model.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {model.context_length && (
              <span>{(model.context_length / 1000).toFixed(0)}K ctx</span>
            )}
            {model.size && (
              <>
                {model.context_length && <span>·</span>}
                <span>{(model.size / 1e9).toFixed(1)}GB</span>
              </>
            )}
          </div>
        </div>

        {showCheckmark && isSelected && (
          <Check className="h-4 w-4 shrink-0 text-primary" />
        )}
      </Button>

      {onPinToggle !== undefined && (
        <div className="absolute right-0 inset-y-0 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center pr-1 bg-linear-to-l from-accent via-accent to-transparent pl-8 rounded-r-md pointer-events-none">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 pointer-events-auto hover:bg-transparent"
            title={isPinned ? "Unpin model" : "Pin model"}
            onClick={onPinToggle}
            disabled={pinLoading || disabled}
          >
            {pinLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isPinned ? (
              <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
