import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Flame, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface HabitPerformance {
  habitId: string;
  habitName: string;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalScheduled: number;
}

export function HabitPerformanceBars() {
  const [expandedHabit, setExpandedHabit] = useState<string | null>(null);
  
  const { data: performanceData = [], isLoading } = useQuery<HabitPerformance[]>({
    queryKey: ["/api/habits/analytics/performance"],
  });

  const sortedData = [...performanceData].sort((a, b) => b.completionRate - a.completionRate);

  const getBarColor = (rate: number) => {
    if (rate >= 80) return "bg-emerald-500";
    if (rate >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getTextColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Habit Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (sortedData.length === 0) {
    return (
      <Card data-testid="card-habit-performance">
        <CardHeader>
          <CardTitle className="text-base">Habit Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No habit data available yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-habit-performance">
      <CardHeader>
        <CardTitle className="text-base">Habit Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedData.map((habit) => (
          <Collapsible
            key={habit.habitId}
            open={expandedHabit === habit.habitId}
            onOpenChange={(open) => setExpandedHabit(open ? habit.habitId : null)}
          >
            <CollapsibleTrigger className="w-full text-left" data-testid={`button-expand-habit-${habit.habitId}`}>
              <div className="space-y-2 p-2 rounded-md hover-elevate cursor-pointer">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{habit.habitName}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {habit.currentStreak > 0 && (
                      <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                        <Flame className="h-3 w-3 mr-1" />
                        {habit.currentStreak}
                      </Badge>
                    )}
                    <span className={`text-sm font-medium ${getTextColor(habit.completionRate)}`}>
                      {Math.round(habit.completionRate)}%
                    </span>
                    {expandedHabit === habit.habitId ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(habit.completionRate)}`}
                    style={{ width: `${habit.completionRate}%` }}
                  />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 pt-1 pb-2 ml-2 border-l-2 border-muted space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Completed</span>
                  <span>{habit.totalCompleted} / {habit.totalScheduled}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Longest Streak</span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {habit.longestStreak} days
                  </span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
