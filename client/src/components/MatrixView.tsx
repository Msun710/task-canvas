import { useState, useMemo } from "react";
import { isToday, isPast, format, startOfDay } from "date-fns";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Calendar,
  AlertTriangle,
  Clock,
  Trash2,
  CheckCircle2,
  GripVertical
} from "lucide-react";
import type { TaskWithRelations, Project } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useCompletionSound } from "@/hooks/use-sound";

type QuadrantId = 1 | 2 | 3 | 4;

interface MatrixViewProps {
  tasks: TaskWithRelations[];
  projects?: Project[];
  onTaskClick?: (task: TaskWithRelations) => void;
  onAddTask?: (quadrant: QuadrantId) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<TaskWithRelations>) => void;
}

interface QuadrantConfig {
  id: QuadrantId;
  title: string;
  subtitle: string;
  bgColor: string;
  borderColor: string;
  headerBgColor: string;
  dragOverBgColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const QUADRANTS: QuadrantConfig[] = [
  {
    id: 1,
    title: "Do First",
    subtitle: "Urgent & Important",
    bgColor: "bg-rose-500/10 dark:bg-rose-500/20",
    borderColor: "border-rose-500",
    headerBgColor: "bg-rose-500/20 dark:bg-rose-500/30",
    dragOverBgColor: "bg-rose-500/30 dark:bg-rose-500/40",
    icon: AlertTriangle,
  },
  {
    id: 2,
    title: "Schedule",
    subtitle: "Not Urgent & Important",
    bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
    borderColor: "border-blue-500",
    headerBgColor: "bg-blue-500/20 dark:bg-blue-500/30",
    dragOverBgColor: "bg-blue-500/30 dark:bg-blue-500/40",
    icon: Calendar,
  },
  {
    id: 3,
    title: "Delegate",
    subtitle: "Urgent & Not Important",
    bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
    borderColor: "border-amber-500",
    headerBgColor: "bg-amber-500/20 dark:bg-amber-500/30",
    dragOverBgColor: "bg-amber-500/30 dark:bg-amber-500/40",
    icon: Clock,
  },
  {
    id: 4,
    title: "Eliminate",
    subtitle: "Not Urgent & Not Important",
    bgColor: "bg-muted/30",
    borderColor: "border-muted",
    headerBgColor: "bg-muted/50",
    dragOverBgColor: "bg-muted/60",
    icon: Trash2,
  },
];

function isTaskUrgent(task: TaskWithRelations): boolean {
  if (!task.dueDate) return false;
  const dueDate = new Date(task.dueDate);
  return isToday(dueDate) || isPast(dueDate);
}

function isTaskImportant(task: TaskWithRelations): boolean {
  return (
    task.priority === "high" ||
    task.priority === "urgent" ||
    task.isImportant === true
  );
}

function getQuadrant(task: TaskWithRelations): QuadrantId {
  const urgent = isTaskUrgent(task);
  const important = isTaskImportant(task);

  if (urgent && important) return 1;
  if (!urgent && important) return 2;
  if (urgent && !important) return 3;
  return 4;
}

function getQuadrantUpdates(quadrantId: QuadrantId, currentTask: TaskWithRelations): Partial<TaskWithRelations> {
  const today = startOfDay(new Date());
  
  switch (quadrantId) {
    case 1:
      return {
        priority: "urgent",
        isImportant: true,
        dueDate: currentTask.dueDate ? new Date(currentTask.dueDate) : today,
      };
    case 2:
      return {
        priority: "high",
        isImportant: true,
        dueDate: null,
      };
    case 3:
      return {
        priority: "medium",
        isImportant: false,
        dueDate: currentTask.dueDate ? new Date(currentTask.dueDate) : today,
      };
    case 4:
      return {
        priority: "low",
        isImportant: false,
        dueDate: null,
      };
  }
}

interface MatrixTaskCardProps {
  task: TaskWithRelations;
  onClick?: () => void;
  onStatusChange?: (status: string) => void;
  isDragging?: boolean;
}

function MatrixTaskCard({ task, onClick, onStatusChange, isDragging }: MatrixTaskCardProps) {
  const { playChime } = useCompletionSound();

  const isOverdue = useMemo(() => {
    if (!task.dueDate || task.status === "done") return false;
    const dueDate = new Date(task.dueDate);
    return isPast(dueDate) && !isToday(dueDate);
  }, [task.dueDate, task.status]);

  const isDueToday = useMemo(() => {
    if (!task.dueDate) return false;
    return isToday(new Date(task.dueDate));
  }, [task.dueDate]);

  const getPriorityBadgeVariant = (priority: string): "destructive" | "default" | "secondary" => {
    switch (priority) {
      case "urgent":
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  const formatDueDate = (date: Date | string) => {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    return format(d, "MMM d");
  };

  const handleCheckChange = (checked: boolean) => {
    if (checked) {
      playChime();
    }
    onStatusChange?.(checked ? "done" : "todo");
  };

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all duration-200 group",
        task.status === "done" && "opacity-60",
        isDragging && "shadow-lg ring-2 ring-primary/50 rotate-2"
      )}
      onClick={onClick}
      data-testid={`matrix-card-${task.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-1">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          <CircularCheckbox
            checked={task.status === "done"}
            onCheckedChange={handleCheckChange}
            onClick={(e) => e.stopPropagation()}
            size="sm"
            data-testid={`checkbox-matrix-${task.id}`}
          />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                "font-medium text-sm leading-snug flex-1",
                task.status === "done" && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </h4>
            {(task.priority === "high" || task.priority === "urgent") && (
              <Badge 
                variant={getPriorityBadgeVariant(task.priority)} 
                className="text-[10px] shrink-0"
              >
                {task.priority}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {task.dueDate && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] gap-1",
                  isOverdue && "border-destructive text-destructive",
                  isDueToday && !isOverdue && "border-amber-500 text-amber-600 dark:text-amber-400"
                )}
              >
                <Calendar className="h-2.5 w-2.5" />
                {formatDueDate(task.dueDate)}
              </Badge>
            )}
            {task.isImportant && (
              <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600 dark:text-yellow-400">
                Important
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function MatrixView({
  tasks,
  projects = [],
  onTaskClick,
  onAddTask,
  onTaskUpdate,
}: MatrixViewProps) {
  const [collapsedQuadrants, setCollapsedQuadrants] = useState<Set<QuadrantId>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) => !task.parentTaskId);
    
    if (!showCompleted) {
      result = result.filter((task) => task.status !== "done");
    }
    
    if (selectedProjectId && selectedProjectId !== "all") {
      result = result.filter((task) => task.projectId === selectedProjectId);
    }
    
    return result;
  }, [tasks, showCompleted, selectedProjectId]);

  const tasksByQuadrant = useMemo(() => {
    const grouped: Record<QuadrantId, TaskWithRelations[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
    };

    filteredTasks.forEach((task) => {
      const quadrant = getQuadrant(task);
      grouped[quadrant].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  const toggleQuadrantCollapse = (quadrantId: QuadrantId) => {
    setCollapsedQuadrants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(quadrantId)) {
        newSet.delete(quadrantId);
      } else {
        newSet.add(quadrantId);
      }
      return newSet;
    });
  };

  const handleStatusChange = (taskId: string, status: string) => {
    onTaskUpdate?.(taskId, { status } as Partial<TaskWithRelations>);
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    const sourceQuadrantId = parseInt(source.droppableId.replace("quadrant-", "")) as QuadrantId;
    const destQuadrantId = parseInt(destination.droppableId.replace("quadrant-", "")) as QuadrantId;

    if (sourceQuadrantId === destQuadrantId && source.index === destination.index) {
      return;
    }

    const task = filteredTasks.find((t) => t.id === draggableId);
    if (!task) return;

    if (sourceQuadrantId !== destQuadrantId) {
      const updates = getQuadrantUpdates(destQuadrantId, task);
      onTaskUpdate?.(task.id, updates);
    } else {
      onTaskUpdate?.(task.id, { position: destination.index } as Partial<TaskWithRelations>);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full" data-testid="matrix-view">
        <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                id="show-completed"
                checked={showCompleted}
                onCheckedChange={setShowCompleted}
                data-testid="switch-show-completed"
              />
              <Label htmlFor="show-completed" className="text-sm cursor-pointer">
                Show completed
              </Label>
            </div>

            {projects.length > 0 && (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[180px]" data-testid="select-project-filter">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span>{filteredTasks.length} tasks</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-full">
            {QUADRANTS.map((quadrant) => {
              const quadrantTasks = tasksByQuadrant[quadrant.id];
              const isCollapsed = collapsedQuadrants.has(quadrant.id);
              const IconComponent = quadrant.icon;

              return (
                <div
                  key={quadrant.id}
                  className={cn(
                    "flex flex-col rounded-lg border overflow-hidden",
                    quadrant.borderColor
                  )}
                  data-testid={`matrix-quadrant-${quadrant.id}`}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between gap-2 px-4 py-3 cursor-pointer select-none",
                      quadrant.headerBgColor
                    )}
                    onClick={() => toggleQuadrantCollapse(quadrant.id)}
                    data-testid={`button-collapse-quadrant-${quadrant.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold text-sm">{quadrant.title}</h3>
                        <p className="text-xs text-muted-foreground">{quadrant.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-background/60">
                        {quadrantTasks.length}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddTask?.(quadrant.id);
                        }}
                        data-testid={`button-add-task-quadrant-${quadrant.id}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <Droppable droppableId={`quadrant-${quadrant.id}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "flex-1 p-3 space-y-2 min-h-[150px] transition-colors duration-200",
                            snapshot.isDraggingOver ? quadrant.dragOverBgColor : quadrant.bgColor,
                            snapshot.isDraggingOver && "ring-2 ring-inset ring-primary/30"
                          )}
                          data-testid={`droppable-quadrant-${quadrant.id}`}
                        >
                          {quadrantTasks.length === 0 && !snapshot.isDraggingOver ? (
                            <div className="flex items-center justify-center h-[100px] text-sm text-muted-foreground">
                              No tasks
                            </div>
                          ) : (
                            quadrantTasks.map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={provided.draggableProps.style}
                                  >
                                    <MatrixTaskCard
                                      task={task}
                                      onClick={() => onTaskClick?.(task)}
                                      onStatusChange={(status) => handleStatusChange(task.id, status)}
                                      isDragging={snapshot.isDragging}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                          {snapshot.isDraggingOver && quadrantTasks.length === 0 && (
                            <div className="flex items-center justify-center h-[100px] text-sm text-muted-foreground border-2 border-dashed border-primary/30 rounded-lg">
                              Drop here
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  )}

                  {isCollapsed && (
                    <div className={cn("h-8", quadrant.bgColor)} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}
