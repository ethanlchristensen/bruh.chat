import { createFileRoute } from "@tanstack/react-router";
import { PersonasManagement } from "@/features/persona/components/persona-management";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_protected/personas")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="overflow-y-scroll h-full w-full">
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Personas</h1>
          </div>
          <p className="text-muted-foreground">
            Create custom AI personas with unique personalities, instructions,
            and behaviors for different use cases
          </p>
        </div>

        <PersonasManagement />
      </div>
    </div>
  );
}
