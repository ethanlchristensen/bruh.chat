import { useState } from "react";
import { ChevronDown, ChevronRight, Brain, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown/markdown";
import type { GeneratedReasoningImage } from "@/types/api";

type ReasoningSectionProps = {
  content: string;
  images?: GeneratedReasoningImage[];
  streamingImages?: Array<{ id: string; data: string }>;
  isActive?: boolean;
};

export const ReasoningSection = ({
  content,
  images = [],
  streamingImages = [],
  isActive = false,
}: ReasoningSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content && images.length === 0 && streamingImages.length === 0)
    return null;

  const getImageUrl = (image: GeneratedReasoningImage) => {
    if (
      image.image_url.startsWith("http") ||
      image.image_url.startsWith("blob:")
    ) {
      return image.image_url;
    }
    const baseUrl = window.location.origin;
    return `${baseUrl}${image.image_url.startsWith("/") ? image.image_url : `/${image.image_url}`}`;
  };

  return (
    <div>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 rounded transition-colors text-left group hover:cursor-pointer"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-muted-foreground" />
        )}
        <Brain className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-muted-foreground" />
        <span
          className={`text-xs font-medium group-hover:text-muted-foreground ${
            isActive
              ? "bg-reasoning-gradient bg-size-[200%_200%] bg-clip-text text-transparent animate-shine drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              : "text-muted-foreground/70"
          }`}
        >
          Reasoning
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="pl-7 pr-1 py-2">
          {content && (
            <div className="italic text-sm text-muted-foreground/90 mb-2">
              <MarkdownRenderer content={content} />
            </div>
          )}

          {isActive && !content && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/70 py-2">
              <span>Thinking</span>
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
          )}

          {/* Streaming Images (base64) */}
          {streamingImages.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {streamingImages.map((image) => (
                <div key={image.id} className="overflow-hidden bg-background">
                  <img
                    src={`data:image/png;base64,${image.data}`}
                    alt="Reasoning visualization"
                    className="rounded max-w-full max-h-64 object-contain"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Final Reasoning Images (from API) */}
          {images.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {images.map((image) => (
                <div key={image.id} className="overflow-hidden bg-background">
                  <img
                    src={getImageUrl(image)}
                    alt="Reasoning visualization"
                    className="rounded max-w-full max-h-64 object-contain"
                    onError={(e) => {
                      console.error(
                        "Reasoning image failed to load:",
                        image.image_url,
                      );
                      console.error("Error event:", e);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
