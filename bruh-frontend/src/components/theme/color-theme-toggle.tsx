import { Palette, Check } from "lucide-react";
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

const accentColors = [
  { value: "red", label: "Red", color: "bg-red-500" },
  { value: "rose", label: "Rose", color: "bg-rose-500" },
  { value: "orange", label: "Orange", color: "bg-orange-500" },
  { value: "amber", label: "Amber", color: "bg-amber-500" },
  { value: "yellow", label: "Yellow", color: "bg-yellow-500" },
  { value: "lime", label: "Lime", color: "bg-lime-500" },
  { value: "green", label: "Green", color: "bg-green-500" },
  { value: "emerald", label: "Emerald", color: "bg-emerald-500" },
  { value: "teal", label: "Teal", color: "bg-teal-500" },
  { value: "cyan", label: "Cyan", color: "bg-cyan-500" },
  { value: "sky", label: "Sky", color: "bg-sky-500" },
  { value: "blue", label: "Blue", color: "bg-blue-500" },
  { value: "indigo", label: "Indigo", color: "bg-indigo-500" },
  { value: "violet", label: "Violet", color: "bg-violet-500" },
  { value: "purple", label: "Purple", color: "bg-purple-500" },
  { value: "fuchsia", label: "Fuchsia", color: "bg-fuchsia-500" },
  { value: "pink", label: "Pink", color: "bg-pink-500" },
] as const;

export function ColorThemeToggle() {
  const { setAccentColor, accentColor } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle accent color</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accentColors.map((color) => (
          <DropdownMenuItem
            key={color.value}
            onClick={() => setAccentColor(color.value)}
            className="flex items-center gap-3"
          >
            <div className={`h-4 w-4 rounded-full ${color.color}`} />
            <Check
              className={`h-4 w-4 transition-opacity ${
                accentColor === color.value ? "opacity-100" : "opacity-0"
              }`}
            />
            <span
              className={
                accentColor === color.value ? "font-semibold" : "font-normal"
              }
            >
              {color.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
