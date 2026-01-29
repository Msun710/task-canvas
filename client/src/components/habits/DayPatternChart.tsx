import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Calendar, AlertTriangle } from "lucide-react";

interface DayPattern {
  day: string;
  dayOfWeek: number;
  completionRate: number;
  completions: number;
  scheduled: number;
}

export function DayPatternChart() {
  const { data: patterns = [], isLoading } = useQuery<DayPattern[]>({
    queryKey: ["/api/habits/analytics/day-patterns"],
  });

  const dayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const chartData = dayOrder.map(day => {
    const found = patterns.find(p => p.day === day);
    return found || { day, dayOfWeek: dayOrder.indexOf(day), completionRate: 0, completions: 0, scheduled: 0 };
  });

  const bestDay = chartData.reduce((max, curr) => 
    curr.completionRate > max.completionRate ? curr : max, 
    chartData[0]
  );

  const worstDay = chartData.reduce((min, curr) => 
    curr.completionRate < min.completionRate && curr.scheduled > 0 ? curr : min, 
    chartData.find(d => d.scheduled > 0) || chartData[0]
  );

  const getBarColor = (rate: number) => {
    if (rate >= 80) return "hsl(142, 76%, 36%)";
    if (rate >= 50) return "hsl(45, 93%, 47%)";
    return "hsl(0, 84%, 60%)";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completion by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = chartData.some(d => d.scheduled > 0);

  return (
    <Card data-testid="card-day-pattern">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-base">Completion by Day</CardTitle>
        {hasData && (
          <div className="flex flex-col gap-1 items-end">
            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
              <Calendar className="h-3 w-3 mr-1" />
              Best: {bestDay.day}
            </Badge>
            {worstDay.completionRate < 50 && worstDay.scheduled > 0 && (
              <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Watch: {worstDay.day}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            No day pattern data available yet
          </div>
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
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
                      const data = payload[0].payload as DayPattern;
                      return (
                        <div className="bg-popover border rounded-lg p-2 shadow-lg">
                          <p className="font-medium text-sm">{data.day}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.completions} / {data.scheduled} completed
                          </p>
                          <p className="text-sm font-medium">
                            {Math.round(data.completionRate)}% completion
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="completionRate" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.completionRate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
