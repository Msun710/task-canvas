import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
} from "lucide-react";
import type { TaskWithRelations } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  isSameMonth,
} from "date-fns";

type ViewMode = "month" | "week" | "day";

interface CalendarViewProps {
  tasks: TaskWithRelations[];
  onTaskClick?: (task: TaskWithRelations) => void;
  onDateClick?: (date: Date) => void;
}

const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => i + 6);

const getPriorityBorderColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "border-l-red-500";
    case "high":
      return "border-l-orange-500";
    case "medium":
      return "border-l-blue-500";
    case "low":
      return "border-l-gray-400";
    default:
      return "border-l-blue-500";
  }
};

const getPriorityDotColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-blue-500";
    case "low":
      return "bg-gray-400";
    default:
      return "bg-blue-500";
  }
};

const formatTimeString = (timeStr: string | null | undefined): string => {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const parseTimeToHour = (timeStr: string | null | undefined): number | null => {
  if (!timeStr) return null;
  const [hours] = timeStr.split(":").map(Number);
  return hours;
};

export function CalendarView({
  tasks,
  onTaskClick,
  onDateClick,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const goToPrevious = () => {
    switch (viewMode) {
      case "month":
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case "week":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "day":
        setCurrentDate(subDays(currentDate, 1));
        break;
    }
  };

  const goToNext = () => {
    switch (viewMode) {
      case "month":
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case "week":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "day":
        setCurrentDate(addDays(currentDate, 1));
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getHeaderText = () => {
    switch (viewMode) {
      case "month":
        return format(currentDate, "MMMM yyyy");
      case "week": {
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${format(weekStart, "MMM d")} - ${format(weekEnd, "d, yyyy")}`;
        }
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
      }
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
    }
  };

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    tasks.forEach((task) => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), "yyyy-MM-dd");
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
        <div className="flex flex-wrap items-center gap-4">
          <h2
            className="text-xl font-semibold"
            data-testid="text-calendar-header"
          >
            {getHeaderText()}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            data-testid="button-today"
          >
            Today
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="month" data-testid="toggle-month-view">
              Month
            </ToggleGroupItem>
            <ToggleGroupItem value="week" data-testid="toggle-week-view">
              Week
            </ToggleGroupItem>
            <ToggleGroupItem value="day" data-testid="toggle-day-view">
              Day
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              data-testid="button-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              data-testid="button-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 mt-4 overflow-auto">
        {viewMode === "month" && (
          <MonthView
            currentDate={currentDate}
            tasksByDate={tasksByDate}
            onTaskClick={onTaskClick}
            onDateClick={onDateClick}
          />
        )}
        {viewMode === "week" && (
          <WeekView
            currentDate={currentDate}
            tasksByDate={tasksByDate}
            onTaskClick={onTaskClick}
            onDateClick={onDateClick}
          />
        )}
        {viewMode === "day" && (
          <DayView
            currentDate={currentDate}
            tasksByDate={tasksByDate}
            onTaskClick={onTaskClick}
            onDateClick={onDateClick}
          />
        )}
      </div>
    </div>
  );
}

interface ViewProps {
  currentDate: Date;
  tasksByDate: Map<string, TaskWithRelations[]>;
  onTaskClick?: (task: TaskWithRelations) => void;
  onDateClick?: (date: Date) => void;
}

function MonthView({
  currentDate,
  tasksByDate,
  onTaskClick,
  onDateClick,
}: ViewProps) {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  return (
    <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
      {weekDays.map((day) => (
        <div
          key={day}
          className="bg-muted px-2 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          {day}
        </div>
      ))}

      {calendarDays.map((date, index) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const dayTasks = tasksByDate.get(dateKey) || [];
        const today = isToday(date);
        const isCurrentMonth = isSameMonth(date, currentDate);

        return (
          <div
            key={index}
            className={cn(
              "bg-background min-h-[100px] p-2 cursor-pointer hover-elevate transition-colors",
              !isCurrentMonth && "bg-muted/30 text-muted-foreground",
              today && "bg-primary/5"
            )}
            onClick={() => onDateClick?.(date)}
            data-testid={`calendar-day-${format(date, "yyyy-MM-dd")}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                  today && "bg-primary text-primary-foreground"
                )}
              >
                {date.getDate()}
              </span>
              {dayTasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {dayTasks.length}
                </span>
              )}
            </div>

            <div className="space-y-1">
              {dayTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer border-l-2",
                    getPriorityBorderColor(task.priority),
                    task.status === "done"
                      ? "bg-muted text-muted-foreground line-through"
                      : "bg-primary/10 text-foreground"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick?.(task);
                  }}
                  data-testid={`task-${task.id}`}
                >
                  <span className="flex items-center gap-1">
                    {task.dueTime && (
                      <span className="text-muted-foreground flex-shrink-0">
                        {formatTimeString(task.dueTime)}
                      </span>
                    )}
                    <span className="truncate">{task.title}</span>
                  </span>
                </div>
              ))}
              {dayTasks.length > 3 && (
                <div className="text-xs text-muted-foreground px-1.5">
                  +{dayTasks.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({
  currentDate,
  tasksByDate,
  onTaskClick,
  onDateClick,
}: ViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate),
  });

  const now = new Date();
  const currentHour = getHours(now);
  const currentMinute = getMinutes(now);

  const getTasksForDayAndHour = (
    date: Date,
    hour: number
  ): TaskWithRelations[] => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dayTasks = tasksByDate.get(dateKey) || [];
    return dayTasks.filter((task) => {
      const taskHour = parseTimeToHour(task.dueTime);
      return taskHour === hour;
    });
  };

  const getAllDayTasks = (date: Date): TaskWithRelations[] => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dayTasks = tasksByDate.get(dateKey) || [];
    return dayTasks.filter(
      (task) => task.allDayTask || !task.dueTime
    );
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    const clickedDate = setMinutes(setHours(date, hour), 0);
    onDateClick?.(clickedDate);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border border-b">
        <div className="bg-muted p-2" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "bg-muted p-2 text-center",
              isToday(day) && "bg-primary/10"
            )}
          >
            <div className="text-xs font-medium text-muted-foreground uppercase">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "text-lg font-semibold mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border border-b">
        <div className="bg-muted p-1 text-xs text-muted-foreground text-center">
          All Day
        </div>
        {weekDays.map((day) => {
          const allDayTasks = getAllDayTasks(day);
          return (
            <div
              key={`allday-${day.toISOString()}`}
              className={cn(
                "bg-background p-1 min-h-[40px] cursor-pointer hover-elevate",
                isToday(day) && "bg-primary/5"
              )}
              onClick={() => onDateClick?.(day)}
            >
              {allDayTasks.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "text-xs px-1 py-0.5 rounded truncate cursor-pointer mb-0.5 border-l-2",
                    getPriorityBorderColor(task.priority),
                    task.status === "done"
                      ? "bg-muted text-muted-foreground line-through"
                      : "bg-primary/10 text-foreground"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick?.(task);
                  }}
                >
                  {task.title}
                </div>
              ))}
              {allDayTasks.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{allDayTasks.length - 2}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border relative">
          {TIME_SLOTS.map((hour) => (
            <div key={hour} className="contents">
              <div className="bg-muted p-1 text-xs text-muted-foreground text-right pr-2 h-12 flex items-start justify-end">
                {format(setHours(new Date(), hour), "h a")}
              </div>
              {weekDays.map((day) => {
                const hourTasks = getTasksForDayAndHour(day, hour);
                const showCurrentTime =
                  isToday(day) && hour === currentHour;

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "bg-background p-0.5 h-12 cursor-pointer hover-elevate relative border-t border-border/50",
                      isToday(day) && "bg-primary/5"
                    )}
                    onClick={() => handleTimeSlotClick(day, hour)}
                    data-testid={`timeslot-${format(day, "yyyy-MM-dd")}-${hour}`}
                  >
                    {showCurrentTime && (
                      <div
                        className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
                        style={{
                          top: `${(currentMinute / 60) * 100}%`,
                        }}
                      >
                        <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                      </div>
                    )}
                    {hourTasks.slice(0, 2).map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "text-xs px-1 py-0.5 rounded truncate cursor-pointer mb-0.5 border-l-2",
                          getPriorityBorderColor(task.priority),
                          task.status === "done"
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-primary/20 text-foreground"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick?.(task);
                        }}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayView({
  currentDate,
  tasksByDate,
  onTaskClick,
  onDateClick,
}: ViewProps) {
  const now = new Date();
  const currentHour = getHours(now);
  const currentMinute = getMinutes(now);
  const isTodayView = isToday(currentDate);

  const dateKey = format(currentDate, "yyyy-MM-dd");
  const dayTasks = tasksByDate.get(dateKey) || [];

  const allDayTasks = dayTasks.filter(
    (task) => task.allDayTask || !task.dueTime
  );

  const getTasksForHour = (hour: number): TaskWithRelations[] => {
    return dayTasks.filter((task) => {
      const taskHour = parseTimeToHour(task.dueTime);
      return taskHour === hour;
    });
  };

  const handleTimeSlotClick = (hour: number) => {
    const clickedDate = setMinutes(setHours(currentDate, hour), 0);
    onDateClick?.(clickedDate);
  };

  return (
    <div className="flex flex-col h-full">
      {allDayTasks.length > 0 && (
        <div className="border-b p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
            All Day
          </div>
          <div className="flex flex-wrap gap-2">
            {allDayTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "text-sm px-3 py-1.5 rounded cursor-pointer border-l-2",
                  getPriorityBorderColor(task.priority),
                  task.status === "done"
                    ? "bg-muted text-muted-foreground line-through"
                    : "bg-primary/10 text-foreground hover-elevate"
                )}
                onClick={() => onTaskClick?.(task)}
                data-testid={`allday-task-${task.id}`}
              >
                {task.title}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="relative">
          {TIME_SLOTS.map((hour) => {
            const hourTasks = getTasksForHour(hour);
            const showCurrentTime = isTodayView && hour === currentHour;

            return (
              <div
                key={hour}
                className="flex border-b border-border/50 relative"
              >
                <div className="w-20 flex-shrink-0 p-2 text-sm text-muted-foreground text-right pr-4 h-16 flex items-start justify-end">
                  {format(setHours(new Date(), hour), "h:mm a")}
                </div>
                <div
                  className={cn(
                    "flex-1 p-1 min-h-[64px] cursor-pointer hover-elevate relative",
                    isTodayView && "bg-primary/5"
                  )}
                  onClick={() => handleTimeSlotClick(hour)}
                  data-testid={`day-timeslot-${hour}`}
                >
                  {showCurrentTime && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
                      style={{
                        top: `${(currentMinute / 60) * 100}%`,
                      }}
                    >
                      <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                    </div>
                  )}
                  <div className="space-y-1">
                    {hourTasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "text-sm px-3 py-2 rounded cursor-pointer border-l-2",
                          getPriorityBorderColor(task.priority),
                          task.status === "done"
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-primary/10 text-foreground hover-elevate"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick?.(task);
                        }}
                        data-testid={`day-task-${task.id}`}
                      >
                        <div className="flex items-center gap-2">
                          {task.dueTime && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeString(task.dueTime)}
                            </span>
                          )}
                          <span>{task.title}</span>
                        </div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {task.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {hourTasks.length === 0 && (
                    <div className="flex items-center justify-center h-full opacity-0 hover:opacity-50 transition-opacity">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
