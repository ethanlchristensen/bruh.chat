import { Layers, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./theme-provider";

const baseThemes = [
  { value: "neutral", label: "Neutral", color: "bg-neutral-500" },
  { value: "stone", label: "Stone", color: "bg-stone-500" },
  { value: "zinc", label: "Zinc", color: "bg-zinc-500" },
  { value: "gray", label: "Gray", color: "bg-gray-500" },
] as const;

export function BaseThemeToggle() {
  const { setBaseTheme, baseTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Layers className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle base theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Base Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {baseThemes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => setBaseTheme(theme.value)}
            className="flex items-center gap-3"
          >
            <div className={`h-4 w-4 rounded-full ${theme.color}`} />
            <Check
              className={`h-4 w-4 transition-opacity ${
                baseTheme === theme.value ? "opacity-100" : "opacity-0"
              }`}
            />
            <span
              className={
                baseTheme === theme.value ? "font-semibold" : "font-normal"
              }
            >
              {theme.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
