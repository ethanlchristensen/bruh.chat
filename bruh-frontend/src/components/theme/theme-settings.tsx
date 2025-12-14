// src/components/theme/theme-settings.tsx
import { Sun, Moon, Monitor, Check, Ban } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const baseThemes = [
  { value: "neutral", label: "Neutral", color: "bg-neutral-500" },
  { value: "stone", label: "Stone", color: "bg-stone-500" },
  { value: "zinc", label: "Zinc", color: "bg-zinc-500" },
  { value: "gray", label: "Gray", color: "bg-gray-500" },
] as const;

const accentColors = [
  {
    value: "none",
    label: "None",
    color: "bg-gradient-to-br from-neutral-400 to-neutral-600",
  },
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

export function ThemeSettings() {
  const {
    theme,
    setTheme,
    baseTheme,
    setBaseTheme,
    accentColor,
    setAccentColor,
  } = useTheme();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Appearance & Theme</CardTitle>
        <CardDescription className="text-xs">
          Customize the look and feel of your interface
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Light/Dark Mode */}
        <div className="space-y-2">
          <div>
            <h3 className="font-medium text-xs">Theme Mode</h3>
            <p className="text-[10px] text-muted-foreground">
              Choose your preferred theme mode
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-2.5 rounded-md border-2 transition-all hover:bg-accent",
                theme === "light"
                  ? "border-primary bg-accent"
                  : "border-border",
              )}
            >
              <Sun className="h-4 w-4" />
              <span className="text-[10px] font-medium">Light</span>
              {theme === "light" && (
                <Check className="h-3 w-3 text-primary absolute top-1.5 right-1.5" />
              )}
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-2.5 rounded-md border-2 transition-all hover:bg-accent",
                theme === "dark" ? "border-primary bg-accent" : "border-border",
              )}
            >
              <Moon className="h-4 w-4" />
              <span className="text-[10px] font-medium">Dark</span>
              {theme === "dark" && (
                <Check className="h-3 w-3 text-primary absolute top-1.5 right-1.5" />
              )}
            </button>

            <button
              onClick={() => setTheme("system")}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-2.5 rounded-md border-2 transition-all hover:bg-accent",
                theme === "system"
                  ? "border-primary bg-accent"
                  : "border-border",
              )}
            >
              <Monitor className="h-4 w-4" />
              <span className="text-[10px] font-medium">System</span>
              {theme === "system" && (
                <Check className="h-3 w-3 text-primary absolute top-1.5 right-1.5" />
              )}
            </button>
          </div>
        </div>

        {/* Base Theme */}
        <div className="space-y-2">
          <div>
            <h3 className="font-medium text-xs">Base Theme</h3>
            <p className="text-[10px] text-muted-foreground">
              Select your preferred neutral color palette
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {baseThemes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => setBaseTheme(themeOption.value)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 p-2.5 rounded-md border-2 transition-all hover:bg-accent",
                  baseTheme === themeOption.value
                    ? "border-primary bg-accent"
                    : "border-border",
                )}
              >
                <div
                  className={cn("h-6 w-6 rounded-full", themeOption.color)}
                />
                <span className="text-[10px] font-medium">
                  {themeOption.label}
                </span>
                {baseTheme === themeOption.value && (
                  <Check className="h-3 w-3 text-primary absolute top-1.5 right-1.5" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-2">
          <div>
            <h3 className="font-medium text-xs">Accent Color</h3>
            <p className="text-[10px] text-muted-foreground">
              Choose your preferred accent color or none to match base
            </p>
          </div>
          <div className="grid grid-cols-9 gap-1.5">
            {accentColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setAccentColor(color.value)}
                className={cn(
                  "relative aspect-square rounded-md border-2 transition-all hover:scale-105 hover:border-primary",
                  accentColor === color.value
                    ? "border-primary scale-105"
                    : "border-border",
                )}
                title={color.label}
              >
                {color.value === "none" ? (
                  <div className="h-full w-full rounded-sm flex items-center justify-center bg-muted">
                    <Ban className="h-4 w-4 text-muted-foreground" />
                  </div>
                ) : (
                  <div
                    className={cn("h-full w-full rounded-sm", color.color)}
                  />
                )}
                {accentColor === color.value && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white drop-shadow-lg" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
