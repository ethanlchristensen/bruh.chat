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
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="bg-sidebar flex shrink-0 items-center justify-between gap-1 px-x py-1">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>
      {fullHeight ? (
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto py-6">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
