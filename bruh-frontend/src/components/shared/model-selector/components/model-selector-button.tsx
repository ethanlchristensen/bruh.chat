import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type ModelSelectorButtonProps = {
  label: string;
  onClick: () => void;
  variant?: "secondary" | "outline";
};

export const ModelSelectorButton = ({
  label,
  onClick,
  variant = "secondary",
}: ModelSelectorButtonProps) => {
  return (
    <Button type="button" variant={variant} onClick={onClick}>
      <span className="flex-1 text-left truncate">{label}</span>
      <ChevronDown className="h-4 w-4 shrink-0" />
    </Button>
  );
};
