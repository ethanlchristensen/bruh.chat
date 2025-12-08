import { createFileRoute } from "@tanstack/react-router";
import { ChatContainer } from "@/features/chat/components";

type ChatSearch = {
  c?: string;
};

export const Route = createFileRoute("/_protected/")({
  component: ChatPage,
  validateSearch: (search: Record<string, unknown>): ChatSearch => {
    return {
      c: search.c as string | undefined,
    };
  },
});

function ChatPage() {
  const { c: conversationId } = Route.useSearch();
  return <ChatContainer conversationId={conversationId} />;
}
