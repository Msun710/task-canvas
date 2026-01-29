import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Play, Square, Clock, Calendar, Timer } from "lucide-react";
import type { TimeLog, Task } from "@shared/schema";
import { format, differenceInMinutes, differenceInSeconds } from "date-fns";

interface TimeTrackerProps {
  timeLogs: (TimeLog & { task?: Task })[];
  activeTimer?: { taskId: string; startTime: Date; task?: Task } | null;
  onStartTimer?: (taskId: string) => void;
  onStopTimer?: () => void;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function TimeTracker({
  timeLogs,
  activeTimer,
  onStartTimer,
  onStopTimer,
}: TimeTrackerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const seconds = differenceInSeconds(new Date(), new Date(activeTimer.startTime));
      setElapsedSeconds(seconds);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const todayLogs = timeLogs.filter((log) => {
    const logDate = new Date(log.startTime);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  const totalTodayMinutes = todayLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
  const weekLogs = timeLogs.filter((log) => {
    const logDate = new Date(log.startTime);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return logDate >= weekAgo;
  });
  const totalWeekMinutes = weekLogs.reduce((acc, log) => acc + (log.duration || 0), 0);

  const logsByDate = timeLogs.reduce((acc, log) => {
    const dateKey = format(new Date(log.startTime), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(log);
    return acc;
  }, {} as Record<string, typeof timeLogs>);

  const sortedDates = Object.keys(logsByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-time-tracking-title">
            Time Tracking
          </h1>
          <p className="text-muted-foreground mt-1">
            Track time spent on your tasks
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-today-time">
              {formatDuration(totalTodayMinutes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayLogs.length} entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-week-time">
              {formatDuration(totalWeekMinutes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {weekLogs.length} entries
            </p>
          </CardContent>
        </Card>

        <Card className={activeTimer ? "border-primary" : ""}>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Timer
            </CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {activeTimer ? (
              <div className="space-y-3">
                <div className="text-3xl font-bold font-mono" data-testid="timer-display">
                  {formatTime(elapsedSeconds)}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {activeTimer.task?.title || "Unknown task"}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onStopTimer}
                  data-testid="button-stop-timer"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-3xl font-bold text-muted-foreground">
                  00:00:00
                </div>
                <p className="text-sm text-muted-foreground">
                  No timer running
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Time Log History</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDates.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No time entries yet</p>
              <p className="text-sm">Start a timer on a task to begin tracking</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] -mx-6 px-6">
              <div className="space-y-6">
                {sortedDates.map((dateKey) => {
                  const logs = logsByDate[dateKey];
                  const totalMinutes = logs.reduce((acc, log) => acc + (log.duration || 0), 0);
                  const displayDate = format(new Date(dateKey), "EEEE, MMMM d");

                  return (
                    <div key={dateKey}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{displayDate}</h3>
                        <Badge variant="secondary">{formatDuration(totalMinutes)}</Badge>
                      </div>
                      <div className="space-y-2">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            data-testid={`time-log-${log.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {log.task?.title || "Unknown task"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(log.startTime), "h:mm a")}
                                {log.endTime && ` - ${format(new Date(log.endTime), "h:mm a")}`}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {formatDuration(log.duration || 0)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
