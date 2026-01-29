import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useConfirm } from "@/hooks/use-confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar as CalendarIcon,
  Clock,
  MessageSquare,
  Paperclip,
  Play,
  Square,
  Trash2,
  Star,
  Bell,
  Plus,
  Repeat,
  Zap,
  Timer,
  X,
  ChevronRight,
  History,
  ChevronDown,
} from "lucide-react";
import type { TaskWithRelations, User as UserType, CommentWithAuthor, TaskReminder } from "@shared/schema";
import { format, addDays, addWeeks } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn, formatDuration, getDurationStatus } from "@/lib/utils";
import { RecurrenceModal, type RecurrenceValue } from "./RecurrenceModal";
import { PomodoroButton } from "@/components/PomodoroButton";
import { ActivityFeed } from "@/components/ActivityFeed";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const DAYS_OF_WEEK_LABELS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getRecurrenceSummary(pattern: string): string {
  if (!pattern) return "";
  
  const parts = pattern.split(":");
  const type = parts[0].toUpperCase();

  if (type === "DAILY") {
    const interval = parseInt(parts[1]) || 1;
    return interval === 1 ? "Every day" : `Every ${interval} days`;
  }

  if (type === "WEEKDAYS") {
    return "Every weekday (Mon-Fri)";
  }

  if (type === "WEEKLY") {
    const interval = parseInt(parts[1]) || 1;
    const days = parts[2] ? parts[2].split(",").map(Number) : [1];
    const dayNames = days.sort((a, b) => a - b).map((d) => DAYS_OF_WEEK_LABELS[d]).filter(Boolean);
    const intervalText = interval === 1 ? "Every" : `Every ${interval} weeks on`;
    if (dayNames.length === 1) return `${intervalText} ${dayNames[0]}`;
    if (dayNames.length === 2) return `${intervalText} ${dayNames[0]} and ${dayNames[1]}`;
    return `${intervalText} ${dayNames.slice(0, -1).join(", ")}, and ${dayNames[dayNames.length - 1]}`;
  }

  if (type === "MONTHLY") {
    if (parts.length === 2) {
      const day = parseInt(parts[1]) || 1;
      const suffix = ["th", "st", "nd", "rd"][(day % 100 - 20) % 10] || ["th", "st", "nd", "rd"][day % 100] || "th";
      return `Every month on the ${day}${suffix}`;
    }
  }

  if (type === "YEARLY") {
    const dateParts = parts[1]?.split("-") || ["1", "1"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `Every year on ${monthNames[parseInt(dateParts[0]) - 1]} ${dateParts[1]}`;
  }

  return pattern;
}

interface TaskDetailModalProps {
  task: TaskWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (task: Partial<TaskWithRelations>) => void;
  onDelete?: (taskId: string) => void;
  onAddComment?: (taskId: string, content: string) => void;
  onStartTimer?: (taskId: string) => void;
  onStopTimer?: (taskId: string) => void;
  users?: UserType[];
  isTimerRunning?: boolean;
}

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
  onSave,
  onDelete,
  onAddComment,
  onStartTimer,
  onStopTimer,
  users = [],
  isTimerRunning = false,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("unassigned");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [allDayTask, setAllDayTask] = useState(false);
  const [focusTime, setFocusTime] = useState("");
  const [energyLevel, setEnergyLevel] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [repeatPattern, setRepeatPattern] = useState("");
  const [repeatEndDate, setRepeatEndDate] = useState<Date | undefined>(undefined);
  const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [estimatedTimeUnit, setEstimatedTimeUnit] = useState<"minutes" | "hours">("minutes");
  const [newComment, setNewComment] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false);
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "todo");
      setPriority(task.priority || "medium");
      setAssigneeId(task.assigneeId || "unassigned");
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setDueTime(task.dueTime || "");
      setStartDate(task.startDate ? new Date(task.startDate) : undefined);
      setStartTime(task.startTime || "");
      setAllDayTask(task.allDayTask || false);
      setFocusTime(task.focusTime?.toString() || "");
      setEnergyLevel(task.energyLevel || "");
      setIsImportant(task.isImportant || false);
      setRepeatPattern(task.repeatPattern || "");
      setRepeatEndDate(task.repeatEndDate ? new Date(task.repeatEndDate) : undefined);
      if (task.estimatedTime) {
        if (task.estimatedTime >= 60 && task.estimatedTime % 60 === 0) {
          setEstimatedTime((task.estimatedTime / 60).toString());
          setEstimatedTimeUnit("hours");
        } else {
          setEstimatedTime(task.estimatedTime.toString());
          setEstimatedTimeUnit("minutes");
        }
      } else {
        setEstimatedTime("");
        setEstimatedTimeUnit("minutes");
      }
    }
  }, [task]);

  const { data: subtasks = [], isLoading: isLoadingSubtasks } = useQuery<TaskWithRelations[]>({
    queryKey: ["/api/tasks", task?.id, "subtasks"],
    queryFn: async () => {
      if (!task?.id) return [];
      const response = await fetch(`/api/tasks/${task.id}/subtasks`);
      if (!response.ok) throw new Error("Failed to fetch subtasks");
      return response.json();
    },
    enabled: !!task?.id && !task.parentTaskId,
  });

  const { data: reminders = [], isLoading: isLoadingReminders } = useQuery<TaskReminder[]>({
    queryKey: ["/api/tasks", task?.id, "reminders"],
    queryFn: async () => {
      if (!task?.id) return [];
      const response = await fetch(`/api/tasks/${task.id}/reminders`);
      if (!response.ok) throw new Error("Failed to fetch reminders");
      return response.json();
    },
    enabled: !!task?.id,
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async (subtaskTitle: string) => {
      const res = await apiRequest("POST", `/api/tasks/${task?.id}/subtasks`, { title: subtaskTitle });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "subtasks"] });
      setNewSubtaskTitle("");
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "subtasks"] });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "subtasks"] });
    },
  });

  const createReminderMutation = useMutation({
    mutationFn: async (relativeTiming: string) => {
      const res = await apiRequest("POST", `/api/tasks/${task?.id}/reminders`, { 
        relativeTiming,
        reminderType: "relative" 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "reminders"] });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reminders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "reminders"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: Partial<TaskWithRelations>) => {
      const res = await apiRequest("PATCH", `/api/tasks/${task?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      onOpenChange(false);
    },
  });

  const getEstimatedTimeInMinutes = (): number | null => {
    if (!estimatedTime) return null;
    const value = parseInt(estimatedTime);
    if (isNaN(value) || value <= 0) return null;
    return estimatedTimeUnit === "hours" ? value * 60 : value;
  };

  const handleSave = () => {
    if (!task) return;
    const updatedData = {
      title,
      description,
      status,
      priority,
      assigneeId: assigneeId && assigneeId !== "unassigned" ? assigneeId : null,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      startDate: startDate || null,
      startTime: startTime || null,
      allDayTask,
      focusTime: focusTime ? parseInt(focusTime) : null,
      energyLevel: energyLevel || null,
      isImportant,
      repeatPattern: repeatPattern || null,
      repeatEndDate: repeatEndDate || null,
      estimatedTime: getEstimatedTimeInMinutes(),
    };
    
    updateTaskMutation.mutate(updatedData);
    onSave?.({ id: task.id, ...updatedData });
  };

  const handleAddComment = () => {
    if (!task || !newComment.trim()) return;
    onAddComment?.(task.id, newComment.trim());
    setNewComment("");
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    createSubtaskMutation.mutate(newSubtaskTitle.trim());
  };

  const getInitials = (user?: UserType | null) => {
    if (!user) return "?";
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || user.email?.charAt(0).toUpperCase() || "?";
  };

  const getReminderLabel = (timing: string | null) => {
    switch (timing) {
      case "15min": return "15 minutes before";
      case "30min": return "30 minutes before";
      case "1hour": return "1 hour before";
      case "1day": return "1 day before";
      default: return timing || "Custom";
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-full max-h-[90vh]">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-shrink-0 p-6 pb-0">
              <div className="flex items-center gap-3 mb-4">
                <Checkbox
                  checked={status === "done"}
                  onCheckedChange={(checked) => setStatus(checked ? "done" : "todo")}
                  className="h-5 w-5"
                  data-testid="checkbox-task-complete"
                />
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 flex-1"
                  placeholder="Task title"
                  data-testid="input-task-title"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-6">
              <div className="space-y-6 pb-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium">Description</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDescriptionPreview(!showDescriptionPreview)}
                      data-testid="button-toggle-preview"
                    >
                      {showDescriptionPreview ? "Edit" : "Preview"}
                    </Button>
                  </div>
                  {showDescriptionPreview ? (
                    <div className="min-h-[120px] p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap">
                      {description || "No description"}
                    </div>
                  ) : (
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a description... (supports markdown)"
                      className="min-h-[120px] resize-none"
                      data-testid="textarea-description"
                    />
                  )}
                </div>

                {!task.parentTaskId && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm font-medium">
                          Subtasks ({subtasks.filter(s => s.status === "done").length}/{subtasks.length})
                        </label>
                      </div>

                      <div className="space-y-1">
                        {isLoadingSubtasks ? (
                          <div className="text-sm text-muted-foreground">Loading subtasks...</div>
                        ) : (
                          subtasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              className="flex items-center gap-3 p-2 rounded-md hover-elevate group"
                              data-testid={`subtask-item-${subtask.id}`}
                            >
                              <Checkbox
                                checked={subtask.status === "done"}
                                onCheckedChange={(checked) => 
                                  updateSubtaskMutation.mutate({ 
                                    id: subtask.id, 
                                    status: checked ? "done" : "todo" 
                                  })
                                }
                                data-testid={`checkbox-subtask-${subtask.id}`}
                              />
                              <span
                                className={cn(
                                  "flex-1 text-sm",
                                  subtask.status === "done" && "line-through text-muted-foreground"
                                )}
                              >
                                {subtask.title}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 invisible group-hover:visible"
                                onClick={async () => {
                                  const confirmed = await confirm({
                                    title: "Delete Subtask",
                                    description: "Are you sure you want to delete this subtask?",
                                    confirmLabel: "Delete",
                                    variant: "destructive",
                                  });
                                  if (confirmed) {
                                    deleteSubtaskMutation.mutate(subtask.id);
                                  }
                                }}
                                data-testid={`button-delete-subtask-${subtask.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          placeholder="Add a subtask..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddSubtask();
                          }}
                          data-testid="input-new-subtask"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAddSubtask}
                          disabled={createSubtaskMutation.isPending}
                          data-testid="button-add-subtask"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {task.attachments && task.attachments.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Attachments ({task.attachments.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {task.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                          >
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate">{attachment.fileName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Comments ({task.comments?.length || 0})
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                      data-testid="input-new-comment"
                    />
                    <Button onClick={handleAddComment} data-testid="button-add-comment">
                      Send
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {task.comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={(comment as CommentWithAuthor).author?.profileImageUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials((comment as CommentWithAuthor).author)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {(comment as CommentWithAuthor).author?.firstName || "User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.createdAt!), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <Collapsible
                  open={isActivityExpanded}
                  onOpenChange={setIsActivityExpanded}
                >
                  <CollapsibleTrigger
                    className="flex items-center justify-between w-full py-2 group"
                    data-testid="button-toggle-activity"
                  >
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      <span className="text-sm font-medium">Activity</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isActivityExpanded && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="max-h-[300px] overflow-auto mt-2">
                      <ActivityFeed taskId={task.id} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between p-4 border-t flex-shrink-0 gap-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  const confirmed = await confirm({
                    title: "Delete Task",
                    description: "Are you sure you want to delete this task? This action cannot be undone.",
                    confirmLabel: "Delete",
                    variant: "destructive",
                  });
                  if (confirmed) {
                    onDelete?.(task.id);
                  }
                }}
                data-testid="button-delete-task"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={updateTaskMutation.isPending}
                  data-testid="button-save-task"
                >
                  {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>

          <div className="w-[280px] border-l flex-shrink-0 flex flex-col bg-muted/30">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <Button
                  variant={isImportant ? "default" : "outline"}
                  className={cn(
                    "w-full justify-start gap-2",
                    isImportant && "bg-yellow-500/20 border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
                  )}
                  onClick={() => setIsImportant(!isImportant)}
                  data-testid="button-toggle-important"
                >
                  <Star className={cn("h-4 w-4", isImportant && "fill-current")} />
                  {isImportant ? "Important" : "Mark as Important"}
                </Button>

                <div className="flex items-center gap-2">
                  <PomodoroButton task={task} />
                  <span className="text-sm text-muted-foreground">Start Focus Session</span>
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Due Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-due-date">
                        <CalendarIcon className="h-4 w-4" />
                        {dueDate ? format(dueDate, "MMM d, yyyy") : "Set due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="flex flex-col">
                        <div className="flex gap-1 p-2 border-b">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setDueDate(new Date())}
                          >
                            Today
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setDueDate(addDays(new Date(), 1))}
                          >
                            Tomorrow
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setDueDate(addWeeks(new Date(), 1))}
                          >
                            Next Week
                          </Button>
                        </div>
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          initialFocus
                        />
                        {dueDate && (
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => setDueDate(undefined)}
                            >
                              Clear
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm text-muted-foreground">All Day</label>
                    <Switch
                      checked={allDayTask}
                      onCheckedChange={setAllDayTask}
                      data-testid="switch-all-day"
                    />
                  </div>

                  {!allDayTask && (
                    <Input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      placeholder="Due time"
                      data-testid="input-due-time"
                    />
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Start Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-start-date">
                        <CalendarIcon className="h-4 w-4" />
                        {startDate ? format(startDate, "MMM d, yyyy") : "Set start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                      {startDate && (
                        <div className="p-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setStartDate(undefined)}
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>

                  {startDate && !allDayTask && (
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="Start time"
                      data-testid="input-start-time"
                    />
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Priority
                  </label>
                  <div className="flex gap-1">
                    {["low", "medium", "high"].map((p) => (
                      <Button
                        key={p}
                        variant={priority === p ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "flex-1 capitalize",
                          priority === p && p === "high" && "bg-destructive text-destructive-foreground",
                          priority === p && p === "medium" && "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50",
                          priority === p && p === "low" && "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/50"
                        )}
                        onClick={() => setPriority(p)}
                        data-testid={`button-priority-${p}`}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Estimated Duration
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      placeholder="e.g., 30"
                      className="flex-1"
                      data-testid="input-estimated-time"
                    />
                    <Select
                      value={estimatedTimeUnit}
                      onValueChange={(value: "minutes" | "hours") => setEstimatedTimeUnit(value)}
                    >
                      <SelectTrigger className="w-24" data-testid="select-time-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">min</SelectItem>
                        <SelectItem value="hours">hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(task.estimatedTime || (task.totalFocusTime && task.totalFocusTime > 0)) && (
                  <>
                    <div className="space-y-3">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        <Timer className="h-3 w-3" />
                        Time Tracking
                      </label>
                      
                      <div className="space-y-2">
                        {task.totalFocusTime && task.totalFocusTime > 0 ? (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Time Tracked</span>
                            <span className={cn(
                              "font-medium",
                              task.estimatedTime && task.totalFocusTime > task.estimatedTime && "text-destructive"
                            )}>
                              {formatDuration(task.totalFocusTime)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Time Tracked</span>
                            <span className="text-muted-foreground">0m</span>
                          </div>
                        )}
                        
                        {task.estimatedTime && (
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Estimated</span>
                              <span className="font-medium">{formatDuration(task.estimatedTime)}</span>
                            </div>
                            
                            {(() => {
                              const durationStatus = getDurationStatus(task.totalFocusTime, task.estimatedTime);
                              const progressValue = Math.min(durationStatus.percentage, 100);
                              return (
                                <>
                                  <Progress
                                    value={progressValue}
                                    className={cn(
                                      "h-2",
                                      durationStatus.status === "over" && "[&>div]:bg-destructive",
                                      durationStatus.status === "approaching" && "[&>div]:bg-yellow-500",
                                      durationStatus.status === "under" && "[&>div]:bg-green-500"
                                    )}
                                  />
                                  <div className={cn(
                                    "text-xs text-center",
                                    durationStatus.status === "over" && "text-destructive font-medium",
                                    durationStatus.status === "approaching" && "text-yellow-600 dark:text-yellow-400",
                                    durationStatus.status === "under" && "text-muted-foreground"
                                  )}>
                                    {durationStatus.percentage}% of estimated time used
                                    {durationStatus.status === "over" && " (overtime!)"}
                                  </div>
                                </>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Timer className="h-3 w-3" />
                    Focus Time (minutes)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={focusTime}
                    onChange={(e) => setFocusTime(e.target.value)}
                    placeholder="e.g., 25"
                    data-testid="input-focus-time"
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Zap className="h-3 w-3" />
                    Energy Level
                  </label>
                  <div className="flex gap-1">
                    {["low", "medium", "high"].map((level) => (
                      <Button
                        key={level}
                        variant={energyLevel === level ? "default" : "outline"}
                        size="sm"
                        className="flex-1 capitalize"
                        onClick={() => setEnergyLevel(energyLevel === level ? "" : level)}
                        data-testid={`button-energy-${level}`}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Bell className="h-3 w-3" />
                    Reminders
                  </label>
                  
                  {isLoadingReminders ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : (
                    <div className="space-y-2">
                      {reminders.map((reminder) => (
                        <div
                          key={reminder.id}
                          className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md text-sm group"
                          data-testid={`reminder-item-${reminder.id}`}
                        >
                          <span>{getReminderLabel(reminder.relativeTiming)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 invisible group-hover:visible"
                            onClick={() => deleteReminderMutation.mutate(reminder.id)}
                            data-testid={`button-delete-reminder-${reminder.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-2" data-testid="button-add-reminder">
                        <Plus className="h-4 w-4" />
                        Add Reminder
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="start">
                      {[
                        { value: "15min", label: "15 min before" },
                        { value: "30min", label: "30 min before" },
                        { value: "1hour", label: "1 hour before" },
                        { value: "1day", label: "1 day before" },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => createReminderMutation.mutate(option.value)}
                          data-testid={`button-reminder-option-${option.value}`}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Repeat className="h-3 w-3" />
                    Repeat
                  </label>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setIsRecurrenceOpen(true)}
                    data-testid="button-set-recurrence"
                  >
                    <Repeat className="h-4 w-4" />
                    {repeatPattern ? getRecurrenceSummary(repeatPattern) : "Set repeat..."}
                  </Button>
                  {repeatPattern && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => {
                        setRepeatPattern("");
                        setRepeatEndDate(undefined);
                      }}
                      data-testid="button-clear-recurrence"
                    >
                      Clear recurrence
                    </Button>
                  )}
                  <RecurrenceModal
                    open={isRecurrenceOpen}
                    onOpenChange={setIsRecurrenceOpen}
                    value={{
                      pattern: repeatPattern,
                      endType: repeatEndDate ? "on" : "never",
                      endDate: repeatEndDate,
                    }}
                    onChange={(value: RecurrenceValue) => {
                      setRepeatPattern(value.pattern);
                      setRepeatEndDate(value.endDate);
                    }}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Assignee
                  </label>
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger data-testid="select-assignee">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user.profileImageUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            {user.firstName || user.email}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Time Tracking
                  </label>
                  {isTimerRunning ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => onStopTimer?.(task.id)}
                      data-testid="button-stop-timer"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Timer
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onStartTimer?.(task.id)}
                      data-testid="button-start-timer"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Timer
                    </Button>
                  )}
                </div>

                {task.createdAt && (
                  <>
                    <Separator />
                    <div className="text-xs text-muted-foreground">
                      Created: {format(new Date(task.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
      {ConfirmDialog}
    </Dialog>
  );
}
