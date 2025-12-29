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
    <div className="flex flex-col h-screen overflow-hidden bg-sidebar relative">
      {/* Overlay Controls */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-3 pointer-events-none">
        <div className="pointer-events-auto">
          <SidebarTrigger />
        </div>
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Content */}
      {fullHeight ? (
        <div className="flex-1 min-h-0 overflow-hidden bg-background my-2 mr-2 rounded-lg">
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
