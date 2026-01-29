import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lightbulb,
  AlertTriangle,
  Trophy,
  Clock,
  TrendingUp,
  Target,
  Flame,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProductivityInsight } from "@shared/schema";

interface InsightsPanelProps {
  className?: string;
}

const INSIGHT_ICONS: Record<string, typeof Lightbulb> = {
  tip: Lightbulb,
  warning: AlertTriangle,
  achievement: Trophy,
  deadline: Clock,
  trend: TrendingUp,
  goal: Target,
  streak: Flame,
  productivity: Sparkles,
};

const INSIGHT_COLORS: Record<string, string> = {
  tip: "text-yellow-500",
  warning: "text-orange-500",
  achievement: "text-green-500",
  deadline: "text-red-500",
  trend: "text-blue-500",
  goal: "text-purple-500",
  streak: "text-orange-500",
  productivity: "text-indigo-500",
};

function InsightCard({
  insight,
  onDismiss,
  isActive,
}: {
  insight: ProductivityInsight;
  onDismiss: (id: string) => void;
  isActive: boolean;
}) {
  const IconComponent = INSIGHT_ICONS[insight.type] || Lightbulb;
  const iconColor = INSIGHT_COLORS[insight.type] || "text-muted-foreground";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-md bg-muted/30 transition-all duration-300",
        isActive ? "opacity-100" : "opacity-0 absolute"
      )}
      data-testid={`insight-card-${insight.id}`}
    >
      <div className={cn("flex-shrink-0 mt-0.5", iconColor)}>
        <IconComponent className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm">{insight.title}</h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-50 hover:opacity-100 flex-shrink-0"
            onClick={() => onDismiss(insight.id)}
            data-testid={`button-dismiss-insight-${insight.id}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{insight.description}</p>
        {insight.actionUrl && (
          <a
            href={insight.actionUrl}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-2"
            data-testid={`link-insight-action-${insight.id}`}
          >
            View details
            <ArrowRight className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}

export function InsightsPanel({ className }: InsightsPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: insights = [], isLoading } = useQuery<ProductivityInsight[]>({
    queryKey: ["/api/insights"],
    refetchInterval: 5 * 60 * 1000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (insightId: string) => {
      await apiRequest("PATCH", `/api/insights/${insightId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
    },
  });

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id);
    if (currentIndex >= insights.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const unreadInsights = insights.filter((i) => !i.isRead);

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? unreadInsights.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === unreadInsights.length - 1 ? 0 : prev + 1
    );
  };

  if (isLoading) {
    return (
      <Card className={className} data-testid="insights-panel-loading">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Sparkles className="h-4 w-4" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InsightsSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (unreadInsights.length === 0) {
    return (
      <Card className={className} data-testid="insights-panel-empty">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Sparkles className="h-4 w-4" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Lightbulb className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No new insights available
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Keep working and we'll share tips soon
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="insights-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Sparkles className="h-4 w-4" />
          Insights
          {unreadInsights.length > 0 && (
            <Badge variant="secondary" size="sm">
              {unreadInsights.length}
            </Badge>
          )}
        </CardTitle>
        {unreadInsights.length > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrev}
              data-testid="button-insight-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
              {currentIndex + 1}/{unreadInsights.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNext}
              data-testid="button-insight-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative min-h-[100px]">
          {unreadInsights.map((insight, index) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onDismiss={handleDismiss}
              isActive={index === currentIndex}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
