import { storage } from "./storage";
import { db } from "./db";
import {
  habits,
  habitOccurrences,
  habitJournal,
  type Habit,
  type HabitOccurrence,
  type InsertHabitInsight,
} from "@shared/schema";
import { eq, and, gte, lte, desc, isNotNull } from "drizzle-orm";
import {
  startOfDay,
  endOfDay,
  subDays,
  addDays,
  getHours,
  getDay,
  differenceInHours,
  parseISO,
  format,
} from "date-fns";

interface InsightGeneratorContext {
  userId: string;
  habits: Habit[];
  occurrences: HabitOccurrence[];
  existingInsightTypes: Set<string>;
}

const INSIGHT_EXPIRY_DAYS = 7;
const MILESTONE_STREAKS = [7, 21, 30, 50, 100, 365];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${period}`;
}

function getExpirationDate(): Date {
  return addDays(new Date(), INSIGHT_EXPIRY_DAYS);
}

async function hasSimilarRecentInsight(
  userId: string,
  type: string,
  habitId?: string
): Promise<boolean> {
  const existingInsights = await storage.getHabitInsights(userId, { limit: 100 });
  const sevenDaysAgo = subDays(new Date(), 7);
  
  return existingInsights.some((insight) => {
    const createdAt = insight.createdAt ? new Date(insight.createdAt) : new Date();
    const isRecent = createdAt > sevenDaysAgo;
    const sameType = insight.type === type;
    const sameHabit = habitId ? insight.habitId === habitId : true;
    return isRecent && sameType && sameHabit;
  });
}

async function generatePeakTimeInsight(
  context: InsightGeneratorContext
): Promise<InsertHabitInsight | null> {
  const completedOccurrences = context.occurrences.filter(
    (o) => o.completedAt && o.status === "completed"
  );

  if (completedOccurrences.length < 10) return null;

  const hourCounts: Record<number, number> = {};
  completedOccurrences.forEach((occurrence) => {
    if (occurrence.completedAt) {
      const hour = getHours(new Date(occurrence.completedAt));
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });

  const sortedHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count);

  if (sortedHours.length === 0) return null;

  const peakHour = sortedHours[0];
  const totalCompletions = completedOccurrences.length;
  const percentage = Math.round((peakHour.count / totalCompletions) * 100);

  if (await hasSimilarRecentInsight(context.userId, "peak_time")) return null;

  return {
    userId: context.userId,
    type: "peak_time",
    title: "Peak Productivity Time",
    description: `You're most productive at ${formatHour(peakHour.hour)}. ${peakHour.count} habits (${percentage}%) completed during this hour. Consider scheduling difficult habits then.`,
    data: { peakHour: peakHour.hour, count: peakHour.count, percentage },
    habitId: null,
    isRead: false,
    expiresAt: getExpirationDate(),
  };
}

async function generatePatternInsights(
  context: InsightGeneratorContext
): Promise<InsertHabitInsight[]> {
  const insights: InsertHabitInsight[] = [];
  const thirtyDaysAgo = subDays(new Date(), 30);
  
  const recentOccurrences = context.occurrences.filter(
    (o) => o.scheduledDate && new Date(o.scheduledDate) >= thirtyDaysAgo
  );

  if (recentOccurrences.length < 14) return insights;

  const dayStats: Record<number, { total: number; completed: number }> = {};
  for (let i = 0; i < 7; i++) {
    dayStats[i] = { total: 0, completed: 0 };
  }

  recentOccurrences.forEach((occurrence) => {
    const dayOfWeek = getDay(new Date(occurrence.scheduledDate!));
    dayStats[dayOfWeek].total++;
    if (occurrence.status === "completed") {
      dayStats[dayOfWeek].completed++;
    }
  });

  const dayRates = Object.entries(dayStats)
    .map(([day, stats]) => ({
      day: parseInt(day),
      rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
      total: stats.total,
    }))
    .filter((d) => d.total >= 2);

  const worstDay = dayRates.reduce(
    (min, d) => (d.rate < min.rate ? d : min),
    dayRates[0]
  );

  if (worstDay && worstDay.rate < 50 && worstDay.total >= 3) {
    if (!(await hasSimilarRecentInsight(context.userId, "pattern"))) {
      insights.push({
        userId: context.userId,
        type: "pattern",
        title: "Weekly Pattern Detected",
        description: `You rarely complete habits on ${DAY_NAMES[worstDay.day]}s (${Math.round(worstDay.rate)}% completion rate). Consider lighter goals for this day.`,
        data: { weakDay: worstDay.day, rate: worstDay.rate },
        habitId: null,
        isRead: false,
        expiresAt: getExpirationDate(),
      });
    }
  }

  const sevenDaysAgo = subDays(new Date(), 7);
  const fourteenDaysAgo = subDays(new Date(), 14);

  const thisWeekOccurrences = recentOccurrences.filter(
    (o) => new Date(o.scheduledDate!) >= sevenDaysAgo
  );
  const lastWeekOccurrences = recentOccurrences.filter(
    (o) => {
      const date = new Date(o.scheduledDate!);
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    }
  );

  if (thisWeekOccurrences.length >= 5 && lastWeekOccurrences.length >= 5) {
    const thisWeekRate =
      (thisWeekOccurrences.filter((o) => o.status === "completed").length /
        thisWeekOccurrences.length) *
      100;
    const lastWeekRate =
      (lastWeekOccurrences.filter((o) => o.status === "completed").length /
        lastWeekOccurrences.length) *
      100;

    const improvement = thisWeekRate - lastWeekRate;

    if (improvement >= 10) {
      insights.push({
        userId: context.userId,
        type: "pattern",
        title: "Improvement Trend",
        description: `Your completion rate improved ${Math.round(improvement)}% this week! Keep up the great work.`,
        data: { thisWeekRate, lastWeekRate, improvement },
        habitId: null,
        isRead: false,
        expiresAt: getExpirationDate(),
      });
    }
  }

  return insights;
}

async function generateStreakAlerts(
  context: InsightGeneratorContext
): Promise<InsertHabitInsight[]> {
  const insights: InsertHabitInsight[] = [];
  const now = new Date();

  for (const habit of context.habits) {
    if (habit.isArchived) continue;

    if (habit.timeWindowEnabled && habit.endTime) {
      const [endHour, endMinute] = habit.endTime.split(":").map(Number);
      const windowEnd = new Date();
      windowEnd.setHours(endHour, endMinute, 0, 0);

      const hoursUntilClose = differenceInHours(windowEnd, now);

      if (hoursUntilClose > 0 && hoursUntilClose <= 2) {
        const todayOccurrence = context.occurrences.find(
          (o) =>
            o.habitId === habit.id &&
            o.scheduledDate &&
            startOfDay(new Date(o.scheduledDate)).getTime() === startOfDay(now).getTime() &&
            o.status === "pending"
        );

        if (todayOccurrence && habit.streakCount && habit.streakCount > 0) {
          if (!(await hasSimilarRecentInsight(context.userId, "alert", habit.id))) {
            insights.push({
              userId: context.userId,
              type: "alert",
              title: "Streak at Risk",
              description: `Your ${habit.streakCount}-day ${habit.name} streak is at risk! Complete it in the next ${hoursUntilClose} hour${hoursUntilClose > 1 ? "s" : ""}.`,
              data: {
                habitId: habit.id,
                streakCount: habit.streakCount,
                hoursRemaining: hoursUntilClose,
              },
              habitId: habit.id,
              isRead: false,
              expiresAt: addDays(now, 1),
            });
          }
        }
      }
    }

    const yesterday = subDays(startOfDay(now), 1);
    const yesterdayOccurrence = context.occurrences.find(
      (o) =>
        o.habitId === habit.id &&
        o.scheduledDate &&
        startOfDay(new Date(o.scheduledDate)).getTime() === yesterday.getTime()
    );

    if (
      yesterdayOccurrence &&
      yesterdayOccurrence.status === "missed" &&
      habit.longestStreak &&
      habit.longestStreak > 7
    ) {
      const previousStreak = habit.longestStreak;
      if (habit.streakCount === 0 || (habit.streakCount && habit.streakCount < previousStreak - 5)) {
        if (!(await hasSimilarRecentInsight(context.userId, "alert", habit.id))) {
          insights.push({
            userId: context.userId,
            type: "alert",
            title: "Streak Broken",
            description: `Your ${previousStreak}-day ${habit.name} streak was broken. Don't give up - start building a new streak today!`,
            data: { habitId: habit.id, previousStreak },
            habitId: habit.id,
            isRead: false,
            expiresAt: getExpirationDate(),
          });
        }
      }
    }
  }

  return insights;
}

async function generateRecommendations(
  context: InsightGeneratorContext
): Promise<InsertHabitInsight[]> {
  const insights: InsertHabitInsight[] = [];
  const thirtyDaysAgo = subDays(new Date(), 30);

  const morningHabits = context.habits.filter((h) => {
    if (h.isArchived || !h.startTime) return false;
    const hour = parseInt(h.startTime.split(":")[0]);
    return hour >= 5 && hour < 10;
  });

  if (morningHabits.length === 0 && context.habits.length >= 3) {
    if (!(await hasSimilarRecentInsight(context.userId, "recommendation"))) {
      insights.push({
        userId: context.userId,
        type: "recommendation",
        title: "Try a Morning Habit",
        description: "You have no morning habits. Research shows morning routines boost productivity. Consider adding one!",
        data: { suggestion: "morning_habit" },
        habitId: null,
        isRead: false,
        expiresAt: getExpirationDate(),
      });
    }
  }

  for (const habit of context.habits) {
    if (habit.isArchived) continue;

    const habitOccurrences = context.occurrences.filter(
      (o) =>
        o.habitId === habit.id &&
        o.scheduledDate &&
        new Date(o.scheduledDate) >= thirtyDaysAgo
    );

    if (habitOccurrences.length >= 10) {
      const completedCount = habitOccurrences.filter(
        (o) => o.status === "completed"
      ).length;
      const completionRate = (completedCount / habitOccurrences.length) * 100;

      if (completionRate < 30) {
        if (!(await hasSimilarRecentInsight(context.userId, "recommendation", habit.id))) {
          insights.push({
            userId: context.userId,
            type: "recommendation",
            title: "Habit Needs Attention",
            description: `${habit.name} has only ${Math.round(completionRate)}% completion rate. Consider simplifying it or changing the schedule.`,
            data: { habitId: habit.id, completionRate },
            habitId: habit.id,
            isRead: false,
            expiresAt: getExpirationDate(),
          });
        }
      }
    }
  }

  const threeDaysAgo = subDays(startOfDay(new Date()), 3);
  const recentDays: Date[] = [];
  for (let i = 0; i < 3; i++) {
    recentDays.push(subDays(startOfDay(new Date()), i));
  }

  let allDaysPerfect = true;
  for (const day of recentDays) {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    
    const dayOccurrences = context.occurrences.filter(
      (o) =>
        o.scheduledDate &&
        new Date(o.scheduledDate) >= dayStart &&
        new Date(o.scheduledDate) <= dayEnd
    );

    if (dayOccurrences.length === 0) {
      allDaysPerfect = false;
      break;
    }

    const allCompleted = dayOccurrences.every((o) => o.status === "completed");
    if (!allCompleted) {
      allDaysPerfect = false;
      break;
    }
  }

  if (allDaysPerfect && context.habits.length >= 2) {
    if (!(await hasSimilarRecentInsight(context.userId, "recommendation"))) {
      insights.push({
        userId: context.userId,
        type: "recommendation",
        title: "Perfect Streak",
        description: "Congratulations! You've completed all habits for 3+ days in a row. You're building strong momentum!",
        data: { perfectDays: 3 },
        habitId: null,
        isRead: false,
        expiresAt: getExpirationDate(),
      });
    }
  }

  return insights;
}

async function generateStreakMilestones(
  context: InsightGeneratorContext
): Promise<InsertHabitInsight[]> {
  const insights: InsertHabitInsight[] = [];

  for (const habit of context.habits) {
    if (habit.isArchived || !habit.streakCount) continue;

    for (const milestone of MILESTONE_STREAKS) {
      if (habit.streakCount === milestone) {
        const insightKey = `streak_milestone_${milestone}`;
        if (!(await hasSimilarRecentInsight(context.userId, insightKey, habit.id))) {
          insights.push({
            userId: context.userId,
            type: "streak_milestone",
            title: `${milestone}-Day Milestone`,
            description: `Amazing! You've maintained your ${habit.name} habit for ${milestone} consecutive days! Keep going!`,
            data: { habitId: habit.id, milestone, habitName: habit.name },
            habitId: habit.id,
            isRead: false,
            expiresAt: getExpirationDate(),
          });
        }
        break;
      }
    }
  }

  return insights;
}

async function generateCorrelationInsights(
  context: InsightGeneratorContext
): Promise<InsertHabitInsight[]> {
  const insights: InsertHabitInsight[] = [];

  const completedWithMood = context.occurrences.filter(
    (o) => o.status === "completed" && o.completedAt && (o.mood || o.energyLevel)
  );

  if (completedWithMood.length < 20) return insights;

  const habitMoodData: Record<
    string,
    { high: number; low: number; total: number; habitName: string }
  > = {};

  for (const occurrence of completedWithMood) {
    const habit = context.habits.find((h) => h.id === occurrence.habitId);
    if (!habit) continue;

    if (!habitMoodData[occurrence.habitId]) {
      habitMoodData[occurrence.habitId] = {
        high: 0,
        low: 0,
        total: 0,
        habitName: habit.name,
      };
    }

    habitMoodData[occurrence.habitId].total++;

    const energy = occurrence.energyLevel?.toLowerCase();
    if (energy === "high" || energy === "energized") {
      habitMoodData[occurrence.habitId].high++;
    } else if (energy === "low" || energy === "tired") {
      habitMoodData[occurrence.habitId].low++;
    }
  }

  for (const [habitId, data] of Object.entries(habitMoodData)) {
    if (data.total < 10) continue;

    const highEnergyRate = (data.high / data.total) * 100;

    if (highEnergyRate >= 60) {
      if (!(await hasSimilarRecentInsight(context.userId, "correlation", habitId))) {
        insights.push({
          userId: context.userId,
          type: "correlation",
          title: "Energy Correlation Found",
          description: `You report higher energy on days you complete ${data.habitName}. This habit seems to boost your energy!`,
          data: { habitId, highEnergyRate, sampleSize: data.total },
          habitId,
          isRead: false,
          expiresAt: getExpirationDate(),
        });
      }
    }
  }

  return insights;
}

export async function generateHabitInsights(userId: string): Promise<number> {
  try {
    const userHabits = await storage.getHabitsByUser(userId);
    if (userHabits.length === 0) return 0;

    const sixtyDaysAgo = subDays(new Date(), 60);
    const allOccurrences = await storage.getHabitOccurrencesByDateRange(
      userId,
      sixtyDaysAgo,
      new Date()
    );

    const context: InsightGeneratorContext = {
      userId,
      habits: userHabits,
      occurrences: allOccurrences,
      existingInsightTypes: new Set(),
    };

    const allInsights: InsertHabitInsight[] = [];

    const peakTimeInsight = await generatePeakTimeInsight(context);
    if (peakTimeInsight) allInsights.push(peakTimeInsight);

    const patternInsights = await generatePatternInsights(context);
    allInsights.push(...patternInsights);

    const streakAlerts = await generateStreakAlerts(context);
    allInsights.push(...streakAlerts);

    const recommendations = await generateRecommendations(context);
    allInsights.push(...recommendations);

    const milestones = await generateStreakMilestones(context);
    allInsights.push(...milestones);

    const correlations = await generateCorrelationInsights(context);
    allInsights.push(...correlations);

    let createdCount = 0;
    for (const insight of allInsights) {
      try {
        await storage.createHabitInsight(insight);
        createdCount++;
      } catch (error) {
        console.error("Error creating habit insight:", error);
      }
    }

    await storage.deleteExpiredHabitInsights();

    return createdCount;
  } catch (error) {
    console.error("Error generating habit insights:", error);
    return 0;
  }
}

export async function generateInsightsOnHabitComplete(
  userId: string,
  habitId: string
): Promise<number> {
  try {
    const habit = await storage.getHabit(habitId);
    if (!habit) return 0;

    const insights: InsertHabitInsight[] = [];

    if (habit.streakCount && MILESTONE_STREAKS.includes(habit.streakCount)) {
      const milestone = habit.streakCount;
      if (!(await hasSimilarRecentInsight(userId, `streak_milestone_${milestone}`, habitId))) {
        insights.push({
          userId,
          type: "streak_milestone",
          title: `${milestone}-Day Milestone Reached!`,
          description: `Congratulations! You've maintained your ${habit.name} habit for ${milestone} consecutive days!`,
          data: { habitId, milestone, habitName: habit.name },
          habitId,
          isRead: false,
          expiresAt: getExpirationDate(),
        });
      }
    }

    let createdCount = 0;
    for (const insight of insights) {
      try {
        await storage.createHabitInsight(insight);
        createdCount++;
      } catch (error) {
        console.error("Error creating immediate insight:", error);
      }
    }

    return createdCount;
  } catch (error) {
    console.error("Error generating insights on habit complete:", error);
    return 0;
  }
}
