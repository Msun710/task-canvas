import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompletionChartProps {
  className?: string;
}

interface TrendDataPoint {
  date: string;
  completed: number;
  created: number;
  overdue: number;
}

interface ChartStats {
  totalCompleted: number;
  totalCreated: number;
  totalOverdue: number;
  completionRate: number;
  trend: "up" | "down" | "stable";
}

type Period = "7days" | "30days" | "90days";

function calculateStats(data: TrendDataPoint[]): ChartStats {
  if (!data.length) {
    return {
      totalCompleted: 0,
      totalCreated: 0,
      totalOverdue: 0,
      completionRate: 0,
      trend: "stable",
    };
  }

  const totalCompleted = data.reduce((sum, d) => sum + d.completed, 0);
  const totalCreated = data.reduce((sum, d) => sum + d.created, 0);
  const totalOverdue = data.reduce((sum, d) => sum + d.overdue, 0);
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

  const midPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midPoint);
  const secondHalf = data.slice(midPoint);
  
  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.completed, 0) / (firstHalf.length || 1);
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.completed, 0) / (secondHalf.length || 1);
  
  let trend: "up" | "down" | "stable" = "stable";
  if (secondHalfAvg > firstHalfAvg * 1.1) trend = "up";
  else if (secondHalfAvg < firstHalfAvg * 0.9) trend = "down";

  return { totalCompleted, totalCreated, totalOverdue, completionRate, trend };
}

function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  color,
}: {
  label: string;
  value: number | string;
  trend?: "up" | "down" | "stable";
  color?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        <span className={cn("text-2xl font-bold", color)}>{value}</span>
        {trend && (
          <span className="flex items-center">
            {trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
            {trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
            {trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
          </span>
        )}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover border border-border rounded-md shadow-md p-3 text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function CompletionChart({ className }: CompletionChartProps) {
  const [period, setPeriod] = useState<Period>("7days");

  const days = period === "7days" ? 7 : period === "30days" ? 30 : 90;
  const endDate = startOfDay(new Date());
  const startDate = subDays(endDate, days);

  const { data, isLoading } = useQuery<{ data: TrendDataPoint[] }>({
    queryKey: ["/api/analytics/trends", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/trends?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch trends");
      return res.json();
    },
  });

  const chartData = data?.data || [];
  const stats = calculateStats(chartData);

  const formattedData = chartData.map((d) => ({
    ...d,
    name: format(new Date(d.date), period === "7days" ? "EEE" : "MMM d"),
  }));

  if (isLoading) {
    return (
      <Card className={className} data-testid="completion-chart-loading">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <BarChart3 className="h-4 w-4" />
            Task Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="completion-chart">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <BarChart3 className="h-4 w-4" />
          Task Trends
        </CardTitle>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="h-8">
            <TabsTrigger value="7days" className="text-xs px-2" data-testid="tab-7days">
              Week
            </TabsTrigger>
            <TabsTrigger value="30days" className="text-xs px-2" data-testid="tab-30days">
              Month
            </TabsTrigger>
            <TabsTrigger value="90days" className="text-xs px-2" data-testid="tab-90days">
              3 Months
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 mb-4 flex-wrap">
          <StatCard
            label="Completed"
            value={stats.totalCompleted}
            trend={stats.trend}
            color="text-green-500"
          />
          <StatCard
            label="Created"
            value={stats.totalCreated}
            color="text-blue-500"
          />
          <StatCard
            label="Overdue"
            value={stats.totalOverdue}
            color="text-red-500"
          />
          <StatCard
            label="Completion Rate"
            value={`${stats.completionRate}%`}
          />
        </div>

        {formattedData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No data available for this period
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
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
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="overdue"
                  name="Overdue"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
