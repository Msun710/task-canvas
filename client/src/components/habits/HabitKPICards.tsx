import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Flame, Star, Target, TrendingUp, TrendingDown, AlertTriangle, Calendar, Zap } from "lucide-react";

interface HabitMetrics {
  total: number;
  completed: number;
  pending: number;
  missed: number;
  completionRate: number;
  currentStreak: number;
  dailyStats?: { date: string; completed: number; total: number }[];
}

interface MultiLevelStreaks {
  parentStreaks: { habitId: string; habitName: string; currentStreak: number; longestStreak: number }[];
  subHabitStreaks: { habitId: string; habitName: string; parentName: string; currentStreak: number; longestStreak: number }[];
  perfectDays: number;
  overallLongest: number;
}

interface HabitPatterns {
  insights: string[];
  dayOfWeekStats: { day: string; completionRate: number }[];
  mostSkippedHabits: { habitName: string; skipRate: number }[];
  bestPerformingHabits: { habitName: string; completionRate: number }[];
}

interface MetricsResponse {
  trend?: 'up' | 'down' | 'stable';
  completionRate?: number;
  topHabits?: { habitName: string; completionRate: number }[];
  needsAttention?: { habitName: string; completionRate: number }[];
}

export function HabitKPICards() {
  const { data: todayMetrics, isLoading: todayLoading } = useQuery<HabitMetrics>({
    queryKey: ["/api/habits/metrics/today"],
  });

  const { data: weekMetrics, isLoading: weekLoading } = useQuery<HabitMetrics>({
    queryKey: ["/api/habits/metrics/week"],
  });

  const { data: streaksData, isLoading: streaksLoading } = useQuery<MultiLevelStreaks>({
    queryKey: ["/api/habits/streaks"],
  });

  const { data: patternsData, isLoading: patternsLoading } = useQuery<HabitPatterns>({
    queryKey: ["/api/habits/patterns"],
  });

  const { data: analyticsMetrics, isLoading: analyticsLoading } = useQuery<MetricsResponse>({
    queryKey: ["/api/habits/analytics/metrics", "week"],
  });

  const isLoading = todayLoading || weekLoading || streaksLoading || patternsLoading || analyticsLoading;

  const consistencyScore = weekMetrics 
    ? Math.round((weekMetrics.completionRate / 100) * 100) 
    : 0;

  const bestDay = patternsData?.dayOfWeekStats?.reduce((best, curr) => 
    curr.completionRate > best.completionRate ? curr : best,
    patternsData.dayOfWeekStats[0]
  );

  const worstDay = patternsData?.dayOfWeekStats?.reduce((worst, curr) => 
    curr.completionRate < worst.completionRate ? curr : worst,
    patternsData.dayOfWeekStats[0]
  );

  const trend = analyticsMetrics?.trend || 'stable';
  const isStreakEndangered = todayMetrics && todayMetrics.pending > 0 && new Date().getHours() >= 20;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Current Streak",
      value: todayMetrics?.currentStreak || 0,
      suffix: "days",
      icon: Flame,
      iconColor: "text-orange-500",
      bgGradient: "from-orange-500/10 to-transparent",
      borderColor: "border-orange-500/20 dark:border-orange-500/30",
      badge: isStreakEndangered ? (
        <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-xs">
          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
          At Risk
        </Badge>
      ) : null,
    },
    {
      title: "Perfect Days",
      value: streaksData?.perfectDays || 0,
      suffix: "days",
      icon: Star,
      iconColor: "text-amber-500",
      bgGradient: "from-amber-500/10 to-transparent",
      borderColor: "border-amber-500/20 dark:border-amber-500/30",
      badge: null,
    },
    {
      title: "Consistency",
      value: consistencyScore,
      suffix: "%",
      icon: Target,
      iconColor: "text-emerald-500",
      bgGradient: "from-emerald-500/10 to-transparent",
      borderColor: "border-emerald-500/20 dark:border-emerald-500/30",
      badge: consistencyScore < 50 ? (
        <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 text-xs">
          Needs Work
        </Badge>
      ) : consistencyScore >= 80 ? (
        <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs">
          Great!
        </Badge>
      ) : null,
    },
    {
      title: "Momentum",
      value: trend === 'up' ? '+' : trend === 'down' ? '-' : '',
      suffix: trend.charAt(0).toUpperCase() + trend.slice(1),
      icon: trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Zap,
      iconColor: trend === 'up' ? "text-emerald-500" : trend === 'down' ? "text-rose-500" : "text-violet-500",
      bgGradient: trend === 'up' ? "from-emerald-500/10 to-transparent" : trend === 'down' ? "from-rose-500/10 to-transparent" : "from-violet-500/10 to-transparent",
      borderColor: trend === 'up' ? "border-emerald-500/20 dark:border-emerald-500/30" : trend === 'down' ? "border-rose-500/20 dark:border-rose-500/30" : "border-violet-500/20 dark:border-violet-500/30",
      badge: null,
      showValue: false,
    },
    {
      title: "Best Day",
      value: bestDay?.day?.slice(0, 3) || '-',
      suffix: bestDay ? `${Math.round(bestDay.completionRate)}%` : '',
      icon: Calendar,
      iconColor: "text-blue-500",
      bgGradient: "from-blue-500/10 to-transparent",
      borderColor: "border-blue-500/20 dark:border-blue-500/30",
      badge: null,
      showValue: false,
    },
    {
      title: "Active Habits",
      value: todayMetrics?.total || 0,
      suffix: "active",
      icon: Target,
      iconColor: "text-violet-500",
      bgGradient: "from-violet-500/10 to-transparent",
      borderColor: "border-violet-500/20 dark:border-violet-500/30",
      badge: (todayMetrics?.pending || 0) > 0 ? (
        <Badge variant="outline" className="text-muted-foreground text-xs">
          {todayMetrics?.pending} pending
        </Badge>
      ) : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="kpi-cards-grid">
      {kpiCards.map((kpi, idx) => (
        <Card 
          key={idx} 
          className={`bg-gradient-to-br ${kpi.bgGradient} ${kpi.borderColor}`}
          data-testid={`kpi-card-${kpi.title.toLowerCase().replace(/\s/g, '-')}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-1 mb-2">
              <div className={`h-8 w-8 rounded-md bg-background/50 flex items-center justify-center`}>
                <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
              </div>
              {kpi.badge}
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {kpi.title}
            </p>
            <div className="flex items-baseline gap-1">
              {kpi.showValue !== false && (
                <span className="text-2xl font-semibold">{kpi.value}</span>
              )}
              <span className="text-sm text-muted-foreground">{kpi.suffix}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
