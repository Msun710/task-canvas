import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Play, Pause, Square, RotateCcw, Check, Coffee, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { PomodoroSettings, PomodoroSession, Task, Project } from "@shared/schema";

type SessionType = "work" | "short_break" | "long_break";

interface PomodoroFullscreenProps {
  open: boolean;
  onClose: () => void;
}

export function PomodoroFullscreen({ open, onClose }: PomodoroFullscreenProps) {
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>("work");
  const [completedWorkSessions, setCompletedWorkSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeRemainingRef = useRef(timeRemaining);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  const { data: settings } = useQuery<PomodoroSettings>({
    queryKey: ["/api/pomodoro/settings"],
  });

  const { data: activeSession } = useQuery<PomodoroSession | null>({
    queryKey: ["/api/pomodoro/session/active"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const startSessionMutation = useMutation({
    mutationFn: async (data: { sessionType: SessionType; taskId?: string; projectId?: string }) => {
      const response = await apiRequest("POST", "/api/pomodoro/session/start", data);
      return response.json() as Promise<PomodoroSession>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pomodoro/session/active"] });
    },
  });

  const pauseSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", `/api/pomodoro/session/${sessionId}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pomodoro/session/active"] });
    },
  });

  const resumeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", `/api/pomodoro/session/${sessionId}/resume`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pomodoro/session/active"] });
    },
  });

  const stopSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", `/api/pomodoro/session/${sessionId}/stop`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pomodoro/session/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pomodoro/sessions"] });
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", `/api/pomodoro/session/${sessionId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pomodoro/session/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pomodoro/sessions"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task marked as complete" });
    },
  });

  const getDurationForType = useCallback((type: SessionType): number => {
    if (!settings) {
      return type === "work" ? 25 : type === "short_break" ? 5 : 15;
    }
    switch (type) {
      case "work":
        return settings.workDuration;
      case "short_break":
        return settings.shortBreakDuration;
      case "long_break":
        return settings.longBreakDuration;
      default:
        return 25;
    }
  }, [settings]);

  useEffect(() => {
    if (settings && !activeSession) {
      setTimeRemaining(getDurationForType(sessionType) * 60);
    }
  }, [settings, sessionType, activeSession, getDurationForType]);

  useEffect(() => {
    if (activeSession) {
      setSessionType(activeSession.sessionType as SessionType);
      
      if (activeSession.status === "active" && activeSession.startedAt) {
        const elapsed = Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000);
        const remaining = (activeSession.duration * 60) - elapsed - (activeSession.completedDuration || 0);
        setTimeRemaining(Math.max(0, remaining));
        setIsRunning(true);
      } else if (activeSession.status === "paused") {
        const remaining = (activeSession.duration * 60) - (activeSession.completedDuration || 0);
        setTimeRemaining(Math.max(0, remaining));
        setIsRunning(false);
      }
    } else {
      setIsRunning(false);
    }
  }, [activeSession]);

  const handleSessionComplete = useCallback(async () => {
    if (activeSession) {
      await completeSessionMutation.mutateAsync(activeSession.id);
      
      if (sessionType === "work") {
        const newCount = completedWorkSessions + 1;
        setCompletedWorkSessions(newCount);
        
        if (settings?.sessionsUntilLongBreak && newCount % settings.sessionsUntilLongBreak === 0) {
          setSessionType("long_break");
        } else {
          setSessionType("short_break");
        }
      } else {
        setSessionType("work");
      }
    }
    setIsRunning(false);
  }, [activeSession, sessionType, completedWorkSessions, settings, completeSessionMutation]);

  const handleSessionCompleteRef = useRef(handleSessionComplete);
  useEffect(() => {
    handleSessionCompleteRef.current = handleSessionComplete;
  }, [handleSessionComplete]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSessionCompleteRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const handleStart = async () => {
    const session = await startSessionMutation.mutateAsync({ sessionType });
    if (session) {
      setTimeRemaining(session.duration * 60);
      setIsRunning(true);
    }
  };

  const handlePause = async () => {
    if (activeSession) {
      await pauseSessionMutation.mutateAsync(activeSession.id);
      setIsRunning(false);
    }
  };

  const handleResume = async () => {
    if (activeSession) {
      await resumeSessionMutation.mutateAsync(activeSession.id);
      setIsRunning(true);
    }
  };

  const handleStop = async () => {
    if (activeSession) {
      await stopSessionMutation.mutateAsync(activeSession.id);
    }
    setIsRunning(false);
    setTimeRemaining(getDurationForType(sessionType) * 60);
  };

  const handleReset = () => {
    setTimeRemaining(getDurationForType(sessionType) * 60);
    if (activeSession && isRunning) {
      handleStop();
    }
  };

  const handleSessionTypeChange = (type: SessionType) => {
    if (!isRunning && !activeSession) {
      setSessionType(type);
      setTimeRemaining(getDurationForType(type) * 60);
    }
  };

  const handleMarkTaskComplete = (taskId: string) => {
    updateTaskMutation.mutate({ taskId, status: "done" });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSessionTypeLabel = (type: SessionType): string => {
    switch (type) {
      case "work":
        return "Focus Time";
      case "short_break":
        return "Short Break";
      case "long_break":
        return "Long Break";
      default:
        return "Focus Time";
    }
  };

  const getSessionTypeColor = (type: SessionType): string => {
    switch (type) {
      case "work":
        return "text-primary";
      case "short_break":
        return "text-green-500";
      case "long_break":
        return "text-blue-500";
      default:
        return "text-primary";
    }
  };

  const getBackgroundGradient = (type: SessionType): string => {
    switch (type) {
      case "work":
        return "from-primary/5 via-background to-background";
      case "short_break":
        return "from-green-500/10 via-background to-background";
      case "long_break":
        return "from-blue-500/10 via-background to-background";
      default:
        return "from-primary/5 via-background to-background";
    }
  };

  const progress = settings
    ? ((getDurationForType(sessionType) * 60 - timeRemaining) / (getDurationForType(sessionType) * 60)) * 100
    : 0;

  const activeTasks = tasks.filter(t => t.status !== "done");
  const getProjectById = (projectId: string | null) => projectId ? projects.find(p => p.id === projectId) : null;

  if (!open) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-gradient-to-b",
        getBackgroundGradient(sessionType)
      )}
      data-testid="pomodoro-fullscreen"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <Badge variant="secondary" className="text-sm">
          {completedWorkSessions} sessions today
        </Badge>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          data-testid="button-close-fullscreen"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="h-full flex">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="flex gap-2 mb-8">
            <Button
              size="sm"
              variant={sessionType === "work" ? "default" : "outline"}
              onClick={() => handleSessionTypeChange("work")}
              disabled={isRunning || !!activeSession}
              data-testid="button-fullscreen-work"
            >
              <Target className="h-4 w-4 mr-2" />
              Focus
            </Button>
            <Button
              size="sm"
              variant={sessionType === "short_break" ? "default" : "outline"}
              onClick={() => handleSessionTypeChange("short_break")}
              disabled={isRunning || !!activeSession}
              data-testid="button-fullscreen-short-break"
            >
              <Coffee className="h-4 w-4 mr-2" />
              Short Break
            </Button>
            <Button
              size="sm"
              variant={sessionType === "long_break" ? "default" : "outline"}
              onClick={() => handleSessionTypeChange("long_break")}
              disabled={isRunning || !!activeSession}
              data-testid="button-fullscreen-long-break"
            >
              <Coffee className="h-4 w-4 mr-2" />
              Long Break
            </Button>
          </div>

          <div className="relative mb-8">
            <svg className="w-72 h-72 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted/20"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                className={cn(
                  "transition-all duration-1000",
                  sessionType === "work" ? "text-primary" : sessionType === "short_break" ? "text-green-500" : "text-blue-500"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span 
                className={cn(
                  "text-7xl font-mono font-bold tabular-nums",
                  getSessionTypeColor(sessionType)
                )}
                data-testid="text-fullscreen-timer"
              >
                {formatTime(timeRemaining)}
              </span>
              <span className="text-lg text-muted-foreground mt-2">
                {getSessionTypeLabel(sessionType)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            {!isRunning && !activeSession && (
              <Button
                size="lg"
                onClick={handleStart}
                disabled={startSessionMutation.isPending}
                data-testid="button-fullscreen-start"
              >
                <Play className="h-5 w-5 mr-2" />
                Start Focus
              </Button>
            )}
            {isRunning && (
              <Button
                size="lg"
                variant="outline"
                onClick={handlePause}
                disabled={pauseSessionMutation.isPending}
                data-testid="button-fullscreen-pause"
              >
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </Button>
            )}
            {!isRunning && activeSession && (
              <Button
                size="lg"
                onClick={handleResume}
                disabled={resumeSessionMutation.isPending}
                data-testid="button-fullscreen-resume"
              >
                <Play className="h-5 w-5 mr-2" />
                Resume
              </Button>
            )}
            {activeSession && (
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStop}
                disabled={stopSessionMutation.isPending}
                data-testid="button-fullscreen-stop"
              >
                <Square className="h-5 w-5 mr-2" />
                Stop
              </Button>
            )}
            {!activeSession && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleReset}
                data-testid="button-fullscreen-reset"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="w-80 border-l bg-card/50 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Active Tasks</h3>
            <p className="text-sm text-muted-foreground">
              {activeTasks.length} tasks remaining
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {activeTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All tasks completed!</p>
                </div>
              ) : (
                activeTasks.map((task) => {
                  const project = getProjectById(task.projectId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover-elevate"
                      data-testid={`fullscreen-task-${task.id}`}
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => handleMarkTaskComplete(task.id)}
                        disabled={updateTaskMutation.isPending}
                        data-testid={`checkbox-complete-task-${task.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {project && (
                          <div className="flex items-center gap-1 mt-1">
                            <div 
                              className="h-2 w-2 rounded-full" 
                              style={{ backgroundColor: project.color || "#3B82F6" }}
                            />
                            <span className="text-xs text-muted-foreground truncate">
                              {project.name}
                            </span>
                          </div>
                        )}
                      </div>
                      {task.priority && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs shrink-0",
                            task.priority === "high" && "border-red-500/50 text-red-500",
                            task.priority === "medium" && "border-yellow-500/50 text-yellow-500",
                            task.priority === "low" && "border-green-500/50 text-green-500"
                          )}
                        >
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
