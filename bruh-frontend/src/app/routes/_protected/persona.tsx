import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/persona")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_protected/persona"!</div>;
}
