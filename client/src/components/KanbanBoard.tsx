import { useState, useCallback, useMemo, memo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Star, 
  Pencil, 
  Trash2, 
  Calendar,
  Eye,
  EyeOff
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { TaskWithRelations } from "@shared/schema";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  tasks: TaskWithRelations[];
  onTaskClick?: (task: TaskWithRelations) => void;
  onTaskMove?: (taskId: string, newStatus: string, newPosition: number) => void;
  onSubtaskStatusChange?: (subtaskId: string, status: string) => void;
  onAddTask?: (status: string) => void;
  onToggleImportant?: (taskId: string, isImportant: boolean) => void;
  onDeleteTask?: (taskId: string) => void;
}

const COLUMNS = [
  { id: "todo", title: "To Do", color: "bg-muted", iconColor: "text-muted-foreground" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500/10 dark:bg-blue-500/20", iconColor: "text-blue-600 dark:text-blue-400" },
  { id: "review", title: "In Review", color: "bg-yellow-500/10 dark:bg-yellow-500/20", iconColor: "text-yellow-600 dark:text-yellow-400" },
  { id: "done", title: "Done", color: "bg-green-500/10 dark:bg-green-500/20", iconColor: "text-green-600 dark:text-green-400" },
];

interface KanbanTaskCardProps {
  task: TaskWithRelations;
  onClick?: () => void;
  onToggleImportant?: (taskId: string, isImportant: boolean) => void;
  onEdit?: () => void;
  onDelete?: (taskId: string) => void;
  isDragging?: boolean;
}

const getPriorityBorderColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "border-l-red-500 dark:border-l-red-400";
    case "high":
      return "border-l-red-400 dark:border-l-red-500";
    case "medium":
      return "border-l-orange-400 dark:border-l-orange-500";
    case "low":
      return "border-l-green-500 dark:border-l-green-400";
    default:
      return "border-l-muted-foreground/30";
  }
};

const getDueDateColor = (dueDate: Date | string | null | undefined, status: string) => {
  if (!dueDate || status === "done") return "text-muted-foreground";
  
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  if (due < today) return "text-red-500 dark:text-red-400";
  if (due.getTime() === today.getTime()) return "text-orange-500 dark:text-orange-400";
  return "text-muted-foreground";
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const KanbanTaskCard = memo(function KanbanTaskCard({ 
  task, 
  onClick, 
  onToggleImportant, 
  onEdit,
  onDelete,
  isDragging 
}: KanbanTaskCardProps) {
  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleImportant?.(task.id, !task.isImportant);
  }, [onToggleImportant, task.id, task.isImportant]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  }, [onEdit]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(task.id);
  }, [onDelete, task.id]);

  return (
    <Card
      className={cn(
        "relative p-3 cursor-pointer transition-all duration-200 group border-l-4",
        getPriorityBorderColor(task.priority),
        isDragging && "shadow-xl rotate-1 scale-[1.02] opacity-90",
        task.status === "done" && "opacity-60"
      )}
      onClick={onClick}
      data-testid={`kanban-card-${task.id}`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              "font-medium text-sm leading-snug flex-1",
              task.status === "done" && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </h4>
          
          <div className="flex items-center gap-1 shrink-0">
            {task.isImportant && (
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            )}
            
            <div 
              className="flex items-center gap-0.5 invisible group-hover:visible"
              style={{ visibility: undefined }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 invisible group-hover:visible"
                onClick={handleStarClick}
                data-testid={`button-star-${task.id}`}
              >
                <Star className={cn(
                  "h-3.5 w-3.5",
                  task.isImportant ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                )} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 invisible group-hover:visible"
                onClick={handleEditClick}
                data-testid={`button-edit-${task.id}`}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 invisible group-hover:visible text-destructive"
                onClick={handleDeleteClick}
                data-testid={`button-delete-${task.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.tags && task.tags.length > 0 && (
              <>
                {task.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                    style={{ 
                      borderColor: tag.color || undefined, 
                      color: tag.color || undefined 
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {task.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{task.tags.length - 3}
                  </span>
                )}
              </>
            )}
          </div>

          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs",
                getDueDateColor(task.dueDate, task.status)
              )}
            >
              <Calendar className="h-3 w-3" />
              <span className="font-medium">{formatDate(task.dueDate)}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
});

export function KanbanBoard({ 
  tasks, 
  onTaskClick, 
  onTaskMove, 
  onSubtaskStatusChange, 
  onAddTask,
  onToggleImportant,
  onDeleteTask
}: KanbanBoardProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [hideCompletedInDone, setHideCompletedInDone] = useState(false);

  const tasksByStatus = useMemo(() => {
    const result: Record<string, TaskWithRelations[]> = {};
    for (const column of COLUMNS) {
      let filtered = tasks.filter((task) => task.status === column.id && !task.parentTaskId);
      if (column.id === "done" && hideCompletedInDone) {
        filtered = [];
      }
      result[column.id] = filtered.sort((a, b) => (a.position || 0) - (b.position || 0));
    }
    return result;
  }, [tasks, hideCompletedInDone]);

  const taskCountByStatus = useMemo(() => {
    const result: Record<string, number> = {};
    for (const column of COLUMNS) {
      result[column.id] = tasks.filter((task) => task.status === column.id && !task.parentTaskId).length;
    }
    return result;
  }, [tasks]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !onTaskMove) return;

    const { draggableId, destination } = result;
    onTaskMove(draggableId, destination.droppableId, destination.index);
  }, [onTaskMove]);

  const toggleColumnCollapse = useCallback((columnId: string) => {
    setCollapsedColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  }, []);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <ScrollArea className="w-full">
        <div className="flex gap-4 p-1 min-w-max">
          {COLUMNS.map((column) => {
            const columnTasks = tasksByStatus[column.id];
            const taskCount = taskCountByStatus[column.id];
            const isCollapsed = collapsedColumns.has(column.id);
            const isDoneColumn = column.id === "done";

            return (
              <div
                key={column.id}
                className={cn(
                  "flex flex-col shrink-0 transition-all duration-200",
                  isCollapsed ? "w-12" : "w-80"
                )}
                data-testid={`kanban-column-${column.id}`}
              >
                <div 
                  className={cn(
                    "rounded-t-lg px-3 py-2.5 cursor-pointer select-none",
                    column.color
                  )}
                  onClick={() => toggleColumnCollapse(column.id)}
                  data-testid={`button-collapse-${column.id}`}
                >
                  <div className={cn(
                    "flex items-center gap-2",
                    isCollapsed ? "flex-col" : "justify-between"
                  )}>
                    <div className={cn(
                      "flex items-center gap-2",
                      isCollapsed && "flex-col"
                    )}>
                      {isCollapsed ? (
                        <ChevronRight className={cn("h-4 w-4", column.iconColor)} />
                      ) : (
                        <ChevronDown className={cn("h-4 w-4", column.iconColor)} />
                      )}
                      
                      <h3 className={cn(
                        "font-semibold text-sm",
                        isCollapsed && "writing-mode-vertical rotate-180"
                      )} style={isCollapsed ? { writingMode: "vertical-rl" } : undefined}>
                        {column.title}
                      </h3>
                      
                      <Badge 
                        variant="secondary" 
                        className="text-xs px-2 py-0.5 bg-background/60"
                      >
                        {taskCount}
                      </Badge>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="flex items-center gap-1">
                        {isDoneColumn && (
                          <div 
                            className="flex items-center gap-2 mr-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setHideCompletedInDone(!hideCompletedInDone)}
                              data-testid="button-toggle-completed"
                            >
                              {hideCompletedInDone ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddTask?.(column.id);
                          }}
                          data-testid={`button-add-task-${column.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {!isCollapsed && (
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 min-h-[200px] p-2 space-y-2 bg-muted/30 rounded-b-lg transition-all duration-200",
                          snapshot.isDraggingOver && "bg-primary/10 ring-2 ring-primary/20 ring-inset"
                        )}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="transition-transform duration-150"
                              >
                                <KanbanTaskCard
                                  task={task}
                                  onClick={() => onTaskClick?.(task)}
                                  onToggleImportant={onToggleImportant}
                                  onEdit={() => onTaskClick?.(task)}
                                  onDelete={onDeleteTask}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="py-8 text-center text-muted-foreground text-sm">
                            {isDoneColumn && hideCompletedInDone 
                              ? `${taskCount} completed tasks hidden`
                              : "No tasks"
                            }
                          </div>
                        )}
                        {snapshot.isDraggingOver && columnTasks.length === 0 && (
                          <div className="py-6 text-center border-2 border-dashed border-primary/30 rounded-lg text-primary/60 text-sm">
                            Drop here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                )}

                {isCollapsed && (
                  <div className="flex-1 bg-muted/30 rounded-b-lg min-h-[200px]" />
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </DragDropContext>
  );
}
