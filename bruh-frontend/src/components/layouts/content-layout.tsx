import * as React from "react";

import { SidebarTrigger } from "../ui/sidebar";
import { ThemeToggle } from "../theme/theme-toggle";
import { ColorThemeToggle } from "../theme/color-theme-toggle";

type ContentLayoutProps = {
  children: React.ReactNode;
};

export const ContentLayout = ({ children }: ContentLayoutProps) => {
  return (
    <>
      <header className="bg-background sticky top-0 flex shrink-0 items-center justify-between gap-2 border-b p-2">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ColorThemeToggle />
        </div>
      </header>
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
          {children}
        </div>
      </div>
    </>
  );
};
