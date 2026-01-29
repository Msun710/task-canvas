import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: number | string;
  trend?: { direction: 'up' | 'down' | 'neutral'; percentage: number };
  goal?: number;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'warning' | 'success' | 'danger';
  subtitle?: string;
  trendLabel?: string;
  invertTrendColor?: boolean;
}

export function KpiCard({ 
  title, 
  value, 
  trend, 
  goal, 
  icon, 
  onClick, 
  variant = 'default', 
  subtitle,
  trendLabel = "vs last week",
  invertTrendColor = false
}: KpiCardProps) {
  const variantStyles = {
    default: "",
    warning: "border-amber-500/30 dark:border-amber-500/30",
    success: "border-green-500/30 dark:border-green-500/30",
    danger: "border-red-500/30 dark:border-red-500/30"
  };

  const variantIconStyles = {
    default: "text-muted-foreground",
    warning: "text-amber-500",
    success: "text-green-500",
    danger: "text-red-500"
  };

  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    if (direction === 'neutral') return "text-muted-foreground";
    if (invertTrendColor) {
      return direction === 'up' 
        ? "text-red-600 dark:text-red-400" 
        : "text-green-600 dark:text-green-400";
    }
    return direction === 'up' 
      ? "text-green-600 dark:text-green-400" 
      : "text-red-600 dark:text-red-400";
  };

  const TrendIcon = trend?.direction === 'up' 
    ? TrendingUp 
    : trend?.direction === 'down' 
      ? TrendingDown 
      : Minus;

  const progress = goal && typeof value === 'number' 
    ? Math.min(Math.round((value / goal) * 100), 100) 
    : null;

  return (
    <Card 
      className={cn(
        "transition-all duration-200",
        variantStyles[variant],
        onClick && "cursor-pointer hover-elevate"
      )}
      onClick={onClick}
      data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold" data-testid={`kpi-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                {value}
              </span>
              {goal && typeof value === 'number' && (
                <span className="text-xs text-muted-foreground">/ {goal}</span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={cn("flex-shrink-0", variantIconStyles[variant])}>
              {icon}
            </div>
          )}
        </div>

        {progress !== null && (
          <div className="mt-3">
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {progress}% of goal
            </p>
          </div>
        )}

        {trend && (
          <div className={cn("flex items-center gap-1 text-xs mt-2", getTrendColor(trend.direction))}>
            <TrendIcon className="h-3 w-3" />
            <span>
              {trend.direction !== 'neutral' && (trend.direction === 'up' ? '+' : '-')}
              {trend.percentage}% {trendLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
