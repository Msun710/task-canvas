import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Timer, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { Task } from "@shared/schema";

interface DurationSummaryProps {
  tasks: Task[];
  showCapacity?: boolean;
  compact?: boolean;
  className?: string;
}

interface DurationStats {
  totalEstimated: number;
  totalActual: number;
  tasksWithEstimates: number;
  tasksWithoutEstimates: number;
  percentage: number;
  status: "under" | "approaching" | "over" | "none";
}

function calculateDurationStats(tasks: Task[]): DurationStats {
  let totalEstimated = 0;
  let totalActual = 0;
  let tasksWithEstimates = 0;
  let tasksWithoutEstimates = 0;

  tasks.forEach((task) => {
    if (task.estimatedTime && task.estimatedTime > 0) {
      totalEstimated += task.estimatedTime;
      tasksWithEstimates++;
    } else {
      tasksWithoutEstimates++;
    }
    if (task.totalFocusTime && task.totalFocusTime > 0) {
      totalActual += task.totalFocusTime;
    }
  });

  let percentage = 0;
  let status: "under" | "approaching" | "over" | "none" = "none";

  if (totalEstimated > 0) {
    percentage = Math.round((totalActual / totalEstimated) * 100);
    if (percentage >= 100) {
      status = "over";
    } else if (percentage >= 80) {
      status = "approaching";
    } else {
      status = "under";
    }
  }

  return {
    totalEstimated,
    totalActual,
    tasksWithEstimates,
    tasksWithoutEstimates,
    percentage,
    status,
  };
}

export function DurationSummary({
  tasks,
  showCapacity = false,
  compact = false,
  className = "",
}: DurationSummaryProps) {
  const stats = useMemo(() => calculateDurationStats(tasks), [tasks]);

  const getStatusColor = () => {
    switch (stats.status) {
      case "over":
        return "text-red-600 dark:text-red-400";
      case "approaching":
        return "text-yellow-600 dark:text-yellow-400";
      case "under":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getProgressColor = () => {
    switch (stats.status) {
      case "over":
        return "bg-red-500";
      case "approaching":
        return "bg-yellow-500";
      default:
        return "";
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Timer className="h-4 w-4" />
        <span data-testid="text-duration-compact">
          {formatDuration(stats.totalEstimated) || "0m"} estimated
          {stats.totalActual > 0 && (
            <span className={getStatusColor()}>
              {" / "}
              {formatDuration(stats.totalActual)} tracked
            </span>
          )}
        </span>
        {stats.tasksWithoutEstimates > 0 && (
          <Badge variant="secondary" size="sm" data-testid="badge-no-estimates">
            {stats.tasksWithoutEstimates} unestimated
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className} data-testid="card-duration-summary">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Time Summary</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Estimated</p>
            <p className="text-2xl font-bold" data-testid="text-total-estimated">
              {formatDuration(stats.totalEstimated) || "0m"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tracked</p>
            <p className={`text-2xl font-bold ${getStatusColor()}`} data-testid="text-total-actual">
              {formatDuration(stats.totalActual) || "0m"}
            </p>
          </div>
        </div>

        {stats.totalEstimated > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className={getStatusColor()} data-testid="text-progress-percentage">
                {stats.percentage}%
              </span>
            </div>
            <Progress 
              value={Math.min(stats.percentage, 100)} 
              className={`h-2 ${getProgressColor()}`} 
              data-testid="progress-duration"
            />
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span data-testid="text-with-estimates">
              {stats.tasksWithEstimates} tasks with estimates
            </span>
          </div>
          {stats.tasksWithoutEstimates > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span data-testid="text-without-estimates">
                {stats.tasksWithoutEstimates} unestimated
              </span>
            </div>
          )}
        </div>

        {showCapacity && stats.status !== "none" && (
          <div className="pt-2 border-t">
            {stats.status === "over" && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Over budget by {formatDuration(stats.totalActual - stats.totalEstimated)}
              </p>
            )}
            {stats.status === "approaching" && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Approaching estimate ({formatDuration(stats.totalEstimated - stats.totalActual)} remaining)
              </p>
            )}
            {stats.status === "under" && (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {formatDuration(stats.totalEstimated - stats.totalActual)} remaining
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DurationSummaryInline({
  tasks,
  className = "",
}: {
  tasks: Task[];
  className?: string;
}) {
  const stats = useMemo(() => calculateDurationStats(tasks), [tasks]);

  if (stats.totalEstimated === 0 && stats.totalActual === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <Timer className="h-3.5 w-3.5" />
      <span data-testid="text-duration-inline">
        {formatDuration(stats.totalEstimated) || "0m"}
        {stats.totalActual > 0 && ` / ${formatDuration(stats.totalActual)}`}
      </span>
    </div>
  );
}
