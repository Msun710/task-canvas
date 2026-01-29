import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, startOfWeek, subDays } from "date-fns";
import { Clock, Target, Coffee, TrendingUp, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PomodoroSession, Task } from "@shared/schema";

interface PomodoroStats {
  totalSessions: number;
  completedSessions: number;
  totalFocusMinutes: number;
  todaySessions: number;
  todayFocusMinutes: number;
  weekSessions: number;
  weekFocusMinutes: number;
  averageSessionMinutes: number;
}

interface PomodoroHistoryProps {
  showStats?: boolean;
  showSessions?: boolean;
}

export function PomodoroHistory({ showStats = true, showSessions = true }: PomodoroHistoryProps) {
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<PomodoroSession[]>({
    queryKey: ["/api/pomodoro/sessions"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<PomodoroStats>({
    queryKey: ["/api/pomodoro/sessions/stats"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const getTaskTitle = (taskId: string | null) => {
    if (!taskId) return null;
    const task = tasks.find(t => t.id === taskId);
    return task?.title || "Unknown task";
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case "work":
        return "Focus";
      case "short_break":
        return "Short Break";
      case "long_break":
        return "Long Break";
      default:
        return type;
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case "work":
        return <Target className="h-4 w-4" />;
      case "short_break":
        return <Coffee className="h-4 w-4" />;
      case "long_break":
        return <Moon className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
        return "default";
      case "active":
        return "secondary";
      case "cancelled":
        return "outline";
      default:
        return "outline";
    }
  };

  const getSessionAccentColor = (type: string): string => {
    switch (type) {
      case "work":
        return "bg-blue-500";
      case "short_break":
        return "bg-emerald-500";
      case "long_break":
        return "bg-violet-500";
      default:
        return "bg-primary";
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatSessionDuration = (session: PomodoroSession) => {
    const seconds = session.completedDuration || (session.duration * 60);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  if (sessionsLoading || statsLoading) {
    return (
      <div className="space-y-4">
        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {showSessions && (
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const todayStart = startOfDay(new Date());
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const todaySessions = sessions.filter(
    s => s.createdAt && new Date(s.createdAt) >= todayStart
  );

  return (
    <div className="space-y-6">
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card data-testid="card-stat-today-sessions" className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Target className="h-4 w-4" />
                <span className="font-medium">Today</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {stats?.todaySessions || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDuration(stats?.todayFocusMinutes || 0)} focus time
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-week-sessions" className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">This Week</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {stats?.weekSessions || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDuration(stats?.weekFocusMinutes || 0)} focus time
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-total-sessions" className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Total Sessions</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {stats?.completedSessions || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDuration(stats?.totalFocusMinutes || 0)} total
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-average-session" className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Coffee className="h-4 w-4" />
                <span className="font-medium">Avg Session</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {stats?.averageSessionMinutes || 0}m
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                per session
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {showStats && showSessions && <Separator className="my-2" />}

      {showSessions && (
        <Card data-testid="card-session-history">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No sessions yet</p>
              <p className="text-sm">Start a Pomodoro session to track your focus time</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {sessions.slice(0, 20).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card hover-elevate transition-all"
                    data-testid={`row-session-${session.id}`}
                  >
                    <div className={cn("w-1 h-10 rounded-full shrink-0", getSessionAccentColor(session.sessionType))} />
                    <div className="flex items-center justify-between gap-4 flex-1 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                          {getSessionTypeIcon(session.sessionType)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground block">
                            {session.taskId ? getTaskTitle(session.taskId) : getSessionTypeLabel(session.sessionType)}
                          </span>
                          {session.taskId && (
                            <span className="text-xs text-muted-foreground">
                              {getSessionTypeLabel(session.sessionType)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-medium text-foreground">
                          {formatSessionDuration(session)}
                        </span>
                        <Badge 
                          variant={getStatusBadgeVariant(session.status)} 
                          className="text-xs"
                        >
                          {session.status}
                        </Badge>
                        {session.createdAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(session.createdAt), "MMM d, HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
        </Card>
      )}
    </div>
  );
}
