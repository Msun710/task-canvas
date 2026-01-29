import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Timer,
  CalendarClock,
  Settings2
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { Task } from "@shared/schema";

interface CapacityPlannerProps {
  tasks: Task[];
  defaultCapacity?: number;
  className?: string;
}

interface TaskDueToday extends Task {
  estimatedTimeDisplay: string;
}

export function CapacityPlanner({
  tasks,
  defaultCapacity = 480,
  className = "",
}: CapacityPlannerProps) {
  const [capacity, setCapacity] = useState(defaultCapacity);
  const [showSettings, setShowSettings] = useState(false);

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const tomorrow = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    return date;
  }, [today]);

  const tasksDueToday = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.dueDate || task.status === "done") return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate < tomorrow;
    }).map((task): TaskDueToday => ({
      ...task,
      estimatedTimeDisplay: task.estimatedTime ? formatDuration(task.estimatedTime) : "No estimate",
    }));
  }, [tasks, today, tomorrow]);

  const stats = useMemo(() => {
    let totalEstimated = 0;
    let tasksWithEstimates = 0;
    let tasksWithoutEstimates = 0;
    let completedTime = 0;

    tasksDueToday.forEach((task) => {
      if (task.estimatedTime && task.estimatedTime > 0) {
        totalEstimated += task.estimatedTime;
        tasksWithEstimates++;
      } else {
        tasksWithoutEstimates++;
      }
      if (task.totalFocusTime) {
        completedTime += task.totalFocusTime;
      }
    });

    const usagePercentage = capacity > 0 ? Math.round((totalEstimated / capacity) * 100) : 0;
    const remainingTime = capacity - totalEstimated;
    const isOverloaded = remainingTime < 0;

    return {
      totalEstimated,
      tasksWithEstimates,
      tasksWithoutEstimates,
      completedTime,
      usagePercentage,
      remainingTime,
      isOverloaded,
    };
  }, [tasksDueToday, capacity]);

  const getStatusColor = () => {
    if (stats.isOverloaded) {
      return "text-red-600 dark:text-red-400";
    }
    if (stats.usagePercentage >= 80) {
      return "text-yellow-600 dark:text-yellow-400";
    }
    return "text-green-600 dark:text-green-400";
  };

  const getProgressColor = () => {
    if (stats.isOverloaded) {
      return "bg-red-500";
    }
    if (stats.usagePercentage >= 80) {
      return "bg-yellow-500";
    }
    return "";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
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

  const capacityHours = capacity / 60;

  return (
    <Card className={className} data-testid="card-capacity-planner">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Today's Capacity
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowSettings(!showSettings)}
          data-testid="button-capacity-settings"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSettings && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
            <Label htmlFor="capacity-hours" className="text-sm whitespace-nowrap">
              Available hours:
            </Label>
            <Input
              id="capacity-hours"
              type="number"
              min={1}
              max={24}
              value={capacityHours}
              onChange={(e) => setCapacity(Number(e.target.value) * 60)}
              className="w-20"
              data-testid="input-capacity-hours"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Capacity Usage</span>
            <span className={getStatusColor()} data-testid="text-capacity-percentage">
              {formatDuration(stats.totalEstimated)} / {formatDuration(capacity)}
            </span>
          </div>
          <Progress 
            value={Math.min(stats.usagePercentage, 100)} 
            className={`h-3 ${getProgressColor()}`}
            data-testid="progress-capacity"
          />
        </div>

        <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
          {stats.isOverloaded ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              <span data-testid="text-capacity-warning">
                You're {formatDuration(Math.abs(stats.remainingTime))} over capacity
              </span>
            </>
          ) : stats.remainingTime > 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span data-testid="text-capacity-remaining">
                You have {formatDuration(stats.remainingTime)} remaining
              </span>
            </>
          ) : (
            <>
              <Timer className="h-4 w-4" />
              <span data-testid="text-capacity-full">Exactly at capacity</span>
            </>
          )}
        </div>

        {stats.tasksWithoutEstimates > 0 && (
          <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            <span data-testid="text-unestimated-warning">
              {stats.tasksWithoutEstimates} task{stats.tasksWithoutEstimates > 1 ? "s" : ""} without estimates
            </span>
          </div>
        )}

        {tasksDueToday.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Tasks Due Today
              </p>
              <Badge variant="secondary" size="sm">
                {tasksDueToday.length}
              </Badge>
            </div>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {tasksDueToday.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 p-2 bg-muted/50 rounded-md"
                    data-testid={`task-today-${task.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={getPriorityColor(task.priority)} size="sm">
                        {task.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.estimatedTimeDisplay}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {tasksDueToday.length === 0 && (
          <div className="py-4 text-center text-muted-foreground">
            <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tasks due today</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CapacityPlannerCompact({
  tasks,
  defaultCapacity = 480,
  className = "",
}: CapacityPlannerProps) {
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const tomorrow = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    return date;
  }, [today]);

  const stats = useMemo(() => {
    let totalEstimated = 0;
    let taskCount = 0;

    tasks.forEach((task) => {
      if (!task.dueDate || task.status === "done") return;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate >= today && dueDate < tomorrow) {
        taskCount++;
        if (task.estimatedTime) {
          totalEstimated += task.estimatedTime;
        }
      }
    });

    const remainingTime = defaultCapacity - totalEstimated;
    const isOverloaded = remainingTime < 0;
    const usagePercentage = defaultCapacity > 0 
      ? Math.round((totalEstimated / defaultCapacity) * 100) 
      : 0;

    return { totalEstimated, taskCount, remainingTime, isOverloaded, usagePercentage };
  }, [tasks, today, tomorrow, defaultCapacity]);

  if (stats.taskCount === 0) {
    return null;
  }

  const getStatusColor = () => {
    if (stats.isOverloaded) {
      return "text-red-600 dark:text-red-400";
    }
    if (stats.usagePercentage >= 80) {
      return "text-yellow-600 dark:text-yellow-400";
    }
    return "text-green-600 dark:text-green-400";
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <CalendarClock className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">Today:</span>
      <span className={getStatusColor()} data-testid="text-capacity-compact">
        {stats.taskCount} task{stats.taskCount !== 1 ? "s" : ""}
        {stats.totalEstimated > 0 && ` (${formatDuration(stats.totalEstimated)})`}
      </span>
      {stats.isOverloaded && (
        <Badge variant="destructive" size="sm">
          Over capacity
        </Badge>
      )}
    </div>
  );
}
