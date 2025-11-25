import { createFileRoute } from "@tanstack/react-router";
import { NewChatLanding } from "@/features/chat/components/new-chat-landing";

export const Route = createFileRoute("/_protected/")({
  component: Index,
});

function Index() {
  return <NewChatLanding />;
}
