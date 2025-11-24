import { AppProvider } from "./provider";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";

import { routeTree } from "@/routeTree.gen";

const router = createRouter({ routeTree: routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export const App = () => {
  return (
    <AppProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>{" "}
    </AppProvider>
  );
};
