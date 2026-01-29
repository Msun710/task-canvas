import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeaderSkeleton, InboxListSkeleton } from "@/components/ui/skeleton-loaders";
import { InboxZero } from "@/components/ui/empty-states";
import { ErrorState } from "@/components/ui/error-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import {
  Inbox as InboxIcon,
  CheckCircle2,
  Play,
  Calendar as CalendarIcon,
  ArrowRight,
  Trash2,
  Check,
  SkipForward,
  Tag,
  X,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Task, Project, User, TaskWithRelations, Tag as TagType } from "@shared/schema";

const PRIORITIES = [
  { value: "low", label: "Low", color: "secondary" },
  { value: "medium", label: "Medium", color: "default" },
  { value: "high", label: "High", color: "destructive" },
  { value: "urgent", label: "Urgent", color: "destructive" },
] as const;

export default function InboxPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessIndex, setCurrentProcessIndex] = useState(0);
  const { toast } = useToast();

  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedPriority, setEditedPriority] = useState("medium");
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(undefined);
  const [editedProjectId, setEditedProjectId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [dueDateOpen, setDueDateOpen] = useState(false);

  const projectSelectRef = useRef<HTMLButtonElement>(null);
  const dueDateButtonRef = useRef<HTMLButtonElement>(null);

  const { data: inboxTasks = [], isLoading, isError, error, refetch } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { inbox: true }],
    queryFn: async () => {
      const response = await fetch("/api/tasks?inbox=true", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch inbox tasks");
      return response.json();
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: tags = [] } = useQuery<TagType[]>({
    queryKey: ["/api/tags"],
  });

  const { data: selectedTask } = useQuery<TaskWithRelations>({
    queryKey: ["/api/tasks", selectedTaskId],
    queryFn: async () => {
      if (!selectedTaskId) throw new Error("No task ID");
      const response = await fetch(`/api/tasks/${selectedTaskId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch task");
      return response.json();
    },
    enabled: !!selectedTaskId,
  });

  const currentTask = isProcessing && inboxTasks.length > 0 ? inboxTasks[currentProcessIndex] : null;

  useEffect(() => {
    if (currentTask) {
      setEditedTitle(currentTask.title);
      setEditedDescription(currentTask.description || "");
      setEditedPriority(currentTask.priority || "medium");
      setEditedDueDate(currentTask.dueDate ? new Date(currentTask.dueDate) : undefined);
      setEditedProjectId(currentTask.projectId);
      setTagInput("");
    }
  }, [currentTask]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
  };

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<Task> }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update task", description: error.message, variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({ title: "Task deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const response = await apiRequest("POST", "/api/comments", { taskId, content });
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries();
      if (selectedTaskId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTaskId] });
      }
    },
  });

  const moveToNextTask = useCallback(() => {
    if (currentProcessIndex < inboxTasks.length - 1) {
      setCurrentProcessIndex((prev) => prev + 1);
    } else {
      setIsProcessing(false);
      setCurrentProcessIndex(0);
      toast({ title: "Inbox processed", description: "All tasks have been reviewed" });
    }
  }, [currentProcessIndex, inboxTasks.length, toast]);

  const handleSkip = useCallback(() => {
    moveToNextTask();
  }, [moveToNextTask]);

  const handleDone = useCallback(() => {
    if (!currentTask) return;
    updateTaskMutation.mutate(
      {
        taskId: currentTask.id,
        data: {
          title: editedTitle,
          description: editedDescription,
          priority: editedPriority,
          dueDate: editedDueDate || null,
          projectId: editedProjectId,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Task updated" });
          moveToNextTask();
        },
      }
    );
  }, [currentTask, editedTitle, editedDescription, editedPriority, editedDueDate, editedProjectId, updateTaskMutation, moveToNextTask, toast]);

  const handleDelete = useCallback(() => {
    if (!currentTask) return;
    deleteTaskMutation.mutate(currentTask.id, {
      onSuccess: () => {
        if (inboxTasks.length <= 1) {
          setIsProcessing(false);
          setCurrentProcessIndex(0);
        } else if (currentProcessIndex >= inboxTasks.length - 1) {
          setCurrentProcessIndex(Math.max(0, currentProcessIndex - 1));
        }
      },
    });
  }, [currentTask, deleteTaskMutation, inboxTasks.length, currentProcessIndex]);

  const handleComplete = useCallback(() => {
    if (!currentTask) return;
    updateTaskMutation.mutate(
      {
        taskId: currentTask.id,
        data: {
          title: editedTitle,
          description: editedDescription,
          priority: editedPriority,
          dueDate: editedDueDate || null,
          projectId: editedProjectId,
          status: "done",
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Task completed" });
          if (inboxTasks.length <= 1) {
            setIsProcessing(false);
            setCurrentProcessIndex(0);
          } else if (currentProcessIndex >= inboxTasks.length - 1) {
            setCurrentProcessIndex(Math.max(0, currentProcessIndex - 1));
          }
        },
      }
    );
  }, [currentTask, editedTitle, editedDescription, editedPriority, editedDueDate, editedProjectId, updateTaskMutation, inboxTasks.length, currentProcessIndex, toast]);

  useEffect(() => {
    if (!isProcessing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      switch (key) {
        case "s":
          e.preventDefault();
          handleSkip();
          break;
        case "d":
          e.preventDefault();
          handleDone();
          break;
        case "c":
          e.preventDefault();
          handleComplete();
          break;
        case "p":
          e.preventDefault();
          projectSelectRef.current?.focus();
          projectSelectRef.current?.click();
          break;
        case "t":
          e.preventDefault();
          setDueDateOpen(true);
          dueDateButtonRef.current?.focus();
          break;
        case "1":
          e.preventDefault();
          setEditedPriority("urgent");
          break;
        case "2":
          e.preventDefault();
          setEditedPriority("high");
          break;
        case "3":
          e.preventDefault();
          setEditedPriority("medium");
          break;
        case "4":
          e.preventDefault();
          setEditedPriority("low");
          break;
        default:
          break;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsProcessing(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, handleSkip, handleDone, handleDelete, handleComplete]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeaderSkeleton />
        <InboxListSkeleton count={3} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState 
          title="Failed to load inbox"
          message={error?.message || "An error occurred while loading your inbox."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold" data-testid="text-inbox-title">Inbox</h1>
          {inboxTasks.length > 0 && (
            <Badge variant="secondary" data-testid="badge-inbox-count">
              {inboxTasks.length}
            </Badge>
          )}
        </div>
        {inboxTasks.length > 0 && (
          <Button
            onClick={() => {
              setCurrentProcessIndex(0);
              setIsProcessing(true);
            }}
            data-testid="button-process-inbox"
          >
            <Play className="h-4 w-4 mr-2" />
            Process Inbox
          </Button>
        )}
      </div>

      {inboxTasks.length === 0 ? (
        <InboxZero />
      ) : (
        <div className="space-y-3">
          {inboxTasks.map((task) => (
            <Card
              key={task.id}
              className="p-4 cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setSelectedTaskId(task.id)}
              data-testid={`card-inbox-task-${task.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-medium" data-testid={`text-task-title-${task.id}`}>
                      {task.title}
                    </h3>
                    {task.priority && task.priority !== "medium" && (
                      <Badge variant={getPriorityVariant(task.priority)} data-testid={`badge-priority-${task.id}`}>
                        {task.priority}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {task.dueDate && (
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>{formatDate(task.dueDate)}</span>
                      </div>
                    )}
                    {task.createdAt && (
                      <div className="text-muted-foreground/70">
                        Created {formatDate(task.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isProcessing} onOpenChange={setIsProcessing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-2">
                <InboxIcon className="h-5 w-5" />
                Process Inbox
              </DialogTitle>
              <div className="text-sm text-muted-foreground" data-testid="text-process-progress">
                Processing {currentProcessIndex + 1} of {inboxTasks.length}
              </div>
            </div>
          </DialogHeader>

          {currentTask && (
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Task title"
                  className="text-lg font-medium"
                  data-testid="input-process-title"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="min-h-[100px] resize-none"
                  data-testid="textarea-process-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={editedPriority} onValueChange={setEditedPriority}>
                    <SelectTrigger data-testid="select-process-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        ref={dueDateButtonRef}
                        variant="outline"
                        className={cn(
                          "w-full justify-start",
                          !editedDueDate && "text-muted-foreground"
                        )}
                        data-testid="button-process-duedate"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedDueDate ? format(editedDueDate, "MMM d, yyyy") : "Set due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editedDueDate}
                        onSelect={setEditedDueDate}
                        initialFocus
                      />
                      {editedDueDate && (
                        <div className="p-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setEditedDueDate(undefined)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Clear date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assign to Project</label>
                <Select
                  value={editedProjectId || "none"}
                  onValueChange={(value) => setEditedProjectId(value === "none" ? null : value)}
                >
                  <SelectTrigger ref={projectSelectRef} data-testid="select-process-project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project (keep in Inbox)</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: project.color || "#3B82F6" }}
                          />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </label>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tags (coming soon)"
                  disabled
                  data-testid="input-process-tags"
                />
              </div>
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={updateTaskMutation.isPending || deleteTaskMutation.isPending}
                data-testid="button-process-skip"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={updateTaskMutation.isPending || deleteTaskMutation.isPending}
                  data-testid="button-process-delete"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={handleComplete}
                  disabled={updateTaskMutation.isPending || deleteTaskMutation.isPending}
                  data-testid="button-process-complete"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Complete
                </Button>
                <Button
                  onClick={handleDone}
                  disabled={updateTaskMutation.isPending || deleteTaskMutation.isPending}
                  data-testid="button-process-done"
                >
                  Done
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">S</kbd>
                Skip
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">D</kbd>
                Done
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">C</kbd>
                Complete
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Del</kbd>
                Delete
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
                Close
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">P</kbd>
                Project
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">T</kbd>
                Due Date
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">1-4</kbd>
                Priority
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTaskId}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
          users={users}
          onSave={(task) => {
            updateTaskMutation.mutate({ taskId: task.id!, data: task });
            setSelectedTaskId(null);
          }}
          onDelete={(taskId) => {
            deleteTaskMutation.mutate(taskId);
            setSelectedTaskId(null);
          }}
          onAddComment={(taskId, content) => addCommentMutation.mutate({ taskId, content })}
        />
      )}
    </div>
  );
}
