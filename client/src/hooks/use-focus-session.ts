import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

export interface SubtaskFocusSegment {
  subtaskId: string;
  subtaskIndex: number;
  startTime: number;
  endTime: number | null;
  duration: number;
}

export interface TaskFocusSession {
  id: string;
  taskId: string;
  startTime: number;
  endTime: number | null;
  totalDuration: number;
  isPaused: boolean;
  pauseStartTime: number | null;
  totalPausedTime: number;
  notes: string;
}

const FOCUS_SESSION_KEY = "focus-session-state";

function loadSessionState(): TaskFocusSession | null {
  try {
    const stored = localStorage.getItem(FOCUS_SESSION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveSessionState(session: TaskFocusSession | null) {
  if (session) {
    localStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(FOCUS_SESSION_KEY);
  }
}

export function useFocusSession() {
  const [session, setSession] = useState<TaskFocusSession | null>(loadSessionState);
  const [segments, setSegments] = useState<SubtaskFocusSegment[]>([]);
  const [activeSubtaskIndex, setActiveSubtaskIndex] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: selectedTask } = useQuery<Task | null>({
    queryKey: ["/api/tasks", session?.taskId],
    enabled: !!session?.taskId,
  });

  const { data: subtasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", session?.taskId, "subtasks"],
    enabled: !!session?.taskId,
  });

  const updateFocusTimeMutation = useMutation({
    mutationFn: async ({ taskId, duration }: { taskId: string; duration: number }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/focus-time`, { duration });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<Task> }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (session?.taskId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", session.taskId, "subtasks"] });
      }
    },
  });

  useEffect(() => {
    saveSessionState(session);
  }, [session]);

  useEffect(() => {
    if (session && !session.isPaused && session.startTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - session.startTime - session.totalPausedTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      setElapsedTime(session?.totalDuration || 0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session?.isPaused, session?.startTime, session?.totalPausedTime]);

  const startSession = useCallback((task: Task) => {
    const now = Date.now();
    const newSession: TaskFocusSession = {
      id: `session-${now}`,
      taskId: task.id,
      startTime: now,
      endTime: null,
      totalDuration: 0,
      isPaused: false,
      pauseStartTime: null,
      totalPausedTime: 0,
      notes: "",
    };
    setSession(newSession);
    setSegments([]);
    setActiveSubtaskIndex(null);
    setElapsedTime(0);
  }, []);

  const pauseSession = useCallback(() => {
    if (!session || session.isPaused) return;
    
    const now = Date.now();
    setSession(prev => {
      if (!prev) return null;
      const elapsed = Math.floor((now - prev.startTime - prev.totalPausedTime) / 1000);
      return {
        ...prev,
        isPaused: true,
        pauseStartTime: now,
        totalDuration: elapsed,
      };
    });

    if (activeSubtaskIndex !== null) {
      setSegments(prev => {
        const updated = [...prev];
        const activeSegment = updated.find(s => s.subtaskIndex === activeSubtaskIndex && s.endTime === null);
        if (activeSegment) {
          activeSegment.endTime = now;
          activeSegment.duration = Math.floor((now - activeSegment.startTime) / 1000);
        }
        return updated;
      });
    }
  }, [session, activeSubtaskIndex]);

  const resumeSession = useCallback(() => {
    if (!session || !session.isPaused) return;
    
    const now = Date.now();
    setSession(prev => {
      if (!prev || !prev.pauseStartTime) return prev;
      const pausedDuration = now - prev.pauseStartTime;
      return {
        ...prev,
        isPaused: false,
        pauseStartTime: null,
        totalPausedTime: prev.totalPausedTime + pausedDuration,
      };
    });

    if (activeSubtaskIndex !== null) {
      const newSegment: SubtaskFocusSegment = {
        subtaskId: subtasks[activeSubtaskIndex]?.id || "",
        subtaskIndex: activeSubtaskIndex,
        startTime: now,
        endTime: null,
        duration: 0,
      };
      setSegments(prev => [...prev, newSegment]);
    }
  }, [session, activeSubtaskIndex, subtasks]);

  const endSession = useCallback(() => {
    if (!session) return null;
    
    const now = Date.now();
    let finalDuration = session.totalDuration;
    
    if (!session.isPaused) {
      finalDuration = Math.floor((now - session.startTime - session.totalPausedTime) / 1000);
    }

    const completedSession: TaskFocusSession = {
      ...session,
      endTime: now,
      totalDuration: finalDuration,
      isPaused: false,
    };

    const finalSegments = segments.map(seg => {
      if (seg.endTime === null) {
        return {
          ...seg,
          endTime: now,
          duration: Math.floor((now - seg.startTime) / 1000),
        };
      }
      return seg;
    });

    if (session.taskId && finalDuration > 0) {
      updateFocusTimeMutation.mutate({
        taskId: session.taskId,
        duration: finalDuration,
      });
    }

    setSession(null);
    setSegments([]);
    setActiveSubtaskIndex(null);
    setElapsedTime(0);

    return { session: completedSession, segments: finalSegments };
  }, [session, segments, updateFocusTimeMutation]);

  const switchSubtask = useCallback((index: number) => {
    if (!session || session.isPaused) return;
    
    const now = Date.now();

    if (activeSubtaskIndex !== null) {
      setSegments(prev => {
        const updated = [...prev];
        const activeSegment = updated.find(s => s.subtaskIndex === activeSubtaskIndex && s.endTime === null);
        if (activeSegment) {
          activeSegment.endTime = now;
          activeSegment.duration = Math.floor((now - activeSegment.startTime) / 1000);
        }
        return updated;
      });
    }

    const subtask = subtasks[index];
    if (subtask) {
      const newSegment: SubtaskFocusSegment = {
        subtaskId: subtask.id,
        subtaskIndex: index,
        startTime: now,
        endTime: null,
        duration: 0,
      };
      setSegments(prev => [...prev, newSegment]);
    }

    setActiveSubtaskIndex(index);
  }, [session, activeSubtaskIndex, subtasks]);

  const completeSubtask = useCallback((index: number) => {
    const subtask = subtasks[index];
    if (!subtask) return;

    updateTaskMutation.mutate({
      taskId: subtask.id,
      data: { status: "done" },
    });

    if (activeSubtaskIndex === index) {
      const nextIncomplete = subtasks.findIndex((s, i) => i !== index && s.status !== "done");
      if (nextIncomplete !== -1) {
        switchSubtask(nextIncomplete);
      } else {
        setActiveSubtaskIndex(null);
      }
    }
  }, [subtasks, activeSubtaskIndex, switchSubtask, updateTaskMutation]);

  const getSubtaskDuration = useCallback((subtaskIndex: number): number => {
    const subtaskSegments = segments.filter(s => s.subtaskIndex === subtaskIndex);
    let total = 0;
    
    for (const seg of subtaskSegments) {
      if (seg.endTime) {
        total += seg.duration;
      } else {
        total += Math.floor((Date.now() - seg.startTime) / 1000);
      }
    }
    
    return total;
  }, [segments]);

  const updateNotes = useCallback((notes: string) => {
    setSession(prev => {
      if (!prev) return null;
      return { ...prev, notes };
    });
  }, []);

  const filteredSubtasks = subtasks.filter(t => t.parentTaskId === session?.taskId);

  return {
    session,
    selectedTask,
    subtasks: filteredSubtasks,
    segments,
    activeSubtaskIndex,
    elapsedTime,
    isActive: session !== null && !session.isPaused,
    isPaused: session?.isPaused ?? false,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    switchSubtask,
    completeSubtask,
    getSubtaskDuration,
    updateNotes,
  };
}
