import { useMemo, useCallback, memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  GripVertical,
  MessageSquare,
  Paperclip,
  Clock,
  Timer,
  AlertTriangle,
} from "lucide-react";
import type { Task, TaskWithRelations, Project, Tag } from "@shared/schema";
import { cn, formatDuration } from "@/lib/utils";
import { PomodoroButton } from "@/components/PomodoroButton";
import { TaskContextMenu } from "@/components/TaskContextMenu";
import { SwipeableTaskCard } from "@/components/SwipeableTaskCard";
import { MobileTaskCard } from "@/components/MobileTaskCard";
import { useMobile } from "@/hooks/use-mobile";

import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";

interface EnhancedTaskCardProps {
  task: Task;
  isSelected: boolean;
  isCompact: boolean;
  onSelect: (taskId: string, selected: boolean) => void;
  onToggleComplete: (taskId: string) => void;
  onToggleImportant: (taskId: string) => void;
  onClick: (task: Task) => void;
  onSetPriority?: (taskId: string, priority: string) => void;
  onDuplicate?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  showProject?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isDragging?: boolean;
  projects?: Project[];
  tags?: Tag[];
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onEdit?: (task: Task) => void;
}

export const EnhancedTaskCard = memo(function EnhancedTaskCard({
  task,
  isSelected,
  isCompact,
  onSelect,
  onToggleComplete,
  onToggleImportant,
  onClick,
  onSetPriority,
  onDuplicate,
  onDelete,
  showProject = false,
  dragHandleProps,
  isDragging = false,
  projects = [],
  tags: tagsProp = [],
  onUpdate,
  onEdit,
}: EnhancedTaskCardProps) {
  const { isMobile } = useMobile();
  const taskWithRelations = task as TaskWithRelations;
  const isCompleted = task.status === "done";

  const priorityBorderClass = useMemo(() => {
    switch (task.priority) {
      case "high":
      case "urgent":
        return "border-l-red-500 dark:border-l-red-400";
      case "medium":
        return "border-l-orange-500 dark:border-l-orange-400";
      case "low":
        return "border-l-green-500 dark:border-l-green-400";
      default:
        return "border-l-transparent";
    }
  }, [task.priority]);

  const dueDateInfo = useMemo(() => {
    if (!task.dueDate) return null;

    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateNormalized = new Date(dueDate);
    dueDateNormalized.setHours(0, 0, 0, 0);

    const isOverdue = dueDateNormalized < today && !isCompleted;
    const isToday = dueDateNormalized.getTime() === today.getTime();

    let colorClass = "text-muted-foreground";
    if (isOverdue) {
      colorClass = "text-red-500 dark:text-red-400";
    } else if (isToday) {
      colorClass = "text-orange-500 dark:text-orange-400";
    }

    const formatDate = (date: Date) => {
      if (isToday) return "Today";
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dueDateNormalized.getTime() === tomorrow.getTime()) return "Tomorrow";
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return {
      text: formatDate(dueDate),
      colorClass,
      isOverdue,
      isToday,
    };
  }, [task.dueDate, isCompleted]);

  const tags = taskWithRelations.tags || [];
  const displayTags = tags.slice(0, 3);
  const remainingTagsCount = tags.length - 3;

  const comments = taskWithRelations.comments || [];
  const attachments = taskWithRelations.attachments || [];

  const subtaskProgress = useMemo(() => {
    return null;
  }, []);

  const hasTime = task.startTime || task.dueTime;
  const timeDisplay = useMemo(() => {
    if (!hasTime) return null;
    if (task.startTime && task.dueTime) {
      return `${task.startTime} - ${task.dueTime}`;
    }
    return task.startTime || task.dueTime;
  }, [task.startTime, task.dueTime, hasTime]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest('[role="checkbox"]')) {
      return;
    }
    onClick(task);
  }, [onClick, task]);

  const handleUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    if (onUpdate) {
      onUpdate(taskId, updates);
    }
    if (updates.isImportant !== undefined) {
      onToggleImportant(taskId);
    }
    if (updates.priority && onSetPriority) {
      onSetPriority(taskId, updates.priority);
    }
    if (updates.status) {
      onToggleComplete(taskId);
    }
  }, [onUpdate, onToggleImportant, onSetPriority, onToggleComplete]);

  const handleDuplicate = useCallback((taskToDuplicate: Task) => {
    if (onDuplicate) {
      onDuplicate(taskToDuplicate.id);
    }
  }, [onDuplicate]);

  const handleDelete = useCallback((taskId: string) => {
    if (onDelete) {
      onDelete(taskId);
    }
  }, [onDelete]);

  const handleEdit = useCallback((taskToEdit: Task) => {
    if (onEdit) {
      onEdit(taskToEdit);
    } else {
      onClick(taskToEdit);
    }
  }, [onEdit, onClick]);

  const hasContextMenu = projects.length > 0 || tagsProp.length > 0;

  const cardContent = (
    <div
      className={cn(
        "group flex items-center gap-2 border-l-4 bg-background hover-elevate active-elevate-2 cursor-pointer transition-colors rounded-md",
        priorityBorderClass,
        isCompact ? "py-1.5 px-2" : "py-2.5 px-3",
        isSelected && "bg-accent/50",
        isCompleted && "opacity-60",
        isDragging && "shadow-lg ring-2 ring-primary/20 opacity-90"
      )}
      onClick={handleCardClick}
      data-testid={`enhanced-task-card-${task.id}`}
    >
      <div
        {...dragHandleProps}
        className="flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical
          className={cn(
            "h-4 w-4 text-muted-foreground/50 cursor-grab transition-opacity",
            "invisible group-hover:visible",
            isDragging && "visible"
          )}
          data-testid={`drag-handle-${task.id}`}
        />
      </div>

      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelect(task.id, checked as boolean)}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0"
        data-testid={`select-checkbox-${task.id}`}
      />

      <CircularCheckbox
        checked={isCompleted}
        onCheckedChange={() => onToggleComplete(task.id)}
        onClick={(e) => e.stopPropagation()}
        size="sm"
        data-testid={`complete-checkbox-${task.id}`}
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleImportant(task.id);
        }}
        className={cn(
          "flex-shrink-0 p-0.5 rounded transition-colors",
          task.isImportant
            ? "text-yellow-500 dark:text-yellow-400"
            : "text-muted-foreground/40 hover:text-yellow-500 dark:hover:text-yellow-400"
        )}
        data-testid={`star-button-${task.id}`}
      >
        <Star
          className={cn("h-4 w-4", task.isImportant && "fill-current")}
        />
      </button>

      <span
        className={cn(
          "flex-1 min-w-0 truncate text-sm font-medium",
          isCompleted && "line-through text-muted-foreground"
        )}
        data-testid={`task-title-${task.id}`}
      >
        {task.title}
      </span>

      {showProject && taskWithRelations.project && !isCompact && (
        <Badge variant="outline" className="flex-shrink-0 text-xs">
          {taskWithRelations.project.name}
        </Badge>
      )}

      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
        {!isCompact && displayTags.length > 0 && (
          <div className="flex items-center gap-1">
            {displayTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs py-0"
                style={{
                  borderColor: tag.color || undefined,
                  color: tag.color || undefined,
                }}
              >
                {tag.name}
              </Badge>
            ))}
            {remainingTagsCount > 0 && (
              <span className="text-xs text-muted-foreground">
                +{remainingTagsCount}
              </span>
            )}
          </div>
        )}

        {subtaskProgress && !isCompact && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {subtaskProgress}
            </span>
            <Progress value={0} className="w-12 h-1.5" />
          </div>
        )}

        {timeDisplay && (
          <Badge variant="secondary" className="text-xs py-0 gap-1">
            <Clock className="h-3 w-3" />
            {timeDisplay}
          </Badge>
        )}

        {!isCompact && (task.estimatedTime || task.totalFocusTime) && (
          <div className="flex items-center gap-2 text-xs">
            {task.estimatedTime && (
              <span className="text-muted-foreground">
                Est: {formatDuration(task.estimatedTime)}
              </span>
            )}
            {task.totalFocusTime && task.totalFocusTime > 0 && (
              <span className={cn(
                "flex items-center gap-1",
                task.estimatedTime && task.totalFocusTime > task.estimatedTime && "text-destructive font-medium"
              )}>
                <Timer className="h-3 w-3" />
                {formatDuration(task.totalFocusTime)}
                {task.estimatedTime && task.totalFocusTime > task.estimatedTime && (
                  <AlertTriangle className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        )}

        {dueDateInfo && (
          <span
            className={cn("text-xs font-medium", dueDateInfo.colorClass)}
            data-testid={`due-date-${task.id}`}
          >
            {dueDateInfo.text}
          </span>
        )}

        {!isCompact && comments.length > 0 && (
          <div
            className="flex items-center gap-0.5 text-muted-foreground"
            data-testid={`comments-count-${task.id}`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="text-xs">{comments.length}</span>
          </div>
        )}

        {!isCompact && attachments.length > 0 && (
          <div
            className="flex items-center gap-0.5 text-muted-foreground"
            data-testid={`attachments-count-${task.id}`}
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span className="text-xs">{attachments.length}</span>
          </div>
        )}

        <PomodoroButton task={task} />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <SwipeableTaskCard
        onComplete={() => onToggleComplete(task.id)}
        onDelete={() => handleDelete(task.id)}
        onEdit={() => handleEdit(task)}
        disabled={isDragging}
      >
        <MobileTaskCard
          task={task}
          onClick={onClick}
          onToggleComplete={onToggleComplete}
          onToggleImportant={onToggleImportant}
          onSetPriority={onSetPriority}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onEdit={onEdit}
          projects={projects}
          tags={tagsProp}
          onUpdate={onUpdate}
        />
      </SwipeableTaskCard>
    );
  }

  if (hasContextMenu) {
    return (
      <TaskContextMenu
        task={task}
        projects={projects}
        tags={tagsProp}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onEdit={handleEdit}
      >
        {cardContent}
      </TaskContextMenu>
    );
  }

  return cardContent;
});
