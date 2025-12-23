import { useState, useEffect } from "react";
import { useConversationStarters } from "../api/conversation-starters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationStartersProps {
  onSelectStarter: (question: string) => void;
  onTopicChange?: (category: string) => void;
  className?: string;
}

const DEFAULT_TOPICS = [
  "technology",
  "science",
  "philosophy",
  "creativity",
  "future",
  "productivity",
];

export const ConversationStarters = ({
  onSelectStarter,
  onTopicChange,
  className,
}: ConversationStartersProps) => {
  const [topics] = useState(DEFAULT_TOPICS);
  const {
    data: starters,
    isLoading,
    refetch,
    isFetching,
  } = useConversationStarters(topics);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const currentStarter = starters?.[currentIndex];

  useEffect(() => {
    if (currentStarter && onTopicChange) {
      onTopicChange(currentStarter.category);
    }
  }, [currentStarter, onTopicChange]);

  useEffect(() => {
    if (!currentStarter) return;

    setIsTyping(true);
    setDisplayedText("");

    const text = currentStarter.question;
    let charIndex = 0;

    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        setDisplayedText(text.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);

        const nextTimeout = setTimeout(() => {
          if (starters && currentIndex < starters.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else {
            setCurrentIndex(0);
          }
        }, 4000);

        return () => clearTimeout(nextTimeout);
      }
    }, 30);

    return () => clearInterval(typeInterval);
  }, [currentIndex, currentStarter, starters]);

  const handleRefresh = () => {
    setCurrentIndex(0);
    setDisplayedText("");
    refetch();
  };

  const handleClick = () => {
    if (currentStarter) {
      onSelectStarter(currentStarter.question);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("w-full max-w-2xl mx-auto", className)}>
        <div className="space-y-4">
          <Skeleton className="h-4 w-24 mx-auto" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-2 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!starters || starters.length === 0 || !currentStarter) {
    return null;
  }

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <div className="space-y-4">
        <button onClick={handleClick} className="w-full text-left group">
          <div className="border border-border rounded-lg p-4 hover:border-foreground/20 transition-colors">
            <p className="text-lg text-foreground/90 leading-relaxed min-h-12">
              {displayedText}
              {isTyping && (
                <span className="inline-block w-0.5 h-5 bg-foreground/40 ml-0.5 animate-pulse" />
              )}
            </p>
          </div>
        </button>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex gap-2">
            {starters.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-1 rounded-full transition-all",
                  index === currentIndex
                    ? "w-6 bg-foreground"
                    : "w-1 bg-foreground/20 hover:bg-foreground/40",
                )}
                aria-label={`Go to suggestion ${index + 1}`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-8 px-3 text-xs"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
};
