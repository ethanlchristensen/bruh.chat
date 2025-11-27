import { createFileRoute } from "@tanstack/react-router";
import ProfileCard from "@/features/profile/profile-card";

export const Route = createFileRoute("/_protected/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="overflow-y-scroll h-full w-full flex justrify-start">
      <ProfileCard />
    </div>
  )
}