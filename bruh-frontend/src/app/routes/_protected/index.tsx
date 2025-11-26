import { createFileRoute } from "@tanstack/react-router";
import { ChatContainer } from "@/features/chat/components";

export const Route = createFileRoute("/_protected/")({
  component: Index,
});

function Index() {
  return <ChatContainer conversationId={undefined} />;
}