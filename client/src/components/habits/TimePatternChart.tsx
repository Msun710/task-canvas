import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Clock } from "lucide-react";

interface TimePattern {
  hour: number;
  completions: number;
  completionRate: number;
}

export function TimePatternChart() {
  const { data: patterns = [], isLoading } = useQuery<TimePattern[]>({
    queryKey: ["/api/habits/analytics/time-patterns"],
  });

  const chartData = patterns.map(p => ({
    ...p,
    hourLabel: `${p.hour.toString().padStart(2, "0")}:00`,
    shortLabel: p.hour.toString().padStart(2, "0"),
  }));

  const peakHour = chartData.reduce((max, curr) => 
    curr.completions > max.completions ? curr : max, 
    chartData[0] || { hour: 0, completions: 0, hourLabel: "00:00" }
  );

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? "AM" : "PM";
    return `${h}:00 ${ampm}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completion by Time</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = chartData.some(d => d.completions > 0);

  return (
    <Card data-testid="card-time-pattern">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Completion by Time</CardTitle>
        {hasData && peakHour && (
          <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
            <Clock className="h-3 w-3 mr-1" />
            Peak: {formatHour(peakHour.hour)}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            No time pattern data available yet
          </div>
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TimePattern & { hourLabel: string };
                      return (
                        <div className="bg-popover border rounded-lg p-2 shadow-lg">
                          <p className="font-medium text-sm">{formatHour(data.hour)}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.completions} completions
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="completions" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hour === peakHour?.hour 
                        ? "hsl(var(--primary))" 
                        : "hsl(var(--muted-foreground) / 0.3)"}
                    />
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
