import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Flame, Target, CheckCircle2, Clock, TrendingUp, Star, Trophy, Lightbulb, AlertTriangle, Award } from "lucide-react";
import { Link } from "wouter";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { CompletionHeatmap } from "@/components/habits/CompletionHeatmap";
import { HabitTrendChart } from "@/components/habits/HabitTrendChart";
import { HabitPerformanceBars } from "@/components/habits/HabitPerformanceBars";
import { TimePatternChart } from "@/components/habits/TimePatternChart";
import { DayPatternChart } from "@/components/habits/DayPatternChart";
import { HabitKPICards } from "@/components/habits/HabitKPICards";
import { HabitInsights } from "@/components/habits/HabitInsights";

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

interface TimeWindowMetrics {
  totalTimeWindowHabits: number;
  onTimeCompletions: number;
  lateCompletions: number;
  missedWindows: number;
  onTimeRate: number;
  lateRate: number;
  missedRate: number;
  habitBreakdown: { habitName: string; onTime: number; late: number; missed: number }[];
}

export default function HabitMetricsPage() {
  const { data: todayMetrics, isLoading: todayLoading } = useQuery<HabitMetrics>({
    queryKey: ["/api/habits/metrics/today"],
  });

  const { data: weekMetrics, isLoading: weekLoading } = useQuery<HabitMetrics>({
    queryKey: ["/api/habits/metrics/week"],
  });

  const { data: monthMetrics, isLoading: monthLoading } = useQuery<HabitMetrics>({
    queryKey: ["/api/habits/metrics/month"],
  });

  const { data: streaksData } = useQuery<MultiLevelStreaks>({
    queryKey: ["/api/habits/streaks"],
  });

  const { data: patternsData } = useQuery<HabitPatterns>({
    queryKey: ["/api/habits/patterns"],
  });

  const { data: timeWindowMetrics } = useQuery<TimeWindowMetrics>({
    queryKey: ["/api/habits/time-window-metrics"],
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return "bg-emerald-500";
    if (rate >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  const renderMetricsCards = (metrics: HabitMetrics | undefined, isLoading: boolean) => {
    if (isLoading || !metrics) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-8 w-12 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-sm">Total Habits</span>
            </div>
            <p className="text-3xl font-bold" data-testid="text-total-habits">{metrics.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Completed</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-completed-habits">{metrics.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Pending</span>
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-pending-habits">{metrics.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Completion Rate</span>
            </div>
            <p className={`text-3xl font-bold ${getCompletionColor(metrics.completionRate)}`} data-testid="text-completion-rate">
              {metrics.completionRate}%
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/habits" data-testid="link-back-habits">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Habit Analytics</h1>
          <p className="text-muted-foreground">Track your habit completion, streaks, and patterns.</p>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="daily" data-testid="tab-daily">Daily Stats</TabsTrigger>
          <TabsTrigger value="streaks" data-testid="tab-streaks">Streaks</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <HabitKPICards />
          
          <CompletionHeatmap />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HabitTrendChart />
            <HabitPerformanceBars />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimePatternChart />
            <DayPatternChart />
          </div>
          
          <HabitInsights />
        </TabsContent>

        <TabsContent value="daily" className="space-y-6">
          <Tabs defaultValue="today">
            <TabsList>
              <TabsTrigger value="today" data-testid="tab-today">Today</TabsTrigger>
              <TabsTrigger value="week" data-testid="tab-week">This Week</TabsTrigger>
              <TabsTrigger value="month" data-testid="tab-month">This Month</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="mt-4 space-y-6">
              {renderMetricsCards(todayMetrics, todayLoading)}
              {todayMetrics && todayMetrics.total === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No habits scheduled for today.</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href="/habits">Create a Habit</Link>
                  </Button>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="week" className="mt-4 space-y-6">
              {renderMetricsCards(weekMetrics, weekLoading)}
              {weekMetrics?.dailyStats && weekMetrics.dailyStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Daily Progress (Last 7 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekMetrics.dailyStats}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { weekday: "short" })}
                            className="text-xs"
                          />
                          <YAxis className="text-xs" />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-popover border rounded-lg p-2 shadow-lg">
                                    <p className="font-medium">{formatDate(data.date)}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {data.completed} / {data.total} completed
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="month" className="mt-4 space-y-6">
              {renderMetricsCards(monthMetrics, monthLoading)}
              {monthMetrics?.dailyStats && monthMetrics.dailyStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Monthly Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-1">
                      {monthMetrics.dailyStats.map((day) => {
                        const rate = day.total > 0 ? (day.completed / day.total) * 100 : 0;
                        const bgColor = rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : rate > 0 ? "bg-rose-400" : "bg-muted";
                        return (
                          <div
                            key={day.date}
                            className={`h-8 rounded-md ${bgColor} ${rate > 0 ? "opacity-75" : ""}`}
                            title={`${formatDate(day.date)}: ${day.completed}/${day.total}`}
                            data-testid={`cell-day-${day.date}`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                        <span>80%+</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-amber-500" />
                        <span>50-79%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-rose-400" />
                        <span>1-49%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm bg-muted" />
                        <span>No data</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="streaks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20 dark:from-orange-500/20 dark:border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-orange-500/15 dark:bg-orange-500/25 flex items-center justify-center">
                    <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Streak</p>
                    <p className="text-2xl font-semibold" data-testid="text-current-streak">
                      {todayMetrics?.currentStreak || 0} <span className="text-sm font-normal text-muted-foreground">days</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 dark:from-amber-500/20 dark:border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-amber-500/15 dark:bg-amber-500/25 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Longest Streak</p>
                    <p className="text-2xl font-semibold" data-testid="text-longest-streak">
                      {streaksData?.overallLongest || 0} <span className="text-sm font-normal text-muted-foreground">days</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20 dark:from-emerald-500/20 dark:border-emerald-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-emerald-500/15 dark:bg-emerald-500/25 flex items-center justify-center">
                    <Star className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Perfect Days</p>
                    <p className="text-2xl font-semibold" data-testid="text-perfect-days">
                      {streaksData?.perfectDays || 0} <span className="text-sm font-normal text-muted-foreground">days</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/20 dark:from-violet-500/20 dark:border-violet-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-violet-500/15 dark:bg-violet-500/25 flex items-center justify-center">
                    <Target className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Routines</p>
                    <p className="text-2xl font-semibold" data-testid="text-routine-count">
                      {streaksData?.parentStreaks?.length || 0} <span className="text-sm font-normal text-muted-foreground">active</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {streaksData && (streaksData.parentStreaks.length > 0 || streaksData.subHabitStreaks.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Streak Leaderboard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {streaksData.parentStreaks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Routines</h4>
                    <div className="space-y-2">
                      {streaksData.parentStreaks
                        .sort((a, b) => b.currentStreak - a.currentStreak)
                        .slice(0, 5)
                        .map((streak) => (
                          <div key={streak.habitId} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <span className="font-medium">{streak.habitName}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                <Flame className="h-3 w-3" />
                                {streak.currentStreak}
                              </span>
                              <span className="text-muted-foreground">Best: {streak.longestStreak}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                {streaksData.subHabitStreaks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Top Sub-habits</h4>
                    <div className="space-y-2">
                      {streaksData.subHabitStreaks
                        .sort((a, b) => b.currentStreak - a.currentStreak)
                        .slice(0, 5)
                        .map((streak) => (
                          <div key={streak.habitId} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <div>
                              <span className="font-medium">{streak.habitName}</span>
                              <span className="text-xs text-muted-foreground ml-2">({streak.parentName})</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                <Flame className="h-3 w-3" />
                                {streak.currentStreak}
                              </span>
                              <span className="text-muted-foreground">Best: {streak.longestStreak}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {patternsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patternsData.insights.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {patternsData.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                        <span className="text-sm">{insight}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              
              {patternsData.dayOfWeekStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Day of Week Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {patternsData.dayOfWeekStats.map((day) => (
                        <div key={day.day} className="flex items-center gap-2">
                          <span className="w-20 text-sm text-muted-foreground">{day.day.slice(0, 3)}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${getProgressColor(day.completionRate)}`}
                              style={{ width: `${day.completionRate}%` }}
                            />
                          </div>
                          <span className="w-12 text-sm text-right text-muted-foreground">{day.completionRate}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Habit Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {patternsData.bestPerformingHabits.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Award className="h-3 w-3 text-emerald-500" />
                        Best Performing
                      </h4>
                      <div className="space-y-1">
                        {patternsData.bestPerformingHabits.map((habit) => (
                          <div key={habit.habitName} className="flex items-center justify-between text-sm">
                            <span>{habit.habitName}</span>
                            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">{habit.completionRate}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {patternsData.mostSkippedHabits.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Needs Attention
                      </h4>
                      <div className="space-y-1">
                        {patternsData.mostSkippedHabits.map((habit) => (
                          <div key={habit.habitName} className="flex items-center justify-between text-sm">
                            <span>{habit.habitName}</span>
                            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">{habit.skipRate}% skipped</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {timeWindowMetrics && timeWindowMetrics.totalTimeWindowHabits > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Window Performance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-sm">Time-Tracked</span>
                </div>
                <p className="text-3xl font-bold" data-testid="text-time-window-habits">{timeWindowMetrics.totalTimeWindowHabits}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">On Time</span>
                </div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-on-time-rate">{timeWindowMetrics.onTimeRate}%</p>
                <p className="text-xs text-muted-foreground">{timeWindowMetrics.onTimeCompletions} completions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Late</span>
                </div>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-late-rate">{timeWindowMetrics.lateRate}%</p>
                <p className="text-xs text-muted-foreground">{timeWindowMetrics.lateCompletions} completions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Missed</span>
                </div>
                <p className="text-3xl font-bold text-rose-600 dark:text-rose-400" data-testid="text-missed-rate">{timeWindowMetrics.missedRate}%</p>
                <p className="text-xs text-muted-foreground">{timeWindowMetrics.missedWindows} windows</p>
              </CardContent>
            </Card>
          </div>
          
          {timeWindowMetrics.habitBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Time Window Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timeWindowMetrics.habitBreakdown.map((habit) => (
                    <div key={habit.habitName} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{habit.habitName}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                            {habit.onTime} on time
                          </Badge>
                          {habit.late > 0 && (
                            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                              {habit.late} late
                            </Badge>
                          )}
                          {habit.missed > 0 && (
                            <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800">
                              {habit.missed} missed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
