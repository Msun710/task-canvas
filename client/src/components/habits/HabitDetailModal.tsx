import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Flame,
  Calendar,
  Target,
  Clock,
  TrendingUp,
  Archive,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import type { HabitWithSubHabits, HabitOccurrence } from "@shared/schema";

interface HabitDetailModalProps {
  habit: HabitWithSubHabits | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (habit: HabitWithSubHabits) => void;
  onDelete: (habit: HabitWithSubHabits) => void;
}

interface JournalEntry {
  id: string;
  note: string | null;
  mood: string | null;
  energyLevel: string | null;
  createdAt: string;
}

interface SubHabitStats {
  id: string;
  name: string;
  totalCompletions: number;
  streakCount: number;
  longestStreak: number;
  completionRate: number;
}

export function HabitDetailModal({
  habit,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: HabitDetailModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { toast } = useToast();

  const { data: journalEntries = [] } = useQuery<JournalEntry[]>({
    queryKey: ["/api/habit-journal", habit?.id],
    queryFn: async () => {
      if (!habit?.id) return [];
      const response = await fetch(`/api/habit-journal?habitId=${habit.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!habit?.id && isOpen,
  });

  const { data: subHabitStats = [] } = useQuery<SubHabitStats[]>({
    queryKey: ["/api/habits", habit?.id, "sub-habits/stats"],
    queryFn: async () => {
      if (!habit?.id || !habit.subHabits?.length) return [];
      const response = await fetch(`/api/habits/${habit.id}/sub-habits/stats`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!habit?.id && !!habit?.subHabits?.length && isOpen,
  });

  const { data: occurrences = [] } = useQuery<HabitOccurrence[]>({
    queryKey: ["/api/habits", habit?.id, "occurrences"],
    queryFn: async () => {
      if (!habit?.id) return [];
      const response = await fetch(`/api/habits/${habit.id}/with-sub-habits`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.occurrences || [];
    },
    enabled: !!habit?.id && isOpen,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/habits/${id}`, { isArchived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({ title: "Habit archived" });
      onClose();
    },
  });

  if (!habit) return null;

  const streakData = generateStreakData(occurrences);
  const completedDates = occurrences
    .filter((o) => o.status === "completed" && o.completedAt)
    .map((o) => new Date(o.completedAt!));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const completionRate =
    occurrences.length > 0
      ? Math.round(
          (occurrences.filter((o) => o.status === "completed").length /
            occurrences.length) *
            100
        )
      : 0;

  const averageCompletionTime = habit.averageCompletionTime || 0;

  const getMoodIcon = (mood: string | null) => {
    switch (mood) {
      case "great": return "Wonderful";
      case "good": return "Good";
      case "okay": return "Neutral";
      case "bad": return "Low";
      case "terrible": return "Struggling";
      default: return mood || "No mood";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="modal-habit-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: habit.color || "#3B82F6" }}
            />
            <span data-testid="text-habit-detail-title">{habit.name}</span>
            {(habit.streakCount || 0) > 0 && (
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                <Flame className="h-3 w-3 mr-1" />
                {habit.streakCount} day streak
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{habit.description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar</TabsTrigger>
            <TabsTrigger value="progress" data-testid="tab-progress">Progress</TabsTrigger>
            <TabsTrigger value="journal" data-testid="tab-journal">Journal</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Total Completions</div>
                  <div className="text-2xl font-bold" data-testid="stat-total-completions">
                    {habit.totalCompletions || 0}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Current Streak</div>
                  <div className="text-2xl font-bold flex items-center gap-1" data-testid="stat-current-streak">
                    <Flame className="h-5 w-5 text-orange-500" />
                    {habit.streakCount || 0}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Best Streak</div>
                  <div className="text-2xl font-bold" data-testid="stat-best-streak">
                    {habit.longestStreak || 0}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Completion Rate</div>
                  <div className="text-2xl font-bold" data-testid="stat-completion-rate">
                    {completionRate}%
                  </div>
                </Card>
              </div>

              {averageCompletionTime > 0 && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Average completion time: {formatDuration(averageCompletionTime)}</span>
                  </div>
                </Card>
              )}

              {habit.subHabits && habit.subHabits.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Sub-Habits Breakdown
                  </h4>
                  <div className="space-y-2">
                    {habit.subHabits.map((sub) => {
                      const stats = subHabitStats.find((s) => s.id === sub.id);
                      return (
                        <Card key={sub.id} className="p-3" data-testid={`sub-habit-stat-${sub.id}`}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-medium">{sub.name}</span>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{stats?.totalCompletions || sub.totalCompletions || 0} completions</span>
                              {(stats?.streakCount || sub.streakCount || 0) > 0 && (
                                <span className="flex items-center gap-1 text-orange-500">
                                  <Flame className="h-3 w-3" />
                                  {stats?.streakCount || sub.streakCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar" className="mt-0">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium">{format(currentMonth, "MMMM yyyy")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-muted-foreground font-medium py-2">
                      {day}
                    </div>
                  ))}

                  {Array.from({ length: getDay(monthStart) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}

                  {daysInMonth.map((day) => {
                    const isCompleted = completedDates.some((d) => isSameDay(d, day));
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={day.toISOString()}
                        className={`aspect-square flex items-center justify-center rounded-md text-sm ${
                          isToday ? "border-2 border-foreground" : ""
                        }`}
                        data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                      >
                        <div className="relative">
                          {format(day, "d")}
                          {isCompleted && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-green-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="mt-0 space-y-4">
              <Card className="p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Streak Over Time
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={streakData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="streak"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Completion Rate Progress
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span className="font-medium">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-3" />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="journal" className="mt-0 space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>Journal Entries ({journalEntries.length})</span>
              </div>

              {journalEntries.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No journal entries yet</p>
                  <p className="text-sm">Complete habits and add notes to see them here</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {journalEntries.map((entry) => (
                    <Card key={entry.id} className="p-4" data-testid={`journal-entry-${entry.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          {entry.note && <p>{entry.note}</p>}
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {entry.mood && (
                              <Badge variant="outline">{getMoodIcon(entry.mood)}</Badge>
                            )}
                            {entry.energyLevel && (
                              <Badge variant="outline">Energy: {entry.energyLevel}</Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(entry.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex items-center justify-between gap-2 pt-4 border-t flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(habit)}
              data-testid="button-edit-habit"
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => archiveMutation.mutate(habit.id)}
              data-testid="button-archive-habit"
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(habit)}
            data-testid="button-delete-habit"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function generateStreakData(occurrences: HabitOccurrence[]) {
  const sorted = [...occurrences]
    .filter((o) => o.completedAt)
    .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

  if (sorted.length === 0) return [];

  const data: { date: string; streak: number }[] = [];
  let currentStreak = 0;

  sorted.forEach((occ) => {
    if (occ.status === "completed") {
      currentStreak++;
    } else {
      currentStreak = 0;
    }
    data.push({
      date: format(new Date(occ.scheduledDate), "MMM d"),
      streak: currentStreak,
    });
  });

  return data.slice(-30);
}

function formatDuration(minutes: number) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
