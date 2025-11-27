import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";

const RootLayout = () => (
  <>
    <Outlet />
    <TanStackRouterDevtools position={"bottom-right"} />
    <Toaster position={'bottom-right'} />
  </>
);

export const Route = createRootRoute({ component: RootLayout });
