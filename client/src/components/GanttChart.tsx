import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { format, addDays, differenceInDays, startOfDay, endOfDay, min, max, startOfMonth, isSameMonth } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, ChevronDown, ChevronUp, Diamond } from "lucide-react";
import type { TaskWithRelations, TaskDependency } from "@shared/schema";

interface GanttChartProps {
  tasks: TaskWithRelations[];
  dependencies: TaskDependency[];
  onTaskClick: (task: TaskWithRelations) => void;
  onTaskUpdate?: (taskId: string, updates: { startDate?: Date; dueDate?: Date }) => void;
}

type DragType = "move" | "resize-left" | "resize-right";

interface DragState {
  taskId: string;
  type: DragType;
  startX: number;
  originalStart: Date;
  originalEnd: Date;
  currentStart: Date;
  currentEnd: Date;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-muted-foreground/50",
  in_progress: "bg-blue-500",
  review: "bg-purple-500",
  done: "bg-emerald-500",
};

type GroupByOption = "none" | "project" | "priority";
type ColorByOption = "priority" | "project";

interface GanttTask extends TaskWithRelations {
  ganttStart: Date;
  ganttEnd: Date;
  isMilestone: boolean;
  subtaskProgress: number;
}

interface TaskGroup {
  key: string;
  label: string;
  color?: string;
  tasks: GanttTask[];
  isCollapsed: boolean;
}

export function GanttChart({ tasks, dependencies, onTaskClick, onTaskUpdate }: GanttChartProps) {
  const [dayWidth, setDayWidth] = useState(40);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showWeekends, setShowWeekends] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [colorBy, setColorBy] = useState<ColorByOption>("priority");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<DragState | null>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  const tasksWithDates = useMemo(() => {
    let filteredTasks = tasks.filter(t => t.startDate || t.dueDate);
    
    if (!showCompleted) {
      filteredTasks = filteredTasks.filter(t => t.status !== "done");
    }

    return filteredTasks.map(task => {
      const hasStartDate = !!task.startDate;
      const hasDueDate = !!task.dueDate;
      const isMilestone = !hasStartDate && hasDueDate;
      
      const start = task.startDate ? new Date(task.startDate) : (task.dueDate ? new Date(task.dueDate) : new Date());
      const end = task.dueDate ? new Date(task.dueDate) : (task.startDate ? new Date(task.startDate) : new Date());
      
      const subtasks = tasks.filter(t => t.parentTaskId === task.id);
      const completedSubtasks = subtasks.filter(t => t.status === "done");
      const subtaskProgress = subtasks.length > 0 ? (completedSubtasks.length / subtasks.length) * 100 : 0;
      
      return { 
        ...task, 
        ganttStart: startOfDay(start), 
        ganttEnd: endOfDay(end),
        isMilestone,
        subtaskProgress
      };
    });
  }, [tasks, showCompleted]);

  const taskGroups = useMemo((): TaskGroup[] => {
    if (groupBy === "none") {
      return [{ key: "all", label: "All Tasks", tasks: tasksWithDates, isCollapsed: false }];
    }

    const groupsMap = new Map<string, { label: string; color?: string; tasks: GanttTask[] }>();

    tasksWithDates.forEach(task => {
      let groupKey: string;
      let groupLabel: string;
      let groupColor: string | undefined;

      if (groupBy === "project") {
        groupKey = task.projectId || "no-project";
        groupLabel = task.project?.name || "No Project";
        groupColor = task.project?.color || undefined;
      } else {
        groupKey = task.priority;
        groupLabel = PRIORITY_LABELS[task.priority] || task.priority;
      }

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, { label: groupLabel, color: groupColor, tasks: [] });
      }
      groupsMap.get(groupKey)!.tasks.push(task);
    });

    return Array.from(groupsMap.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      color: value.color,
      tasks: value.tasks,
      isCollapsed: collapsedGroups.has(key)
    }));
  }, [tasksWithDates, groupBy, collapsedGroups]);

  const flattenedTasks = useMemo(() => {
    const result: { task: GanttTask; groupKey: string; isGroupHeader?: boolean; groupLabel?: string; groupColor?: string; taskCount?: number }[] = [];
    
    taskGroups.forEach(group => {
      if (groupBy !== "none") {
        result.push({ 
          task: group.tasks[0], 
          groupKey: group.key, 
          isGroupHeader: true, 
          groupLabel: group.label,
          groupColor: group.color,
          taskCount: group.tasks.length
        });
      }
      
      if (!group.isCollapsed) {
        group.tasks.forEach(task => {
          result.push({ task, groupKey: group.key });
        });
      }
    });
    
    return result;
  }, [taskGroups, groupBy]);

  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const today = startOfDay(new Date());
      return { timelineStart: addDays(today, -7), timelineEnd: addDays(today, 30), totalDays: 37 };
    }
    const allStarts = tasksWithDates.map(t => t.ganttStart);
    const allEnds = tasksWithDates.map(t => t.ganttEnd);
    const minDate = startOfDay(addDays(min(allStarts), -7));
    const maxDate = endOfDay(addDays(max(allEnds), 14));
    return {
      timelineStart: minDate,
      timelineEnd: maxDate,
      totalDays: differenceInDays(maxDate, minDate) + 1,
    };
  }, [tasksWithDates]);

  const timelineDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      const day = addDays(timelineStart, i);
      if (showWeekends || (day.getDay() !== 0 && day.getDay() !== 6)) {
        days.push(day);
      }
    }
    return days;
  }, [timelineStart, totalDays, showWeekends]);

  const monthHeaders = useMemo(() => {
    const months: { label: string; startIdx: number; span: number }[] = [];
    let currentMonth: Date | null = null;
    let currentStartIdx = 0;
    let currentSpan = 0;

    timelineDays.forEach((day, idx) => {
      const monthStart = startOfMonth(day);
      if (!currentMonth || !isSameMonth(currentMonth, monthStart)) {
        if (currentMonth) {
          months.push({ label: format(currentMonth, "MMMM yyyy"), startIdx: currentStartIdx, span: currentSpan });
        }
        currentMonth = monthStart;
        currentStartIdx = idx;
        currentSpan = 1;
      } else {
        currentSpan++;
      }
    });
    if (currentMonth) {
      months.push({ label: format(currentMonth, "MMMM yyyy"), startIdx: currentStartIdx, span: currentSpan });
    }
    return months;
  }, [timelineDays]);

  const todayIndex = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return timelineDays.findIndex(day => format(day, "yyyy-MM-dd") === today);
  }, [timelineDays]);

  const getTaskPosition = useCallback((task: { ganttStart: Date; ganttEnd: Date; isMilestone: boolean }) => {
    let startIdx = 0;
    let endIdx = 0;
    
    for (let i = 0; i < timelineDays.length; i++) {
      if (format(timelineDays[i], "yyyy-MM-dd") === format(task.ganttStart, "yyyy-MM-dd")) {
        startIdx = i;
      }
      if (format(timelineDays[i], "yyyy-MM-dd") === format(task.ganttEnd, "yyyy-MM-dd")) {
        endIdx = i;
      }
    }
    
    const left = startIdx * dayWidth;
    const width = task.isMilestone ? dayWidth : Math.max((endIdx - startIdx + 1) * dayWidth - 4, dayWidth - 4);
    return { left, width, startIdx, endIdx };
  }, [dayWidth, timelineDays]);

  const getTaskColor = useCallback((task: GanttTask) => {
    if (colorBy === "project" && task.project?.color) {
      return task.project.color;
    }
    return PRIORITY_COLORS[task.priority] || "bg-blue-500";
  }, [colorBy]);

  const handleZoomIn = () => setDayWidth(prev => Math.min(prev + 10, 80));
  const handleZoomOut = () => setDayWidth(prev => Math.max(prev - 10, 20));
  const handleScrollLeft = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollLeft = Math.max(0, scrollContainer.scrollLeft - 7 * dayWidth);
      }
    }
  };
  const handleScrollRight = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollLeft = scrollContainer.scrollLeft + 7 * dayWidth;
      }
    }
  };
  
  const handleScrollToToday = () => {
    if (scrollAreaRef.current && todayIndex >= 0) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const targetScroll = todayIndex * dayWidth - scrollContainer.clientWidth / 2;
        scrollContainer.scrollLeft = Math.max(0, targetScroll);
      }
    }
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const pixelToDate = useCallback((pixelDelta: number): number => {
    return Math.round(pixelDelta / dayWidth);
  }, [dayWidth]);

  const handleDragStart = useCallback((
    e: React.MouseEvent,
    task: GanttTask,
    type: DragType
  ) => {
    if (!onTaskUpdate) return;
    e.preventDefault();
    e.stopPropagation();
    
    setDragState({
      taskId: task.id,
      type,
      startX: e.clientX,
      originalStart: task.ganttStart,
      originalEnd: task.ganttEnd,
      currentStart: task.ganttStart,
      currentEnd: task.ganttEnd,
    });
  }, [onTaskUpdate]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;
    
    const deltaX = e.clientX - dragState.startX;
    const daysDelta = pixelToDate(deltaX);
    
    let newStart = dragState.originalStart;
    let newEnd = dragState.originalEnd;
    
    if (dragState.type === "move") {
      newStart = addDays(dragState.originalStart, daysDelta);
      newEnd = addDays(dragState.originalEnd, daysDelta);
    } else if (dragState.type === "resize-left") {
      newStart = addDays(dragState.originalStart, daysDelta);
      if (newStart >= newEnd) {
        newStart = addDays(newEnd, -1);
      }
    } else if (dragState.type === "resize-right") {
      newEnd = addDays(dragState.originalEnd, daysDelta);
      if (newEnd <= newStart) {
        newEnd = addDays(newStart, 1);
      }
    }
    
    setDragState(prev => prev ? {
      ...prev,
      currentStart: startOfDay(newStart),
      currentEnd: endOfDay(newEnd),
    } : null);
  }, [dragState, pixelToDate]);

  const handleMouseUp = useCallback(() => {
    if (!dragState || !onTaskUpdate) return;
    
    const hasChanged = 
      format(dragState.currentStart, "yyyy-MM-dd") !== format(dragState.originalStart, "yyyy-MM-dd") ||
      format(dragState.currentEnd, "yyyy-MM-dd") !== format(dragState.originalEnd, "yyyy-MM-dd");
    
    if (hasChanged) {
      onTaskUpdate(dragState.taskId, {
        startDate: dragState.currentStart,
        dueDate: dragState.currentEnd,
      });
    }
    
    setDragState(null);
  }, [dragState, onTaskUpdate]);

  useEffect(() => {
    if (dragState) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = dragState.type === "move" ? "grabbing" : "col-resize";
      document.body.style.userSelect = "none";
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const getDragPosition = useCallback((task: GanttTask): { left: number; width: number } | null => {
    if (!dragState || dragState.taskId !== task.id) return null;
    
    let startIdx = 0;
    let endIdx = 0;
    
    for (let i = 0; i < timelineDays.length; i++) {
      if (format(timelineDays[i], "yyyy-MM-dd") === format(dragState.currentStart, "yyyy-MM-dd")) {
        startIdx = i;
      }
      if (format(timelineDays[i], "yyyy-MM-dd") === format(dragState.currentEnd, "yyyy-MM-dd")) {
        endIdx = i;
      }
    }
    
    if (format(dragState.currentStart, "yyyy-MM-dd") < format(timelineDays[0], "yyyy-MM-dd")) {
      startIdx = Math.floor(differenceInDays(dragState.currentStart, timelineDays[0]));
    }
    if (format(dragState.currentEnd, "yyyy-MM-dd") > format(timelineDays[timelineDays.length - 1], "yyyy-MM-dd")) {
      endIdx = timelineDays.length - 1 + Math.ceil(differenceInDays(dragState.currentEnd, timelineDays[timelineDays.length - 1]));
    }
    
    const left = startIdx * dayWidth;
    const width = Math.max((endIdx - startIdx + 1) * dayWidth - 4, dayWidth - 4);
    return { left, width };
  }, [dragState, dayWidth, timelineDays]);

  const rowHeight = 48;
  const headerHeight = 80;
  const taskLabelWidth = 280;

  const visibleTaskRows = flattenedTasks.filter(item => !item.isGroupHeader);
  const totalContentHeight = flattenedTasks.length * rowHeight;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 p-3 border-b">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-medium">Gantt Chart</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="icon" variant="ghost" onClick={handleScrollLeft} data-testid="button-gantt-scroll-left">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleScrollRight} data-testid="button-gantt-scroll-right">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleScrollToToday} data-testid="button-gantt-today">
              <Calendar className="h-4 w-4 mr-1" />
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={handleZoomOut} data-testid="button-gantt-zoom-out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="w-24">
                <Slider
                  value={[dayWidth]}
                  onValueChange={(value) => setDayWidth(value[0])}
                  min={20}
                  max={80}
                  step={5}
                  data-testid="slider-gantt-zoom"
                />
              </div>
              <Button size="icon" variant="ghost" onClick={handleZoomIn} data-testid="button-gantt-zoom-in">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Show weekends</span>
            <Switch
              checked={showWeekends}
              onCheckedChange={setShowWeekends}
              data-testid="switch-show-weekends"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Show completed</span>
            <Switch
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
              data-testid="switch-show-completed"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Group by</span>
            <Select value={groupBy} onValueChange={(value: GroupByOption) => setGroupBy(value)}>
              <SelectTrigger className="w-28 h-8" data-testid="select-group-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Color by</span>
            <Select value={colorBy} onValueChange={(value: ColorByOption) => setColorBy(value)}>
              <SelectTrigger className="w-28 h-8" data-testid="select-color-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="project">Project</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {tasksWithDates.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <p>No tasks with dates to display.</p>
          <p className="text-sm mt-1">Add start or due dates to your tasks to see them here.</p>
        </div>
      ) : (
        <div className="flex">
          <div className="shrink-0 border-r bg-muted/30" style={{ width: taskLabelWidth }}>
            <div className="border-b flex items-end px-3 pb-2" style={{ height: headerHeight }}>
              <span className="text-xs font-medium text-muted-foreground">Task</span>
            </div>
            {flattenedTasks.map((item, idx) => {
              if (item.isGroupHeader) {
                return (
                  <div
                    key={`group-${item.groupKey}`}
                    className="flex items-center px-3 gap-2 border-b bg-muted/50 cursor-pointer hover-elevate"
                    style={{ height: rowHeight }}
                    onClick={() => toggleGroupCollapse(item.groupKey)}
                    data-testid={`gantt-group-header-${item.groupKey}`}
                  >
                    {collapsedGroups.has(item.groupKey) ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    {item.groupColor && (
                      <div 
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: item.groupColor }}
                      />
                    )}
                    <span className="text-sm font-medium truncate flex-1">{item.groupLabel}</span>
                    <Badge variant="secondary" className="text-xs">
                      {item.taskCount}
                    </Badge>
                  </div>
                );
              }

              const task = item.task;
              return (
                <div
                  key={task.id}
                  className="flex items-center px-3 gap-2 border-b hover-elevate cursor-pointer"
                  style={{ height: rowHeight, paddingLeft: groupBy !== "none" ? "2rem" : undefined }}
                  onClick={() => onTaskClick(task)}
                  data-testid={`gantt-task-label-${task.id}`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[task.status] || "bg-muted"}`} />
                  <span className="text-sm truncate flex-1">{task.title}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] shrink-0 ${
                      task.priority === 'urgent' ? 'border-red-500 text-red-500' :
                      task.priority === 'high' ? 'border-orange-500 text-orange-500' :
                      task.priority === 'medium' ? 'border-amber-500 text-amber-500' :
                      'border-emerald-500 text-emerald-500'
                    }`}
                  >
                    {task.priority.charAt(0).toUpperCase()}
                  </Badge>
                  {task.assignee && (
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assignee.profileImageUrl || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {task.assignee.firstName?.[0] || task.assignee.username?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
          </div>

          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div style={{ width: timelineDays.length * dayWidth, minWidth: "100%" }}>
              <div className="sticky top-0 bg-background z-10 border-b" style={{ height: headerHeight }}>
                <div className="flex border-b" style={{ height: 24 }}>
                  {monthHeaders.map((month, idx) => (
                    <div
                      key={idx}
                      className="shrink-0 flex items-center justify-center text-xs font-medium text-muted-foreground border-r bg-muted/20"
                      style={{ width: month.span * dayWidth }}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
                <div className="flex" style={{ height: headerHeight - 24 }}>
                  {timelineDays.map((day, idx) => {
                    const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <div
                        key={idx}
                        className={`shrink-0 border-r flex flex-col items-center justify-end pb-2 ${isWeekend ? "bg-muted/40" : ""} ${isToday ? "bg-primary/10" : ""}`}
                        style={{ width: dayWidth }}
                      >
                        <span className={`text-[10px] ${isWeekend ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                          {format(day, "EEE")}
                        </span>
                        <span className={`text-xs font-medium ${isToday ? "text-primary font-bold" : ""}`}>
                          {format(day, "d")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="relative" style={{ height: totalContentHeight }}>
                {timelineDays.map((day, idx) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={idx}
                      className={`absolute top-0 border-r ${isWeekend ? "bg-muted/30" : ""}`}
                      style={{
                        left: idx * dayWidth,
                        width: dayWidth,
                        height: totalContentHeight,
                      }}
                    />
                  );
                })}

                {todayIndex >= 0 && (
                  <div
                    className="absolute top-0 w-0.5 bg-red-500 z-20"
                    style={{
                      left: todayIndex * dayWidth + dayWidth / 2,
                      height: totalContentHeight,
                    }}
                    data-testid="gantt-today-indicator"
                  />
                )}

                {flattenedTasks.map((item, idx) => {
                  if (item.isGroupHeader) {
                    return (
                      <div
                        key={`group-row-${item.groupKey}`}
                        className="absolute left-0 right-0 bg-muted/30 border-b"
                        style={{
                          top: idx * rowHeight,
                          height: rowHeight,
                          width: timelineDays.length * dayWidth,
                        }}
                      />
                    );
                  }

                  const task = item.task;
                  const { left, width } = getTaskPosition(task);
                  const barColor = getTaskColor(task);
                  const isColorClass = barColor.startsWith("bg-");

                  if (task.isMilestone) {
                    return (
                      <Tooltip key={task.id}>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute flex items-center justify-center cursor-pointer"
                            style={{
                              top: idx * rowHeight + 8,
                              left: left + dayWidth / 2 - 12,
                              width: 24,
                              height: rowHeight - 16,
                            }}
                            onClick={() => onTaskClick(task)}
                            data-testid={`gantt-task-milestone-${task.id}`}
                          >
                            <div
                              className={`w-5 h-5 rotate-45 ${isColorClass ? barColor : ""} hover:opacity-80 transition-opacity`}
                              style={!isColorClass ? { backgroundColor: barColor } : undefined}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Milestone: {format(task.ganttEnd, "MMM d, yyyy")}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-[10px]">
                                {PRIORITY_LABELS[task.priority]}
                              </Badge>
                              {task.assignee && (
                                <span>{task.assignee.firstName || task.assignee.username}</span>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  const isDragging = dragState?.taskId === task.id;
                  const dragPos = getDragPosition(task);
                  const displayLeft = dragPos?.left ?? left;
                  const displayWidth = dragPos?.width ?? width;
                  const displayStart = isDragging ? dragState!.currentStart : task.ganttStart;
                  const displayEnd = isDragging ? dragState!.currentEnd : task.ganttEnd;

                  return (
                    <div key={task.id} className="group">
                      <div
                        className={`absolute flex items-center ${isDragging ? "z-30" : ""}`}
                        style={{
                          top: idx * rowHeight + 8,
                          left: displayLeft,
                          width: displayWidth,
                          height: rowHeight - 16,
                        }}
                      >
                        <div
                          className={`w-full h-full rounded-full ${isColorClass ? barColor : ""} flex items-center overflow-visible relative transition-shadow ${
                            isDragging ? "ring-2 ring-primary shadow-lg opacity-90" : "hover:opacity-90"
                          } ${onTaskUpdate ? "cursor-grab" : "cursor-pointer"}`}
                          style={!isColorClass ? { backgroundColor: barColor } : undefined}
                          onClick={(e) => {
                            if (!isDragging) {
                              onTaskClick(task);
                            }
                          }}
                          onMouseDown={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const edgeThreshold = 8;
                            
                            if (x <= edgeThreshold && onTaskUpdate) {
                              handleDragStart(e, task, "resize-left");
                            } else if (x >= rect.width - edgeThreshold && onTaskUpdate) {
                              handleDragStart(e, task, "resize-right");
                            } else if (onTaskUpdate) {
                              handleDragStart(e, task, "move");
                            }
                          }}
                          onMouseMove={(e) => {
                            if (!dragState && onTaskUpdate) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const edgeThreshold = 8;
                              
                              if (x <= edgeThreshold || x >= rect.width - edgeThreshold) {
                                e.currentTarget.style.cursor = "col-resize";
                              } else {
                                e.currentTarget.style.cursor = "grab";
                              }
                            }
                          }}
                          data-testid={`gantt-task-bar-${task.id}`}
                        >
                          {task.subtaskProgress > 0 && (
                            <div 
                              className="absolute left-0 top-0 bottom-0 bg-white/30 rounded-l-full"
                              style={{ width: `${task.subtaskProgress}%` }}
                            />
                          )}
                          {displayWidth > 60 && (
                            <span className="text-xs text-white truncate font-medium px-2 relative z-10">
                              {task.title}
                            </span>
                          )}
                          
                          {onTaskUpdate && !isDragging && (
                            <>
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-2 rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ cursor: "col-resize" }}
                              />
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-2 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ cursor: "col-resize" }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isDragging && (
                        <div
                          className="absolute z-40 bg-popover text-popover-foreground shadow-md rounded-md px-2 py-1 text-xs font-medium pointer-events-none"
                          style={{
                            top: idx * rowHeight - 4,
                            left: displayLeft + displayWidth / 2,
                            transform: "translate(-50%, -100%)",
                          }}
                          data-testid={`gantt-drag-tooltip-${task.id}`}
                        >
                          {format(displayStart, "MMM d")} - {format(displayEnd, "MMM d")}
                        </div>
                      )}
                      
                      {!isDragging && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute"
                              style={{
                                top: idx * rowHeight + 8,
                                left: displayLeft,
                                width: displayWidth,
                                height: rowHeight - 16,
                                pointerEvents: "none",
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs pointer-events-none">
                            <div className="space-y-1">
                              <p className="font-medium">{task.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(task.ganttStart, "MMM d")} - {format(task.ganttEnd, "MMM d, yyyy")}
                              </p>
                              <div className="flex items-center gap-2 text-xs flex-wrap">
                                <Badge variant="outline" className="text-[10px]">
                                  {PRIORITY_LABELS[task.priority]}
                                </Badge>
                                {task.project && (
                                  <span className="text-muted-foreground">{task.project.name}</span>
                                )}
                                {task.assignee && (
                                  <span>{task.assignee.firstName || task.assignee.username}</span>
                                )}
                              </div>
                              {task.subtaskProgress > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Progress: {Math.round(task.subtaskProgress)}%
                                </p>
                              )}
                              {onTaskUpdate && (
                                <p className="text-xs text-muted-foreground italic">
                                  Drag to move, drag edges to resize
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}

                <svg
                  className="absolute top-0 left-0 pointer-events-none z-10"
                  style={{ width: timelineDays.length * dayWidth, height: totalContentHeight }}
                >
                  {dependencies.map((dep) => {
                    const predecessorItem = flattenedTasks.find(item => !item.isGroupHeader && item.task.id === dep.predecessorId);
                    const successorItem = flattenedTasks.find(item => !item.isGroupHeader && item.task.id === dep.successorId);
                    
                    if (!predecessorItem || !successorItem) return null;

                    const predecessorIdx = flattenedTasks.indexOf(predecessorItem);
                    const successorIdx = flattenedTasks.indexOf(successorItem);
                    
                    const predecessor = predecessorItem.task;
                    const successor = successorItem.task;
                    const predPos = getTaskPosition(predecessor);
                    const succPos = getTaskPosition(successor);

                    const startX = predPos.left + predPos.width;
                    const startY = predecessorIdx * rowHeight + rowHeight / 2;
                    const endX = succPos.left;
                    const endY = successorIdx * rowHeight + rowHeight / 2;
                    const midX = (startX + endX) / 2;

                    return (
                      <g key={dep.id}>
                        <path
                          d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          className="text-muted-foreground/60"
                          markerEnd="url(#arrowhead)"
                        />
                      </g>
                    );
                  })}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="8"
                      markerHeight="6"
                      refX="8"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 8 3, 0 6" fill="currentColor" className="text-muted-foreground/60" />
                    </marker>
                  </defs>
                </svg>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}
