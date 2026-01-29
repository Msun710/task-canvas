import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Clock, 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Zap,
  CalendarDays,
  Battery,
  Target,
  Timer,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Filter,
  Square,
  ListTodo,
  Repeat,
  CheckSquare,
  Flame,
  CheckCircle2,
  Circle,
  Crosshair
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, addDays, isSameDay, parseISO, isAfter, isBefore, addMonths, startOfDay } from "date-fns";
import type { FlexibleTask, ScheduleSuggestion, TimeBlock, ScheduleAnalysis } from "@shared/schema";

const DAYS_OF_WEEK = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
  high: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  medium: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  low: "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  accepted: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  rejected: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

const ENERGY_ICONS: Record<string, string> = {
  low: "text-blue-500",
  medium: "text-amber-500", 
  high: "text-emerald-500",
};

const PRIORITY_BORDER_COLORS: Record<string, string> = {
  urgent: "border-l-rose-500",
  high: "border-l-amber-500",
  medium: "border-l-blue-500",
  low: "border-l-gray-400",
};

const WINDOW_STATUS_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  active: { border: "border-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  grace: { border: "border-amber-500", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  early: { border: "border-blue-400", bg: "bg-blue-400/10", text: "text-blue-600 dark:text-blue-400" },
  closed: { border: "border-orange-500", bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
};

interface UnifiedTimelineTask {
  id: string;
  title: string;
  description?: string | null;
  dueTime: string | null;
  priority: string;
  status: string;
  estimatedTime: number | null;
  allDayTask: boolean | null;
  subtasks: Array<{ id: string; title: string; isCompleted: boolean }>;
  projectId: string | null;
  project?: { name: string } | null;
  itemType: "task";
}

interface UnifiedTimelineHabit {
  id: string;
  habitId: string;
  status: string;
  habit: {
    id: string;
    name: string;
    description?: string | null;
    startTime: string | null;
    endTime: string | null;
    streakCount: number;
    estimatedDuration: number | null;
    subHabits: Array<{ id: string; name: string; isCompleted: boolean }>;
  };
  hasTimeWindow: boolean;
  windowStatus: "early" | "active" | "grace" | "closed";
  startTime: string | null;
  endTime: string | null;
  itemType: "habit";
}

interface UnifiedTimelineBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string | null;
  blockType: string | null;
  itemType: "timeBlock";
}

interface UnifiedTimelineResponse {
  date: string;
  timeBlocks: UnifiedTimelineBlock[];
  timedTasks: UnifiedTimelineTask[];
  allDayTasks: UnifiedTimelineTask[];
  timedHabits: UnifiedTimelineHabit[];
  allDayHabits: UnifiedTimelineHabit[];
  metrics: {
    totalWorkMinutes: number;
    scheduledMinutes: number;
    availableMinutes: number;
    scheduledPercentage: number;
    isOverbooked: boolean;
  };
  dynamicRange: {
    recommendedStartTime: string;
    recommendedEndTime: string;
    hasScheduledItems: boolean;
  };
}

interface FlexibleTaskForm {
  title: string;
  description: string;
  estimatedDuration: number;
  priority: string;
  frequencyType: string;
  preferredTimeStart: string;
  preferredTimeEnd: string;
  specificDays: number[];
  deadline: Date | null;
  energyLevel: string;
  isRecurring: boolean;
}

const defaultFormValues: FlexibleTaskForm = {
  title: "",
  description: "",
  estimatedDuration: 30,
  priority: "medium",
  frequencyType: "weekly",
  preferredTimeStart: "",
  preferredTimeEnd: "",
  specificDays: [],
  deadline: null,
  energyLevel: "medium",
  isRecurring: true,
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatTime(timeStr: string): string {
  const [hours, mins] = timeStr.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${mins} ${ampm}`;
}

type TaskFilter = "all" | "high-priority" | "due-soon";
type ViewMode = "day" | "week";
type SuggestionFilter = "all" | "pending" | "accepted" | "rejected";

export default function UnifiedSchedulerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [suggestionFilter, setSuggestionFilter] = useState<SuggestionFilter>("all");
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FlexibleTask | null>(null);
  const [formValues, setFormValues] = useState<FlexibleTaskForm>(defaultFormValues);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [schedulingTask, setSchedulingTask] = useState<FlexibleTask | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    date: new Date(),
    startTime: "09:00",
    endTime: "10:00",
  });
  const [isScheduleDateOpen, setIsScheduleDateOpen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [isAllDayExpanded, setIsAllDayExpanded] = useState(true);
  const [showTimeBlocks, setShowTimeBlocks] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showHabits, setShowHabits] = useState(true);
  const [expandedTimelineTasks, setExpandedTimelineTasks] = useState<Set<string>>(new Set());
  const [expandedTimelineHabits, setExpandedTimelineHabits] = useState<Set<string>>(new Set());
  const [selectedTimelineTask, setSelectedTimelineTask] = useState<UnifiedTimelineTask | null>(null);
  const [selectedTimelineHabit, setSelectedTimelineHabit] = useState<UnifiedTimelineHabit | null>(null);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<UnifiedTimelineBlock | null>(null);
  const [isTaskDetailDialogOpen, setIsTaskDetailDialogOpen] = useState(false);
  const [isHabitQuickCompleteOpen, setIsHabitQuickCompleteOpen] = useState(false);
  const [isBlockEditDialogOpen, setIsBlockEditDialogOpen] = useState(false);
  const [rangeAdjustment, setRangeAdjustment] = useState(0);
  const [isAutoRange, setIsAutoRange] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const nowLineRef = useRef<HTMLDivElement>(null);
  const hasScrolledToNow = useRef(false);
  const { toast } = useToast();

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const dateStr = selectedDate.toISOString().split('T')[0];

  const { data: flexibleTasks = [], isLoading: isLoadingTasks } = useQuery<FlexibleTask[]>({
    queryKey: ["/api/flexible-tasks"],
  });

  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useQuery<ScheduleSuggestion[]>({
    queryKey: ["/api/schedule-suggestions"],
  });

  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery<ScheduleAnalysis>({
    queryKey: ["/api/schedule/analyze", dateStr],
    queryFn: () => fetch(`/api/schedule/analyze?date=${dateStr}`).then(r => r.json()),
  });

  const { data: timeBlocks = [] } = useQuery<TimeBlock[]>({
    queryKey: ["/api/time-blocks", { startDate: weekStart.toISOString(), endDate: weekEnd.toISOString() }],
    queryFn: async () => {
      const response = await fetch(
        `/api/time-blocks?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch time blocks");
      return response.json();
    },
  });

  const { data: unifiedTimeline, isLoading: isLoadingTimeline } = useQuery<UnifiedTimelineResponse>({
    queryKey: ['/api/unified-timeline', dateStr],
  });

  const dynamicTimeRange = useMemo(() => {
    const defaultStart = 8;
    const defaultEnd = 18;
    const minSpan = 2;
    
    let baseStart = defaultStart;
    let baseEnd = defaultEnd;
    
    if (unifiedTimeline?.dynamicRange && isAutoRange) {
      const { recommendedStartTime, recommendedEndTime, hasScheduledItems } = unifiedTimeline.dynamicRange;
      
      if (hasScheduledItems) {
        const [startH] = recommendedStartTime.split(':').map(Number);
        const [endH] = recommendedEndTime.split(':').map(Number);
        baseStart = startH;
        baseEnd = endH;
      }
    }
    
    let startHour = Math.max(0, baseStart - rangeAdjustment);
    let endHour = Math.min(24, baseEnd + rangeAdjustment);
    
    if (endHour - startHour < minSpan) {
      const center = (baseStart + baseEnd) / 2;
      startHour = Math.max(0, Math.floor(center - minSpan / 2));
      endHour = Math.min(24, Math.ceil(center + minSpan / 2));
    }
    
    return { startHour, endHour };
  }, [unifiedTimeline?.dynamicRange, rangeAdjustment, isAutoRange]);

  const dynamicHours = useMemo(() => {
    const { startHour, endHour } = dynamicTimeRange;
    const numHours = Math.max(2, endHour - startHour);
    return Array.from({ length: numHours }, (_, i) => startHour + i);
  }, [dynamicTimeRange]);

  // Update current time every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to NOW line on initial load (only for today)
  useEffect(() => {
    if (!hasScrolledToNow.current && nowLineRef.current && timelineContainerRef.current && isSameDay(selectedDate, new Date())) {
      const container = timelineContainerRef.current;
      const nowLine = nowLineRef.current;
      const containerRect = container.getBoundingClientRect();
      const nowLineRect = nowLine.getBoundingClientRect();
      
      // Calculate scroll position to center the NOW line
      const scrollTop = nowLine.offsetTop - containerRect.height / 2 + nowLineRect.height / 2;
      container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
      hasScrolledToNow.current = true;
    }
  }, [selectedDate, unifiedTimeline]);

  // Reset scroll flag when date changes
  useEffect(() => {
    hasScrolledToNow.current = false;
  }, [dateStr]);

  // Calculate current time position as percentage
  const currentTimePosition = useMemo(() => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    
    const { startHour, endHour } = dynamicTimeRange;
    const startMinutes = startHour * 60;
    const endMinutes = endHour * 60;
    const totalMinutes = endMinutes - startMinutes;
    
    if (totalMinutes <= 0) return null;
    
    const position = ((currentMinutes - startMinutes) / totalMinutes) * 100;
    
    // Only show if within visible range
    if (position < 0 || position > 100) return null;
    
    return position;
  }, [currentTime, dynamicTimeRange]);

  // Check if today is selected
  const isToday = useMemo(() => isSameDay(selectedDate, new Date()), [selectedDate]);

  // Helper to get entry time state (past, current, future)
  const getEntryTimeState = (startTime: string | null, endTime: string | null): 'past' | 'current' | 'future' | null => {
    if (!startTime || !endTime || !isToday) return null;
    
    const now = currentTime;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (nowMinutes >= endMinutes) return 'past';
    if (nowMinutes >= startMinutes && nowMinutes < endMinutes) return 'current';
    return 'future';
  };

  // Helper to calculate progress percentage for current entries
  const getProgressPercentage = (startTime: string | null, endTime: string | null): number => {
    if (!startTime || !endTime || !isToday) return 0;
    
    const now = currentTime;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (nowMinutes <= startMinutes) return 0;
    if (nowMinutes >= endMinutes) return 100;
    
    const totalDuration = endMinutes - startMinutes;
    const elapsed = nowMinutes - startMinutes;
    return Math.round((elapsed / totalDuration) * 100);
  };

  // Jump to now function
  const scrollToNow = () => {
    if (nowLineRef.current && timelineContainerRef.current) {
      const container = timelineContainerRef.current;
      const nowLine = nowLineRef.current;
      const containerRect = container.getBoundingClientRect();
      const scrollTop = nowLine.offsetTop - containerRect.height / 2;
      container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
    }
  };

  const createTaskMutation = useMutation({
    mutationFn: (data: Partial<FlexibleTask>) => 
      apiRequest("POST", "/api/flexible-tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flexible-tasks"] });
      setIsTaskDialogOpen(false);
      setFormValues(defaultFormValues);
      toast({ title: "Task created" });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FlexibleTask> }) =>
      apiRequest("PATCH", `/api/flexible-tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flexible-tasks"] });
      setIsTaskDialogOpen(false);
      setEditingTask(null);
      setFormValues(defaultFormValues);
      toast({ title: "Task updated" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/flexible-tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flexible-tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  const generateSuggestionsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/schedule-suggestions/generate", {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-suggestions"] });
      toast({ title: "Suggestions generated", description: "Review and accept your schedule suggestions." });
    },
    onError: () => {
      toast({ title: "Failed to generate suggestions", variant: "destructive" });
    },
  });

  const acceptSuggestionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/schedule-suggestions/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/analyze"] });
      toast({ title: "Suggestion accepted" });
    },
    onError: () => {
      toast({ title: "Failed to accept suggestion", variant: "destructive" });
    },
  });

  const rejectSuggestionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/schedule-suggestions/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-suggestions"] });
      toast({ title: "Suggestion rejected" });
    },
    onError: () => {
      toast({ title: "Failed to reject suggestion", variant: "destructive" });
    },
  });

  const scheduleTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { date: string; startTime: string; endTime: string } }) =>
      apiRequest("POST", `/api/flexible-tasks/${id}/schedule`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flexible-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/analyze"] });
      setIsScheduleDialogOpen(false);
      setSchedulingTask(null);
      toast({ title: "Task scheduled" });
    },
    onError: () => {
      toast({ title: "Failed to schedule task", variant: "destructive" });
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, isCompleted }: { subtaskId: string; isCompleted: boolean }) =>
      apiRequest("PATCH", `/api/tasks/${subtaskId}`, { 
        status: isCompleted ? "todo" : "done" 
      }),
    onMutate: async ({ subtaskId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/unified-timeline', dateStr] });
      const previousData = queryClient.getQueryData<UnifiedTimelineResponse>(['/api/unified-timeline', dateStr]);
      
      queryClient.setQueryData<UnifiedTimelineResponse>(['/api/unified-timeline', dateStr], (old) => {
        if (!old) return old;
        return {
          ...old,
          timedTasks: old.timedTasks.map(task => ({
            ...task,
            subtasks: task.subtasks.map(st => 
              st.id === subtaskId ? { ...st, isCompleted: !isCompleted } : st
            )
          })),
          allDayTasks: old.allDayTasks.map(task => ({
            ...task,
            subtasks: task.subtasks.map(st => 
              st.id === subtaskId ? { ...st, isCompleted: !isCompleted } : st
            )
          }))
        };
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['/api/unified-timeline', dateStr], context.previousData);
      }
      toast({ title: "Failed to update subtask", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/unified-timeline', dateStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const completeHabitMutation = useMutation({
    mutationFn: (occurrenceId: string) =>
      apiRequest("PATCH", `/api/habit-occurrences/${occurrenceId}`, { 
        status: "completed" 
      }),
    onMutate: async (occurrenceId) => {
      await queryClient.cancelQueries({ queryKey: ['/api/unified-timeline', dateStr] });
      const previousData = queryClient.getQueryData<UnifiedTimelineResponse>(['/api/unified-timeline', dateStr]);
      
      queryClient.setQueryData<UnifiedTimelineResponse>(['/api/unified-timeline', dateStr], (old) => {
        if (!old) return old;
        return {
          ...old,
          timedHabits: old.timedHabits.map(h => 
            h.id === occurrenceId ? { ...h, status: "completed" } : h
          ),
          allDayHabits: old.allDayHabits.map(h => 
            h.id === occurrenceId ? { ...h, status: "completed" } : h
          )
        };
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['/api/unified-timeline', dateStr], context.previousData);
      }
      toast({ title: "Failed to complete habit", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Habit completed!" });
      setIsHabitQuickCompleteOpen(false);
      setSelectedTimelineHabit(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/unified-timeline', dateStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/habit-occurrences"] });
    },
  });

  const updateTimeBlockMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TimeBlock> }) =>
      apiRequest("PATCH", `/api/time-blocks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      queryClient.invalidateQueries({ queryKey: ['/api/unified-timeline', dateStr] });
      setIsBlockEditDialogOpen(false);
      setSelectedTimeBlock(null);
      toast({ title: "Time block updated" });
    },
    onError: () => {
      toast({ title: "Failed to update time block", variant: "destructive" });
    },
  });

  const activeTasks = useMemo(() => {
    return flexibleTasks.filter(t => t.isActive);
  }, [flexibleTasks]);

  const filteredTasks = useMemo(() => {
    let tasks = activeTasks;
    
    switch (taskFilter) {
      case "high-priority":
        tasks = tasks.filter(t => t.priority === "urgent" || t.priority === "high");
        break;
      case "due-soon":
        const oneWeekFromNow = addDays(new Date(), 7);
        tasks = tasks.filter(t => t.deadline && isBefore(new Date(t.deadline), oneWeekFromNow));
        break;
    }
    
    return tasks;
  }, [activeTasks, taskFilter]);

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      if (suggestionFilter === "all") return true;
      return s.status === suggestionFilter;
    });
  }, [suggestions, suggestionFilter]);

  const suggestionsByDay = useMemo(() => {
    const grouped: Record<string, ScheduleSuggestion[]> = {};
    filteredSuggestions.forEach(s => {
      const date = typeof s.suggestedDate === "string" ? parseISO(s.suggestedDate) : new Date(s.suggestedDate);
      const key = format(date, "yyyy-MM-dd");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  }, [filteredSuggestions]);

  const pendingSuggestions = useMemo(() => {
    return suggestions.filter(s => s.status === "pending");
  }, [suggestions]);

  const openCreateDialog = () => {
    setEditingTask(null);
    setFormValues(defaultFormValues);
    setIsTaskDialogOpen(true);
  };

  const openEditDialog = (task: FlexibleTask) => {
    setEditingTask(task);
    setFormValues({
      title: task.title,
      description: task.description || "",
      estimatedDuration: task.estimatedDuration,
      priority: task.priority,
      frequencyType: task.frequencyType,
      preferredTimeStart: task.preferredTimeStart || "",
      preferredTimeEnd: task.preferredTimeEnd || "",
      specificDays: task.specificDays?.map(d => parseInt(d)) || [],
      deadline: task.deadline ? new Date(task.deadline) : null,
      energyLevel: task.energyLevel,
      isRecurring: task.isRecurring ?? true,
    });
    setIsTaskDialogOpen(true);
  };

  const openScheduleDialog = (task: FlexibleTask) => {
    const defaultStart = task.preferredTimeStart || "09:00";
    const durationMinutes = task.estimatedDuration || 30;
    
    // Function to calculate end time based on start time and duration
    const calculateEndTime = (start: string, duration: number) => {
      const [startHours, startMins] = start.split(':').map(Number);
      const totalMins = startHours * 60 + startMins + duration;
      const endHours = Math.floor(totalMins / 60) % 24;
      const endMins = totalMins % 60;
      return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    };

    const defaultEnd = calculateEndTime(defaultStart, durationMinutes);
    
    setSchedulingTask(task);
    setScheduleForm({
      date: selectedDate,
      startTime: defaultStart,
      endTime: defaultEnd,
    });
    setIsScheduleDialogOpen(true);
  };

  const handleScheduleTimeChange = (type: "startTime" | "endTime", value: string) => {
    setScheduleForm(prev => {
      const newForm = { ...prev, [type]: value };
      
      // If start time changed, update end time based on task duration
      if (type === "startTime" && schedulingTask) {
        const durationMinutes = schedulingTask.estimatedDuration || 30;
        const [startHours, startMins] = value.split(':').map(Number);
        const totalMins = startHours * 60 + startMins + durationMinutes;
        const endHours = Math.floor(totalMins / 60) % 24;
        const endMins = totalMins % 60;
        newForm.endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      }
      
      return newForm;
    });
  };

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      title: formValues.title,
      description: formValues.description || undefined,
      estimatedDuration: formValues.estimatedDuration,
      priority: formValues.priority,
      frequencyType: formValues.frequencyType,
      preferredTimeStart: formValues.preferredTimeStart || undefined,
      preferredTimeEnd: formValues.preferredTimeEnd || undefined,
      specificDays: formValues.specificDays.map(String),
      deadline: formValues.deadline || undefined,
      energyLevel: formValues.energyLevel,
      isRecurring: formValues.isRecurring,
    };

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: taskData });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingTask) return;
    
    scheduleTaskMutation.mutate({
      id: schedulingTask.id,
      data: {
        date: scheduleForm.date.toISOString(),
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
      },
    });
  };

  const toggleDay = (day: number) => {
    setFormValues(prev => ({
      ...prev,
      specificDays: prev.specificDays.includes(day)
        ? prev.specificDays.filter(d => d !== day)
        : [...prev.specificDays, day],
    }));
  };

  const changeDate = (days: number) => {
    setSelectedDate(prev => addDays(prev, days));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const toggleDayExpansion = (dayKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  };

  const acceptAllPending = () => {
    pendingSuggestions.forEach(s => {
      acceptSuggestionMutation.mutate(s.id);
    });
  };

  const rejectAllPending = () => {
    pendingSuggestions.forEach(s => {
      rejectSuggestionMutation.mutate(s.id);
    });
  };

  const toggleTimelineTaskExpand = (taskId: string) => {
    setExpandedTimelineTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleTimelineHabitExpand = (habitId: string) => {
    setExpandedTimelineHabits(prev => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      return next;
    });
  };

  const openTaskDetailDialog = (task: UnifiedTimelineTask) => {
    setSelectedTimelineTask(task);
    setIsTaskDetailDialogOpen(true);
  };

  const openHabitQuickComplete = (habitOcc: UnifiedTimelineHabit) => {
    setSelectedTimelineHabit(habitOcc);
    setIsHabitQuickCompleteOpen(true);
  };

  const openBlockEditDialog = (block: UnifiedTimelineBlock) => {
    setSelectedTimeBlock(block);
    setIsBlockEditDialogOpen(true);
  };

  const handleSubtaskToggle = (e: React.MouseEvent, subtaskId: string, isCompleted: boolean) => {
    e.stopPropagation();
    toggleSubtaskMutation.mutate({ subtaskId, isCompleted });
  };

  const getTaskTitle = (suggestion: ScheduleSuggestion) => {
    const task = flexibleTasks.find(t => t.id === suggestion.flexibleTaskId);
    return task?.title || "Unknown Task";
  };

  const getBlocksForDay = (day: Date) => {
    return timeBlocks.filter(block => {
      if (!block.date) return false;
      const blockDate = typeof block.date === "string" ? parseISO(block.date) : new Date(block.date);
      return isSameDay(blockDate, day);
    });
  };

  const timeToPosition = (timeStr: string) => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const { startHour, endHour } = dynamicTimeRange;
    const totalMinutes = (hours * 60 + mins) - (startHour * 60);
    const totalRange = (endHour - startHour) * 60;
    return Math.max(0, Math.min(100, (totalMinutes / totalRange) * 100));
  };

  const getBlockHeight = (startTime: string, endTime: string) => {
    const startPos = timeToPosition(startTime);
    const endPos = timeToPosition(endTime);
    return Math.max(endPos - startPos, 3);
  };

  const expandTimeRange = () => setRangeAdjustment(prev => Math.min(prev + 1, 8));
  const contractTimeRange = () => {
    const { startHour, endHour } = dynamicTimeRange;
    if (endHour - startHour > 2) {
      setRangeAdjustment(prev => prev - 1);
    }
  };
  const resetTimeRange = () => { setRangeAdjustment(0); setIsAutoRange(true); };

  const timelineMetrics = unifiedTimeline?.metrics;
  const availableMinutes = timelineMetrics?.availableMinutes || analysis?.availableMinutes || 0;
  const availableColor = availableMinutes > 180 ? "text-emerald-600 dark:text-emerald-400" : 
                         availableMinutes > 60 ? "text-amber-600 dark:text-amber-400" : 
                         "text-rose-600 dark:text-rose-400";

  const scheduledPercentage = timelineMetrics?.scheduledPercentage || 
    (analysis?.totalWorkMinutes 
      ? Math.round((analysis.scheduledMinutes || 0) / analysis.totalWorkMinutes * 100)
      : 0);
  
  const totalWorkMinutes = timelineMetrics?.totalWorkMinutes || analysis?.totalWorkMinutes || 0;
  const isOverbooked = timelineMetrics?.isOverbooked || false;
  
  const allDayItemsCount = (unifiedTimeline?.allDayTasks?.length || 0) + (unifiedTimeline?.allDayHabits?.length || 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Tasks to Schedule</CardTitle>
                    <Badge variant="secondary" className="text-xs">{activeTasks.length}</Badge>
                  </div>
                  <Button size="sm" onClick={openCreateDialog} data-testid="button-add-task">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={taskFilter === "all" ? "default" : "outline"}
                    onClick={() => setTaskFilter("all")}
                    className="text-xs"
                    data-testid="filter-all"
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={taskFilter === "high-priority" ? "default" : "outline"}
                    onClick={() => setTaskFilter("high-priority")}
                    className="text-xs"
                    data-testid="filter-high-priority"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Priority
                  </Button>
                  <Button
                    size="sm"
                    variant={taskFilter === "due-soon" ? "default" : "outline"}
                    onClick={() => setTaskFilter("due-soon")}
                    className="text-xs"
                    data-testid="filter-due-soon"
                  >
                    <Timer className="h-3 w-3 mr-1" />
                    Due Soon
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-2">
                  {isLoadingTasks ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {taskFilter === "all" 
                          ? "No tasks to schedule yet. Add one to get started."
                          : "No matching tasks found."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTasks.map(task => (
                        <div
                          key={task.id}
                          className={cn(
                            "group p-3 rounded-md border hover-elevate",
                            task.status === "scheduled" && "opacity-60"
                          )}
                          data-testid={`task-${task.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{task.title}</p>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatDuration(task.estimatedDuration)}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", PRIORITY_COLORS[task.priority])}
                                >
                                  {task.priority}
                                </Badge>
                                <Battery className={cn("h-3 w-3", ENERGY_ICONS[task.energyLevel])} />
                              </div>
                              {task.deadline && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Due: {format(new Date(task.deadline), "MMM d")}
                                </p>
                              )}
                              {task.status === "scheduled" && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs mt-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                >
                                  Scheduled
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 invisible group-hover:visible">
                              {task.status !== "scheduled" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-primary"
                                  onClick={() => openScheduleDialog(task)}
                                  data-testid={`schedule-task-${task.id}`}
                                >
                                  <CalendarIcon className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditDialog(task)}
                                data-testid={`edit-task-${task.id}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => deleteTaskMutation.mutate(task.id)}
                                data-testid={`delete-task-${task.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-6 flex flex-col gap-4">
            <Card className="flex-shrink-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} data-testid="button-prev-day">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center min-w-[200px]">
                      <p className="text-lg font-semibold" data-testid="text-date">
                        {format(selectedDate, "EEEE, MMMM d")}
                      </p>
                      {isSameDay(selectedDate, new Date()) && (
                        <Badge variant="secondary" className="text-xs">Today</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => changeDate(1)} data-testid="button-next-day">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
                      Today
                    </Button>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={viewMode === "day" ? "default" : "outline"}
                      onClick={() => setViewMode("day")}
                      data-testid="view-day"
                    >
                      Day
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === "week" ? "default" : "outline"}
                      onClick={() => setViewMode("week")}
                      data-testid="view-week"
                    >
                      Week
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="p-3 rounded-md bg-muted/50">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">Work Time</span>
                    </div>
                    {isLoadingTimeline && isLoadingAnalysis ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      <p className="text-xl font-bold" data-testid="metric-work-time">
                        {Math.round(totalWorkMinutes / 60)}h
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span className="text-xs">Scheduled</span>
                    </div>
                    {isLoadingTimeline && isLoadingAnalysis ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      <p className={cn(
                        "text-xl font-bold",
                        isOverbooked ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                      )} data-testid="metric-scheduled">
                        {scheduledPercentage}%
                        {isOverbooked && <span className="text-xs ml-1">!</span>}
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <Target className="h-3.5 w-3.5" />
                      <span className="text-xs">Available</span>
                    </div>
                    {isLoadingTimeline && isLoadingAnalysis ? (
                      <Skeleton className="h-7 w-20" />
                    ) : (
                      <p className={cn("text-xl font-bold", availableColor)} data-testid="metric-available">
                        {formatDuration(availableMinutes)}
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <Timer className="h-3.5 w-3.5" />
                      <span className="text-xs">All-Day</span>
                    </div>
                    {isLoadingTimeline ? (
                      <Skeleton className="h-7 w-8" />
                    ) : (
                      <p className="text-xl font-bold" data-testid="metric-all-day">
                        {allDayItemsCount}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t" data-testid="filter-row">
                  <span className="text-xs text-muted-foreground mr-1">Show:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTimeBlocks(prev => !prev)}
                    className={cn(
                      "text-xs rounded-full px-3 toggle-elevate",
                      showTimeBlocks && "toggle-elevated bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-300"
                    )}
                    data-testid="toggle-time-blocks"
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Time Blocks
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTasks(prev => !prev)}
                    className={cn(
                      "text-xs rounded-full px-3 toggle-elevate",
                      showTasks && "toggle-elevated bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300"
                    )}
                    data-testid="toggle-tasks"
                  >
                    <ListTodo className="h-3 w-3 mr-1" />
                    Tasks
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowHabits(prev => !prev)}
                    className={cn(
                      "text-xs rounded-full px-3 toggle-elevate",
                      showHabits && "toggle-elevated bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                    )}
                    data-testid="toggle-habits"
                  >
                    <Repeat className="h-3 w-3 mr-1" />
                    Habits
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardContent className="p-4 h-full flex flex-col">
                {viewMode === "day" ? (
                  <div className="flex flex-col h-full gap-3">
                    {allDayItemsCount > 0 && (
                      <Collapsible open={isAllDayExpanded} onOpenChange={setIsAllDayExpanded}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md border bg-muted/30 hover-elevate" data-testid="all-day-trigger">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">All Day Items</span>
                            <Badge variant="secondary" className="text-xs">{allDayItemsCount}</Badge>
                          </div>
                          {isAllDayExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="flex gap-2 flex-wrap p-2 rounded-md border bg-muted/20">
                            {showTasks && unifiedTimeline?.allDayTasks?.map((task) => (
                              <div
                                key={`allday-task-${task.id}`}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 rounded-md border-l-4 bg-gradient-to-r from-blue-100/30 to-transparent dark:from-blue-900/30 cursor-pointer hover-elevate",
                                  PRIORITY_BORDER_COLORS[task.priority] || "border-l-gray-400"
                                )}
                                onClick={() => openTaskDetailDialog(task)}
                                data-testid={`allday-task-${task.id}`}
                              >
                                <ListTodo className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-sm font-medium truncate max-w-32">{task.title}</span>
                                <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[task.priority])}>
                                  {task.priority}
                                </Badge>
                              </div>
                            ))}
                            {showHabits && unifiedTimeline?.allDayHabits?.map((habitOcc) => (
                              <div
                                key={`allday-habit-${habitOcc.id}`}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 rounded-md border border-dashed cursor-pointer hover-elevate",
                                  WINDOW_STATUS_COLORS[habitOcc.windowStatus]?.border || "border-gray-400",
                                  WINDOW_STATUS_COLORS[habitOcc.windowStatus]?.bg || "bg-gray-100/20"
                                )}
                                onClick={() => openHabitQuickComplete(habitOcc)}
                                data-testid={`allday-habit-${habitOcc.id}`}
                              >
                                <Repeat className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-sm font-medium truncate max-w-32">{habitOcc.habit?.name}</span>
                                {habitOcc.habit?.streakCount > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {habitOcc.habit.streakCount}d
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {dynamicTimeRange.startHour}:00 - {dynamicTimeRange.endHour}:00
                        </span>
                        {isToday && currentTimePosition !== null && (
                          <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(currentTime, 'h:mm a')}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Mini Timeline Overview */}
                      {isToday && (() => {
                        // Calculate actual bounds based on dynamic range (clamped 0-24)
                        const miniDayStart = Math.max(0, dynamicTimeRange.startHour - 1) * 60;
                        const miniDayEnd = Math.min(24, dynamicTimeRange.endHour + 1) * 60;
                        const miniTotalMinutes = miniDayEnd - miniDayStart;
                        
                        // Helper to clamp percentage to 0-100
                        const clampPercent = (val: number) => Math.max(0, Math.min(100, val));
                        
                        return (
                          <div 
                            className="flex-1 mx-4 h-2 bg-muted/50 rounded-full relative overflow-hidden cursor-pointer"
                            onClick={scrollToNow}
                            title="Click to jump to current time"
                            data-testid="mini-timeline-overview"
                          >
                            {/* Time blocks indicator */}
                            {showTimeBlocks && unifiedTimeline?.timeBlocks?.map((block) => {
                              const [startH, startM] = (block.startTime || '00:00').split(':').map(Number);
                              const [endH, endM] = (block.endTime || '00:00').split(':').map(Number);
                              const startMinutes = startH * 60 + startM;
                              const endMinutes = endH * 60 + endM;
                              const left = clampPercent(((startMinutes - miniDayStart) / miniTotalMinutes) * 100);
                              const right = clampPercent(((endMinutes - miniDayStart) / miniTotalMinutes) * 100);
                              const width = right - left;
                              if (width <= 0) return null;
                              return (
                                <div
                                  key={`mini-block-${block.id}`}
                                  className="absolute top-0 bottom-0 opacity-60"
                                  style={{
                                    left: `${left}%`,
                                    width: `${width}%`,
                                    backgroundColor: block.color || '#3B82F6'
                                  }}
                                />
                              );
                            })}
                            
                            {/* Tasks indicator */}
                            {showTasks && unifiedTimeline?.timedTasks?.map((task) => {
                              if (!task.dueTime) return null;
                              const [h, m] = task.dueTime.split(':').map(Number);
                              const startMinutes = h * 60 + m;
                              const left = clampPercent(((startMinutes - miniDayStart) / miniTotalMinutes) * 100);
                              return (
                                <div
                                  key={`mini-task-${task.id}`}
                                  className="absolute top-0 bottom-0 w-0.5 bg-blue-500 opacity-80"
                                  style={{ left: `${left}%` }}
                                />
                              );
                            })}
                            
                            {/* Habits indicator */}
                            {showHabits && unifiedTimeline?.timedHabits?.map((habit) => {
                              if (!habit.startTime) return null;
                              const [h, m] = habit.startTime.split(':').map(Number);
                              const startMinutes = h * 60 + m;
                              const left = clampPercent(((startMinutes - miniDayStart) / miniTotalMinutes) * 100);
                              return (
                                <div
                                  key={`mini-habit-${habit.id}`}
                                  className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 opacity-80"
                                  style={{ left: `${left}%` }}
                                />
                              );
                            })}
                            
                            {/* NOW indicator */}
                            {currentTimePosition !== null && (
                              <div 
                                className="absolute top-0 bottom-0 w-1 bg-rose-500 rounded-full shadow-lg shadow-rose-500/50"
                                style={{ 
                                  left: `${clampPercent((() => {
                                    const now = currentTime;
                                    const nowMinutes = now.getHours() * 60 + now.getMinutes();
                                    return ((nowMinutes - miniDayStart) / miniTotalMinutes) * 100;
                                  })())}%` 
                                }}
                              />
                            )}
                            
                            {/* Current view window indicator */}
                            <div 
                              className="absolute top-0 bottom-0 border border-foreground/30 rounded-sm bg-foreground/5"
                              style={{
                                left: `${clampPercent(((dynamicTimeRange.startHour * 60 - miniDayStart) / miniTotalMinutes) * 100)}%`,
                                width: `${clampPercent(((dynamicTimeRange.endHour - dynamicTimeRange.startHour) * 60 / miniTotalMinutes) * 100)}%`
                              }}
                            />
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-1">
                        {isToday && currentTimePosition !== null && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={scrollToNow}
                            className="text-xs text-rose-600 dark:text-rose-400"
                            title="Jump to current time"
                            data-testid="button-jump-to-now"
                          >
                            <Crosshair className="h-3 w-3 mr-1" />
                            Now
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={expandTimeRange}
                          title="Show more hours"
                          data-testid="button-expand-range"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={contractTimeRange}
                          title="Show fewer hours"
                          data-testid="button-contract-range"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        {rangeAdjustment !== 0 && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={resetTimeRange}
                            className="text-xs"
                            data-testid="button-reset-range"
                          >
                            Auto
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="relative flex-1 border rounded-md overflow-auto" ref={timelineContainerRef}>
                      <div className="relative min-h-full flex flex-col" style={{ minHeight: `${dynamicHours.length * 60}px` }}>
                        {dynamicHours.map(hour => (
                          <div key={hour} className="flex-1 border-b border-dashed border-muted flex items-start" style={{ minHeight: '60px' }}>
                            <span className="text-xs text-muted-foreground px-2 py-1 shrink-0 w-14">
                              {hour % 12 || 12}{hour >= 12 ? "PM" : "AM"}
                            </span>
                            <div className="flex-1" />
                          </div>
                        ))}
                        
                        {/* NOW Line - Current Time Indicator */}
                        {isToday && currentTimePosition !== null && (
                          <div
                            ref={nowLineRef}
                            className="absolute left-0 right-0 z-30 pointer-events-none"
                            style={{ top: `${currentTimePosition}%` }}
                            data-testid="now-line"
                          >
                            <div className="relative flex items-center">
                              {/* Left badge with time */}
                              <div className="absolute -left-1 -translate-y-1/2 flex items-center">
                                <div className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm">
                                  NOW
                                </div>
                              </div>
                              {/* Horizontal line */}
                              <div className="w-full h-[2px] bg-rose-500 shadow-sm" />
                              {/* Right dot indicator */}
                              <div className="absolute right-0 -translate-y-1/2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="absolute left-14 right-2 top-0 bottom-0">
                        {showTimeBlocks && (unifiedTimeline?.timeBlocks || timeBlocks.filter(block => {
                          if (!block.date) return false;
                          const blockDate = typeof block.date === "string" ? parseISO(block.date) : new Date(block.date);
                          return isSameDay(blockDate, selectedDate);
                        })).map((block) => {
                          const timeState = getEntryTimeState(block.startTime, block.endTime);
                          const progress = getProgressPercentage(block.startTime, block.endTime);
                          const baseColor = block.color || "#3B82F6";
                          
                          return (
                            <div
                              key={block.id}
                              className={cn(
                                "absolute left-0 right-[66%] rounded-md px-2 py-1 text-xs text-white overflow-hidden cursor-pointer transition-all duration-300",
                                timeState === 'past' && "opacity-60",
                                timeState === 'current' && "ring-2 ring-rose-500/50 shadow-lg"
                              )}
                              style={{
                                top: `${timeToPosition(block.startTime)}%`,
                                height: `${getBlockHeight(block.startTime, block.endTime)}%`,
                                background: timeState === 'current' 
                                  ? `linear-gradient(to right, ${baseColor} ${progress}%, ${baseColor}80 ${progress}%)`
                                  : baseColor,
                                minHeight: '24px',
                              }}
                              onClick={() => openBlockEditDialog(block as UnifiedTimelineBlock)}
                              data-testid={`block-${block.id}`}
                            >
                              <div className="flex items-center gap-1">
                                <Square className="h-3 w-3 fill-current" />
                                <span className="font-medium truncate">{block.title}</span>
                                {timeState === 'current' && (
                                  <div className="ml-auto text-[10px] font-bold bg-white/20 rounded px-1 animate-pulse">
                                    {100 - progress}% left
                                  </div>
                                )}
                              </div>
                              <span className="opacity-80">{formatTime(block.startTime)} - {formatTime(block.endTime)}</span>
                            </div>
                          );
                        })}
                        
                        {showTasks && unifiedTimeline?.timedTasks?.map((task) => {
                          if (!task.dueTime) return null;
                          const estimatedMinutes = task.estimatedTime || 30;
                          const [h, m] = task.dueTime.split(':').map(Number);
                          const endMinutes = h * 60 + m + estimatedMinutes;
                          const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
                          const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                          const isExpanded = expandedTimelineTasks.has(task.id);
                          const timeState = getEntryTimeState(task.dueTime, endTime);
                          const progress = getProgressPercentage(task.dueTime, endTime);
                          const isCompleted = task.status === 'done' || task.status === 'completed';
                          
                          return (
                            <div
                              key={`task-${task.id}`}
                              className={cn(
                                "absolute left-[34%] right-[34%] rounded-md px-2 py-1 text-xs overflow-visible border-l-4 cursor-pointer transition-all duration-300",
                                PRIORITY_BORDER_COLORS[task.priority] || "border-l-gray-400",
                                timeState === 'past' && !isCompleted && "opacity-60",
                                timeState === 'past' && isCompleted && "opacity-70 bg-emerald-100/30 dark:bg-emerald-900/30",
                                timeState === 'current' && "ring-2 ring-rose-500/50 shadow-lg",
                                timeState !== 'current' && "bg-gradient-to-r from-blue-100/40 to-transparent dark:from-blue-900/40"
                              )}
                              style={{
                                top: `${timeToPosition(task.dueTime)}%`,
                                height: `${getBlockHeight(task.dueTime, endTime)}%`,
                                minHeight: hasSubtasks && isExpanded ? `${24 + task.subtasks.length * 20}px` : '24px',
                                zIndex: isExpanded ? 20 : 10,
                                ...(timeState === 'current' ? {
                                  background: `linear-gradient(to right, rgba(244, 63, 94, 0.2) ${progress}%, rgba(59, 130, 246, 0.1) ${progress}%)`
                                } : {})
                              }}
                              onClick={() => openTaskDetailDialog(task)}
                              data-testid={`timeline-task-${task.id}`}
                            >
                              <div className="flex items-center gap-1">
                                {hasSubtasks && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleTimelineTaskExpand(task.id); }}
                                    className="p-0.5 -ml-0.5 hover-elevate rounded"
                                    data-testid={`expand-task-${task.id}`}
                                  >
                                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  </button>
                                )}
                                {timeState === 'past' && isCompleted ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <ListTodo className="h-3 w-3 text-blue-500" />
                                )}
                                <span className="font-medium truncate">{task.title}</span>
                                {timeState === 'current' && (
                                  <Badge variant="outline" className="ml-auto text-[9px] h-4 bg-rose-500/10 text-rose-600 border-rose-500/30 animate-pulse">
                                    {100 - progress}% left
                                  </Badge>
                                )}
                              </div>
                              <span className="text-muted-foreground">{formatTime(task.dueTime)}</span>
                              {hasSubtasks && isExpanded && (
                                <div className="mt-1 pl-3 space-y-0.5 bg-white/80 dark:bg-gray-900/80 rounded py-1" onClick={(e) => e.stopPropagation()}>
                                  {task.subtasks.map((st) => (
                                    <div
                                      key={st.id}
                                      className="flex items-center gap-1.5 text-[10px]"
                                      data-testid={`subtask-${st.id}`}
                                    >
                                      <button
                                        onClick={(e) => handleSubtaskToggle(e, st.id, st.isCompleted)}
                                        className="flex-shrink-0"
                                        data-testid={`checkbox-subtask-${st.id}`}
                                      >
                                        {st.isCompleted ? (
                                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        ) : (
                                          <Circle className="h-3 w-3 text-muted-foreground" />
                                        )}
                                      </button>
                                      <span className={cn("truncate", st.isCompleted && "line-through text-muted-foreground")}>
                                        {st.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {showHabits && unifiedTimeline?.timedHabits?.map((habitOcc) => {
                          if (!habitOcc.startTime || !habitOcc.endTime) return null;
                          const statusColors = WINDOW_STATUS_COLORS[habitOcc.windowStatus] || WINDOW_STATUS_COLORS.closed;
                          const hasSubHabits = habitOcc.habit?.subHabits && habitOcc.habit.subHabits.length > 0;
                          const isExpanded = expandedTimelineHabits.has(habitOcc.id);
                          const timeState = getEntryTimeState(habitOcc.startTime, habitOcc.endTime);
                          const progress = getProgressPercentage(habitOcc.startTime, habitOcc.endTime);
                          const isCompleted = habitOcc.status === "completed";
                          
                          return (
                            <div
                              key={`habit-${habitOcc.id}`}
                              className={cn(
                                "absolute left-[68%] right-0 rounded-md px-2 py-1 text-xs overflow-visible border-2 border-dashed cursor-pointer transition-all duration-300",
                                statusColors.border,
                                statusColors.bg,
                                timeState === 'past' && !isCompleted && "opacity-60",
                                timeState === 'past' && isCompleted && "opacity-70",
                                timeState === 'current' && !isCompleted && "ring-2 ring-rose-500/50 shadow-lg"
                              )}
                              style={{
                                top: `${timeToPosition(habitOcc.startTime)}%`,
                                height: `${getBlockHeight(habitOcc.startTime, habitOcc.endTime)}%`,
                                minHeight: hasSubHabits && isExpanded ? `${24 + habitOcc.habit.subHabits.length * 20}px` : '24px',
                                zIndex: isExpanded ? 20 : 10,
                                ...(timeState === 'current' && !isCompleted ? {
                                  background: `linear-gradient(to right, rgba(244, 63, 94, 0.15) ${progress}%, rgba(16, 185, 129, 0.1) ${progress}%)`
                                } : {})
                              }}
                              onClick={() => openHabitQuickComplete(habitOcc)}
                              data-testid={`timeline-habit-${habitOcc.id}`}
                            >
                              <div className="flex items-center gap-1">
                                {hasSubHabits && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleTimelineHabitExpand(habitOcc.id); }}
                                    className="p-0.5 -ml-0.5 hover-elevate rounded"
                                    data-testid={`expand-habit-${habitOcc.id}`}
                                  >
                                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  </button>
                                )}
                                <Repeat className={cn("h-3 w-3", statusColors.text)} />
                                <span className={cn("font-medium truncate", statusColors.text)}>
                                  {habitOcc.habit?.name}
                                </span>
                                {isCompleted ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                ) : timeState === 'current' && (
                                  <Badge variant="outline" className="ml-auto text-[9px] h-4 bg-rose-500/10 text-rose-600 border-rose-500/30 animate-pulse">
                                    {100 - progress}% left
                                  </Badge>
                                )}
                              </div>
                              <span className="text-muted-foreground">
                                {formatTime(habitOcc.startTime)} - {formatTime(habitOcc.endTime)}
                              </span>
                              {hasSubHabits && isExpanded && (
                                <div className="mt-1 pl-3 space-y-0.5 bg-white/80 dark:bg-gray-900/80 rounded py-1" onClick={(e) => e.stopPropagation()}>
                                  {habitOcc.habit.subHabits.map((sh) => (
                                    <div
                                      key={sh.id}
                                      className="flex items-center gap-1.5 text-[10px]"
                                      data-testid={`subhabit-${sh.id}`}
                                    >
                                      {sh.isCompleted ? (
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      ) : (
                                        <Circle className="h-3 w-3 text-muted-foreground" />
                                      )}
                                      <span className={cn("truncate", sh.isCompleted && "line-through text-muted-foreground")}>
                                        {sh.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {analysis?.gaps?.map((gap, i) => (
                          <div
                            key={i}
                            className="absolute left-0 right-0 rounded-md border-2 border-dashed border-emerald-500/50 bg-emerald-500/5 px-2 py-0.5 text-xs pointer-events-none"
                            style={{
                              top: `${timeToPosition(gap.startTime)}%`,
                              height: `${getBlockHeight(gap.startTime, gap.endTime)}%`,
                              minHeight: '16px',
                            }}
                            data-testid={`gap-${i}`}
                          >
                            <span className="text-emerald-600/60 dark:text-emerald-400/60 text-[10px]">{gap.durationMinutes}m</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-4 py-2 border-t" data-testid="timeline-legend">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-3 rounded-sm bg-blue-500" />
                        <span className="text-xs text-muted-foreground">Time Block</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-3 rounded-sm border-l-2 border-l-amber-500 bg-gradient-to-r from-blue-100/50 to-transparent dark:from-blue-900/50" />
                        <span className="text-xs text-muted-foreground">Task</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-3 rounded-sm border border-dashed border-emerald-500 bg-emerald-500/10" />
                        <span className="text-xs text-muted-foreground">Habit</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-x-auto">
                    <div className="min-w-[600px] h-full">
                      <div className="grid grid-cols-8 gap-1 mb-2">
                        <div className="w-12" />
                        {weekDays.map((day, i) => (
                          <div
                            key={i}
                            className={cn(
                              "text-center py-2 rounded-md text-sm font-medium",
                              isSameDay(day, new Date()) && "bg-primary/10 text-primary"
                            )}
                          >
                            <div className="text-xs">{format(day, "EEE")}</div>
                            <div className="text-lg">{format(day, "d")}</div>
                          </div>
                        ))}
                      </div>
                      <div className="relative border rounded-md overflow-hidden" style={{ height: "calc(100% - 60px)" }}>
                        <div className="absolute inset-0 grid grid-cols-8">
                          <div className="border-r">
                            {dynamicHours.map(hour => (
                              <div
                                key={hour}
                                className="h-[29px] border-b text-xs text-muted-foreground px-1 text-right"
                              >
                                {hour % 12 || 12}{hour >= 12 ? "p" : "a"}
                              </div>
                            ))}
                          </div>
                          {weekDays.map((day, dayIndex) => (
                            <div key={dayIndex} className="relative border-r last:border-r-0">
                              {dynamicHours.map(hour => (
                                <div key={hour} className="h-[29px] border-b border-dashed" />
                              ))}
                              {getBlocksForDay(day).map(block => (
                                <div
                                  key={block.id}
                                  className="absolute left-0.5 right-0.5 rounded px-1 text-xs text-white overflow-hidden"
                                  style={{
                                    top: `${timeToPosition(block.startTime)}%`,
                                    height: `${getBlockHeight(block.startTime, block.endTime)}%`,
                                    backgroundColor: block.color || "#3B82F6",
                                    minHeight: "16px",
                                  }}
                                >
                                  <span className="truncate block text-[10px]">{block.title}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Schedule Suggestions</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => generateSuggestionsMutation.mutate()}
                    disabled={generateSuggestionsMutation.isPending}
                    data-testid="button-generate"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    {generateSuggestionsMutation.isPending ? "..." : "Generate"}
                  </Button>
                </div>
                <Tabs value={suggestionFilter} onValueChange={(v) => setSuggestionFilter(v as SuggestionFilter)} className="mt-2">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="all" className="text-xs" data-testid="tab-all">All</TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs" data-testid="tab-pending">Pending</TabsTrigger>
                    <TabsTrigger value="accepted" className="text-xs" data-testid="tab-accepted">Done</TabsTrigger>
                    <TabsTrigger value="rejected" className="text-xs" data-testid="tab-rejected">Skip</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 pr-2">
                  {isLoadingSuggestions ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : filteredSuggestions.length === 0 ? (
                    <div className="text-center py-8">
                      <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {suggestionFilter === "all"
                          ? "No suggestions yet. Click Generate to create schedule suggestions based on your tasks."
                          : "No matching suggestions."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(suggestionsByDay).map(([dayKey, daySuggestions]) => (
                        <Collapsible
                          key={dayKey}
                          open={expandedDays.has(dayKey) || expandedDays.size === 0}
                          onOpenChange={() => toggleDayExpansion(dayKey)}
                        >
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover-elevate">
                            <span className="text-sm font-medium">
                              {format(parseISO(dayKey), "EEE, MMM d")}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">{daySuggestions.length}</Badge>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-1 space-y-1.5">
                            {daySuggestions.map(suggestion => (
                              <div
                                key={suggestion.id}
                                className="p-2.5 rounded-md border"
                                data-testid={`suggestion-${suggestion.id}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{getTaskTitle(suggestion)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatTime(suggestion.startTime)} - {formatTime(suggestion.endTime)}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={cn("text-xs shrink-0", STATUS_COLORS[suggestion.status])}
                                  >
                                    {suggestion.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {suggestion.confidenceScore}% match
                                  </Badge>
                                  {suggestion.status === "pending" && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-emerald-600"
                                        onClick={() => acceptSuggestionMutation.mutate(suggestion.id)}
                                        disabled={acceptSuggestionMutation.isPending}
                                        data-testid={`accept-${suggestion.id}`}
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-rose-600"
                                        onClick={() => rejectSuggestionMutation.mutate(suggestion.id)}
                                        disabled={rejectSuggestionMutation.isPending}
                                        data-testid={`reject-${suggestion.id}`}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {pendingSuggestions.length > 1 && suggestionFilter !== "accepted" && suggestionFilter !== "rejected" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-emerald-600"
                      onClick={acceptAllPending}
                      data-testid="accept-all"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-rose-600"
                      onClick={rejectAllPending}
                      data-testid="reject-all"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject All
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitTask} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formValues.title}
                onChange={(e) => setFormValues(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
                required
                data-testid="input-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (min)</label>
                <Input
                  type="number"
                  min={5}
                  step={5}
                  value={formValues.estimatedDuration}
                  onChange={(e) => setFormValues(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 30 }))}
                  data-testid="input-duration"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={formValues.priority}
                  onValueChange={(v) => setFormValues(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={formValues.frequencyType}
                  onValueChange={(v) => setFormValues(prev => ({ ...prev, frequencyType: v }))}
                >
                  <SelectTrigger data-testid="select-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Energy</label>
                <Select
                  value={formValues.energyLevel}
                  onValueChange={(v) => setFormValues(prev => ({ ...prev, energyLevel: v }))}
                >
                  <SelectTrigger data-testid="select-energy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred Start</label>
                <Input
                  type="time"
                  value={formValues.preferredTimeStart}
                  onChange={(e) => setFormValues(prev => ({ ...prev, preferredTimeStart: e.target.value }))}
                  data-testid="input-start-time"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred End</label>
                <Input
                  type="time"
                  value={formValues.preferredTimeEnd}
                  onChange={(e) => setFormValues(prev => ({ ...prev, preferredTimeEnd: e.target.value }))}
                  data-testid="input-end-time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={formValues.specificDays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                    data-testid={`day-${day.value}`}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Deadline (optional)</label>
              <Popover open={isDeadlineOpen} onOpenChange={setIsDeadlineOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formValues.deadline && "text-muted-foreground"
                    )}
                    data-testid="button-deadline"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formValues.deadline ? format(formValues.deadline, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formValues.deadline || undefined}
                    onSelect={(date) => {
                      setFormValues(prev => ({ ...prev, deadline: date || null }));
                      setIsDeadlineOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="recurring"
                checked={formValues.isRecurring}
                onCheckedChange={(checked) => setFormValues(prev => ({ ...prev, isRecurring: !!checked }))}
                data-testid="checkbox-recurring"
              />
              <label htmlFor="recurring" className="text-sm">Allow splitting across slots</label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                data-testid="button-submit"
              >
                {createTaskMutation.isPending || updateTaskMutation.isPending 
                  ? "Saving..." 
                  : editingTask ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Task</DialogTitle>
          </DialogHeader>
          {schedulingTask && (
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium text-sm">{schedulingTask.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Duration: {formatDuration(schedulingTask.estimatedDuration)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Popover open={isScheduleDateOpen} onOpenChange={setIsScheduleDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-schedule-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(scheduleForm.date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduleForm.date}
                      onSelect={(date) => {
                        if (date) {
                          setScheduleForm(prev => ({ ...prev, date }));
                        }
                        setIsScheduleDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) => handleScheduleTimeChange("startTime", e.target.value)}
                    data-testid="input-schedule-start"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <Input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) => handleScheduleTimeChange("endTime", e.target.value)}
                    data-testid="input-schedule-end"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={scheduleTaskMutation.isPending}
                  data-testid="button-confirm-schedule"
                >
                  {scheduleTaskMutation.isPending ? "Scheduling..." : "Schedule"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isTaskDetailDialogOpen} onOpenChange={setIsTaskDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-blue-500" />
              Task Details
            </DialogTitle>
          </DialogHeader>
          {selectedTimelineTask && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedTimelineTask.title}</h3>
                {selectedTimelineTask.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedTimelineTask.description}</p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[selectedTimelineTask.priority])}>
                  {selectedTimelineTask.priority} priority
                </Badge>
                {selectedTimelineTask.project?.name && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedTimelineTask.project.name}
                  </Badge>
                )}
              </div>

              {selectedTimelineTask.dueTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Due at {formatTime(selectedTimelineTask.dueTime)}
                </div>
              )}

              {selectedTimelineTask.subtasks && selectedTimelineTask.subtasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Subtasks ({selectedTimelineTask.subtasks.filter(s => s.isCompleted).length}/{selectedTimelineTask.subtasks.length})</h4>
                  <div className="space-y-1.5 pl-2">
                    {selectedTimelineTask.subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-2 text-sm"
                        data-testid={`dialog-subtask-${st.id}`}
                      >
                        <button
                          onClick={() => toggleSubtaskMutation.mutate({ subtaskId: st.id, isCompleted: st.isCompleted })}
                          className="flex-shrink-0"
                          data-testid={`dialog-checkbox-subtask-${st.id}`}
                        >
                          {st.isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        <span className={cn(st.isCompleted && "line-through text-muted-foreground")}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTaskDetailDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isHabitQuickCompleteOpen} onOpenChange={setIsHabitQuickCompleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-emerald-500" />
              Quick Complete
            </DialogTitle>
          </DialogHeader>
          {selectedTimelineHabit && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedTimelineHabit.habit?.name}</h3>
                {selectedTimelineHabit.habit?.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedTimelineHabit.habit.description}</p>
                )}
              </div>

              {selectedTimelineHabit.habit?.streakCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-md border border-amber-500/20">
                  <Flame className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">{selectedTimelineHabit.habit.streakCount} day streak!</span>
                </div>
              )}

              {selectedTimelineHabit.startTime && selectedTimelineHabit.endTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatTime(selectedTimelineHabit.startTime)} - {formatTime(selectedTimelineHabit.endTime)}
                </div>
              )}

              <div className={cn(
                "flex items-center gap-2 text-sm rounded-md p-2",
                WINDOW_STATUS_COLORS[selectedTimelineHabit.windowStatus]?.bg,
                WINDOW_STATUS_COLORS[selectedTimelineHabit.windowStatus]?.border,
                "border"
              )}>
                <span className={WINDOW_STATUS_COLORS[selectedTimelineHabit.windowStatus]?.text}>
                  Status: {selectedTimelineHabit.windowStatus}
                </span>
              </div>

              {selectedTimelineHabit.habit?.subHabits && selectedTimelineHabit.habit.subHabits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Sub-habits</h4>
                  <div className="space-y-1.5 pl-2">
                    {selectedTimelineHabit.habit.subHabits.map((sh) => (
                      <div
                        key={sh.id}
                        className="flex items-center gap-2 text-sm"
                        data-testid={`dialog-subhabit-${sh.id}`}
                      >
                        {sh.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={cn(sh.isCompleted && "line-through text-muted-foreground")}>
                          {sh.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsHabitQuickCompleteOpen(false)}>
                  Cancel
                </Button>
                {selectedTimelineHabit.status !== "completed" && (
                  <Button 
                    onClick={() => completeHabitMutation.mutate(selectedTimelineHabit.id)}
                    disabled={completeHabitMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    data-testid="button-complete-habit"
                  >
                    {completeHabitMutation.isPending ? "Completing..." : "Mark Complete"}
                  </Button>
                )}
                {selectedTimelineHabit.status === "completed" && (
                  <Badge variant="secondary" className="py-2 px-4">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Completed
                  </Badge>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isBlockEditDialogOpen} onOpenChange={setIsBlockEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="h-5 w-5" style={{ color: selectedTimeBlock?.color || "#3B82F6" }} />
              Edit Time Block
            </DialogTitle>
          </DialogHeader>
          {selectedTimeBlock && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={selectedTimeBlock.title}
                  onChange={(e) => setSelectedTimeBlock({ ...selectedTimeBlock, title: e.target.value })}
                  data-testid="input-block-title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Input
                    type="time"
                    value={selectedTimeBlock.startTime}
                    onChange={(e) => setSelectedTimeBlock({ ...selectedTimeBlock, startTime: e.target.value })}
                    data-testid="input-block-start"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <Input
                    type="time"
                    value={selectedTimeBlock.endTime}
                    onChange={(e) => setSelectedTimeBlock({ ...selectedTimeBlock, endTime: e.target.value })}
                    data-testid="input-block-end"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6366F1"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedTimeBlock({ ...selectedTimeBlock, color })}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        selectedTimeBlock.color === color ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      data-testid={`color-${color}`}
                    />
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBlockEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => updateTimeBlockMutation.mutate({ 
                    id: selectedTimeBlock.id, 
                    data: { 
                      title: selectedTimeBlock.title,
                      startTime: selectedTimeBlock.startTime,
                      endTime: selectedTimeBlock.endTime,
                      color: selectedTimeBlock.color
                    }
                  })}
                  disabled={updateTimeBlockMutation.isPending}
                  data-testid="button-save-block"
                >
                  {updateTimeBlockMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
