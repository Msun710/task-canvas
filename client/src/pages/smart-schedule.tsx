import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  Sparkles, 
  Plus, 
  Settings, 
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
  SlidersHorizontal,
  RefreshCw
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, addDays, isSameDay, parseISO } from "date-fns";
import type { FlexibleTask, ScheduleSuggestion, TimeBlock, UserAvailability, SchedulingPreferences } from "@shared/schema";

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

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

const ENERGY_COLORS: Record<string, string> = {
  low: "bg-blue-500/30 border-blue-500/50",
  medium: "bg-amber-500/30 border-amber-500/50",
  high: "bg-emerald-500/30 border-emerald-500/50",
};

const ENERGY_LEGEND = [
  { level: "low", label: "Low Energy", color: "bg-blue-500/30" },
  { level: "medium", label: "Medium Energy", color: "bg-amber-500/30" },
  { level: "high", label: "High Energy", color: "bg-emerald-500/30" },
];

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
  if (minutes < 60) return `${minutes} min`;
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

export default function SmartSchedulePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FlexibleTask | null>(null);
  const [formValues, setFormValues] = useState<FlexibleTaskForm>(defaultFormValues);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [autoRefreshSuggestions, setAutoRefreshSuggestions] = useState(false);
  const [selectedEnergyLevel, setSelectedEnergyLevel] = useState<string>("medium");
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [schedulingTask, setSchedulingTask] = useState<FlexibleTask | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    date: new Date(),
    startTime: "09:00",
    endTime: "10:00",
  });
  const [isScheduleDateOpen, setIsScheduleDateOpen] = useState(false);
  const [preferencesForm, setPreferencesForm] = useState({
    preferMorning: false,
    preferAfternoon: false,
    preferEvening: false,
    minBreakBetweenTasks: 5,
    maxTasksPerDay: 10,
    bufferBeforeMeetings: 5,
    bufferAfterMeetings: 5,
  });
  const { toast } = useToast();

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const { data: flexibleTasks = [], isLoading: isLoadingTasks } = useQuery<FlexibleTask[]>({
    queryKey: ["/api/flexible-tasks"],
  });

  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useQuery<ScheduleSuggestion[]>({
    queryKey: ["/api/schedule-suggestions"],
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

  const { data: userAvailability = [], isLoading: isLoadingAvailability } = useQuery<UserAvailability[]>({
    queryKey: ["/api/user-availability"],
  });

  const { data: schedulingPreferences, isLoading: isLoadingPreferences } = useQuery<SchedulingPreferences>({
    queryKey: ["/api/scheduling-preferences"],
  });

  useEffect(() => {
    if (schedulingPreferences) {
      setPreferencesForm({
        preferMorning: schedulingPreferences.preferMorning ?? false,
        preferAfternoon: schedulingPreferences.preferAfternoon ?? false,
        preferEvening: schedulingPreferences.preferEvening ?? false,
        minBreakBetweenTasks: schedulingPreferences.minBreakBetweenTasks ?? 5,
        maxTasksPerDay: schedulingPreferences.maxTasksPerDay ?? 10,
        bufferBeforeMeetings: schedulingPreferences.bufferBeforeMeetings ?? 5,
        bufferAfterMeetings: schedulingPreferences.bufferAfterMeetings ?? 5,
      });
    }
  }, [schedulingPreferences]);

  const createTaskMutation = useMutation({
    mutationFn: (data: Partial<FlexibleTask>) => 
      apiRequest("POST", "/api/flexible-tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flexible-tasks"] });
      setIsTaskDialogOpen(false);
      setFormValues(defaultFormValues);
      toast({ title: "Flexible task created" });
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

  const addAvailabilityMutation = useMutation({
    mutationFn: (data: { dayOfWeek: number; startTime: string; endTime: string; energyLevel: string }) =>
      apiRequest("POST", "/api/user-availability", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-availability"] });
      toast({ title: "Availability added" });
    },
    onError: () => {
      toast({ title: "Failed to add availability", variant: "destructive" });
    },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/user-availability/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-availability"] });
      toast({ title: "Availability removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove availability", variant: "destructive" });
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserAvailability> }) =>
      apiRequest("PATCH", `/api/user-availability/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-availability"] });
      toast({ title: "Availability updated" });
    },
    onError: () => {
      toast({ title: "Failed to update availability", variant: "destructive" });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (data: typeof preferencesForm) =>
      apiRequest("PUT", "/api/scheduling-preferences", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling-preferences"] });
      setIsPreferencesModalOpen(false);
      toast({ title: "Preferences saved" });
    },
    onError: () => {
      toast({ title: "Failed to save preferences", variant: "destructive" });
    },
  });

  const scheduleTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { date: string; startTime: string; endTime: string } }) =>
      apiRequest("POST", `/api/flexible-tasks/${id}/schedule`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flexible-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      setIsScheduleDialogOpen(false);
      setSchedulingTask(null);
      toast({ title: "Task scheduled", description: "The task has been added to your calendar." });
    },
    onError: () => {
      toast({ title: "Failed to schedule task", variant: "destructive" });
    },
  });

  const openScheduleDialog = (task: FlexibleTask) => {
    const defaultStart = task.preferredTimeStart || "09:00";
    const durationMinutes = task.estimatedDuration || 30;
    const [startHours, startMins] = defaultStart.split(':').map(Number);
    const totalMins = startHours * 60 + startMins + durationMinutes;
    const endHours = Math.floor(totalMins / 60) % 24;
    const endMins = totalMins % 60;
    const defaultEnd = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    
    setSchedulingTask(task);
    setScheduleForm({
      date: new Date(),
      startTime: defaultStart,
      endTime: defaultEnd,
    });
    setIsScheduleDialogOpen(true);
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

  const toggleDay = (day: number) => {
    setFormValues(prev => ({
      ...prev,
      specificDays: prev.specificDays.includes(day)
        ? prev.specificDays.filter(d => d !== day)
        : [...prev.specificDays, day],
    }));
  };

  const filteredSuggestions = suggestions.filter(s => {
    if (suggestionFilter === "all") return true;
    return s.status === suggestionFilter;
  });

  const getBlocksForDay = (day: Date) => {
    return timeBlocks.filter(block => {
      if (!block.date) return false;
      const blockDate = typeof block.date === "string" ? parseISO(block.date) : new Date(block.date);
      return isSameDay(blockDate, day);
    });
  };

  const getSuggestionsForDay = (day: Date) => {
    return suggestions.filter(s => {
      if (s.status !== "pending") return false;
      const suggestedDate = typeof s.suggestedDate === "string" ? parseISO(s.suggestedDate) : new Date(s.suggestedDate);
      return isSameDay(suggestedDate, day);
    });
  };

  const timeToPosition = (timeStr: string) => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = (hours * 60 + mins) - (6 * 60);
    const totalRange = 16 * 60;
    return Math.max(0, Math.min(100, (totalMinutes / totalRange) * 100));
  };

  const getBlockHeight = (startTime: string, endTime: string) => {
    const startPos = timeToPosition(startTime);
    const endPos = timeToPosition(endTime);
    return Math.max(endPos - startPos, 3);
  };

  const getTaskTitle = (suggestion: ScheduleSuggestion) => {
    const task = flexibleTasks.find(t => t.id === suggestion.flexibleTaskId);
    return task?.title || "Unknown Task";
  };

  const getAvailabilityForCell = (dayOfWeek: number, hour: number) => {
    const hourStr = `${hour.toString().padStart(2, '0')}:00`;
    return userAvailability.find(a => {
      if (a.dayOfWeek !== dayOfWeek) return false;
      const startHour = parseInt(a.startTime.split(':')[0]);
      const endHour = parseInt(a.endTime.split(':')[0]);
      return hour >= startHour && hour < endHour;
    });
  };

  const handleCellClick = (dayOfWeek: number, hour: number) => {
    const existing = getAvailabilityForCell(dayOfWeek, hour);
    if (existing) {
      deleteAvailabilityMutation.mutate(existing.id);
    } else {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      addAvailabilityMutation.mutate({
        dayOfWeek,
        startTime,
        endTime,
        energyLevel: selectedEnergyLevel,
      });
    }
  };

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate(preferencesForm);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Sparkles className="h-6 w-6 text-primary" />
            Smart Schedule
          </h1>
          <p className="text-muted-foreground">
            Auto-schedule flexible tasks based on your availability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => generateSuggestionsMutation.mutate()}
            disabled={generateSuggestionsMutation.isPending}
            data-testid="button-generate-suggestions"
          >
            <Zap className="h-4 w-4 mr-2" />
            {generateSuggestionsMutation.isPending ? "Generating..." : "Generate Suggestions"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-settings">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => setIsAvailabilityModalOpen(true)}
                data-testid="menuitem-manage-availability"
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Manage Availability
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsPreferencesModalOpen(true)}
                data-testid="menuitem-scheduling-preferences"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Scheduling Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm">Auto-Refresh</span>
                </div>
                <Switch
                  checked={autoRefreshSuggestions}
                  onCheckedChange={setAutoRefreshSuggestions}
                  data-testid="switch-auto-refresh"
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Tasks to Schedule</CardTitle>
                <Button size="sm" onClick={openCreateDialog} data-testid="button-add-flexible-task">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoadingTasks ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : flexibleTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No flexible tasks yet. Add one to get started.
                </p>
              ) : (
                flexibleTasks.filter(t => t.isActive).map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "group p-3 rounded-md border hover-elevate",
                      task.status === "scheduled" && "opacity-60"
                    )}
                    data-testid={`flexible-task-${task.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                          {task.status === "scheduled" && (
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            >
                              <CalendarDays className="h-3 w-3 mr-1" />
                              Scheduled
                            </Badge>
                          )}
                        </div>
                        {task.deadline && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {format(new Date(task.deadline), "MMM d")}
                          </p>
                        )}
                        {task.status === "scheduled" && task.scheduledDate && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                            {format(new Date(task.scheduledDate), "MMM d")} at {formatTime(task.scheduledStartTime || "00:00")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 invisible group-hover:visible">
                        {task.status !== "scheduled" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary"
                            onClick={() => openScheduleDialog(task)}
                            data-testid={`button-schedule-task-${task.id}`}
                          >
                            <CalendarIcon className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(task)}
                          data-testid={`button-edit-task-${task.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          data-testid={`button-delete-task-${task.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-6">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Weekly Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekStart(addWeeks(weekStart, -1))}
                    data-testid="button-prev-week"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[180px] text-center">
                    {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                    data-testid="button-next-week"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
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
                        <div>{format(day, "EEE")}</div>
                        <div className="text-lg">{format(day, "d")}</div>
                      </div>
                    ))}
                  </div>
                  <div className="relative border rounded-md overflow-hidden" style={{ height: "500px" }}>
                    <div className="absolute inset-0 grid grid-cols-8">
                      <div className="border-r">
                        {HOURS.map(hour => (
                          <div
                            key={hour}
                            className="h-[29.4px] border-b text-xs text-muted-foreground pr-1 text-right"
                          >
                            {hour % 12 || 12}{hour >= 12 ? "PM" : "AM"}
                          </div>
                        ))}
                      </div>
                      {weekDays.map((day, dayIndex) => (
                        <div key={dayIndex} className="relative border-r">
                          {HOURS.map(hour => (
                            <div key={hour} className="h-[29.4px] border-b border-dashed" />
                          ))}
                          {getBlocksForDay(day).map(block => (
                            <div
                              key={block.id}
                              className="absolute left-1 right-1 rounded px-1 text-xs text-white overflow-hidden"
                              style={{
                                top: `${timeToPosition(block.startTime)}%`,
                                height: `${getBlockHeight(block.startTime, block.endTime)}%`,
                                backgroundColor: block.color || "#3B82F6",
                                minHeight: "18px",
                              }}
                              data-testid={`time-block-${block.id}`}
                            >
                              <span className="truncate block">{block.title}</span>
                            </div>
                          ))}
                          {getSuggestionsForDay(day).map(suggestion => (
                            <div
                              key={suggestion.id}
                              className="absolute left-1 right-1 rounded px-1 text-xs overflow-hidden border-2 border-dashed border-primary bg-primary/10 cursor-pointer hover-elevate"
                              style={{
                                top: `${timeToPosition(suggestion.startTime)}%`,
                                height: `${getBlockHeight(suggestion.startTime, suggestion.endTime)}%`,
                                minHeight: "18px",
                              }}
                              onClick={() => {
                                const confirmed = window.confirm(`Accept "${getTaskTitle(suggestion)}" at ${formatTime(suggestion.startTime)}?`);
                                if (confirmed) {
                                  acceptSuggestionMutation.mutate(suggestion.id);
                                }
                              }}
                              data-testid={`suggestion-block-${suggestion.id}`}
                            >
                              <span className="truncate block text-primary font-medium">
                                {getTaskTitle(suggestion)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Schedule Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Tabs value={suggestionFilter} onValueChange={(v) => setSuggestionFilter(v as typeof suggestionFilter)}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                  <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
                  <TabsTrigger value="accepted" data-testid="tab-accepted">Done</TabsTrigger>
                  <TabsTrigger value="rejected" data-testid="tab-rejected">Reject</TabsTrigger>
                </TabsList>
              </Tabs>

              {isLoadingSuggestions ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredSuggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No suggestions yet. Click "Generate Suggestions" to get started.
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredSuggestions.map(suggestion => {
                    const taskTitle = getTaskTitle(suggestion);
                    const suggestedDate = typeof suggestion.suggestedDate === "string" 
                      ? parseISO(suggestion.suggestedDate) 
                      : new Date(suggestion.suggestedDate);
                    
                    return (
                      <div
                        key={suggestion.id}
                        className="p-3 rounded-md border space-y-2"
                        data-testid={`suggestion-${suggestion.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm truncate">{taskTitle}</p>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs shrink-0", STATUS_COLORS[suggestion.status])}
                          >
                            {suggestion.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>{format(suggestedDate, "EEE, MMM d")}</p>
                          <p>{formatTime(suggestion.startTime)} - {formatTime(suggestion.endTime)}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.confidenceScore} pts
                          </Badge>
                          {suggestion.status === "pending" && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600"
                                onClick={() => acceptSuggestionMutation.mutate(suggestion.id)}
                                disabled={acceptSuggestionMutation.isPending}
                                data-testid={`button-accept-${suggestion.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-600"
                                onClick={() => rejectSuggestionMutation.mutate(suggestion.id)}
                                disabled={rejectSuggestionMutation.isPending}
                                data-testid={`button-reject-${suggestion.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {suggestion.reasoning && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {suggestion.reasoning}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Flexible Task" : "Add Flexible Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitTask} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formValues.title}
                onChange={(e) => setFormValues(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
                required
                data-testid="input-task-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (minutes)</label>
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
                <label className="text-sm font-medium">Energy Level</label>
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
                  data-testid="input-time-start"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred End</label>
                <Input
                  type="time"
                  value={formValues.preferredTimeEnd}
                  onChange={(e) => setFormValues(prev => ({ ...prev, preferredTimeEnd: e.target.value }))}
                  data-testid="input-time-end"
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
                    data-testid={`button-day-${day.value}`}
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
              <label htmlFor="recurring" className="text-sm">Allow splitting across multiple slots</label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                data-testid="button-submit-task"
              >
                {createTaskMutation.isPending || updateTaskMutation.isPending 
                  ? "Saving..." 
                  : editingTask ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAvailabilityModalOpen} onOpenChange={setIsAvailabilityModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Availability</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium">Energy Level:</span>
                <div className="flex gap-2">
                  {ENERGY_LEGEND.map(item => (
                    <Button
                      key={item.level}
                      type="button"
                      variant={selectedEnergyLevel === item.level ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedEnergyLevel(item.level)}
                      data-testid={`button-energy-${item.level}`}
                    >
                      <div className={cn("w-3 h-3 rounded-full mr-2", item.color)} />
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {ENERGY_LEGEND.map(item => (
                  <div key={item.level} className="flex items-center gap-1">
                    <div className={cn("w-3 h-3 rounded border", item.color)} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="grid" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
                <div className="bg-muted p-2 text-center text-xs font-medium border-b border-r">
                  Time
                </div>
                {DAYS_OF_WEEK.map(day => (
                  <div
                    key={day.value}
                    className="bg-muted p-2 text-center text-xs font-medium border-b border-r last:border-r-0"
                  >
                    {day.label}
                  </div>
                ))}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="grid"
                    style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
                  >
                    <div className="p-2 text-center text-xs border-b border-r text-muted-foreground">
                      {hour % 12 || 12}{hour >= 12 ? "PM" : "AM"}
                    </div>
                    {DAYS_OF_WEEK.map(day => {
                      const availability = getAvailabilityForCell(day.value, hour);
                      return (
                        <div
                          key={`${day.value}-${hour}`}
                          className={cn(
                            "p-2 border-b border-r last:border-r-0 cursor-pointer transition-colors min-h-[32px]",
                            availability
                              ? cn("border", ENERGY_COLORS[availability.energyLevel || "medium"])
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => handleCellClick(day.value, hour)}
                          data-testid={`availability-cell-${day.value}-${hour}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Click on cells to toggle availability. Select an energy level first to set the energy for new slots.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAvailabilityModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreferencesModalOpen} onOpenChange={setIsPreferencesModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scheduling Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Time Preferences</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prefer-morning" className="text-sm">
                    Prefer morning slots for new tasks
                  </Label>
                  <Checkbox
                    id="prefer-morning"
                    checked={preferencesForm.preferMorning}
                    onCheckedChange={(checked) =>
                      setPreferencesForm(prev => ({ ...prev, preferMorning: !!checked }))
                    }
                    data-testid="checkbox-prefer-morning"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="prefer-afternoon" className="text-sm">
                    Prefer afternoon slots
                  </Label>
                  <Checkbox
                    id="prefer-afternoon"
                    checked={preferencesForm.preferAfternoon}
                    onCheckedChange={(checked) =>
                      setPreferencesForm(prev => ({ ...prev, preferAfternoon: !!checked }))
                    }
                    data-testid="checkbox-prefer-afternoon"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="prefer-evening" className="text-sm">
                    Prefer evening slots
                  </Label>
                  <Checkbox
                    id="prefer-evening"
                    checked={preferencesForm.preferEvening}
                    onCheckedChange={(checked) =>
                      setPreferencesForm(prev => ({ ...prev, preferEvening: !!checked }))
                    }
                    data-testid="checkbox-prefer-evening"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Task Limits</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-break" className="text-sm">
                    Minimum break (minutes)
                  </Label>
                  <Input
                    id="min-break"
                    type="number"
                    min={0}
                    value={preferencesForm.minBreakBetweenTasks}
                    onChange={(e) =>
                      setPreferencesForm(prev => ({
                        ...prev,
                        minBreakBetweenTasks: parseInt(e.target.value) || 0,
                      }))
                    }
                    data-testid="input-min-break"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-tasks" className="text-sm">
                    Maximum tasks per day
                  </Label>
                  <Input
                    id="max-tasks"
                    type="number"
                    min={1}
                    value={preferencesForm.maxTasksPerDay}
                    onChange={(e) =>
                      setPreferencesForm(prev => ({
                        ...prev,
                        maxTasksPerDay: parseInt(e.target.value) || 1,
                      }))
                    }
                    data-testid="input-max-tasks"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Buffer Times</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buffer-before" className="text-sm">
                    Buffer before tasks (minutes)
                  </Label>
                  <Input
                    id="buffer-before"
                    type="number"
                    min={0}
                    value={preferencesForm.bufferBeforeMeetings}
                    onChange={(e) =>
                      setPreferencesForm(prev => ({
                        ...prev,
                        bufferBeforeMeetings: parseInt(e.target.value) || 0,
                      }))
                    }
                    data-testid="input-buffer-before"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buffer-after" className="text-sm">
                    Buffer after tasks (minutes)
                  </Label>
                  <Input
                    id="buffer-after"
                    type="number"
                    min={0}
                    value={preferencesForm.bufferAfterMeetings}
                    onChange={(e) =>
                      setPreferencesForm(prev => ({
                        ...prev,
                        bufferAfterMeetings: parseInt(e.target.value) || 0,
                      }))
                    }
                    data-testid="input-buffer-after"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreferencesModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePreferences}
              disabled={updatePreferencesMutation.isPending}
              data-testid="button-save-preferences"
            >
              {updatePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </DialogFooter>
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
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduleForm.date && "text-muted-foreground"
                      )}
                      data-testid="button-schedule-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleForm.date ? format(scheduleForm.date, "PPP") : "Pick a date"}
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
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                    data-testid="input-schedule-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <Input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                    data-testid="input-schedule-end-time"
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
    </div>
  );
}
