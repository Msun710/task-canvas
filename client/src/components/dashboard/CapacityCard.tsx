import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Gauge, Clock, CalendarCheck, Timer, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CapacityBreakdown {
  meetings: number;
  focusTime: number;
  tasks: number;
}

interface CapacityData {
  totalHours: number;
  scheduledHours: number;
  availableHours: number;
  status: "available" | "at_capacity" | "overbooked";
  breakdown: CapacityBreakdown;
}

interface CapacityCardProps {
  capacity: CapacityData;
  className?: string;
}

function formatHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

export function CapacityCard({ capacity, className }: CapacityCardProps) {
  const usagePercentage =
    capacity.totalHours > 0
      ? Math.min(Math.round((capacity.scheduledHours / capacity.totalHours) * 100), 100)
      : 0;

  const getStatusColor = () => {
    switch (capacity.status) {
      case "available":
        return "text-green-600 dark:text-green-400";
      case "at_capacity":
        return "text-yellow-600 dark:text-yellow-400";
      case "overbooked":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getProgressIndicatorClass = () => {
    switch (capacity.status) {
      case "available":
        return "";
      case "at_capacity":
        return "[&>div]:bg-yellow-500";
      case "overbooked":
        return "[&>div]:bg-red-500";
      default:
        return "";
    }
  };

  const getStatusIcon = () => {
    switch (capacity.status) {
      case "available":
        return <CheckCircle2 className="h-4 w-4" />;
      case "at_capacity":
        return <Clock className="h-4 w-4" />;
      case "overbooked":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (capacity.status) {
      case "available":
        return `${formatHours(capacity.availableHours)} available`;
      case "at_capacity":
        return "At capacity";
      case "overbooked":
        return `${formatHours(Math.abs(capacity.availableHours))} over capacity`;
      default:
        return "";
    }
  };

  const breakdownItems = [
    {
      icon: CalendarCheck,
      label: "Meetings",
      value: capacity.breakdown.meetings,
    },
    {
      icon: Timer,
      label: "Focus Time",
      value: capacity.breakdown.focusTime,
    },
    {
      icon: Clock,
      label: "Task Estimates",
      value: capacity.breakdown.tasks,
    },
  ].filter((item) => item.value > 0);

  return (
    <Card className={className} data-testid="card-capacity">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Gauge className="h-4 w-4" />
          Today's Capacity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Capacity Usage</span>
            <span className={getStatusColor()}>
              {formatHours(capacity.scheduledHours)} / {formatHours(capacity.totalHours)}
            </span>
          </div>
          <Progress
            value={usagePercentage}
            className={cn("h-2.5", getProgressIndicatorClass())}
            data-testid="progress-capacity"
          />
        </div>

        <div className={cn("flex items-center gap-2 text-sm font-medium", getStatusColor())}>
          {getStatusIcon()}
          <span data-testid="text-capacity-status">{getStatusMessage()}</span>
        </div>

        {breakdownItems.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Breakdown</p>
            <div className="space-y-1.5">
              {breakdownItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between text-sm"
                  data-testid={`breakdown-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                  <span className="font-medium">{formatHours(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {breakdownItems.length === 0 && capacity.scheduledHours === 0 && (
          <div className="py-2 text-center text-muted-foreground">
            <p className="text-sm">No scheduled time today</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
