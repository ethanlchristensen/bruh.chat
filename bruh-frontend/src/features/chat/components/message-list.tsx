import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Message as MessageComponent } from "./message";
import { Loader2 } from "lucide-react";
import type { Message } from "@/types/api.types";

type MessageListProps = {
  messages: Message[];
  isLoading?: boolean;
  onScrollStateChange?: (isScrolledUp: boolean) => void;
  isStreaming?: boolean;
};

export const MessageList = forwardRef<
  { scrollToBottom: () => void },
  MessageListProps
>(({ messages, isLoading, onScrollStateChange, isStreaming }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastScrollHeight = useRef(0);
  const isScrollingToBottom = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const prevFirstMessageIdRef = useRef<string | null>(null);

  const checkIfNearBottom = () => {
    if (!containerRef.current) return false;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    return distanceFromBottom < 25;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (!messagesEndRef.current || !containerRef.current) return;

    isScrollingToBottom.current = true;
    setAutoScroll(true);

    // Immediately notify parent that we're at the bottom
    onScrollStateChange?.(false);

    messagesEndRef.current.scrollIntoView({
      behavior: isStreaming ? "instant" : behavior,
      block: "end",
    });

    setTimeout(() => {
      isScrollingToBottom.current = false;
    }, 100);
  };

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      setAutoScroll(true);
      scrollToBottom("smooth");
    },
  }));

  const handleScroll = () => {
    if (isScrollingToBottom.current) return;

    const nearBottom = checkIfNearBottom();

    if (!nearBottom) {
      if (autoScroll) {
        setAutoScroll(false);
        onScrollStateChange?.(true);
      }
      return;
    }

    if (nearBottom && !autoScroll) {
      setAutoScroll(true);
      onScrollStateChange?.(false);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isStreaming, autoScroll]);

  // Handle scrolling during updates
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const currentScrollHeight = container.scrollHeight;

    const contentGrew = currentScrollHeight > lastScrollHeight.current;
    lastScrollHeight.current = currentScrollHeight;

    if (contentGrew && autoScroll) {
      scrollToBottom("auto");
    }
  }, [messages, autoScroll]);

  // Detect conversation switches
  useEffect(() => {
    const currentLength = messages.length;
    const prevLength = prevMessagesLengthRef.current;
    const currentFirstId = messages[0]?.id ?? null;
    const prevFirstId = prevFirstMessageIdRef.current;

    const conversationSwitched =
      currentFirstId !== prevFirstId && prevFirstId !== null;

    const significantChange =
      Math.abs(currentLength - prevLength) > 1 || currentLength === 0;

    if (conversationSwitched || significantChange) {
      setAutoScroll(true);
      onScrollStateChange?.(false);
      lastScrollHeight.current = 0;

      setTimeout(() => {
        scrollToBottom("auto");
      }, 50);
    }

    prevMessagesLengthRef.current = currentLength;
    prevFirstMessageIdRef.current = currentFirstId;
  }, [messages]);

  // Initial scroll when messages first load
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollToBottom("auto");
      }, 50);
    }
  }, [messages.length]);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-6">
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
