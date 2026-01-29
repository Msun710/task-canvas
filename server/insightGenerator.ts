import { storage } from "./storage";
import type { Task, Habit, ProductivityInsight, InsertProductivityInsight } from "@shared/schema";
import { startOfDay, subDays, differenceInDays, isAfter, isBefore, addDays, getHours, format } from "date-fns";

interface InsightContext {
  userId: string;
  tasks: Task[];
  habits?: any[];
  pomodoroSessions?: any[];
}

async function generatePeakProductivityInsight(context: InsightContext): Promise<InsertProductivityInsight | null> {
  const completedTasks = context.tasks.filter(t => t.status === "done" && t.completedAt);
  
  if (completedTasks.length < 5) return null;

  const hourCounts: Record<number, number> = {};
  completedTasks.forEach(task => {
    const hour = getHours(new Date(task.completedAt!));
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)[0];

  if (!peakHour) return null;

  const hour = parseInt(peakHour[0]);
  const startHour = hour;
  const endHour = (hour + 2) % 24;
  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}${period}`;
  };

  return {
    userId: context.userId,
    type: "productivity",
    title: "Peak Productivity Time",
    description: `Your peak productivity is ${formatHour(startHour)}-${formatHour(endHour)}. You completed ${peakHour[1]} tasks during these hours.`,
    icon: "clock",
    priority: 2,
    isRead: false,
  };
}

async function generateStuckTasksInsight(context: InsightContext): Promise<InsertProductivityInsight | null> {
  const stuckTasks = context.tasks.filter(task => {
    if (task.status === "done" || task.status === "todo") return false;
    if (!task.updatedAt) return false;
    
    const daysSinceUpdate = differenceInDays(new Date(), new Date(task.updatedAt));
    return daysSinceUpdate >= 5;
  });

  if (stuckTasks.length === 0) return null;

  const reviewTasks = stuckTasks.filter(t => t.status === "review");
  const inProgressTasks = stuckTasks.filter(t => t.status === "in_progress");

  let description = "";
  if (reviewTasks.length > 0) {
    description = `${reviewTasks.length} task${reviewTasks.length > 1 ? 's' : ''} stuck in Review for over 5 days.`;
  } else if (inProgressTasks.length > 0) {
    description = `${inProgressTasks.length} task${inProgressTasks.length > 1 ? 's' : ''} in progress for over 5 days.`;
  }

  return {
    userId: context.userId,
    type: "warning",
    title: "Tasks Need Attention",
    description,
    icon: "alert",
    actionUrl: "/tasks?filter=stuck",
    priority: 3,
    isRead: false,
  };
}

async function generateWeeklyGoalInsight(context: InsightContext): Promise<InsertProductivityInsight | null> {
  const weekStart = startOfDay(subDays(new Date(), 7));
  const completedThisWeek = context.tasks.filter(task => {
    if (task.status !== "done" || !task.completedAt) return false;
    return isAfter(new Date(task.completedAt), weekStart);
  }).length;

  const lastWeekStart = subDays(weekStart, 7);
  const completedLastWeek = context.tasks.filter(task => {
    if (task.status !== "done" || !task.completedAt) return false;
    const completedDate = new Date(task.completedAt);
    return isAfter(completedDate, lastWeekStart) && isBefore(completedDate, weekStart);
  }).length;

  if (completedLastWeek === 0) return null;

  const percentChange = Math.round(((completedThisWeek - completedLastWeek) / completedLastWeek) * 100);

  if (percentChange > 0) {
    return {
      userId: context.userId,
      type: "achievement",
      title: "Exceeding Weekly Goal",
      description: `You're ${percentChange}% ahead of last week's pace with ${completedThisWeek} tasks completed.`,
      icon: "trophy",
      priority: 1,
      isRead: false,
    };
  }

  if (percentChange < -20) {
    return {
      userId: context.userId,
      type: "tip",
      title: "Weekly Pace Alert",
      description: `You're ${Math.abs(percentChange)}% behind last week. Focus on high-priority tasks to catch up.`,
      icon: "lightbulb",
      actionUrl: "/tasks?filter=priority-urgent",
      priority: 2,
      isRead: false,
    };
  }

  return null;
}

async function generateUpcomingDeadlinesInsight(context: InsightContext): Promise<InsertProductivityInsight | null> {
  const tomorrow = addDays(startOfDay(new Date()), 1);
  const nextWeek = addDays(startOfDay(new Date()), 7);

  const upcomingTasks = context.tasks.filter(task => {
    if (task.status === "done" || !task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return isAfter(dueDate, tomorrow) && isBefore(dueDate, nextWeek);
  });

  const urgentTasks = upcomingTasks.filter(t => t.priority === "urgent" || t.priority === "high");

  if (urgentTasks.length === 0 && upcomingTasks.length < 5) return null;

  if (urgentTasks.length > 0) {
    return {
      userId: context.userId,
      type: "deadline",
      title: "High-Priority Deadlines",
      description: `${urgentTasks.length} high-priority task${urgentTasks.length > 1 ? 's' : ''} due this week. Review your schedule.`,
      icon: "clock",
      actionUrl: "/schedule",
      priority: 4,
      isRead: false,
    };
  }

  return {
    userId: context.userId,
    type: "tip",
    title: "Week Ahead",
    description: `You have ${upcomingTasks.length} task${upcomingTasks.length > 1 ? 's' : ''} due this week. Plan your time wisely.`,
    icon: "lightbulb",
    actionUrl: "/schedule",
    priority: 1,
    isRead: false,
  };
}

async function generateStreakInsight(context: InsightContext): Promise<InsertProductivityInsight | null> {
  const completedByDate: Record<string, number> = {};
  
  context.tasks.forEach(task => {
    if (task.status === "done" && task.completedAt) {
      const dateKey = format(new Date(task.completedAt), "yyyy-MM-dd");
      completedByDate[dateKey] = (completedByDate[dateKey] || 0) + 1;
    }
  });

  let currentStreak = 0;
  let checkDate = startOfDay(new Date());
  
  while (true) {
    const dateKey = format(checkDate, "yyyy-MM-dd");
    if (completedByDate[dateKey] && completedByDate[dateKey] > 0) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    } else if (currentStreak === 0) {
      checkDate = subDays(checkDate, 1);
      const prevDateKey = format(checkDate, "yyyy-MM-dd");
      if (!completedByDate[prevDateKey]) break;
    } else {
      break;
    }
    
    if (currentStreak > 365) break;
  }

  if (currentStreak >= 7) {
    return {
      userId: context.userId,
      type: "streak",
      title: "Productivity Streak",
      description: `${currentStreak}-day streak! You've completed tasks every day for ${currentStreak} days.`,
      icon: "flame",
      priority: 1,
      isRead: false,
    };
  }

  return null;
}

async function generateBestDayInsight(context: InsightContext): Promise<InsertProductivityInsight | null> {
  const completedTasks = context.tasks.filter(t => t.status === "done" && t.completedAt);
  
  if (completedTasks.length < 10) return null;

  const dayOfWeekCounts: Record<number, number> = {};
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  completedTasks.forEach(task => {
    const dayOfWeek = new Date(task.completedAt!).getDay();
    dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
  });

  const bestDay = Object.entries(dayOfWeekCounts)
    .sort(([, a], [, b]) => b - a)[0];

  if (!bestDay) return null;

  const dayIndex = parseInt(bestDay[0]);
  const count = bestDay[1];
  const avgPerDay = completedTasks.length / 7;
  const percentAboveAvg = Math.round(((count - avgPerDay) / avgPerDay) * 100);

  if (percentAboveAvg < 20) return null;

  return {
    userId: context.userId,
    type: "trend",
    title: "Most Productive Day",
    description: `${dayNames[dayIndex]} is your most productive day with ${percentAboveAvg}% more completions than average.`,
    icon: "trending-up",
    priority: 1,
    isRead: false,
  };
}

export async function generateInsightsForUser(userId: string): Promise<ProductivityInsight[]> {
  try {
    const tasks = await storage.getTasksByUser(userId);
    
    const context: InsightContext = {
      userId,
      tasks,
    };

    const insightGenerators = [
      generatePeakProductivityInsight,
      generateStuckTasksInsight,
      generateWeeklyGoalInsight,
      generateUpcomingDeadlinesInsight,
      generateStreakInsight,
      generateBestDayInsight,
    ];

    const generatedInsights: InsertProductivityInsight[] = [];
    
    for (const generator of insightGenerators) {
      try {
        const insight = await generator(context);
        if (insight) {
          generatedInsights.push(insight);
        }
      } catch (error) {
        console.error("Error generating insight:", error);
      }
    }

    generatedInsights.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const topInsights = generatedInsights.slice(0, 4);

    const existingInsights = await storage.getInsights(userId);
    const existingTitles = new Set(existingInsights.filter(i => !i.isRead).map(i => i.title));

    const newInsights: ProductivityInsight[] = [];
    for (const insight of topInsights) {
      if (!existingTitles.has(insight.title)) {
        const created = await storage.createInsight(insight);
        newInsights.push(created);
      }
    }

    return newInsights;
  } catch (error) {
    console.error("Error generating insights for user:", error);
    return [];
  }
}

export async function cleanupExpiredInsights(userId: string): Promise<void> {
  try {
    const insights = await storage.getInsights(userId);
    const now = new Date();
    
    for (const insight of insights) {
      if (insight.expiresAt && isBefore(new Date(insight.expiresAt), now)) {
        await storage.markInsightRead(insight.id);
      }
    }
  } catch (error) {
    console.error("Error cleaning up expired insights:", error);
  }
}
