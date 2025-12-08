import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Message as MessageComponent } from "./message";
import { MessageSquare, Loader2 } from "lucide-react";
import type { Message } from "@/types/api";

type MessageListProps = {
  messages: Message[];
  isLoading?: boolean;
  onScrollStateChange?: (isScrolledUp: boolean) => void;
};

export const MessageList = forwardRef<
  { scrollToBottom: () => void },
  MessageListProps
>(({ messages, isLoading, onScrollStateChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastScrollHeight = useRef(0);
  const isScrollingToBottom = useRef(false);

  // Check if user is near bottom
  const checkIfNearBottom = () => {
    if (!containerRef.current) return false;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    return distanceFromBottom < 150;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (!messagesEndRef.current || !containerRef.current) return;

    isScrollingToBottom.current = true;
    messagesEndRef.current.scrollIntoView({
      behavior,
      block: "end",
    });

    setTimeout(() => {
      isScrollingToBottom.current = false;
    }, 100);
  };

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => scrollToBottom("smooth"),
  }));

  const handleScroll = () => {
    if (isScrollingToBottom.current) return;

    const nearBottom = checkIfNearBottom();
    setAutoScroll(nearBottom);

    onScrollStateChange?.(!nearBottom);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle scrolling during updates
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const currentScrollHeight = container.scrollHeight;

    // Check if content grew (streaming or new message)
    const contentGrew = currentScrollHeight > lastScrollHeight.current;
    lastScrollHeight.current = currentScrollHeight;

    if (contentGrew && autoScroll) {
      // Use auto behavior to prevent jump
      scrollToBottom("auto");
    }
  }, [messages, autoScroll]);

  // Initial scroll
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom("auto");
    }
  }, []);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-3xl text-primary font-semibold mb-1">
              bruh.chat
            </h3>
            <p className="text-sm text-muted-foreground">Let's finna chat.</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageComponent key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex gap-3 mb-6">
            <div className="shrink-0">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              </div>
            </div>
            <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2.5">
              <span className="text-sm text-muted-foreground">Thinking</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});

MessageList.displayName = "MessageList";
