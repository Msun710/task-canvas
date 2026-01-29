import { Play, Pause, Square, SkipForward, Settings, Maximize2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePomodoro, type SessionType } from "@/hooks/use-pomodoro";
import { cn } from "@/lib/utils";

interface PomodoroTimerProps {
  compact?: boolean;
  onOpenSettings?: () => void;
}

function CircularProgress({ 
  progress, 
  size = 200, 
  strokeWidth = 8, 
  color 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number; 
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-300"
      />
    </svg>
  );
}

export function PomodoroTimer({ compact = false, onOpenSettings }: PomodoroTimerProps) {
  const [, navigate] = useLocation();
  const {
    isRunning,
    isPaused,
    timeRemaining,
    currentTask,
    sessionType,
    completedPomodoros,
    settings,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    skipToBreak,
  } = usePomodoro();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSessionTypeLabel = (type: SessionType): string => {
    switch (type) {
      case "focus":
        return "Focus";
      case "shortBreak":
        return "Short Break";
      case "longBreak":
        return "Long Break";
    }
  };

  const getSessionColor = (type: SessionType): string => {
    switch (type) {
      case "focus":
        return "#10b981";
      case "shortBreak":
        return "#3b82f6";
      case "longBreak":
        return "#8b5cf6";
    }
  };

  const getDurationForType = (type: SessionType): number => {
    switch (type) {
      case "focus":
        return settings.focusDuration * 60;
      case "shortBreak":
        return settings.shortBreakDuration * 60;
      case "longBreak":
        return settings.longBreakDuration * 60;
    }
  };

  const totalDuration = getDurationForType(sessionType);
  const progress = ((totalDuration - timeRemaining) / totalDuration) * 100;
  const sessionColor = getSessionColor(sessionType);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const handleStartOrResume = () => {
    if (isPaused) {
      resumeTimer();
    } else {
      startTimer();
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2" data-testid="pomodoro-timer-compact">
        <Badge 
          variant="outline" 
          className="font-mono text-sm"
          style={{ borderColor: sessionColor, color: sessionColor }}
          data-testid="badge-pomodoro-time"
        >
          {formatTime(timeRemaining)}
        </Badge>
        {!isRunning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleStartOrResume}
                data-testid="button-pomodoro-start-compact"
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPaused ? "Resume" : "Start"}</TooltipContent>
          </Tooltip>
        )}
        {isRunning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={pauseTimer}
                data-testid="button-pomodoro-pause-compact"
              >
                <Pause className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pause</TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full rounded-xl" data-testid="card-pomodoro-timer">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Pomodoro Timer</CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              {completedPomodoros} sessions
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => navigate("/focus")}
                  data-testid="button-enter-focus-mode"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enter Focus Mode</TooltipContent>
            </Tooltip>
            {onOpenSettings && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onOpenSettings}
                    data-testid="button-pomodoro-settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Timer Settings</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 py-6">
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <CircularProgress 
              progress={progress} 
              size={200} 
              strokeWidth={8}
              color={sessionColor}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span 
                className="font-mono font-bold text-5xl tabular-nums tracking-tight"
                data-testid="text-timer-display"
              >
                {formatTime(timeRemaining)}
              </span>
              <span 
                className="text-sm font-medium mt-1"
                style={{ color: sessionColor }}
                data-testid="text-session-type"
              >
                {getSessionTypeLabel(sessionType)}
              </span>
            </div>
          </div>
        </div>

        {currentTask && (
          <div 
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50"
            data-testid="pomodoro-current-task"
          >
            <span className="text-sm font-medium truncate max-w-[200px]">
              {currentTask.title}
            </span>
            {currentTask.priority && currentTask.priority !== "medium" && (
              <Badge variant={getPriorityColor(currentTask.priority)}>
                {currentTask.priority}
              </Badge>
            )}
          </div>
        )}

        <div className="flex justify-center gap-2">
          {!isRunning && (
            <Button
              onClick={handleStartOrResume}
              className={cn(
                sessionType === "focus" 
                  ? "bg-emerald-500 hover:bg-emerald-600" 
                  : "bg-blue-500 hover:bg-blue-600"
              )}
              data-testid="button-pomodoro-start"
            >
              <Play className="h-4 w-4 mr-2" />
              {isPaused ? "Resume" : "Start"}
            </Button>
          )}
          {isRunning && (
            <Button
              variant="outline"
              onClick={pauseTimer}
              data-testid="button-pomodoro-pause"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          {(isRunning || isPaused) && (
            <Button
              variant="destructive"
              onClick={stopTimer}
              data-testid="button-pomodoro-stop"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={skipToBreak}
                data-testid="button-pomodoro-skip"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                {sessionType === "focus" ? "Skip to Break" : "Skip to Focus"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sessionType === "focus" 
                ? "End focus session and start break" 
                : "End break and start focus session"}
            </TooltipContent>
          </Tooltip>
        </div>

        {completedPomodoros > 0 && completedPomodoros % 4 === 0 && sessionType === "focus" && !isRunning && !isPaused && (
          <div className="text-center text-sm text-muted-foreground">
            Great work! Consider taking a long break.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
