import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Square, Clock, Calendar, Timer, Target, Maximize2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInSeconds } from "date-fns";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { PomodoroSettingsDialog } from "@/components/PomodoroSettings";
import { PomodoroHistory } from "@/components/PomodoroHistory";
import { PomodoroFullscreen } from "@/components/PomodoroFullscreen";
import type { Task, TimeLog, Project } from "@shared/schema";

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

export default function TimePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [pomodoroSettingsOpen, setPomodoroSettingsOpen] = useState(false);
  const [pomodoroFullscreenOpen, setPomodoroFullscreenOpen] = useState(false);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: timeLogs = [], isLoading: logsLoading } = useQuery<TimeLog[]>({
    queryKey: ["/api/time-logs"],
  });

  const { data: activeTimeLog } = useQuery<TimeLog | null>({
    queryKey: ["/api/time-logs", "active"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const startTimerMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", "/api/time-logs", { taskId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-logs"] });
      toast({ title: "Timer started" });
      setSelectedTaskId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start timer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await apiRequest("PATCH", `/api/time-logs/${logId}/stop`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-logs"] });
      toast({ title: "Timer stopped" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to stop timer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!activeTimeLog) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const seconds = differenceInSeconds(new Date(), new Date(activeTimeLog.startTime));
      setElapsedSeconds(seconds);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimeLog]);

  const isLoading = tasksLoading || logsLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const activeTask = activeTimeLog ? tasks.find(t => t.id === activeTimeLog.taskId) : null;

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

  const getTaskById = (taskId: string) => tasks.find(t => t.id === taskId);
  const getProjectById = (projectId: string) => projects.find(p => p.id === projectId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-time-tracking-title">
            Time Tracking
          </h1>
          <p className="text-muted-foreground mt-1">
            Track time spent on your tasks
          </p>
        </div>
      </div>

      <Tabs defaultValue="timer" className="w-full">
        <TabsList data-testid="tabs-time-tracking">
          <TabsTrigger value="timer" data-testid="tab-timer">
            <Timer className="h-4 w-4 mr-2" />
            Timer
          </TabsTrigger>
          <TabsTrigger value="pomodoro" data-testid="tab-pomodoro">
            <Target className="h-4 w-4 mr-2" />
            Pomodoro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="mt-6 space-y-6">
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

        <Card className={activeTimeLog ? "border-primary" : ""}>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Timer
            </CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {activeTimeLog ? (
              <div className="space-y-3">
                <div className="text-3xl font-bold font-mono" data-testid="timer-display">
                  {formatTime(elapsedSeconds)}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {activeTask?.title || "Unknown task"}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => stopTimerMutation.mutate(activeTimeLog.id)}
                  disabled={stopTimerMutation.isPending}
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
                <div className="flex items-center gap-2">
                  <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                    <SelectTrigger className="flex-1" data-testid="select-task-timer">
                      <SelectValue placeholder="Select a task" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.filter(t => t.status !== "done").map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    onClick={() => selectedTaskId && startTimerMutation.mutate(selectedTaskId)}
                    disabled={!selectedTaskId || startTimerMutation.isPending}
                    data-testid="button-start-timer"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
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
                          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                            <h3 className="font-medium">{displayDate}</h3>
                            <Badge variant="secondary">{formatDuration(totalMinutes)}</Badge>
                          </div>
                          <div className="space-y-2">
                            {logs.map((log) => {
                              const task = getTaskById(log.taskId);
                              const project = task ? getProjectById(task.projectId) : null;

                              return (
                                <div
                                  key={log.id}
                                  className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg flex-wrap"
                                  data-testid={`time-log-${log.id}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                      {task?.title || "Unknown task"}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      {project && (
                                        <span className="flex items-center gap-1">
                                          <div 
                                            className="h-2 w-2 rounded-full" 
                                            style={{ backgroundColor: project.color || "#3B82F6" }}
                                          />
                                          {project.name}
                                        </span>
                                      )}
                                      <span>
                                        {format(new Date(log.startTime), "h:mm a")}
                                        {log.endTime && ` - ${format(new Date(log.endTime), "h:mm a")}`}
                                      </span>
                                    </div>
                                  </div>
                                  <Badge variant="outline">
                                    {formatDuration(log.duration || 0)}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pomodoro" className="mt-6 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Pomodoro Technique</h2>
              <p className="text-sm text-muted-foreground">
                Focus in intervals with breaks to maximize productivity
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setPomodoroFullscreenOpen(true)}
              data-testid="button-pomodoro-fullscreen"
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Focus Mode
            </Button>
          </div>

          <PomodoroHistory showStats={true} showSessions={false} />

          <PomodoroTimer onOpenSettings={() => setPomodoroSettingsOpen(true)} />

          <PomodoroHistory showStats={false} showSessions={true} />
        </TabsContent>
      </Tabs>

      <PomodoroSettingsDialog 
        open={pomodoroSettingsOpen} 
        onOpenChange={setPomodoroSettingsOpen} 
      />

      <PomodoroFullscreen
        open={pomodoroFullscreenOpen}
        onClose={() => setPomodoroFullscreenOpen(false)}
      />
    </div>
  );
}
