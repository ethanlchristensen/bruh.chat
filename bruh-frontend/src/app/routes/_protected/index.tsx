import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_protected/")({
  component: Index,
});

function Index() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary">
        Welcome Home, {user?.first_name || user?.username}!
      </h1>
      <p className="text-muted-foreground">{user?.profile.bio}</p>
    </div>
  );
}