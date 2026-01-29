import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { X, Play, Pause, Square, Coffee, Target, Clock, Zap, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePomodoro, type SessionType } from "@/hooks/use-pomodoro";
import { useFocusSession } from "@/hooks/use-focus-session";
import { TaskSelector } from "@/components/focus/TaskSelector";
import { SubtaskTracker } from "@/components/focus/SubtaskTracker";
import { FocusSessionSummary } from "@/components/focus/FocusSessionSummary";
import { FocusInspiration } from "@/components/focus/FocusInspiration";
import type { Task } from "@shared/schema";

type BackgroundStyle = "solid" | "gradient";

interface CompletedSessionData {
  session: NonNullable<ReturnType<typeof useFocusSession>["session"]>;
  segments: ReturnType<typeof useFocusSession>["segments"];
  task: Task;
  subtasks: Task[];
}

function CircularTimer({ 
  progress, 
  size = 320, 
  strokeWidth = 12, 
  color,
  isRunning
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number; 
  color: string;
  isRunning: boolean;
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
        stroke="rgba(255, 255, 255, 0.1)"
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
        className={cn(
          "transition-all duration-300",
          isRunning && "drop-shadow-[0_0_10px_currentColor]"
        )}
      />
    </svg>
  );
}

function PomodoroIndicator({ count, max = 4 }: { count: number; max?: number }) {
  const dots = [];
  const completedSets = Math.floor(count / max);
  const currentSetProgress = count % max;

  for (let i = 0; i < max; i++) {
    const isComplete = i < currentSetProgress || completedSets > 0;
    dots.push(
      <div
        key={i}
        className={cn(
          "w-3 h-3 rounded-full transition-all duration-300",
          isComplete 
            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
            : "bg-white/20"
        )}
        data-testid={`pomodoro-dot-${i}`}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-2" data-testid="pomodoro-dots">
        {dots}
      </div>
      {completedSets > 0 && (
        <span className="text-sm text-white/60" data-testid="text-completed-sets">
          +{completedSets} set{completedSets > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function formatElapsedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function FocusPage() {
  const [, navigate] = useLocation();
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>("gradient");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completedSessionData, setCompletedSessionData] = useState<CompletedSessionData | null>(null);
  const [timerMode, setTimerMode] = useState<"pomodoro" | "stopwatch">("stopwatch");

  const {
    isRunning: pomodoroRunning,
    isPaused: pomodoroPaused,
    timeRemaining,
    sessionType,
    completedPomodoros,
    settings,
    startTimer: startPomodoroTimer,
    pauseTimer: pausePomodoroTimer,
    resumeTimer: resumePomodoroTimer,
    stopTimer: stopPomodoroTimer,
    skipToBreak,
  } = usePomodoro();

  const {
    session,
    subtasks,
    segments,
    activeSubtaskIndex,
    elapsedTime,
    isActive: focusSessionActive,
    isPaused: focusSessionPaused,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    switchSubtask,
    completeSubtask,
    getSubtaskDuration,
    updateNotes,
  } = useFocusSession();

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  useEffect(() => {
    if (session?.taskId) {
      const task = allTasks.find(t => t.id === session.taskId);
      if (task) {
        setSelectedTask(task);
      }
    }
  }, [session?.taskId, allTasks]);

  const handleExit = useCallback(() => {
    navigate("/time");
  }, [navigate]);

  const handleStartFocusSession = useCallback(() => {
    if (!selectedTask) return;
    
    if (timerMode === "pomodoro") {
      startPomodoroTimer(selectedTask);
    }
    startSession(selectedTask);
  }, [selectedTask, timerMode, startPomodoroTimer, startSession]);

  const handlePauseFocusSession = useCallback(() => {
    if (timerMode === "pomodoro") {
      pausePomodoroTimer();
    }
    pauseSession();
  }, [timerMode, pausePomodoroTimer, pauseSession]);

  const handleResumeFocusSession = useCallback(() => {
    if (timerMode === "pomodoro") {
      resumePomodoroTimer();
    }
    resumeSession();
  }, [timerMode, resumePomodoroTimer, resumeSession]);

  const handleEndFocusSession = useCallback(() => {
    if (timerMode === "pomodoro") {
      stopPomodoroTimer();
    }
    const result = endSession();
    if (result && selectedTask) {
      setCompletedSessionData({
        session: result.session,
        segments: result.segments,
        task: selectedTask,
        subtasks: subtasks,
      });
    }
  }, [timerMode, stopPomodoroTimer, endSession, selectedTask, subtasks]);

  const handleCloseSummary = useCallback(() => {
    setCompletedSessionData(null);
    setSelectedTask(null);
  }, []);

  const handleSelectTask = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (completedSessionData) {
          handleCloseSummary();
        } else {
          handleExit();
        }
      } else if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        if (session) {
          if (focusSessionActive) {
            handlePauseFocusSession();
          } else if (focusSessionPaused) {
            handleResumeFocusSession();
          }
        } else if (selectedTask) {
          handleStartFocusSession();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleExit,
    handleCloseSummary,
    completedSessionData,
    session,
    focusSessionActive,
    focusSessionPaused,
    selectedTask,
    handleStartFocusSession,
    handlePauseFocusSession,
    handleResumeFocusSession,
  ]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSessionTypeLabel = (type: SessionType): string => {
    switch (type) {
      case "focus":
        return "Focus Time";
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
  const pomodoroProgress = ((totalDuration - timeRemaining) / totalDuration) * 100;
  const sessionColor = getSessionColor(sessionType);

  const stopwatchProgress = Math.min((elapsedTime / 3600) * 100, 100);

  const getBackgroundClass = () => {
    if (backgroundStyle === "solid") {
      return "bg-black";
    }
    if (timerMode === "pomodoro") {
      if (sessionType === "focus") {
        return "bg-gradient-to-br from-black via-emerald-950/20 to-black";
      } else if (sessionType === "shortBreak") {
        return "bg-gradient-to-br from-black via-blue-950/20 to-black";
      } else {
        return "bg-gradient-to-br from-black via-violet-950/20 to-black";
      }
    }
    return "bg-gradient-to-br from-black via-emerald-950/20 to-black";
  };

  const getPriorityVariant = (priority: string) => {
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

  const isSessionStarted = session !== null;
  const isSessionPaused = focusSessionPaused;
  const isSessionRunning = focusSessionActive;

  if (completedSessionData) {
    return (
      <FocusSessionSummary
        session={completedSessionData.session}
        segments={completedSessionData.segments}
        task={completedSessionData.task}
        subtasks={completedSessionData.subtasks}
        onClose={handleCloseSummary}
        onSaveNotes={updateNotes}
      />
    );
  }

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center",
        getBackgroundClass()
      )}
      data-testid="focus-mode-page"
    >
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10"
        onClick={handleExit}
        data-testid="button-exit-focus"
      >
        <X className="h-6 w-6" />
      </Button>

      <div className="absolute top-4 left-4 flex items-center gap-3">
        <PomodoroIndicator count={completedPomodoros} />
        <Badge 
          variant="outline" 
          className="border-white/20 text-white/60 text-xs"
          data-testid="badge-session-count"
        >
          {completedPomodoros} session{completedPomodoros !== 1 ? 's' : ''} today
        </Badge>
      </div>

      <div className="absolute top-4 right-16 flex gap-2">
        <Button
          size="sm"
          variant={timerMode === "stopwatch" ? "secondary" : "ghost"}
          className={cn(
            "text-xs",
            timerMode === "stopwatch" 
              ? "bg-white/10 text-white" 
              : "text-white/40 hover:text-white/60 hover:bg-white/5"
          )}
          onClick={() => setTimerMode("stopwatch")}
          disabled={isSessionStarted}
          data-testid="button-mode-stopwatch"
        >
          <Timer className="h-3 w-3 mr-1" />
          Stopwatch
        </Button>
        <Button
          size="sm"
          variant={timerMode === "pomodoro" ? "secondary" : "ghost"}
          className={cn(
            "text-xs",
            timerMode === "pomodoro" 
              ? "bg-white/10 text-white" 
              : "text-white/40 hover:text-white/60 hover:bg-white/5"
          )}
          onClick={() => setTimerMode("pomodoro")}
          disabled={isSessionStarted}
          data-testid="button-mode-pomodoro"
        >
          <Target className="h-3 w-3 mr-1" />
          Pomodoro
        </Button>
        <div className="w-px bg-white/20 mx-1" />
        <Button
          size="sm"
          variant={backgroundStyle === "solid" ? "secondary" : "ghost"}
          className={cn(
            "text-xs",
            backgroundStyle === "solid" 
              ? "bg-white/10 text-white" 
              : "text-white/40 hover:text-white/60 hover:bg-white/5"
          )}
          onClick={() => setBackgroundStyle("solid")}
          data-testid="button-bg-solid"
        >
          Solid
        </Button>
        <Button
          size="sm"
          variant={backgroundStyle === "gradient" ? "secondary" : "ghost"}
          className={cn(
            "text-xs",
            backgroundStyle === "gradient" 
              ? "bg-white/10 text-white" 
              : "text-white/40 hover:text-white/60 hover:bg-white/5"
          )}
          onClick={() => setBackgroundStyle("gradient")}
          data-testid="button-bg-gradient"
        >
          Gradient
        </Button>
      </div>

      <div className="flex flex-col items-center gap-6 max-w-xl w-full px-4">
        {!isSessionStarted && (
          <div className="w-full max-w-md mb-4" data-testid="task-selection-area">
            <TaskSelector
              onSelectTask={handleSelectTask}
              selectedTaskId={selectedTask?.id}
              disabled={isSessionStarted}
            />
          </div>
        )}

        {timerMode === "pomodoro" && (
          <div className="flex gap-3 mb-4">
            <Button
              size="sm"
              variant={sessionType === "focus" ? "default" : "outline"}
              className={cn(
                sessionType === "focus" 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                  : "border-white/20 text-white/60 hover:text-white hover:bg-white/10"
              )}
              disabled={pomodoroRunning || pomodoroPaused}
              data-testid="button-session-focus"
            >
              <Target className="h-4 w-4 mr-2" />
              Focus
            </Button>
            <Button
              size="sm"
              variant={sessionType === "shortBreak" || sessionType === "longBreak" ? "default" : "outline"}
              className={cn(
                sessionType === "shortBreak" || sessionType === "longBreak"
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "border-white/20 text-white/60 hover:text-white hover:bg-white/10"
              )}
              onClick={() => !pomodoroRunning && !pomodoroPaused && skipToBreak()}
              disabled={pomodoroRunning || pomodoroPaused}
              data-testid="button-session-short-break"
            >
              <Coffee className="h-4 w-4 mr-2" />
              Break
            </Button>
          </div>
        )}

        <div className="relative" data-testid="timer-container">
          {timerMode === "pomodoro" ? (
            <CircularTimer
              progress={pomodoroProgress}
              size={320}
              strokeWidth={12}
              color={sessionColor}
              isRunning={pomodoroRunning}
            />
          ) : (
            <CircularTimer
              progress={stopwatchProgress}
              size={320}
              strokeWidth={12}
              color="#10b981"
              isRunning={isSessionRunning}
            />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {timerMode === "pomodoro" ? (
              <>
                <span
                  className={cn(
                    "font-mono font-bold text-7xl tabular-nums tracking-tight text-white",
                    pomodoroRunning && "animate-pulse"
                  )}
                  style={{ animationDuration: "2s" }}
                  data-testid="text-timer-display"
                >
                  {formatTime(timeRemaining)}
                </span>
                <span
                  className="text-lg font-medium mt-2"
                  style={{ color: sessionColor }}
                  data-testid="text-session-label"
                >
                  {getSessionTypeLabel(sessionType)}
                </span>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    "font-mono font-bold text-7xl tabular-nums tracking-tight text-white",
                    isSessionRunning && "animate-pulse"
                  )}
                  style={{ animationDuration: "2s" }}
                  data-testid="text-timer-display"
                >
                  {formatElapsedTime(elapsedTime)}
                </span>
                <span
                  className="text-lg font-medium mt-2 text-emerald-500"
                  data-testid="text-session-label"
                >
                  {isSessionRunning ? "Focusing" : isSessionPaused ? "Paused" : "Ready"}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          {!isSessionStarted && (
            <Button
              size="lg"
              className="min-w-32 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleStartFocusSession}
              disabled={!selectedTask}
              data-testid="button-start"
            >
              <Play className="h-5 w-5 mr-2" />
              Start
            </Button>
          )}
          {isSessionRunning && (
            <Button
              size="lg"
              variant="outline"
              className="min-w-32 border-white/20 text-white hover:bg-white/10"
              onClick={handlePauseFocusSession}
              data-testid="button-pause"
            >
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </Button>
          )}
          {isSessionPaused && (
            <Button
              size="lg"
              className="min-w-32 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleResumeFocusSession}
              data-testid="button-resume"
            >
              <Play className="h-5 w-5 mr-2" />
              Resume
            </Button>
          )}
          {isSessionStarted && (
            <Button
              size="lg"
              variant="destructive"
              className="min-w-32"
              onClick={handleEndFocusSession}
              data-testid="button-stop"
            >
              <Square className="h-5 w-5 mr-2" />
              End
            </Button>
          )}
          {timerMode === "pomodoro" && sessionType === "focus" && isSessionStarted && (
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={skipToBreak}
              data-testid="button-take-break"
            >
              <Coffee className="h-5 w-5 mr-2" />
              Take Break
            </Button>
          )}
        </div>

        {selectedTask && (
          <div
            className="mt-6 w-full max-w-md bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4"
            data-testid="current-task-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate" data-testid="text-task-title">
                  {selectedTask.title}
                </h3>
                {selectedTask.description && (
                  <p className="text-sm text-white/60 mt-1 line-clamp-2" data-testid="text-task-description">
                    {selectedTask.description}
                  </p>
                )}
              </div>
              {selectedTask.priority && (
                <Badge 
                  variant={getPriorityVariant(selectedTask.priority)}
                  data-testid="badge-task-priority"
                >
                  {selectedTask.priority}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-white/50 mt-3">
              {selectedTask.estimatedTime && (
                <div className="flex items-center gap-1" data-testid="estimated-time">
                  <Clock className="h-4 w-4" />
                  <span>Est: {selectedTask.estimatedTime}m</span>
                </div>
              )}
              {(selectedTask.totalFocusTime || 0) > 0 && (
                <div className="flex items-center gap-1" data-testid="total-focus-time">
                  <Zap className="h-4 w-4" />
                  <span>Total: {Math.floor((selectedTask.totalFocusTime || 0) / 60)}m</span>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTask && subtasks.length > 0 && (
          <SubtaskTracker
            task={selectedTask}
            subtasks={subtasks}
            activeSubtaskIndex={activeSubtaskIndex}
            segments={segments}
            onSwitchSubtask={switchSubtask}
            onCompleteSubtask={completeSubtask}
            isSessionActive={isSessionRunning}
            getSubtaskDuration={getSubtaskDuration}
          />
        )}

        {!selectedTask && (
          <div className="mt-8 text-center text-white/40" data-testid="no-task-message">
            <p className="text-sm">Select a task above to start focusing</p>
            <p className="text-xs mt-1">Choose from your active tasks to track time</p>
          </div>
        )}
      </div>

      <FocusInspiration />

      <div className="absolute bottom-4 text-center text-white/30 text-xs" data-testid="keyboard-hints">
        <span>Press </span>
        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/50">Space</kbd>
        <span> to {isSessionRunning ? "pause" : isSessionPaused ? "resume" : "start"} </span>
        <span className="mx-2">|</span>
        <span>Press </span>
        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/50">Esc</kbd>
        <span> to exit</span>
      </div>
    </div>
  );
}
