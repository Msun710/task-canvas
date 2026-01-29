import { KpiCard } from "./KpiCard";
import {
  ListTodo,
  Clock,
  AlertCircle,
  CheckCircle2,
  Timer,
  CalendarDays
} from "lucide-react";
import type { Task, PomodoroSession } from "@shared/schema";

interface KpiCardsRowProps {
  tasks: Task[];
  pomodoroSessions?: PomodoroSession[];
  onCardClick?: (cardType: string) => void;
}

function isToday(date: Date | string): boolean {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

function isThisWeek(date: Date | string): boolean {
  const d = new Date(date);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function KpiCardsRow({ tasks, pomodoroSessions = [], onCardClick }: KpiCardsRowProps) {
  const now = new Date();
  
  const totalTasks = tasks.filter(t => !t.isArchived).length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress" && !t.isArchived).length;
  
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.isArchived) return false;
    return new Date(t.dueDate) < now && t.status !== "done";
  }).length;
  
  const completedToday = tasks.filter(t => 
    t.status === "done" && t.completedAt && isToday(t.completedAt)
  ).length;
  
  const todaySessions = pomodoroSessions.filter(s => 
    s.completedAt && isToday(s.completedAt) && s.sessionType === "work"
  );
  const focusTimeMinutes = todaySessions.reduce((acc, s) => acc + (s.completedDuration || 0), 0);
  const pomodoroCount = todaySessions.length;
  
  const weekDueTasks = tasks.filter(t => 
    t.dueDate && isThisWeek(t.dueDate) && !t.isArchived
  ).length;
  const weekCompletedTasks = tasks.filter(t => 
    t.completedAt && isThisWeek(t.completedAt) && t.status === "done"
  ).length;
  
  const dailyGoal = 5;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard
        title="Total Tasks"
        value={totalTasks}
        subtitle={`${tasks.filter(t => t.status === "done").length} completed`}
        icon={<ListTodo className="h-5 w-5" />}
        onClick={() => onCardClick?.("total")}
      />
      
      <KpiCard
        title="In Progress"
        value={inProgressTasks}
        subtitle="Active tasks"
        icon={<Clock className="h-5 w-5" />}
        variant={inProgressTasks > 5 ? "warning" : "default"}
        onClick={() => onCardClick?.("in_progress")}
      />
      
      <KpiCard
        title="Overdue"
        value={overdueTasks}
        subtitle="Need attention"
        icon={<AlertCircle className="h-5 w-5" />}
        variant={overdueTasks > 0 ? "danger" : "default"}
        invertTrendColor
        onClick={() => onCardClick?.("overdue")}
      />
      
      <KpiCard
        title="Completed Today"
        value={completedToday}
        goal={dailyGoal}
        subtitle={`Goal: ${dailyGoal} tasks`}
        icon={<CheckCircle2 className="h-5 w-5" />}
        variant={completedToday >= dailyGoal ? "success" : "default"}
        onClick={() => onCardClick?.("completed_today")}
      />
      
      <KpiCard
        title="Focus Time"
        value={formatDuration(focusTimeMinutes)}
        subtitle={`${pomodoroCount} pomodoro${pomodoroCount !== 1 ? 's' : ''}`}
        icon={<Timer className="h-5 w-5" />}
        onClick={() => onCardClick?.("focus_time")}
      />
      
      <KpiCard
        title="This Week"
        value={weekCompletedTasks}
        subtitle={`${weekDueTasks} due this week`}
        icon={<CalendarDays className="h-5 w-5" />}
        onClick={() => onCardClick?.("week_summary")}
      />
    </div>
  );
}
