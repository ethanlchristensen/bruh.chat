// src/components/theme/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from "react";

type EffectiveTheme = "dark" | "light";
type Theme = EffectiveTheme | "system";
type BaseTheme = "neutral" | "stone" | "zinc" | "gray";
type AccentColor =
  | "none" // Add this
  | "red"
  | "rose"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultBaseTheme?: BaseTheme;
  defaultAccentColor?: AccentColor;
  storageKey?: string;
  baseThemeStorageKey?: string;
  accentColorStorageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  effectiveTheme: EffectiveTheme;
  baseTheme: BaseTheme;
  accentColor: AccentColor;
  setTheme: (theme: Theme) => void;
  setBaseTheme: (baseTheme: BaseTheme) => void;
  setAccentColor: (accentColor: AccentColor) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  effectiveTheme: "dark",
  baseTheme: "zinc",
  accentColor: "none", // Changed default
  setTheme: () => null,
  setBaseTheme: () => null,
  setAccentColor: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultBaseTheme = "zinc",
  defaultAccentColor = "none", // Changed default
  storageKey = "bruh-ui-theme",
  baseThemeStorageKey = "bruh-ui-base-theme",
  accentColorStorageKey = "bruh-ui-accent-color",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  const [baseTheme, setBaseTheme] = useState<BaseTheme>(
    () =>
      (localStorage.getItem(baseThemeStorageKey) as BaseTheme) ||
      defaultBaseTheme,
  );

  const [accentColor, setAccentColor] = useState<AccentColor>(
    () =>
      (localStorage.getItem(accentColorStorageKey) as AccentColor) ||
      defaultAccentColor,
  );

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>("dark");

  // Handle light/dark theme
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      setEffectiveTheme(systemTheme);
      return;
    }

    root.classList.add(theme);
    setEffectiveTheme(theme);
  }, [theme]);

  // Handle base theme
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("neutral", "stone", "zinc", "gray");
    root.classList.add(baseTheme);
  }, [baseTheme]);

  // Handle accent color
  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all accent colors
    root.classList.remove(
      "red",
      "rose",
      "orange",
      "amber",
      "yellow",
      "lime",
      "green",
      "emerald",
      "teal",
      "cyan",
      "sky",
      "blue",
      "indigo",
      "violet",
      "purple",
      "fuchsia",
      "pink",
    );

    // Only add accent color if it's not "none"
    if (accentColor !== "none") {
      root.classList.add(accentColor);
    }
  }, [accentColor]);

  const value = {
    theme,
    effectiveTheme,
    baseTheme,
    accentColor,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    setBaseTheme: (baseTheme: BaseTheme) => {
      localStorage.setItem(baseThemeStorageKey, baseTheme);
      setBaseTheme(baseTheme);
    },
    setAccentColor: (accentColor: AccentColor) => {
      localStorage.setItem(accentColorStorageKey, accentColor);
      setAccentColor(accentColor);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
