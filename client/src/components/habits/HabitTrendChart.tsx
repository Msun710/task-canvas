import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrendData {
  date: string;
  completionRate: number;
}

interface MetricsResponse {
  dailyStats?: TrendData[];
  trend?: 'up' | 'down' | 'stable';
  completionRate?: number;
}

export function HabitTrendChart() {
  const { data: heatmapData = [], isLoading: heatmapLoading } = useQuery<TrendData[]>({
    queryKey: ["/api/habits/analytics/heatmap", 30],
  });

  const { data: metricsData, isLoading: metricsLoading } = useQuery<MetricsResponse>({
    queryKey: ["/api/habits/analytics/metrics", "week"],
  });

  const isLoading = heatmapLoading || metricsLoading;
  const chartData = heatmapData.slice(-30).map(d => ({
    ...d,
    date: format(new Date(d.date), "MMM d"),
  }));

  const trend = metricsData?.trend || 'stable';
  const trendIcon = {
    up: <TrendingUp className="h-4 w-4" />,
    down: <TrendingDown className="h-4 w-4" />,
    stable: <Minus className="h-4 w-4" />,
  };
  const trendColor = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-rose-600 dark:text-rose-400",
    stable: "text-muted-foreground",
  };
  const trendBadgeVariant = {
    up: "outline" as const,
    down: "outline" as const,
    stable: "secondary" as const,
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completion Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-habit-trend">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Completion Trend (30 Days)</CardTitle>
        <Badge variant={trendBadgeVariant[trend]} className={trendColor[trend]}>
          {trendIcon[trend]}
          <span className="ml-1 capitalize">{trend}</span>
        </Badge>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            No data available yet
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  className="text-muted-foreground"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TrendData & { date: string };
                      return (
                        <div className="bg-popover border rounded-lg p-2 shadow-lg">
                          <p className="font-medium text-sm">{data.date}</p>
                          <p className="text-sm text-muted-foreground">
                            Completion: {Math.round(data.completionRate)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completionRate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorRate)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
