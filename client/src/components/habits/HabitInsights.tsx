import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Zap, 
  Flame, 
  Check,
  ChevronRight
} from "lucide-react";

interface HabitInsight {
  id: string;
  type: 'peak_time' | 'pattern' | 'alert' | 'recommendation' | 'correlation' | 'streak_milestone';
  title: string;
  description: string;
  habitId?: string;
  habitName?: string;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

const insightIcons: Record<string, typeof Lightbulb> = {
  peak_time: Clock,
  pattern: TrendingUp,
  alert: AlertTriangle,
  recommendation: Target,
  correlation: Zap,
  streak_milestone: Flame,
};

const insightColors: Record<string, { icon: string; bg: string; border: string }> = {
  peak_time: {
    icon: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  pattern: {
    icon: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  alert: {
    icon: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  recommendation: {
    icon: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  correlation: {
    icon: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  streak_milestone: {
    icon: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
};

export function HabitInsights() {
  const { data: insights = [], isLoading } = useQuery<HabitInsight[]>({
    queryKey: ["/api/habit-insights", { limit: 6 }],
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/habit-insights/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-insights"] });
    },
  });

  const unreadInsights = insights.filter(i => !i.isRead);
  const displayInsights = unreadInsights.length > 0 ? unreadInsights.slice(0, 6) : insights.slice(0, 6);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-md border">
              <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (displayInsights.length === 0) {
    return (
      <Card data-testid="card-habit-insights">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Complete more habits to unlock insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-habit-insights">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Smart Insights
        </CardTitle>
        {unreadInsights.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {unreadInsights.length} new
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {displayInsights.map((insight) => {
          const Icon = insightIcons[insight.type] || Lightbulb;
          const colors = insightColors[insight.type] || insightColors.recommendation;

          return (
            <div
              key={insight.id}
              className={`flex items-start gap-3 p-3 rounded-md border ${colors.border} ${!insight.isRead ? colors.bg : 'bg-muted/30'}`}
              data-testid={`insight-item-${insight.id}`}
            >
              <div className={`h-8 w-8 rounded-md ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-4 w-4 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-medium text-sm leading-tight">{insight.title}</h4>
                  {!insight.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => markAsReadMutation.mutate(insight.id)}
                      data-testid={`button-mark-read-${insight.id}`}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                {insight.actionUrl && insight.actionLabel && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-1 text-xs"
                    data-testid={`button-insight-action-${insight.id}`}
                  >
                    {insight.actionLabel}
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
