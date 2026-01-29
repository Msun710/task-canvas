import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays, isToday, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

interface WeeklyActivityChartProps {
  className?: string;
}

interface WeeklyDataPoint {
  day: string;
  date: Date;
  completed: number;
  isToday: boolean;
}

function ChartSkeleton() {
  return (
    <div className="h-[180px] flex items-end justify-between gap-2 px-4">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <Skeleton
            className="w-full rounded-t-md"
            style={{ height: `${Math.random() * 100 + 40}px` }}
          />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover border border-border rounded-md shadow-md p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-muted-foreground">Tasks completed:</span>
        <span className="font-medium">{payload[0].value}</span>
      </div>
    </div>
  );
};

export function WeeklyActivityChart({ className }: WeeklyActivityChartProps) {
  const { data, isLoading } = useQuery<{ weeklyData: { date: string; completed: number }[] }>({
    queryKey: ["/api/analytics/weekly-completions"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/weekly-completions");
      if (!res.ok) throw new Error("Failed to fetch weekly data");
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const defaultData: WeeklyDataPoint[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      day: format(date, "EEE"),
      date,
      completed: 0,
      isToday: isToday(date),
    };
  });

  const chartData = data?.weeklyData
    ? defaultData.map((d) => {
        const match = data.weeklyData.find(
          (w) => format(new Date(w.date), "yyyy-MM-dd") === format(d.date, "yyyy-MM-dd")
        );
        return {
          ...d,
          completed: match?.completed || 0,
        };
      })
    : defaultData;

  const average =
    chartData.reduce((sum, d) => sum + d.completed, 0) / chartData.length;
  const maxCompleted = Math.max(...chartData.map((d) => d.completed), 1);

  if (isLoading) {
    return (
      <Card className={className} data-testid="weekly-chart-loading">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <CalendarDays className="h-4 w-4" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="weekly-activity-chart">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <CalendarDays className="h-4 w-4" />
          This Week
        </CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Completed
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4 bg-orange-500" />
            Avg: {average.toFixed(1)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                width={25}
                domain={[0, Math.max(maxCompleted, Math.ceil(average) + 1)]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={average}
                stroke="#f97316"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
              <Bar dataKey="completed" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isToday ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.6)"}
                    stroke={entry.isToday ? "hsl(var(--primary))" : "transparent"}
                    strokeWidth={entry.isToday ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Total: <span className="font-medium text-foreground">{chartData.reduce((s, d) => s + d.completed, 0)}</span> tasks
          </span>
          <span>
            Best day:{" "}
            <span className="font-medium text-foreground">
              {chartData.reduce((best, d) => (d.completed > best.completed ? d : best), chartData[0]).day}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
