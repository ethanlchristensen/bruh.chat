import { createContext, useContext, useEffect, useState } from "react";

type EffectiveTheme = "dark" | "light";
type Theme = EffectiveTheme | "system";
type ColorTheme =
  | "neutral"
  | "red"
  | "rose"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "violet";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultColorTheme?: ColorTheme;
  storageKey?: string;
  colorStorageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  effectiveTheme: EffectiveTheme;
  colorTheme: ColorTheme;
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: ColorTheme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  effectiveTheme: "dark",
  colorTheme: "neutral",
  setTheme: () => null,
  setColorTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultColorTheme = "neutral",
  storageKey = "bruh-ui-theme",
  colorStorageKey = "bruh-ui-color-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  const [colorTheme, setColorTheme] = useState<ColorTheme>(
    () =>
      (localStorage.getItem(colorStorageKey) as ColorTheme) ||
      defaultColorTheme,
  );

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>("dark");

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

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove(
      "neutral",
      "red",
      "rose",
      "orange",
      "yellow",
      "green",
      "blue",
      "violet",
    );
    root.classList.add(colorTheme);
  }, [colorTheme]);

  const value = {
    theme,
    effectiveTheme,
    colorTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    setColorTheme: (colorTheme: ColorTheme) => {
      localStorage.setItem(colorStorageKey, colorTheme);
      setColorTheme(colorTheme);
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
