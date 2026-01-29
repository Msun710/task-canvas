import { useQuery } from "@tanstack/react-query";
import type { Task } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Zap, Target, Timer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FocusSuggestedTasksProps {
  availableMinutes?: number;
  onSelectTask: (task: Task) => void;
}

const priorityOrder: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatFocusTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function FocusSuggestedTasks({ 
  availableMinutes = 25, 
  onSelectTask 
}: FocusSuggestedTasksProps) {
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const suggestedTasks = (tasks || [])
    .filter((task) => {
      if (task.status === "done") return false;
      if (task.isArchived) return false;
      const estimatedMinutes = task.estimatedTime || 0;
      if (estimatedMinutes > availableMinutes && estimatedMinutes > 0) return false;
      return true;
    })
    .map((task) => {
      const priorityScore = priorityOrder[task.priority] || 2;
      const recencyPenalty = task.lastFocusedAt
        ? Math.max(0, 1 - (Date.now() - new Date(task.lastFocusedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const hasEstimate = task.estimatedTime && task.estimatedTime > 0 ? 1 : 0;
      const score = priorityScore * 10 + hasEstimate * 5 - recencyPenalty * 3;
      
      return { task, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ task }) => task);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Good for Focus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-2 p-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (suggestedTasks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Good for Focus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No tasks available for a {availableMinutes} minute focus session. 
            Try adding tasks with estimated time or increase your available time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Good for Focus
          <Badge variant="secondary" className="ml-auto text-xs">
            {availableMinutes}m available
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestedTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate"
            data-testid={`focus-task-${task.id}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid={`task-title-${task.id}`}>
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${priorityColors[task.priority] || priorityColors.medium}`}
                  data-testid={`priority-badge-${task.id}`}
                >
                  {task.priority}
                </Badge>
                {task.estimatedTime && task.estimatedTime > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatEstimatedTime(task.estimatedTime)}
                  </span>
                )}
                {task.totalFocusTime && task.totalFocusTime > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {formatFocusTime(task.totalFocusTime)} focused
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onSelectTask(task)}
              className="shrink-0"
              data-testid={`start-focus-${task.id}`}
            >
              <Zap className="h-4 w-4 mr-1" />
              Focus
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
