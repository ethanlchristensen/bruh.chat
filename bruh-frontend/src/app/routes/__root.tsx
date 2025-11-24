import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

const RootLayout = () => (
  <>
    <Outlet />
    <TanStackRouterDevtools position={'bottom-right'}/>
  </>
)

export const Route = createRootRoute({ component: RootLayout })