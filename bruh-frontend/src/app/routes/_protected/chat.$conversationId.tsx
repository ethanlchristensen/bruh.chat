import { createFileRoute } from "@tanstack/react-router";
import { ChatContainer } from "@/features/chat/components";

export const Route = createFileRoute("/_protected/chat/$conversationId")({
  component: ChatPage,
});

function ChatPage() {
  const { conversationId } = Route.useParams();
  return <ChatContainer conversationId={conversationId} />;
}
