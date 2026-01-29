import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

export type SessionType = "focus" | "shortBreak" | "longBreak";

interface PomodoroSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
}

interface PomodoroState {
  isRunning: boolean;
  isPaused: boolean;
  timeRemaining: number;
  currentTask: Task | null;
  sessionType: SessionType;
  completedPomodoros: number;
  settings: PomodoroSettings;
}

interface PomodoroContextValue extends PomodoroState {
  startTimer: (task?: Task) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  skipToBreak: () => void;
  resetTimer: () => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
}

const STORAGE_KEY = "pomodoro-state";
const SETTINGS_KEY = "pomodoro-settings";

const defaultSettings: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: false,
};

const BEEP_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACA/4CAf39/fn19fX19fn5/f4CAgYGBgoGBgYGAgH9/fn5+fn5+fn5/gICBgYKCgoKCgYGAgH9/fn19fX5+f3+AgIGBgoKCgoGBgH9/fn19fX5+f3+AgIGBgoKCgoKBgIB/f359fX1+fn9/gICBgYKCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgoGAgH9/fn19fX5+f3+AgIGBgoKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgoGAgH9/fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoKBgH9/fn19fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKCgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn59fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/f359fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/gICAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKB";

function loadSettings(): PomodoroSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultSettings;
}

function loadState(settings: PomodoroSettings): Omit<PomodoroState, "settings"> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        isRunning: false,
        isPaused: parsed.isPaused || false,
        timeRemaining: parsed.timeRemaining || settings.focusDuration * 60,
        currentTask: parsed.currentTask || null,
        sessionType: parsed.sessionType || "focus",
        completedPomodoros: parsed.completedPomodoros || 0,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {
    isRunning: false,
    isPaused: false,
    timeRemaining: settings.focusDuration * 60,
    currentTask: null,
    sessionType: "focus",
    completedPomodoros: 0,
  };
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings);
  const [state, setState] = useState<Omit<PomodoroState, "settings">>(() => loadState(settings));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);

  const addFocusTimeMutation = useMutation({
    mutationFn: async ({ taskId, duration }: { taskId: string; duration: number }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/focus-time`, { duration });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  useEffect(() => {
    audioRef.current = new Audio(BEEP_SOUND_URL);
    audioRef.current.volume = 0.5;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const stateToSave = {
      isPaused: state.isPaused,
      timeRemaining: state.timeRemaining,
      currentTask: state.currentTask,
      sessionType: state.sessionType,
      completedPomodoros: state.completedPomodoros,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const playBeep = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const getDurationForType = useCallback((type: SessionType): number => {
    switch (type) {
      case "focus":
        return settings.focusDuration * 60;
      case "shortBreak":
        return settings.shortBreakDuration * 60;
      case "longBreak":
        return settings.longBreakDuration * 60;
    }
  }, [settings]);

  const handleSessionComplete = useCallback(() => {
    playBeep();
    
    setState((prev) => {
      if (prev.sessionType === "focus") {
        const newCount = prev.completedPomodoros + 1;
        const nextType = newCount % 4 === 0 ? "longBreak" : "shortBreak";
        const autoStart = settings.autoStartBreaks;
        
        if (prev.currentTask?.id && sessionStartTimeRef.current) {
          const durationInSeconds = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
          if (durationInSeconds > 0) {
            addFocusTimeMutation.mutate({
              taskId: prev.currentTask.id,
              duration: durationInSeconds,
            });
          }
        }
        sessionStartTimeRef.current = null;
        
        return {
          ...prev,
          isRunning: autoStart,
          isPaused: false,
          completedPomodoros: newCount,
          sessionType: nextType,
          timeRemaining: getDurationForType(nextType),
        };
      } else {
        return {
          ...prev,
          isRunning: false,
          isPaused: false,
          sessionType: "focus",
          timeRemaining: getDurationForType("focus"),
        };
      }
    });
  }, [playBeep, settings.autoStartBreaks, getDurationForType, addFocusTimeMutation]);

  useEffect(() => {
    if (state.isRunning && state.timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.timeRemaining <= 1) {
            return prev;
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    } else if (state.isRunning && state.timeRemaining <= 0) {
      handleSessionComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, state.timeRemaining, handleSessionComplete]);

  const startTimer = useCallback((task?: Task) => {
    setState((prev) => {
      if (prev.sessionType === "focus" && !prev.isPaused) {
        sessionStartTimeRef.current = Date.now();
      } else if (prev.sessionType === "focus" && prev.isPaused && !sessionStartTimeRef.current) {
        sessionStartTimeRef.current = Date.now();
      }
      return {
        ...prev,
        isRunning: true,
        isPaused: false,
        currentTask: task || prev.currentTask,
        timeRemaining: prev.isPaused ? prev.timeRemaining : getDurationForType(prev.sessionType),
      };
    });
  }, [getDurationForType]);

  const pauseTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: true,
    }));
  }, []);

  const resumeTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
    }));
  }, []);

  const stopTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentTask: null,
      timeRemaining: getDurationForType(prev.sessionType),
    }));
  }, [getDurationForType]);

  const skipToBreak = useCallback(() => {
    setState((prev) => {
      if (prev.sessionType === "focus") {
        const newCount = prev.completedPomodoros + 1;
        const nextType = newCount % 4 === 0 ? "longBreak" : "shortBreak";
        return {
          ...prev,
          isRunning: false,
          isPaused: false,
          completedPomodoros: newCount,
          sessionType: nextType,
          timeRemaining: getDurationForType(nextType),
        };
      } else {
        return {
          ...prev,
          isRunning: false,
          isPaused: false,
          sessionType: "focus",
          timeRemaining: getDurationForType("focus"),
        };
      }
    });
  }, [getDurationForType]);

  const resetTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      timeRemaining: getDurationForType(prev.sessionType),
    }));
  }, [getDurationForType]);

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const value: PomodoroContextValue = {
    ...state,
    settings,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    skipToBreak,
    resetTimer,
    updateSettings,
  };

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error("usePomodoro must be used within a PomodoroProvider");
  }
  return context;
}
