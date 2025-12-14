import { Check, Box } from "lucide-react";
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
};

export const ModelListItem = ({
  model,
  isSelected,
  onClick,
  disabled = false,
  showCheckmark = true,
  icon: Icon = Box,
}: ModelListItemProps) => {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className="w-full justify-start gap-3 px-2 py-1.5 h-auto text-left hover:bg-accent"
    >
      {/* Icon */}
      <div className="shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm leading-tight">{model.name}</div>

        {/* Compact metadata */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {model.context_length && (
            <span>
              {(model.context_length / 1000).toFixed(0)}K - context length
            </span>
          )}
          {model.size && (
            <>
              {model.context_length && <span>•</span>}
              <span>{(model.size / 1e9).toFixed(1)}GB - model size</span>
            </>
          )}
        </div>
      </div>

      {/* Checkmark */}
      {showCheckmark && isSelected && (
        <Check className="h-4 w-4 shrink-0 text-primary" />
      )}
    </Button>
  );
};
