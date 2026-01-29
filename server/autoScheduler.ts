import { storage } from "./storage";
import {
  type FlexibleTask,
  type ScheduleSuggestion,
  type InsertScheduleSuggestion,
  type UserAvailability,
  type SchedulingPreferences,
  type AvailableSlot,
  type ScoredSlot,
  type ScheduleGenerationResult,
  type TimeBlock,
} from "@shared/schema";
import { addDays, startOfDay, isBefore, isAfter, differenceInDays } from "date-fns";

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function getTimeOfDay(time: string): "morning" | "afternoon" | "evening" | "night" {
  const minutes = parseTimeToMinutes(time);
  if (minutes < 360) return "night";
  if (minutes < 720) return "morning";
  if (minutes < 1020) return "afternoon";
  if (minutes < 1260) return "evening";
  return "night";
}

function slotsOverlap(
  slot1Start: number,
  slot1End: number,
  slot2Start: number,
  slot2End: number
): boolean {
  return slot1Start < slot2End && slot2Start < slot1End;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

async function getAvailableSlots(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AvailableSlot[]> {
  const availabilityList = await storage.getUserAvailability(userId);
  const slots: AvailableSlot[] = [];

  const currentDate = startOfDay(startDate);
  const end = startOfDay(endDate);

  let iterDate = new Date(currentDate);
  while (isBefore(iterDate, end) || iterDate.getTime() === end.getTime()) {
    const dayOfWeek = iterDate.getDay();

    const dayBlocks = await storage.getTimeBlocksByDate(userId, iterDate);

    let dayAvailability = availabilityList.filter((a) => a.dayOfWeek === dayOfWeek);

    if (dayAvailability.length === 0) {
      dayAvailability = [
        {
          id: "default",
          userId,
          dayOfWeek,
          startTime: "09:00",
          endTime: "17:00",
          availabilityType: "work_hours",
          energyLevel: "medium",
          isRecurring: true,
          priority: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }

    for (const availability of dayAvailability) {
      const availStart = parseTimeToMinutes(availability.startTime);
      const availEnd = parseTimeToMinutes(availability.endTime);

      const occupiedSlots: { start: number; end: number }[] = dayBlocks.map((block) => ({
        start: parseTimeToMinutes(block.startTime),
        end: parseTimeToMinutes(block.endTime),
      }));

      occupiedSlots.sort((a, b) => a.start - b.start);

      const freeSlots: { start: number; end: number }[] = [];
      let currentStart = availStart;

      for (const occupied of occupiedSlots) {
        if (occupied.start > currentStart && occupied.start < availEnd) {
          const slotEnd = Math.min(occupied.start, availEnd);
          if (slotEnd > currentStart) {
            freeSlots.push({ start: currentStart, end: slotEnd });
          }
        }
        if (occupied.end > currentStart) {
          currentStart = Math.max(currentStart, occupied.end);
        }
      }

      if (currentStart < availEnd) {
        freeSlots.push({ start: currentStart, end: availEnd });
      }

      for (const freeSlot of freeSlots) {
        const duration = freeSlot.end - freeSlot.start;
        if (duration >= 15) {
          slots.push({
            date: new Date(iterDate),
            startTime: minutesToTime(freeSlot.start),
            endTime: minutesToTime(freeSlot.end),
            durationMinutes: duration,
            energyLevel: availability.energyLevel || "medium",
            dayOfWeek,
            timeOfDay: getTimeOfDay(minutesToTime(freeSlot.start)),
          });
        }
      }
    }

    iterDate = addDays(iterDate, 1);
  }

  return slots;
}

function scoreSlot(
  slot: AvailableSlot,
  task: FlexibleTask,
  preferences: SchedulingPreferences | undefined,
  allSlots: AvailableSlot[],
  scheduledDays: Set<string>
): ScoredSlot {
  let score = 0;
  const reasoning: string[] = [];

  const priorityScores: Record<string, number> = {
    critical: 20,
    high: 15,
    medium: 10,
    low: 5,
  };

  if (task.priority === "critical" || task.priority === "high") {
    if (slot.timeOfDay === "morning") {
      score += priorityScores[task.priority] || 10;
      reasoning.push(`High priority task in peak morning hours (+${priorityScores[task.priority] || 10})`);
    } else {
      score += (priorityScores[task.priority] || 10) * 0.5;
      reasoning.push(`High priority task scheduled (+${Math.round((priorityScores[task.priority] || 10) * 0.5)})`);
    }
  } else {
    score += priorityScores[task.priority] || 10;
    reasoning.push(`Priority match (+${priorityScores[task.priority] || 10})`);
  }

  const energyMatch: Record<string, Record<string, number>> = {
    high: { high: 20, medium: 10, low: 5 },
    medium: { high: 10, medium: 20, low: 10 },
    low: { high: 5, medium: 10, low: 20 },
  };
  const taskEnergy = task.energyLevel || "medium";
  const slotEnergy = slot.energyLevel || "medium";
  const energyScore = energyMatch[taskEnergy]?.[slotEnergy] || 10;
  score += energyScore;
  if (energyScore >= 15) {
    reasoning.push(`Energy level match: ${taskEnergy} task in ${slotEnergy} energy slot (+${energyScore})`);
  }

  const taskDuration = task.estimatedDuration;
  const slotDuration = slot.durationMinutes;

  if (slotDuration >= taskDuration) {
    const excess = slotDuration - taskDuration;
    if (excess === 0) {
      score += 20;
      reasoning.push(`Perfect duration fit (+20)`);
    } else if (excess <= 15) {
      score += 18;
      reasoning.push(`Near-perfect duration fit (+18)`);
    } else if (excess <= 30) {
      score += 15;
      reasoning.push(`Good duration fit with ${excess}min buffer (+15)`);
    } else {
      const durationScore = Math.max(5, 15 - Math.floor(excess / 30));
      score += durationScore;
      reasoning.push(`Duration fits with ${formatDuration(excess)} spare (+${durationScore})`);
    }
  } else {
    return {
      ...slot,
      score: -1,
      reasoning: [`Slot too short: need ${formatDuration(taskDuration)}, only ${formatDuration(slotDuration)} available`],
    };
  }

  if (preferences) {
    let prefScore = 0;
    if (preferences.preferMorning && slot.timeOfDay === "morning") {
      prefScore = 15;
      reasoning.push(`Morning preference matched (+15)`);
    } else if (preferences.preferAfternoon && slot.timeOfDay === "afternoon") {
      prefScore = 15;
      reasoning.push(`Afternoon preference matched (+15)`);
    } else if (preferences.preferEvening && slot.timeOfDay === "evening") {
      prefScore = 15;
      reasoning.push(`Evening preference matched (+15)`);
    } else {
      prefScore = 5;
    }
    score += prefScore;
  } else {
    score += 7;
  }

  if (task.deadline) {
    const deadline = new Date(task.deadline);
    const slotDate = slot.date;
    const daysUntilDeadline = differenceInDays(deadline, slotDate);

    if (daysUntilDeadline < 0) {
      return {
        ...slot,
        score: -1,
        reasoning: ["Slot is after deadline"],
      };
    } else if (daysUntilDeadline <= 1) {
      score += 15;
      reasoning.push(`Urgent: deadline tomorrow or today (+15)`);
    } else if (daysUntilDeadline <= 3) {
      score += 12;
      reasoning.push(`Deadline approaching in ${daysUntilDeadline} days (+12)`);
    } else if (daysUntilDeadline <= 7) {
      score += 8;
      reasoning.push(`Deadline within a week (+8)`);
    } else {
      score += 5;
      reasoning.push(`Adequate time before deadline (+5)`);
    }
  } else {
    score += 7;
  }

  const dateKey = slot.date.toISOString().split("T")[0];
  if (!scheduledDays.has(dateKey)) {
    score += 10;
    reasoning.push(`Spreads work across days (+10)`);
  } else {
    score += 3;
  }

  return {
    ...slot,
    score,
    reasoning,
  };
}

async function createSuggestionsForTask(
  userId: string,
  task: FlexibleTask,
  availableSlots: AvailableSlot[],
  preferences: SchedulingPreferences | undefined,
  scheduledDays: Set<string>
): Promise<ScheduleSuggestion[]> {
  const scoredSlots: ScoredSlot[] = [];

  let filteredSlots = availableSlots;

  if (task.preferredTimeStart && task.preferredTimeEnd) {
    const prefStart = parseTimeToMinutes(task.preferredTimeStart);
    const prefEnd = parseTimeToMinutes(task.preferredTimeEnd);

    const preferredSlots = filteredSlots.filter((slot) => {
      const slotStart = parseTimeToMinutes(slot.startTime);
      const slotEnd = parseTimeToMinutes(slot.endTime);
      return slotStart >= prefStart && slotEnd <= prefEnd;
    });

    if (preferredSlots.length > 0) {
      filteredSlots = preferredSlots;
    }
  }

  if (task.specificDays && task.specificDays.length > 0) {
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const allowedDays = new Set(
      task.specificDays.map((d) => dayMap[d.toLowerCase()] ?? -1).filter((d) => d >= 0)
    );

    if (allowedDays.size > 0) {
      filteredSlots = filteredSlots.filter((slot) => allowedDays.has(slot.dayOfWeek));
    }
  }

  for (const slot of filteredSlots) {
    const scored = scoreSlot(slot, task, preferences, filteredSlots, scheduledDays);
    if (scored.score > 0) {
      scoredSlots.push(scored);
    }
  }

  scoredSlots.sort((a, b) => b.score - a.score);

  const topSlots = scoredSlots.slice(0, 3);

  const suggestions: ScheduleSuggestion[] = [];

  for (const slot of topSlots) {
    const endTimeMinutes = parseTimeToMinutes(slot.startTime) + task.estimatedDuration;
    const endTime = minutesToTime(Math.min(endTimeMinutes, parseTimeToMinutes(slot.endTime)));

    const suggestionData: InsertScheduleSuggestion = {
      flexibleTaskId: task.id,
      suggestedDate: slot.date,
      startTime: slot.startTime,
      endTime,
      confidenceScore: Math.min(100, Math.round(slot.score)),
      reasoning: JSON.stringify({
        factors: slot.reasoning,
        totalScore: slot.score,
        slotInfo: {
          dayOfWeek: slot.dayOfWeek,
          timeOfDay: slot.timeOfDay,
          energyLevel: slot.energyLevel,
        },
      }),
      status: "pending",
    };

    const suggestion = await storage.createScheduleSuggestion(userId, suggestionData);
    suggestions.push(suggestion);

    const dateKey = slot.date.toISOString().split("T")[0];
    scheduledDays.add(dateKey);
  }

  return suggestions;
}

export async function generateScheduleSuggestions(
  userId: string,
  startDate: Date,
  endDate: Date,
  specificTaskIds?: string[]
): Promise<ScheduleGenerationResult> {
  const result: ScheduleGenerationResult = {
    suggestions: [],
    conflicts: [],
    unschedulable: [],
    summary: {
      totalTasks: 0,
      scheduledTasks: 0,
      totalSuggestions: 0,
    },
  };

  let flexibleTasks = await storage.getFlexibleTasksByUser(userId, true);

  if (specificTaskIds && specificTaskIds.length > 0) {
    const taskIdSet = new Set(specificTaskIds);
    flexibleTasks = flexibleTasks.filter((t) => taskIdSet.has(t.id));
  }

  result.summary.totalTasks = flexibleTasks.length;

  if (flexibleTasks.length === 0) {
    return result;
  }

  const preferences = await storage.getSchedulingPreferences(userId);

  const availableSlots = await getAvailableSlots(userId, startDate, endDate);

  if (availableSlots.length === 0) {
    for (const task of flexibleTasks) {
      result.unschedulable.push({
        taskId: task.id,
        reason: "No available time slots in the specified date range",
      });
    }
    return result;
  }

  const scheduledDays = new Set<string>();

  const sortedTasks = [...flexibleTasks].sort((a, b) => {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;

    if (aPriority !== bPriority) return aPriority - bPriority;

    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;

    return 0;
  });

  for (const task of sortedTasks) {
    const validSlots = availableSlots.filter(
      (slot) => slot.durationMinutes >= task.estimatedDuration
    );

    if (validSlots.length === 0) {
      result.unschedulable.push({
        taskId: task.id,
        reason: `No slots with sufficient duration (${formatDuration(task.estimatedDuration)} required)`,
      });
      continue;
    }

    if (task.deadline) {
      const deadline = new Date(task.deadline);
      const slotsBeforeDeadline = validSlots.filter(
        (slot) => isBefore(slot.date, deadline) || slot.date.getTime() === deadline.getTime()
      );

      if (slotsBeforeDeadline.length === 0) {
        result.conflicts.push({
          taskId: task.id,
          reason: `No available slots before deadline (${deadline.toLocaleDateString()})`,
        });
        continue;
      }
    }

    try {
      const suggestions = await createSuggestionsForTask(
        userId,
        task,
        validSlots,
        preferences,
        scheduledDays
      );

      if (suggestions.length > 0) {
        result.suggestions.push(...suggestions);
        result.summary.scheduledTasks++;
        result.summary.totalSuggestions += suggestions.length;
      } else {
        result.unschedulable.push({
          taskId: task.id,
          reason: "No suitable time slots found matching task requirements",
        });
      }
    } catch (error) {
      result.conflicts.push({
        taskId: task.id,
        reason: `Error generating suggestions: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  return result;
}

export { getAvailableSlots, parseTimeToMinutes, getTimeOfDay, formatDuration, slotsOverlap };
