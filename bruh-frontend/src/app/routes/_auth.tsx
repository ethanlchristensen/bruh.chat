import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ location }) => {
    console.loge(location);
    const tokens = localStorage.getItem("auth_tokens");

    if (tokens) {
      const authTokens = JSON.parse(tokens);
      if (authTokens.expires_at > Date.now()) {
        throw redirect({ to: "/" });
      }
    }
  },
  component: () => (
    <div className="flex min-h-screen w-full items-center justify-center bg-linear-to-br from-background to-muted p-4">
      <Outlet />
    </div>
  ),
});