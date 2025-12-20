import { type LucideIcon } from "lucide-react";

interface NodeHeaderProps {
  icon: LucideIcon;
  label: string;
  iconColor?: string;
}

export const NodeHeader = ({
  icon: Icon,
  label,
  iconColor = "text-primary",
}: NodeHeaderProps) => {
  return (
    <div className="bg-muted/50 border-b border-border px-4 py-3 rounded-t-xl font-medium flex items-center gap-2">
      <div
        className={`p-1.5 ${iconColor.replace("text-", "bg-")}/10 rounded-md`}
      >
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
};
