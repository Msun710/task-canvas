import { useState, useRef, useCallback, useMemo, memo } from "react";
import { Badge } from "@/components/ui/badge";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import { Star, Clock, Calendar } from "lucide-react";
import type { Task, TaskWithRelations, Project, Tag } from "@shared/schema";
import { cn, formatDuration } from "@/lib/utils";
import { useCompletionSound } from "@/hooks/use-sound";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileTaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onToggleImportant: (taskId: string) => void;
  onSetPriority?: (taskId: string, priority: string) => void;
  onDuplicate?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  projects?: Project[];
  tags?: Tag[];
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
}

const LONG_PRESS_DURATION = 500;

export const MobileTaskCard = memo(function MobileTaskCard({
  task,
  onClick,
  onToggleComplete,
  onToggleImportant,
  onSetPriority,
  onDuplicate,
  onDelete,
  onEdit,
  projects = [],
  tags: tagsProp = [],
  onUpdate,
}: MobileTaskCardProps) {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  
  const { playChime } = useCompletionSound();
  const taskWithRelations = task as TaskWithRelations;
  const isCompleted = task.status === "done";

  const priorityStripeClass = useMemo(() => {
    switch (task.priority) {
      case "high":
      case "urgent":
        return "bg-red-500 dark:bg-red-400";
      case "medium":
        return "bg-orange-500 dark:bg-orange-400";
      case "low":
        return "bg-green-500 dark:bg-green-400";
      default:
        return "bg-transparent";
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
    };
  }, [task.dueDate, isCompleted]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      setContextMenuOpen(true);
    }, LONG_PRESS_DURATION);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
    
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
    setIsLongPressing(false);
  }, []);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest('[role="checkbox"]')) {
      return;
    }
    if (!isLongPressing) {
      onClick(task);
    }
  };

  const handleToggleComplete = () => {
    if (!isCompleted) {
      playChime();
    }
    onToggleComplete(task.id);
  };

  const handlePriorityChange = (priority: string) => {
    if (onSetPriority) {
      onSetPriority(task.id, priority);
    }
    if (onUpdate) {
      onUpdate(task.id, { priority: priority as Task["priority"] });
    }
  };

  const cardContent = (
    <div
      className={cn(
        "flex items-center gap-3 min-h-14 px-3 py-2.5 bg-background rounded-md transition-colors touch-manipulation",
        isCompleted && "opacity-60",
        isLongPressing && "bg-accent/50 scale-[0.98]"
      )}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      data-testid={`mobile-task-card-${task.id}`}
    >
      <div 
        className={cn("w-1 self-stretch rounded-full flex-shrink-0", priorityStripeClass)}
        data-testid={`priority-stripe-${task.id}`}
      />

      <CircularCheckbox
        checked={isCompleted}
        onCheckedChange={handleToggleComplete}
        onClick={(e) => e.stopPropagation()}
        size="lg"
        className="flex-shrink-0 touch-target"
        data-testid={`mobile-complete-checkbox-${task.id}`}
      />

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span
          className={cn(
            "text-sm font-medium leading-tight line-clamp-2",
            isCompleted && "line-through text-muted-foreground"
          )}
          data-testid={`mobile-task-title-${task.id}`}
        >
          {task.title}
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          {dueDateInfo && (
            <span className={cn("flex items-center gap-1 text-xs", dueDateInfo.colorClass)}>
              <Calendar className="w-3 h-3" />
              {dueDateInfo.text}
            </span>
          )}
          
          {task.estimatedTime && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDuration(task.estimatedTime)}
            </span>
          )}

          {taskWithRelations.project && (
            <Badge variant="outline" className="text-xs py-0 h-5">
              {taskWithRelations.project.name}
            </Badge>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleImportant(task.id);
        }}
        className={cn(
          "flex-shrink-0 p-2 rounded-md transition-colors touch-target",
          task.isImportant
            ? "text-yellow-500 dark:text-yellow-400"
            : "text-muted-foreground/40"
        )}
        data-testid={`mobile-star-button-${task.id}`}
      >
        <Star className={cn("w-5 h-5", task.isImportant && "fill-current")} />
      </button>
    </div>
  );

  return (
    <DropdownMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
      <DropdownMenuTrigger asChild>
        {cardContent}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuItem
          onClick={() => {
            if (onEdit) onEdit(task);
            else onClick(task);
          }}
          data-testid="context-menu-edit"
        >
          Edit Task
        </DropdownMenuItem>
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Priority</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handlePriorityChange("urgent")}>
              Urgent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange("high")}>
              High
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange("medium")}>
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePriorityChange("low")}>
              Low
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem
          onClick={() => onToggleComplete(task.id)}
          data-testid="context-menu-complete"
        >
          {isCompleted ? "Mark Incomplete" : "Mark Complete"}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onToggleImportant(task.id)}
          data-testid="context-menu-important"
        >
          {task.isImportant ? "Remove Star" : "Add Star"}
        </DropdownMenuItem>

        {onDuplicate && (
          <DropdownMenuItem
            onClick={() => onDuplicate(task.id)}
            data-testid="context-menu-duplicate"
          >
            Duplicate
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(task.id)}
            className="text-destructive focus:text-destructive"
            data-testid="context-menu-delete"
          >
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
