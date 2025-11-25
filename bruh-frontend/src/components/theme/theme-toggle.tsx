import { Moon, Sun, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center gap-2"
        >
          <Check
            className={`h-4 w-4 transition-opacity ${theme === "light" ? "opacity-100" : "opacity-0"}`}
          />
          <span className={theme === "light" ? "font-semibold" : "font-normal"}>
            Light
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center gap-2"
        >
          <Check
            className={`h-4 w-4 transition-opacity ${theme === "dark" ? "opacity-100" : "opacity-0"}`}
          />
          <span className={theme === "dark" ? "font-semibold" : "font-normal"}>
            Dark
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center gap-2"
        >
          <Check
            className={`h-4 w-4 transition-opacity ${theme === "system" ? "opacity-100" : "opacity-0"}`}
          />
          <span
            className={theme === "system" ? "font-semibold" : "font-normal"}
          >
            System
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
