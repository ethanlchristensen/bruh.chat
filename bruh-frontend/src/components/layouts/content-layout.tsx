import * as React from "react";

import { SidebarTrigger } from "../ui/sidebar";
import { ThemeToggle } from "../theme/theme-toggle";

type ContentLayoutProps = {
  children: React.ReactNode;
  fullHeight?: boolean;
};

export const ContentLayout = ({
  children,
  fullHeight = false,
}: ContentLayoutProps) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-sidebar">
      <header className="bg-transparent flex shrink-0 items-center justify-between gap-1 px-1 pt-1">
        <SidebarTrigger />
        <ThemeToggle />
      </header>
      {fullHeight ? (
        <div className="flex-1 min-h-0 overflow-hidden bg-background mx-2 mb-2 rounded-lg">
          {children}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto py-6 bg-background">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
