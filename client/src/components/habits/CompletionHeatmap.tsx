import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, subDays, startOfWeek, addDays, getDay } from "date-fns";

interface HeatmapDay {
  date: string;
  completionRate: number;
  habitsCompleted: number;
  totalHabits: number;
}

export function CompletionHeatmap() {
  const { data: heatmapData = [], isLoading } = useQuery<HeatmapDay[]>({
    queryKey: ["/api/habits/analytics/heatmap", 90],
  });

  const getColorIntensity = (rate: number) => {
    if (rate === 0) return "bg-muted";
    if (rate < 25) return "bg-emerald-200 dark:bg-emerald-900/50";
    if (rate < 50) return "bg-emerald-300 dark:bg-emerald-800/60";
    if (rate < 75) return "bg-emerald-400 dark:bg-emerald-700/70";
    if (rate < 100) return "bg-emerald-500 dark:bg-emerald-600";
    return "bg-emerald-600 dark:bg-emerald-500";
  };

  const getMonthLabels = () => {
    const labels: { month: string; offset: number }[] = [];
    let currentMonth = "";
    
    for (let i = 0; i < 90; i++) {
      const date = subDays(new Date(), 89 - i);
      const month = format(date, "MMM");
      if (month !== currentMonth) {
        const weekOffset = Math.floor(i / 7);
        labels.push({ month, offset: weekOffset });
        currentMonth = month;
      }
    }
    return labels;
  };

  const organizeDataByWeek = () => {
    const weeks: (HeatmapDay | null)[][] = [];
    const today = new Date();
    const startDate = subDays(today, 89);
    const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });
    
    let currentWeek: (HeatmapDay | null)[] = [];
    let currentDate = weekStart;
    
    const daysBeforeStart = getDay(startDate);
    for (let i = 0; i < daysBeforeStart; i++) {
      currentWeek.push(null);
    }
    
    const dataMap = new Map(heatmapData.map(d => [d.date, d]));
    
    for (let i = 0; i < 90; i++) {
      const dateStr = format(subDays(today, 89 - i), "yyyy-MM-dd");
      const dayData = dataMap.get(dateStr) || {
        date: dateStr,
        completionRate: 0,
        habitsCompleted: 0,
        totalHabits: 0,
      };
      
      currentWeek.push(dayData);
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabels = getMonthLabels();
  const weeks = organizeDataByWeek();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completion History</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-completion-heatmap">
      <CardHeader>
        <CardTitle className="text-base">Completion History (Last 90 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex gap-1 mb-1 ml-8">
              {monthLabels.map((label, idx) => (
                <div
                  key={idx}
                  className="text-xs text-muted-foreground"
                  style={{ marginLeft: idx === 0 ? 0 : `${(label.offset - (monthLabels[idx - 1]?.offset || 0) - 1) * 12}px` }}
                >
                  {label.month}
                </div>
              ))}
            </div>
            
            <div className="flex gap-1">
              <div className="flex flex-col gap-1 mr-1">
                {dayLabels.map((day, idx) => (
                  <div key={idx} className="h-3 text-xs text-muted-foreground flex items-center">
                    {idx % 2 === 1 ? day : ""}
                  </div>
                ))}
              </div>
              
              <div className="flex gap-1">
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-1">
                    {week.map((day, dayIdx) => (
                      <div key={dayIdx}>
                        {day ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`h-3 w-3 rounded-sm ${getColorIntensity(day.completionRate)} cursor-pointer transition-opacity hover:opacity-80`}
                                data-testid={`heatmap-day-${day.date}`}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <p className="font-medium">{format(new Date(day.date), "MMM d, yyyy")}</p>
                                <p className="text-muted-foreground">
                                  {day.habitsCompleted} / {day.totalHabits} completed ({Math.round(day.completionRate)}%)
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="h-3 w-3" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="h-3 w-3 rounded-sm bg-muted" />
                <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/50" />
                <div className="h-3 w-3 rounded-sm bg-emerald-300 dark:bg-emerald-800/60" />
                <div className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-700/70" />
                <div className="h-3 w-3 rounded-sm bg-emerald-500 dark:bg-emerald-600" />
                <div className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
