import { useMemo, useState, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import { Calendar, Clock, MessageSquare, Paperclip, ChevronDown, ChevronRight, ListTodo, AlertTriangle, Timer } from "lucide-react";
import type { Task, TaskWithRelations, Project, Tag } from "@shared/schema";
import { cn, formatDuration, getDurationStatus } from "@/lib/utils";
import { useCompletionSound } from "@/hooks/use-sound";
import { PomodoroButton } from "@/components/PomodoroButton";
import { TaskContextMenu } from "@/components/TaskContextMenu";

interface TaskCardProps {
  task: TaskWithRelations;
  subtasks?: TaskWithRelations[];
  onClick?: () => void;
  onStatusChange?: (status: string) => void;
  onSubtaskStatusChange?: (subtaskId: string, status: string) => void;
  isDragging?: boolean;
  compact?: boolean;
  projects?: Project[];
  tags?: Tag[];
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (task: Task) => void;
  onEdit?: (task: Task) => void;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent": return "destructive";
    case "high": return "destructive";
    case "medium": return "default";
    case "low": return "secondary";
    default: return "secondary";
  }
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const TaskCard = memo(function TaskCard({ 
  task, 
  subtasks = [], 
  onClick, 
  onStatusChange, 
  onSubtaskStatusChange, 
  isDragging, 
  compact,
  projects = [],
  tags = [],
  onUpdate,
  onDelete,
  onDuplicate,
  onEdit,
}: TaskCardProps) {
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const { playChime } = useCompletionSound();
  
  const hasContextMenu = projects.length > 0 || tags.length > 0 || onUpdate || onDelete || onDuplicate || onEdit;
  
  const isOverdue = useMemo(() => {
    if (!task.dueDate || task.status === "done") return false;
    return new Date(task.dueDate) < new Date();
  }, [task.dueDate, task.status]);
  
  const completedSubtasks = useMemo(() => subtasks.filter(s => s.status === "done").length, [subtasks]);
  const hasSubtasks = subtasks.length > 0;

  const handleCheckChange = useCallback((checked: boolean) => {
    if (checked) {
      playChime();
    }
    if (onStatusChange) {
      onStatusChange(checked ? "done" : "todo");
    }
  }, [playChime, onStatusChange]);

  const handleSubtaskCheck = useCallback((subtaskId: string, checked: boolean) => {
    if (checked) {
      playChime();
    }
    onSubtaskStatusChange?.(subtaskId, checked ? "done" : "todo");
  }, [playChime, onSubtaskStatusChange]);

  const handleUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    if (onUpdate) {
      onUpdate(taskId, updates);
    }
    if (updates.status && onStatusChange) {
      onStatusChange(updates.status);
    }
  }, [onUpdate, onStatusChange]);

  const handleToggleSubtasks = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSubtasksExpanded(prev => !prev);
  }, []);

  const cardContent = (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all duration-200 hover-elevate active-elevate-2 group",
        isDragging && "shadow-xl rotate-1 scale-[1.02]",
        task.status === "done" && "opacity-60"
      )}
      onClick={onClick}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start gap-4">
        <CircularCheckbox
          checked={task.status === "done"}
          onCheckedChange={handleCheckChange}
          onClick={(e) => e.stopPropagation()}
          size="lg"
          data-testid={`checkbox-task-${task.id}`}
        />
        
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3
              className={cn(
                "font-semibold text-base leading-snug tracking-tight",
                task.status === "done" && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </h3>
            {task.priority !== "medium" && (
              <Badge variant={getPriorityColor(task.priority)} className="flex-shrink-0">
                {task.priority}
              </Badge>
            )}
          </div>

          {!compact && task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {task.dueDate && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 font-medium",
                    isOverdue && "text-destructive"
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(task.dueDate)}</span>
                </div>
              )}
              {(task.estimatedTime || task.totalFocusTime) && (
                <div className="flex items-center gap-2">
                  {task.estimatedTime && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>Est: {formatDuration(task.estimatedTime)}</span>
                    </div>
                  )}
                  {task.totalFocusTime && task.totalFocusTime > 0 && (
                    <div className={cn(
                      "flex items-center gap-1.5",
                      task.estimatedTime && task.totalFocusTime > task.estimatedTime && "text-destructive"
                    )}>
                      <Timer className="h-4 w-4" />
                      <span>Tracked: {formatDuration(task.totalFocusTime)}</span>
                      {task.estimatedTime && task.totalFocusTime > task.estimatedTime && (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                    </div>
                  )}
                </div>
              )}
              {task.comments && task.comments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  <span>{task.comments.length}</span>
                </div>
              )}
              {task.attachments && task.attachments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4" />
                  <span>{task.attachments.length}</span>
                </div>
              )}
            </div>
            <PomodoroButton task={task} />
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {task.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={{ borderColor: tag.color || undefined, color: tag.color || undefined }}
                >
                  {tag.name}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {hasSubtasks && (
            <div className="pt-3 border-t border-border/50 mt-3">
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-muted-foreground hover-elevate rounded-md px-2 py-1.5 -ml-2 w-full"
                onClick={handleToggleSubtasks}
                data-testid={`button-toggle-subtasks-${task.id}`}
              >
                {subtasksExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <ListTodo className="h-4 w-4" />
                <span className="font-medium">
                  Subtasks ({completedSubtasks}/{subtasks.length})
                </span>
              </button>
              
              {subtasksExpanded && (
                <div className="mt-3 space-y-2 pl-2">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-3 py-1"
                      data-testid={`subtask-inline-${subtask.id}`}
                    >
                      <CircularCheckbox
                        checked={subtask.status === "done"}
                        onCheckedChange={(checked) => handleSubtaskCheck(subtask.id, checked)}
                        onClick={(e) => e.stopPropagation()}
                        size="sm"
                        data-testid={`checkbox-subtask-inline-${subtask.id}`}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          subtask.status === "done" && "line-through text-muted-foreground"
                        )}
                      >
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  if (hasContextMenu && onUpdate && onDelete && onDuplicate && onEdit) {
    return (
      <TaskContextMenu
        task={task}
        projects={projects}
        tags={tags}
        onUpdate={handleUpdate}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onEdit={onEdit}
      >
        {cardContent}
      </TaskContextMenu>
    );
  }

  return cardContent;
});
