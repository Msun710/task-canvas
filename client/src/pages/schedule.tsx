import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ScheduleSkeleton } from "@/components/ui/skeleton-loaders";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Plus, Settings, Trash2, ChevronLeft, ChevronRight, Target, Flame, CheckSquare } from "lucide-react";
import type { ScheduleAnalysis, TimeBlock, Task, Habit, ScheduleSettings } from "@shared/schema";

const BLOCK_TYPES = [
  { value: "blocked", label: "Blocked Time", color: "#9CA3AF" },
  { value: "meal", label: "Meal", color: "#F59E0B" },
  { value: "meeting", label: "Meeting", color: "#3B82F6" },
  { value: "break", label: "Break", color: "#10B981" },
  { value: "personal", label: "Personal", color: "#8B5CF6" },
];

const DAYS_OF_WEEK = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    workStartTime: "08:00",
    workEndTime: "22:00",
    minTaskDuration: 15,
    maxTaskDuration: 120,
    breakDuration: 10,
    breakFrequency: 90,
    preferMorningTasks: false,
    workDays: ["monday", "tuesday", "wednesday", "thursday", "friday"] as string[],
  });
  const [newBlock, setNewBlock] = useState({
    title: "",
    startTime: "09:00",
    endTime: "10:00",
    blockType: "blocked",
    isRecurring: false,
    recurrenceDays: [] as string[],
    color: "#9CA3AF",
  });
  const [scheduleTaskModal, setScheduleTaskModal] = useState<{ open: boolean; task: Task | null; startTime: string; endTime: string }>({
    open: false,
    task: null,
    startTime: "09:00",
    endTime: "10:00",
  });
  const { toast } = useToast();

  const dateStr = selectedDate.toISOString().split('T')[0];

  const { data: analysis, isLoading } = useQuery<ScheduleAnalysis>({
    queryKey: ["/api/schedule/analyze", dateStr],
    queryFn: () => fetch(`/api/schedule/analyze?date=${dateStr}`).then(r => r.json()),
  });

  const { data: blocks = [] } = useQuery<TimeBlock[]>({
    queryKey: ["/api/schedule/blocks"],
  });

  const { data: settings } = useQuery<ScheduleSettings>({
    queryKey: ["/api/schedule/settings"],
  });

  const { data: allHabits = [] } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const createBlockMutation = useMutation({
    mutationFn: (data: typeof newBlock) => apiRequest("POST", "/api/schedule/blocks", {
      ...data,
      date: data.isRecurring ? null : selectedDate.toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/analyze"] });
      setIsBlockModalOpen(false);
      setNewBlock({ title: "", startTime: "09:00", endTime: "10:00", blockType: "blocked", isRecurring: false, recurrenceDays: [], color: "#9CA3AF" });
      toast({ title: "Time block created" });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/schedule/blocks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/analyze"] });
      toast({ title: "Time block deleted" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: typeof settingsForm) => apiRequest("PUT", "/api/schedule/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/analyze"] });
      setIsSettingsOpen(false);
      toast({ title: "Settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const scheduleTaskMutation = useMutation({
    mutationFn: (data: { title: string; startTime: string; endTime: string; taskId: string }) => 
      apiRequest("POST", "/api/schedule/blocks", {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        blockType: "task",
        color: "#3B82F6",
        isRecurring: false,
        taskId: data.taskId,
        date: selectedDate.toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/analyze"] });
      setScheduleTaskModal({ open: false, task: null, startTime: "09:00", endTime: "10:00" });
      toast({ title: "Task scheduled" });
    },
    onError: () => {
      toast({ title: "Failed to schedule task", variant: "destructive" });
    },
  });

  const openScheduleTask = (task: Task) => {
    const estimatedMinutes = task.estimatedTime || 30;
    const firstGap = analysis?.gaps?.[0];
    let startTime = "09:00";
    let endTime = "10:00";
    
    if (firstGap) {
      startTime = firstGap.startTime;
      const startParts = startTime.split(':').map(Number);
      const endMinutes = startParts[0] * 60 + startParts[1] + Math.min(estimatedMinutes, firstGap.durationMinutes);
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
    }
    
    setScheduleTaskModal({ open: true, task, startTime, endTime });
  };

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        workStartTime: settings.workStartTime || "08:00",
        workEndTime: settings.workEndTime || "22:00",
        minTaskDuration: settings.minTaskDuration || 15,
        maxTaskDuration: settings.maxTaskDuration || 120,
        breakDuration: settings.breakDuration || 10,
        breakFrequency: settings.breakFrequency || 90,
        preferMorningTasks: settings.preferMorningTasks || false,
        workDays: settings.workDays || ["monday", "tuesday", "wednesday", "thursday", "friday"],
      });
    }
  }, [settings]);

  const toggleWorkDay = (day: string) => {
    const days = settingsForm.workDays.includes(day)
      ? settingsForm.workDays.filter(d => d !== day)
      : [...settingsForm.workDays, day];
    setSettingsForm({ ...settingsForm, workDays: days });
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatTime = (timeStr: string) => {
    const [hours, mins] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${mins} ${ampm}`;
  };

  const timeToPosition = (timeStr: string) => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const startHour = settings?.workStartTime ? parseInt(settings.workStartTime.split(':')[0]) : 8;
    const endHour = settings?.workEndTime ? parseInt(settings.workEndTime.split(':')[0]) : 22;
    const totalMinutes = (hours * 60 + mins) - (startHour * 60);
    const totalRange = (endHour - startHour) * 60;
    return Math.max(0, Math.min(100, (totalMinutes / totalRange) * 100));
  };

  const getBlockHeight = (startTime: string, endTime: string) => {
    const startPos = timeToPosition(startTime);
    const endPos = timeToPosition(endTime);
    return endPos - startPos;
  };

  const getBlockTypeColor = (type: string) => {
    return BLOCK_TYPES.find(t => t.value === type)?.color || "#9CA3AF";
  };

  const toggleRecurrenceDay = (day: string) => {
    const days = newBlock.recurrenceDays.includes(day)
      ? newBlock.recurrenceDays.filter(d => d !== day)
      : [...newBlock.recurrenceDays, day];
    setNewBlock({ ...newBlock, recurrenceDays: days });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <ScheduleSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Schedule Planner</h1>
          <p className="text-muted-foreground">Manage your time blocks and find available slots.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)} data-testid="button-settings">
            <Settings className="h-4 w-4" />
          </Button>
          <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-block">
                <Plus className="h-4 w-4 mr-2" />
                Add Block
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Time Block</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  createBlockMutation.mutate(newBlock);
                }}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newBlock.title}
                    onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
                    placeholder="e.g., Lunch break"
                    required
                    data-testid="input-block-title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Time</label>
                    <Input
                      type="time"
                      value={newBlock.startTime}
                      onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                      data-testid="input-block-start"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Time</label>
                    <Input
                      type="time"
                      value={newBlock.endTime}
                      onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                      data-testid="input-block-end"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={newBlock.blockType}
                    onValueChange={(v) => setNewBlock({ ...newBlock, blockType: v, color: getBlockTypeColor(v) })}
                  >
                    <SelectTrigger data-testid="select-block-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCK_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Recurring</label>
                  <Switch
                    checked={newBlock.isRecurring}
                    onCheckedChange={(checked) => setNewBlock({ ...newBlock, isRecurring: checked })}
                    data-testid="switch-recurring"
                  />
                </div>
                {newBlock.isRecurring && (
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={newBlock.recurrenceDays.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleRecurrenceDay(day.value)}
                        data-testid={`button-day-${day.value}`}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsBlockModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createBlockMutation.isPending} data-testid="button-submit-block">
                    {createBlockMutation.isPending ? "Adding..." : "Add Block"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} data-testid="button-prev-day">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-lg font-semibold" data-testid="text-selected-date">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {selectedDate.toDateString() === new Date().toDateString() && (
            <Badge variant="secondary">Today</Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => changeDate(1)} data-testid="button-next-day">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Total Work Time</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-work">
              {Math.round((analysis?.totalWorkMinutes || 0) / 60)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Scheduled</span>
            </div>
            <p className="text-2xl font-bold text-blue-500" data-testid="text-scheduled">
              {Math.round((analysis?.scheduledMinutes || 0) / 60)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-sm">Available</span>
            </div>
            <p className="text-2xl font-bold text-green-500" data-testid="text-available">
              {Math.round((analysis?.availableMinutes || 0) / 60)}h {(analysis?.availableMinutes || 0) % 60}m
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Time Gaps</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-gaps-count">
              {analysis?.gaps?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="relative h-[36rem] border rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex flex-col">
                  {Array.from({ length: 15 }, (_, i) => {
                    const startHour = settings?.workStartTime ? parseInt(settings.workStartTime.split(':')[0]) : 8;
                    const hour = startHour + i;
                    if (hour > 22) return null;
                    return (
                      <div key={i} className="flex-1 border-b border-dashed border-muted flex items-start">
                        <span className="text-xs text-muted-foreground px-1 py-1 shrink-0 w-12">
                          {formatTime(`${hour.toString().padStart(2, '0')}:00`)}
                        </span>
                        <div className="flex-1" />
                      </div>
                    );
                  })}
                </div>
                <div className="absolute left-12 right-2 top-0 bottom-0">
                  {analysis?.timeBlocks?.map((block) => (
                    <div
                      key={block.id}
                      className="absolute left-0 right-0 rounded-md px-2 py-1 text-xs text-white overflow-hidden group"
                      style={{
                        top: `${timeToPosition(block.startTime)}%`,
                        height: `${getBlockHeight(block.startTime, block.endTime)}%`,
                        backgroundColor: block.color || getBlockTypeColor(block.blockType),
                        minHeight: '24px',
                      }}
                      data-testid={`block-${block.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{block.title}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteBlockMutation.mutate(block.id)}
                          data-testid={`button-delete-block-${block.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="opacity-80">{formatTime(block.startTime)} - {formatTime(block.endTime)}</span>
                    </div>
                  ))}
                  {analysis?.gaps?.map((gap, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 rounded-md border-2 border-dashed border-green-500 bg-green-500/10 px-2 py-1 text-xs"
                      style={{
                        top: `${timeToPosition(gap.startTime)}%`,
                        height: `${getBlockHeight(gap.startTime, gap.endTime)}%`,
                        minHeight: '20px',
                      }}
                      data-testid={`gap-${i}`}
                    >
                      <span className="text-green-600 font-medium">{gap.durationMinutes}m</span>
                    </div>
                  ))}
                  {allHabits.filter(h => {
                    if (!h.timeWindowEnabled || !h.startTime || !h.endTime || h.isArchived) return false;
                    const dayIndex = selectedDate.getDay();
                    const dayMap: { [key: number]: number } = { 0: 7, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
                    if (h.requiredDays && h.requiredDays.length > 0) {
                      return h.requiredDays.includes(dayMap[dayIndex]);
                    }
                    return h.recurrence === 'daily' || h.recurrence === 'weekly';
                  }).map((habit) => (
                    <div
                      key={habit.id}
                      className="absolute left-0 right-0 rounded-md px-2 py-1 text-xs overflow-hidden border-2 border-dashed"
                      style={{
                        top: `${timeToPosition(habit.startTime!)}%`,
                        height: `${getBlockHeight(habit.startTime!, habit.endTime!)}%`,
                        backgroundColor: `${habit.color || '#8B5CF6'}20`,
                        borderColor: habit.color || '#8B5CF6',
                        minHeight: '24px',
                      }}
                      data-testid={`habit-block-${habit.id}`}
                    >
                      <div className="flex items-center gap-1">
                        <Flame className="h-3 w-3" style={{ color: habit.color || '#8B5CF6' }} />
                        <span className="font-medium truncate text-[10px]" style={{ color: habit.color || '#8B5CF6' }}>{habit.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                Available Gaps
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {analysis?.gaps?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No available gaps found for this day.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analysis?.gaps?.map((gap, i) => (
                    <Badge key={i} variant="outline" className="text-green-600 border-green-500" data-testid={`badge-gap-${i}`}>
                      {formatTime(gap.startTime)} - {formatTime(gap.endTime)} ({gap.durationMinutes}m)
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {(analysis?.suggestedTasks?.length || 0) > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Suggested Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {analysis?.suggestedTasks?.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md" data-testid={`task-row-${task.id}`}>
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                          {task.priority}
                        </Badge>
                        {task.estimatedTime && (
                          <span className="text-xs text-muted-foreground">{task.estimatedTime}m</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openScheduleTask(task)}
                        data-testid={`button-schedule-task-${task.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(analysis?.suggestedHabits?.length || 0) > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  Incomplete Habits
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                  {analysis?.suggestedHabits?.map((habit) => (
                    <Badge
                      key={habit.id}
                      variant="outline"
                      style={{ borderColor: habit.color || '#3B82F6', color: habit.color || '#3B82F6' }}
                      data-testid={`badge-habit-${habit.id}`}
                    >
                      {habit.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(analysis?.suggestedTasks?.length || 0) === 0 && (analysis?.suggestedHabits?.length || 0) === 0 && (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No suggestions available. All tasks and habits are complete!</p>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Work Start</label>
                <Input
                  type="time"
                  value={settingsForm.workStartTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, workStartTime: e.target.value })}
                  data-testid="input-work-start"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Work End</label>
                <Input
                  type="time"
                  value={settingsForm.workEndTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, workEndTime: e.target.value })}
                  data-testid="input-work-end"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Work Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    size="sm"
                    variant={settingsForm.workDays.includes(day.value) ? "default" : "outline"}
                    onClick={() => toggleWorkDay(day.value)}
                    data-testid={`button-day-${day.value}`}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Task (min)</label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={settingsForm.minTaskDuration}
                  onChange={(e) => setSettingsForm({ ...settingsForm, minTaskDuration: parseInt(e.target.value) || 15 })}
                  data-testid="input-min-task"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Task (min)</label>
                <Input
                  type="number"
                  min={30}
                  max={480}
                  value={settingsForm.maxTaskDuration}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxTaskDuration: parseInt(e.target.value) || 120 })}
                  data-testid="input-max-task"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Break (min)</label>
                <Input
                  type="number"
                  min={5}
                  max={30}
                  value={settingsForm.breakDuration}
                  onChange={(e) => setSettingsForm({ ...settingsForm, breakDuration: parseInt(e.target.value) || 10 })}
                  data-testid="input-break-duration"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Break Every (min)</label>
                <Input
                  type="number"
                  min={30}
                  max={180}
                  value={settingsForm.breakFrequency}
                  onChange={(e) => setSettingsForm({ ...settingsForm, breakFrequency: parseInt(e.target.value) || 90 })}
                  data-testid="input-break-frequency"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Prefer Morning Tasks</label>
              <Switch
                checked={settingsForm.preferMorningTasks}
                onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, preferMorningTasks: checked })}
                data-testid="switch-morning-tasks"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => updateSettingsMutation.mutate(settingsForm)}
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleTaskModal.open} onOpenChange={(open) => setScheduleTaskModal({ ...scheduleTaskModal, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Task</DialogTitle>
          </DialogHeader>
          {scheduleTaskModal.task && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium">{scheduleTaskModal.task.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={scheduleTaskModal.task.priority === 'high' ? 'destructive' : scheduleTaskModal.task.priority === 'medium' ? 'default' : 'secondary'}>
                    {scheduleTaskModal.task.priority}
                  </Badge>
                  {scheduleTaskModal.task.estimatedTime && (
                    <span className="text-sm text-muted-foreground">Est: {scheduleTaskModal.task.estimatedTime}m</span>
                  )}
                </div>
              </div>

              {analysis?.gaps && analysis.gaps.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quick Fill from Gap</label>
                  <div className="flex flex-wrap gap-2">
                    {analysis.gaps.slice(0, 3).map((gap, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const estimatedMinutes = scheduleTaskModal.task?.estimatedTime || 30;
                          const startParts = gap.startTime.split(':').map(Number);
                          const endMinutes = startParts[0] * 60 + startParts[1] + Math.min(estimatedMinutes, gap.durationMinutes);
                          const endHour = Math.floor(endMinutes / 60);
                          const endMin = endMinutes % 60;
                          setScheduleTaskModal({
                            ...scheduleTaskModal,
                            startTime: gap.startTime,
                            endTime: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
                          });
                        }}
                        data-testid={`button-gap-${i}`}
                      >
                        {formatTime(gap.startTime)} ({gap.durationMinutes}m)
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Input
                    type="time"
                    value={scheduleTaskModal.startTime}
                    onChange={(e) => setScheduleTaskModal({ ...scheduleTaskModal, startTime: e.target.value })}
                    data-testid="input-task-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <Input
                    type="time"
                    value={scheduleTaskModal.endTime}
                    onChange={(e) => setScheduleTaskModal({ ...scheduleTaskModal, endTime: e.target.value })}
                    data-testid="input-task-end-time"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setScheduleTaskModal({ open: false, task: null, startTime: "09:00", endTime: "10:00" })}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (scheduleTaskModal.task) {
                      scheduleTaskMutation.mutate({
                        title: scheduleTaskModal.task.title,
                        startTime: scheduleTaskModal.startTime,
                        endTime: scheduleTaskModal.endTime,
                        taskId: scheduleTaskModal.task.id,
                      });
                    }
                  }}
                  disabled={scheduleTaskMutation.isPending}
                  data-testid="button-confirm-schedule"
                >
                  {scheduleTaskMutation.isPending ? "Scheduling..." : "Add to Schedule"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
