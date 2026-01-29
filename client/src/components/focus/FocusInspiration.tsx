import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Quote, Music, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InspirationQuote, InspirationMusic } from "@shared/schema";

export function FocusInspiration() {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: quoteData } = useQuery<{ daily: any; quote: InspirationQuote | null }>({
    queryKey: ["/api/inspiration/quotes/daily"],
  });

  const { data: focusMusic = [] } = useQuery<InspirationMusic[]>({
    queryKey: ["/api/inspiration/music/focus"],
  });

  const quote = quoteData?.quote;
  const primaryMusic = focusMusic[0];

  if (!quote && !primaryMusic) return null;

  return (
    <div
      className={cn(
        "absolute bottom-16 left-4 bg-black/30 backdrop-blur-md rounded-lg border border-white/10 transition-all duration-300",
        isExpanded ? "w-80 p-4" : "w-auto p-2"
      )}
      data-testid="focus-inspiration-panel"
    >
      <Button
        variant="ghost"
        size="sm"
        className="text-white/60 hover:text-white hover:bg-white/10 h-7 px-2 mb-2 w-full justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="button-toggle-inspiration"
      >
        <span className="flex items-center gap-2 text-xs">
          <Quote className="h-3 w-3" />
          Inspiration
        </span>
        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </Button>

      {isExpanded && (
        <div className="space-y-4">
          {quote && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <Quote className="h-3 w-3" />
                <span>Daily Quote</span>
              </div>
              <blockquote className="text-sm italic text-white/90 line-clamp-3" data-testid="text-focus-quote">
                "{quote.text}"
              </blockquote>
              <p className="text-xs text-white/50" data-testid="text-focus-author">
                — {quote.author || "Unknown"}
              </p>
            </div>
          )}

          {primaryMusic && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <Music className="h-3 w-3" />
                <span>Focus Music</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white/80 truncate">{primaryMusic.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-white/60 hover:text-white hover:bg-white/10"
                  asChild
                >
                  <a href={primaryMusic.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Play
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
