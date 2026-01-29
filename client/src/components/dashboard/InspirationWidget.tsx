import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Quote, RefreshCw, Star, ArrowRight, Sparkles } from "lucide-react";
import type { InspirationQuote } from "@shared/schema";

interface DailyQuoteResponse {
  daily: any;
  quote: InspirationQuote | null;
}

export function InspirationWidget() {
  const { data, isLoading } = useQuery<DailyQuoteResponse>({
    queryKey: ["/api/inspiration/quotes/daily"],
  });

  const { data: stats } = useQuery<{ quotesCount: number; videosCount: number; musicCount: number; imagesCount: number }>({
    queryKey: ["/api/inspiration/stats"],
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/inspiration/quotes/daily/refresh"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/quotes/daily"] });
    },
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Quote className="h-4 w-4" />
            Daily Inspiration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded-md" />
        </CardContent>
      </Card>
    );
  }

  const quote = data?.quote;
  const totalItems = (stats?.quotesCount || 0) + (stats?.videosCount || 0) + (stats?.musicCount || 0) + (stats?.imagesCount || 0);

  return (
    <Card className="border-l-4 border-l-violet-500" data-testid="card-inspiration-widget">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Daily Inspiration
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              data-testid="button-refresh-widget-quote"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quote ? (
          <div className="space-y-2">
            <blockquote className="text-sm italic text-foreground line-clamp-3" data-testid="text-widget-quote">
              "{quote.text}"
            </blockquote>
            <p className="text-xs text-muted-foreground" data-testid="text-widget-author">
              — {quote.author || "Unknown"}
            </p>
            {quote.category && (
              <Badge variant="outline" className="text-xs">
                {quote.category}
              </Badge>
            )}
          </div>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            <Quote className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No quotes yet</p>
            <p className="text-xs mt-1">Add your first quote to get inspired</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="h-3 w-3" />
            <span>{totalItems} items in collection</span>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <Link href="/inspiration">
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
