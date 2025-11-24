import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth")({
  beforeLoad: () => {
    const tokens = localStorage.getItem("auth_tokens")
    
    // If already authenticated, redirect to home
    if (tokens) {
      const authTokens = JSON.parse(tokens)
      if (authTokens.expiresAt > Date.now()) {
        throw redirect({ to: "/" })
      }
    }
  },
  component: () => (
    <div className="flex min-h-screen min-w-screen items-center justify-center bg-background">
      <Outlet />
    </div>
  ),
})