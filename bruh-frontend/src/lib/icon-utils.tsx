import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function getLucideIcon(iconName: string): LucideIcon {
  const componentName = iconName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  const Icon = (LucideIcons as any)[componentName];

  return Icon || LucideIcons.Box;
}
