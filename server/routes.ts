import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { notificationService } from "./notifications";
import { generateHabitInsights, generateInsightsOnHabitComplete } from "./habitInsightGenerator";
import { generateScheduleSuggestions } from "./autoScheduler";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  setDate,
  setMonth,
  getDay,
  isAfter,
  isBefore,
  startOfDay,
  parseISO,
  getDaysInMonth,
  startOfMonth,
  getDate,
} from "date-fns";
import {
  insertProjectSchema,
  insertTaskSchema,
  insertCommentSchema,
  insertTimeLogSchema,
  insertTagSchema,
  insertTaskDependencySchema,
  insertGroupSchema,
  insertGroupMemberSchema,
  insertPomodoroSettingsSchema,
  insertPomodoroSessionSchema,
  insertHabitSchema,
  insertHabitOccurrenceSchema,
  insertHabitCategorySchema,
  insertHabitInsightSchema,
  insertHabitJournalSchema,
  insertHabitAchievementSchema,
  insertHabitTemplateSchema,
  insertHabitAnalyticsSchema,
  insertScheduleSettingsSchema,
  insertTimeBlockSchema,
  insertTaskTemplateSchema,
  insertListSchema,
  insertTaskReminderSchema,
  insertTaskSectionSchema,
  insertRecurringTaskInstanceSchema,
  insertActivitySchema,
  insertUserPreferencesSchema,
  insertActivityFeedSchema,
  insertProductivityInsightSchema,
  insertUserGoalSchema,
  insertFlexibleTaskSchema,
  insertScheduleSuggestionSchema,
  insertUserAvailabilitySchema,
  insertSchedulingPreferencesSchema,
  type User,
  type Task,
  type FlexibleTask,
  type ScheduleSuggestion,
  type UserAvailability,
  type SchedulingPreferences,
} from "@shared/schema";

interface ParsedRecurringPattern {
  type: 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  days?: number[];
  date?: number;
  monthDay?: string;
  ordinal?: number;
  weekday?: number;
}

function parseRepeatPattern(pattern: string): ParsedRecurringPattern | null {
  if (!pattern) return null;
  
  const parts = pattern.split(':');
  const type = parts[0].toUpperCase();
  
  switch (type) {
    case 'DAILY':
      return {
        type: 'DAILY',
        interval: parts[1] ? parseInt(parts[1], 10) : 1,
      };
    case 'WEEKDAYS':
      return {
        type: 'WEEKDAYS',
        days: [1, 2, 3, 4, 5],
      };
    case 'WEEKLY':
      return {
        type: 'WEEKLY',
        interval: parts[1] ? parseInt(parts[1], 10) : 1,
        days: parts[2] ? parts[2].split(',').map(d => parseInt(d, 10)) : [1],
      };
    case 'MONTHLY':
      if (parts.length === 3) {
        return {
          type: 'MONTHLY',
          ordinal: parseInt(parts[1], 10) || 1,
          weekday: parseInt(parts[2], 10) || 1,
        };
      }
      return {
        type: 'MONTHLY',
        date: parts[1] ? parseInt(parts[1], 10) : 1,
      };
    case 'YEARLY':
      return {
        type: 'YEARLY',
        monthDay: parts[1] || '01-01',
      };
    default:
      return null;
  }
}

function convertToGetDayFormat(day: number): number {
  return day === 7 ? 0 : day;
}

function getNthWeekdayOfMonth(year: number, month: number, weekday: number, ordinal: number): Date {
  const targetDay = convertToGetDayFormat(weekday);
  const firstOfMonth = new Date(year, month, 1);
  let firstOccurrence = firstOfMonth;
  
  while (getDay(firstOccurrence) !== targetDay) {
    firstOccurrence = addDays(firstOccurrence, 1);
  }
  
  if (ordinal === 5) {
    let lastOccurrence = firstOccurrence;
    let nextOccurrence = addDays(firstOccurrence, 7);
    while (nextOccurrence.getMonth() === month) {
      lastOccurrence = nextOccurrence;
      nextOccurrence = addDays(nextOccurrence, 7);
    }
    return lastOccurrence;
  }
  
  return addDays(firstOccurrence, (ordinal - 1) * 7);
}

function generateNextRecurringInstance(
  fromDate: Date,
  pattern: string,
  repeatEndDate?: Date | null
): Date | null {
  const parsed = parseRepeatPattern(pattern);
  if (!parsed) return null;
  
  let nextDate: Date = startOfDay(fromDate);
  
  switch (parsed.type) {
    case 'DAILY':
      nextDate = addDays(nextDate, parsed.interval || 1);
      break;
      
    case 'WEEKDAYS': {
      nextDate = addDays(nextDate, 1);
      while (getDay(nextDate) === 0 || getDay(nextDate) === 6) {
        nextDate = addDays(nextDate, 1);
      }
      break;
    }
      
    case 'WEEKLY': {
      const interval = parsed.interval || 1;
      const targetDays = parsed.days || [1];
      const rawDay = getDay(nextDate);
      const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;
      
      const sortedTargetDays = [...targetDays].sort((a, b) => a - b);
      const nextDayInWeek = sortedTargetDays.find(d => d > currentDayOfWeek);
      
      if (nextDayInWeek !== undefined) {
        nextDate = addDays(nextDate, nextDayInWeek - currentDayOfWeek);
      } else {
        const daysToNextWeek = 7 - currentDayOfWeek + sortedTargetDays[0];
        nextDate = addDays(nextDate, daysToNextWeek);
        if (interval > 1) {
          nextDate = addWeeks(nextDate, interval - 1);
        }
      }
      break;
    }
      
    case 'MONTHLY': {
      if (parsed.ordinal !== undefined && parsed.weekday !== undefined) {
        const nextMonth = addMonths(nextDate, 1);
        nextDate = getNthWeekdayOfMonth(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          parsed.weekday,
          parsed.ordinal
        );
      } else {
        const targetDate = parsed.date || 1;
        nextDate = addMonths(nextDate, 1);
        const daysInMonth = getDaysInMonth(nextDate);
        nextDate = setDate(nextDate, Math.min(targetDate, daysInMonth));
      }
      break;
    }
      
    case 'YEARLY': {
      const [month, day] = (parsed.monthDay || '01-01').split('-').map(n => parseInt(n, 10));
      nextDate = addYears(nextDate, 1);
      nextDate = setMonth(nextDate, month - 1);
      const daysInMonth = getDaysInMonth(nextDate);
      nextDate = setDate(nextDate, Math.min(day, daysInMonth));
      break;
    }
      
    default:
      return null;
  }
  
  if (repeatEndDate && isAfter(nextDate, repeatEndDate)) {
    return null;
  }
  
  return nextDate;
}

async function logTaskActivity(
  taskId: string,
  userId: string,
  type: string,
  field?: string,
  oldValue?: any,
  newValue?: any,
  metadata?: any
) {
  try {
    await storage.createActivity({
      taskId,
      userId,
      activityType: type,
      field: field || null,
      oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : null,
      newValue: newValue !== undefined ? JSON.stringify(newValue) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

const TRACKED_FIELDS: Record<string, string> = {
  status: "status_changed",
  priority: "priority_changed",
  dueDate: "due_date_changed",
  assigneeId: "assignee_changed",
  title: "title_changed",
  description: "description_changed",
  isImportant: "importance_changed",
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);


  // Users routes
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Projects routes
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertProjectSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid project data", errors: parsed.error.errors });
      }
      const project = await storage.createProject(parsed.data);
      await storage.addProjectMember({ projectId: project.id, userId, role: "owner" });
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProjectWithRelations(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Project members routes
  app.get("/api/projects/:id/members", isAuthenticated, async (req, res) => {
    try {
      const members = await storage.getProjectMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching project members:", error);
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  app.post("/api/projects/:id/members", isAuthenticated, async (req, res) => {
    try {
      const member = await storage.addProjectMember({
        projectId: req.params.id,
        userId: req.body.userId,
        role: req.body.role || "member",
      });
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding project member:", error);
      res.status(500).json({ message: "Failed to add project member" });
    }
  });

  app.delete("/api/projects/:id/members/:userId", isAuthenticated, async (req, res) => {
    try {
      await storage.removeProjectMember(req.params.id, req.params.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing project member:", error);
      res.status(500).json({ message: "Failed to remove project member" });
    }
  });

  // Tasks routes
  app.get("/api/tasks/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const query = (req.query.q as string || "").toLowerCase().trim();
      
      if (!query) {
        return res.json([]);
      }
      
      const allTasks = await storage.getTasksByUser(userId);
      const matchingTasks = allTasks.filter((task: Task) => 
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query))
      );
      
      res.json(matchingTasks.slice(0, 50));
    } catch (error) {
      console.error("Error searching tasks:", error);
      res.status(500).json({ message: "Failed to search tasks" });
    }
  });

  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const inbox = req.query.inbox === "true";
      const { projectId, sectionId, status, limit, offset } = req.query;
      
      if (inbox) {
        const inboxTasks = await storage.getInboxTasks(userId);
        return res.json(inboxTasks);
      }
      
      // Use paginated method if limit/offset are provided
      if (limit !== undefined || offset !== undefined) {
        const tasks = await storage.getTasksPaginated(userId, {
          projectId: projectId as string | undefined,
          sectionId: sectionId as string | undefined,
          status: status as string | undefined,
          limit: limit ? parseInt(limit as string, 10) : 50,
          offset: offset ? parseInt(offset as string, 10) : 0,
        });
        return res.json(tasks);
      }
      
      const tasks = await storage.getTasksByUser(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/projects/:projectId/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasksByProject(req.params.projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: "Failed to fetch project tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertTaskSchema.safeParse({ ...req.body, creatorId: userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid task data", errors: parsed.error.errors });
      }
      const task = await storage.createTask(parsed.data);
      
      logTaskActivity(task.id, userId, "task_created");
      
      if (task.assigneeId && task.assigneeId !== userId) {
        notificationService.notifyTaskAssigned(task, task.assigneeId);
      }
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.post("/api/tasks/batch", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { tasks } = req.body;
      
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ message: "Tasks array is required" });
      }
      
      const results: { success: Task[]; failed: { index: number; error: string }[] } = {
        success: [],
        failed: [],
      };
      
      for (let i = 0; i < tasks.length; i++) {
        const taskData = tasks[i];
        try {
          const parsed = insertTaskSchema.safeParse({ ...taskData, creatorId: userId });
          if (!parsed.success) {
            results.failed.push({ 
              index: i, 
              error: parsed.error.errors.map(e => e.message).join(", ") 
            });
            continue;
          }
          const task = await storage.createTask(parsed.data);
          logTaskActivity(task.id, userId, "task_created");
          results.success.push(task);
        } catch (error) {
          results.failed.push({ 
            index: i, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }
      
      res.status(201).json(results);
    } catch (error) {
      console.error("Error creating batch tasks:", error);
      res.status(500).json({ message: "Failed to create batch tasks" });
    }
  });

  // Smart tasks filter route - must be before /api/tasks/:id to avoid conflicts
  app.get("/api/tasks/smart/:filter", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const filter = req.params.filter;
      
      const allTasks = await storage.getTasksByUser(userId);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
      const next7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);
      const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

      let filteredTasks = allTasks;

      switch (filter) {
        case "today":
          filteredTasks = allTasks.filter(task => {
            if (!task.dueDate || task.status === "done") return false;
            const dueDate = new Date(task.dueDate);
            return dueDate >= startOfToday && dueDate <= endOfToday;
          });
          break;
        case "tomorrow":
          filteredTasks = allTasks.filter(task => {
            if (!task.dueDate || task.status === "done") return false;
            const dueDate = new Date(task.dueDate);
            return dueDate >= startOfTomorrow && dueDate <= endOfTomorrow;
          });
          break;
        case "next7days":
          filteredTasks = allTasks.filter(task => {
            if (!task.dueDate || task.status === "done") return false;
            const dueDate = new Date(task.dueDate);
            return dueDate >= startOfToday && dueDate <= next7Days;
          });
          break;
        case "important":
          filteredTasks = allTasks.filter(task => task.isImportant === true && task.status !== "done");
          break;
        case "nodue":
          filteredTasks = allTasks.filter(task => !task.dueDate && task.status !== "done");
          break;
        case "completed":
          filteredTasks = allTasks.filter(task => {
            if (task.status !== "done") return false;
            if (task.completedAt) {
              return new Date(task.completedAt) >= thirtyDaysAgo;
            }
            return true;
          });
          break;
        case "all":
        default:
          filteredTasks = allTasks.filter(task => task.status !== "done");
          break;
      }

      res.json(filteredTasks);
    } catch (error) {
      console.error("Error fetching smart filtered tasks:", error);
      res.status(500).json({ message: "Failed to fetch filtered tasks" });
    }
  });

  app.get("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const task = await storage.getTaskWithRelations(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existingTask = await storage.getTask(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const isBeingCompleted = req.body.status === 'done' && existingTask.status !== 'done';
      
      const updateData = { ...req.body };
      if (isBeingCompleted) {
        updateData.completedAt = new Date();
      }
      
      const task = await storage.updateTask(req.params.id, updateData);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      for (const [field, activityType] of Object.entries(TRACKED_FIELDS)) {
        if (req.body[field] !== undefined) {
          const oldValue = existingTask[field as keyof typeof existingTask];
          const newValue = req.body[field];
          const oldStr = oldValue instanceof Date ? oldValue.toISOString() : oldValue;
          const newStr = newValue instanceof Date ? new Date(newValue).toISOString() : newValue;
          if (JSON.stringify(oldStr) !== JSON.stringify(newStr)) {
            logTaskActivity(task.id, userId, activityType, field, oldValue, newValue);
          }
        }
      }
      
      if (isBeingCompleted && existingTask.parentTaskId) {
        logTaskActivity(task.id, userId, "subtask_completed", undefined, undefined, undefined, { parentTaskId: existingTask.parentTaskId });
      }
      
      if (req.body.assigneeId !== undefined && req.body.assigneeId !== existingTask.assigneeId && req.body.assigneeId) {
        notificationService.notifyTaskAssigned(task, req.body.assigneeId);
      }
      
      if (isBeingCompleted) {
        notificationService.notifyTaskCompleted(task, userId);
      }
      
      if (isBeingCompleted && task.repeatPattern) {
        try {
          await storage.createRecurringTaskInstance({
            parentTaskId: task.id,
            instanceDate: task.dueDate || new Date(),
            status: 'completed',
            completedAt: new Date(),
          });
          
          const nextInstanceDate = generateNextRecurringInstance(
            task.dueDate || new Date(),
            task.repeatPattern,
            task.repeatEndDate
          );
          
          if (nextInstanceDate) {
            await storage.updateTask(task.id, {
              status: 'todo',
              completedAt: null,
              dueDate: nextInstanceDate,
            });
            
            const updatedTask = await storage.getTask(task.id);
            return res.json(updatedTask);
          }
        } catch (recurringError) {
          console.error("Error handling recurring task completion:", recurringError);
        }
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.patch("/api/tasks/:id/focus-time", isAuthenticated, async (req, res) => {
    try {
      const { duration } = req.body;
      if (typeof duration !== 'number' || duration <= 0) {
        return res.status(400).json({ message: "Invalid duration. Must be a positive number in seconds." });
      }
      const task = await storage.addFocusTime(req.params.id, duration);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error adding focus time:", error);
      res.status(500).json({ message: "Failed to add focus time" });
    }
  });

  app.post("/api/tasks/:taskId/generate-instance", isAuthenticated, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (!task.repeatPattern) {
        return res.status(400).json({ message: "Task does not have a repeat pattern" });
      }
      
      const fromDate = req.body.fromDate ? new Date(req.body.fromDate) : (task.dueDate || new Date());
      
      const nextInstanceDate = generateNextRecurringInstance(
        fromDate,
        task.repeatPattern,
        task.repeatEndDate
      );
      
      if (!nextInstanceDate) {
        return res.status(400).json({ message: "No more instances to generate (past end date or invalid pattern)" });
      }
      
      const instance = await storage.createRecurringTaskInstance({
        parentTaskId: task.id,
        instanceDate: nextInstanceDate,
        status: 'pending',
      });
      
      res.status(201).json(instance);
    } catch (error) {
      console.error("Error generating recurring instance:", error);
      res.status(500).json({ message: "Failed to generate recurring instance" });
    }
  });

  app.get("/api/tasks/:taskId/instances", isAuthenticated, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const instances = await storage.getRecurringTaskInstances(req.params.taskId);
      res.json(instances);
    } catch (error) {
      console.error("Error fetching recurring instances:", error);
      res.status(500).json({ message: "Failed to fetch recurring instances" });
    }
  });

  app.patch("/api/recurring-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const { status, notes, completedAt } = req.body;
      
      const updateData: any = {};
      
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'completed' && !completedAt) {
          updateData.completedAt = new Date();
        } else if (status === 'skipped') {
          updateData.completedAt = null;
        }
      }
      
      if (completedAt !== undefined) {
        updateData.completedAt = completedAt ? new Date(completedAt) : null;
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      const instance = await storage.updateRecurringTaskInstance(req.params.id, updateData);
      if (!instance) {
        return res.status(404).json({ message: "Recurring instance not found" });
      }
      
      res.json(instance);
    } catch (error) {
      console.error("Error updating recurring instance:", error);
      res.status(500).json({ message: "Failed to update recurring instance" });
    }
  });

  // Comments routes
  app.get("/api/tasks/:taskId/comments", isAuthenticated, async (req, res) => {
    try {
      const comments = await storage.getCommentsByTask(req.params.taskId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertCommentSchema.safeParse({ ...req.body, authorId: userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid comment data", errors: parsed.error.errors });
      }
      const comment = await storage.createComment(parsed.data);
      
      if (parsed.data.taskId) {
        logTaskActivity(parsed.data.taskId, userId, "comment_added", undefined, undefined, undefined, { commentId: comment.id });
        
        const task = await storage.getTask(parsed.data.taskId);
        if (task) {
          notificationService.notifyCommentAdded(task, userId);
        }
      }
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.delete("/api/comments/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteComment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Time logs routes
  app.get("/api/time-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const timeLogs = await storage.getTimeLogsByUser(userId);
      res.json(timeLogs);
    } catch (error) {
      console.error("Error fetching time logs:", error);
      res.status(500).json({ message: "Failed to fetch time logs" });
    }
  });

  app.get("/api/time-logs/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const activeLog = await storage.getActiveTimeLog(userId);
      res.json(activeLog || null);
    } catch (error) {
      console.error("Error fetching active time log:", error);
      res.status(500).json({ message: "Failed to fetch active time log" });
    }
  });

  app.post("/api/time-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const activeLog = await storage.getActiveTimeLog(userId);
      if (activeLog) {
        await storage.stopTimeLog(activeLog.id);
      }
      const parsed = insertTimeLogSchema.safeParse({
        ...req.body,
        userId,
        startTime: new Date(),
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid time log data", errors: parsed.error.errors });
      }
      const timeLog = await storage.createTimeLog(parsed.data);
      res.status(201).json(timeLog);
    } catch (error) {
      console.error("Error creating time log:", error);
      res.status(500).json({ message: "Failed to create time log" });
    }
  });

  app.patch("/api/time-logs/:id/stop", isAuthenticated, async (req, res) => {
    try {
      const timeLog = await storage.stopTimeLog(req.params.id);
      if (!timeLog) {
        return res.status(404).json({ message: "Time log not found" });
      }
      res.json(timeLog);
    } catch (error) {
      console.error("Error stopping time log:", error);
      res.status(500).json({ message: "Failed to stop time log" });
    }
  });

  // Focus Session routes
  app.post("/api/tasks/:taskId/focus-session", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { taskId } = req.params;
      const { subtaskIndex } = req.body;

      const existingSession = await storage.getActiveFocusSession(userId);
      if (existingSession) {
        return res.status(400).json({ message: "You already have an active focus session" });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const session = await storage.createFocusSession({
        userId,
        taskId,
        activeSubtaskIndex: subtaskIndex ?? null,
        status: 'active',
      });

      let activeSegment = null;
      if (typeof subtaskIndex === 'number') {
        const subtasks = await storage.getSubtasks(taskId);
        const subtask = subtasks[subtaskIndex];
        activeSegment = await storage.createSubtaskSegment({
          sessionId: session.id,
          subtaskIndex,
          subtaskTitle: subtask?.title || `Subtask ${subtaskIndex + 1}`,
        });
      }

      res.status(201).json({ session, activeSegment });
    } catch (error) {
      console.error("Error starting focus session:", error);
      res.status(500).json({ message: "Failed to start focus session" });
    }
  });

  app.get("/api/focus-session/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const session = await storage.getActiveFocusSession(userId);
      
      if (!session) {
        return res.json({ session: null, segments: [], task: null });
      }

      const [segments, task] = await Promise.all([
        storage.getSegmentsBySession(session.id),
        storage.getTask(session.taskId),
      ]);

      res.json({ session, segments, task });
    } catch (error) {
      console.error("Error fetching active focus session:", error);
      res.status(500).json({ message: "Failed to fetch active focus session" });
    }
  });

  app.patch("/api/focus-session/:id/switch-subtask", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { subtaskIndex } = req.body;

      if (typeof subtaskIndex !== 'number') {
        return res.status(400).json({ message: "subtaskIndex is required" });
      }

      const segments = await storage.getSegmentsBySession(id);
      const activeSegment = segments.find(s => !s.endedAt);
      
      let previousSegment = null;
      if (activeSegment) {
        previousSegment = await storage.endSubtaskSegment(activeSegment.id, false);
      }

      const session = await storage.updateFocusSession(id, { activeSubtaskIndex: subtaskIndex });
      
      const task = await storage.getTask(session.taskId);
      const subtasks = task ? await storage.getSubtasks(task.id) : [];
      const subtask = subtasks[subtaskIndex];

      const newSegment = await storage.createSubtaskSegment({
        sessionId: id,
        subtaskIndex,
        subtaskTitle: subtask?.title || `Subtask ${subtaskIndex + 1}`,
      });

      res.json({ session, newSegment, previousSegment });
    } catch (error) {
      console.error("Error switching subtask:", error);
      res.status(500).json({ message: "Failed to switch subtask" });
    }
  });

  app.patch("/api/focus-session/:id/complete-subtask", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { subtaskIndex, switchToIndex } = req.body;

      if (typeof subtaskIndex !== 'number') {
        return res.status(400).json({ message: "subtaskIndex is required" });
      }

      const segments = await storage.getSegmentsBySession(id);
      const activeSegment = segments.find(s => !s.endedAt && s.subtaskIndex === subtaskIndex);
      
      let segment = null;
      if (activeSegment) {
        segment = await storage.endSubtaskSegment(activeSegment.id, true);
      }

      const session = await storage.updateFocusSession(id, { 
        activeSubtaskIndex: typeof switchToIndex === 'number' ? switchToIndex : null 
      });
      
      const task = await storage.getTask(session.taskId);
      if (task) {
        const subtasks = await storage.getSubtasks(task.id);
        const subtask = subtasks[subtaskIndex];
        if (subtask) {
          await storage.updateTask(subtask.id, { status: 'done', completedAt: new Date() });
        }
      }

      if (typeof switchToIndex === 'number' && task) {
        const subtasks = await storage.getSubtasks(task.id);
        const nextSubtask = subtasks[switchToIndex];
        await storage.createSubtaskSegment({
          sessionId: id,
          subtaskIndex: switchToIndex,
          subtaskTitle: nextSubtask?.title || `Subtask ${switchToIndex + 1}`,
        });
      }

      const updatedTask = task ? await storage.getTask(task.id) : null;
      res.json({ session, segment, task: updatedTask });
    } catch (error) {
      console.error("Error completing subtask:", error);
      res.status(500).json({ message: "Failed to complete subtask" });
    }
  });

  app.patch("/api/focus-session/:id/pause", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.updateFocusSession(id, { status: 'paused' });
      res.json({ session });
    } catch (error) {
      console.error("Error pausing focus session:", error);
      res.status(500).json({ message: "Failed to pause focus session" });
    }
  });

  app.patch("/api/focus-session/:id/resume", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.updateFocusSession(id, { status: 'active' });
      res.json({ session });
    } catch (error) {
      console.error("Error resuming focus session:", error);
      res.status(500).json({ message: "Failed to resume focus session" });
    }
  });

  app.patch("/api/focus-session/:id/end", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      const segments = await storage.getSegmentsBySession(id);
      const activeSegment = segments.find(s => !s.endedAt);
      if (activeSegment) {
        await storage.endSubtaskSegment(activeSegment.id, false);
      }

      const session = await storage.endFocusSession(id);
      const finalSegments = await storage.getSegmentsBySession(id);
      
      const summary = {
        totalDuration: session.totalDuration || 0,
        subtaskCount: new Set(finalSegments.map(s => s.subtaskIndex)).size,
        completedSubtasks: finalSegments.filter(s => s.completedDuringSegment).length,
      };

      res.json({ session, segments: finalSegments, summary });
    } catch (error) {
      console.error("Error ending focus session:", error);
      res.status(500).json({ message: "Failed to end focus session" });
    }
  });

  app.get("/api/tasks/:taskId/subtask-times", isAuthenticated, async (req, res) => {
    try {
      const { taskId } = req.params;
      const stats = await storage.getSubtaskTimeStats(taskId);
      
      const subtasks = await storage.getSubtasks(taskId);
      
      const result = stats.map(stat => {
        const subtask = subtasks[stat.subtaskIndex];
        return {
          subtaskIndex: stat.subtaskIndex,
          title: subtask?.title || `Subtask ${stat.subtaskIndex + 1}`,
          totalDuration: stat.totalDuration,
          completed: subtask?.status === 'done',
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching subtask times:", error);
      res.status(500).json({ message: "Failed to fetch subtask times" });
    }
  });

  // Notifications routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      await storage.markAllNotificationsRead(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ message: "Failed to mark all notifications read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteNotification(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Notification settings routes
  app.get("/api/notification-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const settings = await storage.getNotificationSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ message: "Failed to fetch notification settings" });
    }
  });

  app.patch("/api/notification-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const settings = await storage.upsertNotificationSettings(userId, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  // User preferences routes
  app.get("/api/user-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const prefs = await storage.getUserPreferences(userId);
      
      if (prefs) {
        res.json(prefs);
      } else {
        res.json({
          userId,
          theme: "auto",
          accentColor: "emerald",
          density: "comfortable",
          fontSize: "medium",
          taskCardStyle: "default",
          showDueDate: true,
          showPriority: true,
          showTags: true,
          showProject: true,
          showAssignee: true,
          showEstimatedTime: true,
          defaultListId: null,
          defaultView: "list",
          smartDateParsing: true,
          confirmBeforeDelete: true,
          autoArchiveDays: 0,
          firstDayOfWeek: "sunday",
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12h",
        });
      }
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });

  app.patch("/api/user-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const prefs = await storage.upsertUserPreferences(userId, req.body);
      res.json(prefs);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  // Tags routes
  app.get("/api/tags", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const tagsWithCounts = await storage.getAllTagsWithCounts(userId);
      res.json(tagsWithCounts);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  app.get("/api/projects/:projectId/tags", isAuthenticated, async (req, res) => {
    try {
      const tags = await storage.getTagsByProject(req.params.projectId);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  app.post("/api/tags", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertTagSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid tag data", errors: parsed.error.errors });
      }
      const tag = await storage.createTag(parsed.data);
      res.status(201).json(tag);
    } catch (error) {
      console.error("Error creating tag:", error);
      res.status(500).json({ message: "Failed to create tag" });
    }
  });

  app.delete("/api/tags/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTag(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tag:", error);
      res.status(500).json({ message: "Failed to delete tag" });
    }
  });

  // Task tags routes
  app.post("/api/tasks/:taskId/tags", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const taskTag = await storage.addTaskTag({
        taskId: req.params.taskId,
        tagId: req.body.tagId,
      });
      
      logTaskActivity(req.params.taskId, userId, "tag_added", undefined, undefined, undefined, { tagId: req.body.tagId });
      
      res.status(201).json(taskTag);
    } catch (error) {
      console.error("Error adding task tag:", error);
      res.status(500).json({ message: "Failed to add task tag" });
    }
  });

  app.delete("/api/tasks/:taskId/tags/:tagId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      await storage.removeTaskTag(req.params.taskId, req.params.tagId);
      
      logTaskActivity(req.params.taskId, userId, "tag_removed", undefined, undefined, undefined, { tagId: req.params.tagId });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing task tag:", error);
      res.status(500).json({ message: "Failed to remove task tag" });
    }
  });

  // Object storage routes
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.post("/api/attachments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const objectStorageService = new ObjectStorageService();
      
      let fileUrl = req.body.fileUrl;
      if (fileUrl.startsWith("https://storage.googleapis.com/")) {
        fileUrl = await objectStorageService.trySetObjectEntityAclPolicy(fileUrl, {
          owner: userId,
          visibility: "public",
        });
      }

      const attachment = await storage.createAttachment({
        fileName: req.body.fileName,
        fileUrl,
        fileSize: req.body.fileSize,
        fileType: req.body.fileType,
        taskId: req.body.taskId,
        projectId: req.body.projectId,
        uploadedById: userId,
      });
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error creating attachment:", error);
      res.status(500).json({ message: "Failed to create attachment" });
    }
  });

  app.delete("/api/attachments/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAttachment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // Task dependencies routes for Gantt chart
  app.get("/api/projects/:projectId/dependencies", isAuthenticated, async (req, res) => {
    try {
      const dependencies = await storage.getProjectDependencies(req.params.projectId);
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching project dependencies:", error);
      res.status(500).json({ message: "Failed to fetch dependencies" });
    }
  });

  app.post("/api/dependencies", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertTaskDependencySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid dependency data", errors: parsed.error.errors });
      }
      const dependency = await storage.createTaskDependency(parsed.data);
      res.status(201).json(dependency);
    } catch (error) {
      console.error("Error creating dependency:", error);
      res.status(500).json({ message: "Failed to create dependency" });
    }
  });

  app.delete("/api/dependencies/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTaskDependency(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting dependency:", error);
      res.status(500).json({ message: "Failed to delete dependency" });
    }
  });

  // Groups routes
  app.get("/api/groups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const groups = await storage.getGroupsByUser(userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post("/api/groups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertGroupSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid group data", errors: parsed.error.errors });
      }
      const group = await storage.createGroup(parsed.data);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.get("/api/groups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const isMember = await storage.isUserGroupMember(req.params.id, userId);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }
      const group = await storage.getGroupWithRelations(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      console.error("Error fetching group:", error);
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });

  app.patch("/api/groups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existingGroup = await storage.getGroup(req.params.id);
      if (!existingGroup) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (existingGroup.ownerId !== userId) {
        return res.status(403).json({ message: "Only the group owner can update the group" });
      }
      const group = await storage.updateGroup(req.params.id, req.body);
      res.json(group);
    } catch (error) {
      console.error("Error updating group:", error);
      res.status(500).json({ message: "Failed to update group" });
    }
  });

  app.delete("/api/groups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existingGroup = await storage.getGroup(req.params.id);
      if (!existingGroup) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (existingGroup.ownerId !== userId) {
        return res.status(403).json({ message: "Only the group owner can delete the group" });
      }
      await storage.deleteGroup(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  // Group members routes
  app.get("/api/groups/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const isMember = await storage.isUserGroupMember(req.params.id, userId);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }
      const members = await storage.getGroupMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });

  app.post("/api/groups/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (group.ownerId !== userId) {
        return res.status(403).json({ message: "Only the group owner can add members" });
      }
      const parsed = insertGroupMemberSchema.safeParse({
        groupId: req.params.id,
        userId: req.body.userId,
        role: req.body.role || "member",
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid member data", errors: parsed.error.errors });
      }
      const member = await storage.addGroupMember(parsed.data);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding group member:", error);
      res.status(500).json({ message: "Failed to add group member" });
    }
  });

  app.delete("/api/groups/:id/members/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (group.ownerId !== userId) {
        return res.status(403).json({ message: "Only the group owner can remove members" });
      }
      await storage.removeGroupMember(req.params.id, req.params.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing group member:", error);
      res.status(500).json({ message: "Failed to remove group member" });
    }
  });

  // Group projects routes
  app.get("/api/groups/:id/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const isMember = await storage.isUserGroupMember(req.params.id, userId);
      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }
      const projects = await storage.getProjectsByGroup(req.params.id);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching group projects:", error);
      res.status(500).json({ message: "Failed to fetch group projects" });
    }
  });

  app.patch("/api/projects/:id/group", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.moveProjectToGroup(req.params.id, req.body.groupId || null);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error moving project to group:", error);
      res.status(500).json({ message: "Failed to move project to group" });
    }
  });

  // Subtask routes
  app.get("/api/tasks/:taskId/subtasks", isAuthenticated, async (req, res) => {
    try {
      const subtasks = await storage.getSubtasks(req.params.taskId);
      res.json(subtasks);
    } catch (error) {
      console.error("Error fetching subtasks:", error);
      res.status(500).json({ message: "Failed to fetch subtasks" });
    }
  });

  app.post("/api/tasks/:taskId/subtasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertTaskSchema.omit({ projectId: true }).safeParse({
        ...req.body,
        creatorId: userId,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid subtask data", errors: parsed.error.errors });
      }
      const subtask = await storage.createSubtask(req.params.taskId, parsed.data);
      
      logTaskActivity(req.params.taskId, userId, "subtask_added", undefined, undefined, undefined, { subtaskId: subtask.id, subtaskTitle: subtask.title });
      
      res.status(201).json(subtask);
    } catch (error) {
      console.error("Error creating subtask:", error);
      res.status(500).json({ message: "Failed to create subtask" });
    }
  });

  app.get("/api/tasks/:taskId/progress", isAuthenticated, async (req, res) => {
    try {
      const progress = await storage.getSubtaskProgress(req.params.taskId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching subtask progress:", error);
      res.status(500).json({ message: "Failed to fetch subtask progress" });
    }
  });

  app.patch("/api/tasks/:taskId/promote", isAuthenticated, async (req, res) => {
    try {
      const task = await storage.promoteSubtaskToTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error promoting subtask:", error);
      res.status(500).json({ message: "Failed to promote subtask" });
    }
  });

  // Pomodoro routes
  app.get("/api/pomodoro/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      let settings = await storage.getPomodoroSettings(userId);
      if (!settings) {
        settings = await storage.upsertPomodoroSettings({ userId });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching pomodoro settings:", error);
      res.status(500).json({ message: "Failed to fetch pomodoro settings" });
    }
  });

  app.put("/api/pomodoro/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertPomodoroSettingsSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid settings data", errors: parsed.error.errors });
      }
      const settings = await storage.upsertPomodoroSettings(parsed.data);
      res.json(settings);
    } catch (error) {
      console.error("Error updating pomodoro settings:", error);
      res.status(500).json({ message: "Failed to update pomodoro settings" });
    }
  });

  app.get("/api/pomodoro/session/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const session = await storage.getActivePomodoroSession(userId);
      res.json(session || null);
    } catch (error) {
      console.error("Error fetching active pomodoro session:", error);
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  app.post("/api/pomodoro/session/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existingSession = await storage.getActivePomodoroSession(userId);
      if (existingSession) {
        return res.status(400).json({ message: "An active session already exists" });
      }
      const settings = await storage.getPomodoroSettings(userId);
      const sessionType = req.body.sessionType || "work";
      let duration = req.body.duration;
      if (!duration && settings) {
        if (sessionType === "work") duration = settings.workDuration;
        else if (sessionType === "short_break") duration = settings.shortBreakDuration;
        else if (sessionType === "long_break") duration = settings.longBreakDuration;
      }
      duration = duration || 25;
      const sessionData = {
        userId,
        taskId: req.body.taskId || null,
        projectId: req.body.projectId || null,
        sessionType,
        duration,
        status: "active" as const,
        startedAt: new Date(),
      };
      const session = await storage.createPomodoroSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error starting pomodoro session:", error);
      res.status(500).json({ message: "Failed to start session" });
    }
  });

  app.post("/api/pomodoro/session/:id/pause", isAuthenticated, async (req: any, res) => {
    try {
      const session = await storage.getPomodoroSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (session.userId !== (req.user as User).id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (session.status !== "active") {
        return res.status(400).json({ message: "Session is not active" });
      }
      const elapsedSeconds = session.startedAt 
        ? Math.floor((Date.now() - session.startedAt.getTime()) / 1000) + (session.completedDuration || 0)
        : session.completedDuration || 0;
      const updated = await storage.updatePomodoroSession(req.params.id, {
        status: "paused",
        pausedAt: new Date(),
        completedDuration: elapsedSeconds,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error pausing pomodoro session:", error);
      res.status(500).json({ message: "Failed to pause session" });
    }
  });

  app.post("/api/pomodoro/session/:id/resume", isAuthenticated, async (req: any, res) => {
    try {
      const session = await storage.getPomodoroSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (session.userId !== (req.user as User).id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (session.status !== "paused") {
        return res.status(400).json({ message: "Session is not paused" });
      }
      const updated = await storage.updatePomodoroSession(req.params.id, {
        status: "active",
        startedAt: new Date(),
        pausedAt: null,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error resuming pomodoro session:", error);
      res.status(500).json({ message: "Failed to resume session" });
    }
  });

  app.post("/api/pomodoro/session/:id/stop", isAuthenticated, async (req: any, res) => {
    try {
      const session = await storage.getPomodoroSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (session.userId !== (req.user as User).id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      let completedDuration = session.completedDuration || 0;
      if (session.status === "active" && session.startedAt) {
        completedDuration = Math.floor((Date.now() - session.startedAt.getTime()) / 1000) + completedDuration;
      }
      const isCompleted = completedDuration >= (session.duration * 60);
      const updated = await storage.updatePomodoroSession(req.params.id, {
        status: isCompleted ? "completed" : "cancelled",
        completedAt: new Date(),
        completedDuration,
        interruptions: (session.interruptions || 0) + (req.body.wasInterrupted ? 1 : 0),
      });
      res.json(updated);
    } catch (error) {
      console.error("Error stopping pomodoro session:", error);
      res.status(500).json({ message: "Failed to stop session" });
    }
  });

  app.post("/api/pomodoro/session/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const session = await storage.getPomodoroSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      if (session.userId !== (req.user as User).id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const updated = await storage.updatePomodoroSession(req.params.id, {
        status: "completed",
        completedAt: new Date(),
        completedDuration: session.duration * 60,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error completing pomodoro session:", error);
      res.status(500).json({ message: "Failed to complete session" });
    }
  });

  app.get("/api/pomodoro/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const sessions = await storage.getPomodoroSessionsByUser(userId, limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching pomodoro sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get("/api/pomodoro/sessions/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const days = parseInt(req.query.days as string) || 7;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const sessions = await storage.getPomodoroSessionsByDateRange(userId, startDate, endDate);
      const workSessions = sessions.filter(s => s.sessionType === "work" && s.status === "completed");
      const totalWorkMinutes = workSessions.reduce((sum, s) => sum + (s.completedDuration || 0) / 60, 0);
      const stats = {
        totalSessions: workSessions.length,
        totalWorkMinutes: Math.round(totalWorkMinutes),
        averageSessionMinutes: workSessions.length > 0 ? Math.round(totalWorkMinutes / workSessions.length) : 0,
        sessionsPerDay: workSessions.length / days,
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching pomodoro stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Habits routes
  app.get("/api/habits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const habits = await storage.getHabitsByUser(userId);
      res.json(habits);
    } catch (error) {
      console.error("Error fetching habits:", error);
      res.status(500).json({ message: "Failed to fetch habits" });
    }
  });

  app.post("/api/habits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertHabitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid habit data", errors: parsed.error.errors });
      }
      const habit = await storage.createHabit({ ...parsed.data, userId });
      
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 30);
      await storage.generateHabitOccurrences(habit.id, today, endDate);
      
      res.status(201).json(habit);
    } catch (error) {
      console.error("Error creating habit:", error);
      res.status(500).json({ message: "Failed to create habit" });
    }
  });

  app.get("/api/habits/:id", isAuthenticated, async (req, res) => {
    try {
      const habit = await storage.getHabitWithRelations(req.params.id);
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      res.json(habit);
    } catch (error) {
      console.error("Error fetching habit:", error);
      res.status(500).json({ message: "Failed to fetch habit" });
    }
  });

  app.patch("/api/habits/:id", isAuthenticated, async (req, res) => {
    try {
      const habit = await storage.updateHabit(req.params.id, req.body);
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      res.json(habit);
    } catch (error) {
      console.error("Error updating habit:", error);
      res.status(500).json({ message: "Failed to update habit" });
    }
  });

  app.delete("/api/habits/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteHabit(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting habit:", error);
      res.status(500).json({ message: "Failed to delete habit" });
    }
  });

  // Habit occurrences routes
  app.get("/api/habits/occurrences/today", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const occurrences = await storage.getHabitOccurrencesByDate(userId, new Date());
      res.json(occurrences);
    } catch (error) {
      console.error("Error fetching today's occurrences:", error);
      res.status(500).json({ message: "Failed to fetch occurrences" });
    }
  });

  app.post("/api/habits/occurrences/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const occurrence = await storage.markHabitComplete(req.params.id, req.body.notes);
      if (!occurrence) {
        return res.status(404).json({ message: "Occurrence not found" });
      }
      
      generateInsightsOnHabitComplete(userId, occurrence.habitId).catch((err) => {
        console.error("Error generating insights on completion:", err);
      });
      
      res.json(occurrence);
    } catch (error) {
      console.error("Error completing habit:", error);
      res.status(500).json({ message: "Failed to complete habit" });
    }
  });

  app.post("/api/habits/occurrences/:id/miss", isAuthenticated, async (req, res) => {
    try {
      const occurrence = await storage.markHabitMissed(req.params.id);
      if (!occurrence) {
        return res.status(404).json({ message: "Occurrence not found" });
      }
      res.json(occurrence);
    } catch (error) {
      console.error("Error marking habit missed:", error);
      res.status(500).json({ message: "Failed to mark habit missed" });
    }
  });

  // Habits metrics routes
  app.get("/api/habits/metrics/:period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const period = req.params.period as 'today' | 'week' | 'month';
      if (!['today', 'week', 'month'].includes(period)) {
        return res.status(400).json({ message: "Invalid period. Use today, week, or month" });
      }
      const metrics = await storage.getHabitMetrics(userId, period);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching habit metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/habits/streaks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const streaks = await storage.getMultiLevelStreaks(userId);
      res.json(streaks);
    } catch (error) {
      console.error("Error fetching streaks:", error);
      res.status(500).json({ message: "Failed to fetch streaks" });
    }
  });

  app.get("/api/habits/patterns", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const patterns = await storage.getHabitPatterns(userId);
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching patterns:", error);
      res.status(500).json({ message: "Failed to fetch patterns" });
    }
  });

  app.get("/api/habits/time-window-metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const metrics = await storage.getTimeWindowMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching time window metrics:", error);
      res.status(500).json({ message: "Failed to fetch time window metrics" });
    }
  });

  // Sub-habits routes
  app.get("/api/habits/:id/with-sub-habits", isAuthenticated, async (req, res) => {
    try {
      const habit = await storage.getHabitWithSubHabits(req.params.id);
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      res.json(habit);
    } catch (error) {
      console.error("Error fetching habit with sub-habits:", error);
      res.status(500).json({ message: "Failed to fetch habit" });
    }
  });

  app.get("/api/habits/parent/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const habits = await storage.getParentHabitsWithSubHabits(userId);
      res.json(habits);
    } catch (error) {
      console.error("Error fetching parent habits:", error);
      res.status(500).json({ message: "Failed to fetch habits" });
    }
  });

  app.post("/api/habits/with-sub-habits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { subHabits, ...habitData } = req.body;
      const parsed = insertHabitSchema.safeParse(habitData);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid habit data", errors: parsed.error.errors });
      }
      const habit = await storage.createHabitWithSubHabits(
        { ...parsed.data, userId },
        subHabits || []
      );
      res.status(201).json(habit);
    } catch (error) {
      console.error("Error creating habit with sub-habits:", error);
      res.status(500).json({ message: "Failed to create habit" });
    }
  });

  app.post("/api/habits/:parentId/sub-habits", isAuthenticated, async (req, res) => {
    try {
      const subHabit = await storage.addSubHabit(req.params.parentId, req.body);
      res.status(201).json(subHabit);
    } catch (error) {
      console.error("Error adding sub-habit:", error);
      res.status(500).json({ message: "Failed to add sub-habit" });
    }
  });

  app.put("/api/habits/:parentId/reorder-sub-habits", isAuthenticated, async (req, res) => {
    try {
      await storage.reorderSubHabits(req.params.parentId, req.body.subHabitIds);
      res.json({ message: "Sub-habits reordered" });
    } catch (error) {
      console.error("Error reordering sub-habits:", error);
      res.status(500).json({ message: "Failed to reorder sub-habits" });
    }
  });

  app.get("/api/habits/:parentId/progress", isAuthenticated, async (req, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const progress = await storage.getSubHabitProgress(req.params.parentId, date);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching sub-habit progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post("/api/habits/:parentId/complete-all-sub-habits", isAuthenticated, async (req, res) => {
    try {
      const date = req.body.date ? new Date(req.body.date) : new Date();
      await storage.completeAllSubHabits(req.params.parentId, date);
      res.json({ message: "All sub-habits completed" });
    } catch (error) {
      console.error("Error completing all sub-habits:", error);
      res.status(500).json({ message: "Failed to complete sub-habits" });
    }
  });

  app.post("/api/habits/:parentId/uncheck-all-sub-habits", isAuthenticated, async (req, res) => {
    try {
      const date = req.body.date ? new Date(req.body.date) : new Date();
      await storage.uncheckAllSubHabits(req.params.parentId, date);
      res.json({ message: "All sub-habits unchecked" });
    } catch (error) {
      console.error("Error unchecking all sub-habits:", error);
      res.status(500).json({ message: "Failed to uncheck sub-habits" });
    }
  });

  app.post("/api/habits/:subHabitId/toggle-complete", isAuthenticated, async (req, res) => {
    try {
      const date = req.body.date ? new Date(req.body.date) : new Date();
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const occurrences = await storage.getHabitOccurrencesByDate(
        (req.user as User).id,
        date
      );

      let occurrence = occurrences.find(o => o.habitId === req.params.subHabitId);

      if (!occurrence) {
        occurrence = await storage.createHabitOccurrence({
          habitId: req.params.subHabitId,
          scheduledDate: startOfDay,
          status: 'pending',
        });
      }

      let updatedOccurrence;
      if (occurrence.status === 'completed') {
        updatedOccurrence = await storage.resetHabitToPending(occurrence.id);
      } else {
        updatedOccurrence = await storage.markHabitComplete(occurrence.id);
      }

      const habit = await storage.getHabit(req.params.subHabitId);
      if (habit?.parentHabitId) {
        const autoCompleted = await storage.checkAndAutoCompleteParent(habit.parentHabitId, date);
        // Get parent occurrence to include its completionStatus
        const parentOccurrences = await storage.getHabitOccurrencesByDate((req.user as User).id, date);
        const parentOccurrence = parentOccurrences.find(o => o.habitId === habit.parentHabitId);
        res.json({ occurrence: updatedOccurrence, parentAutoCompleted: autoCompleted, parentOccurrence });
      } else {
        res.json({ occurrence: updatedOccurrence, parentAutoCompleted: false });
      }
    } catch (error) {
      console.error("Error toggling sub-habit:", error);
      res.status(500).json({ message: "Failed to toggle sub-habit" });
    }
  });

  app.get("/api/habits/:parentId/sub-habit-history", isAuthenticated, async (req, res) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const history = await storage.getSubHabitHistory(req.params.parentId, startDate, endDate);
      res.json(history);
    } catch (error) {
      console.error("Error fetching sub-habit history:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  // Habit Categories routes
  app.get("/api/habit-categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const categories = await storage.getHabitCategories(userId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching habit categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/habit-categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertHabitCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid category data", errors: parsed.error.errors });
      }
      const category = await storage.createHabitCategory({ ...parsed.data, userId });
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating habit category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/habit-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.updateHabitCategory(req.params.id, req.body);
      res.json(category);
    } catch (error) {
      console.error("Error updating habit category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/habit-categories/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteHabitCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting habit category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Habit Insights routes
  app.get("/api/habit-insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const unreadOnly = req.query.unreadOnly === 'true';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const insights = await storage.getHabitInsights(userId, { unreadOnly, limit });
      res.json(insights);
    } catch (error) {
      console.error("Error fetching habit insights:", error);
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });

  app.post("/api/habit-insights/:id/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markHabitInsightAsRead(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking insight as read:", error);
      res.status(500).json({ message: "Failed to mark insight as read" });
    }
  });

  app.post("/api/habits/generate-insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const count = await generateHabitInsights(userId);
      res.json({ success: true, insightsGenerated: count });
    } catch (error) {
      console.error("Error generating habit insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // Habit Journal routes
  app.get("/api/habit-journal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const habitId = req.query.habitId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const entries = await storage.getHabitJournalEntries(userId, { habitId, limit });
      res.json(entries);
    } catch (error) {
      console.error("Error fetching habit journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  app.post("/api/habit-journal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertHabitJournalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid journal entry data", errors: parsed.error.errors });
      }
      const entry = await storage.createHabitJournalEntry({ ...parsed.data, userId });
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating habit journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  app.get("/api/habit-occurrences/:id/journal", isAuthenticated, async (req, res) => {
    try {
      const entries = await storage.getJournalEntriesForOccurrence(req.params.id);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries for occurrence:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  // Habit Achievements routes
  app.get("/api/habit-achievements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const achievements = await storage.getHabitAchievements(userId);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching habit achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  app.post("/api/habit-achievements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { achievementType, habitId, unlockedAt, metadata } = req.body;
      
      // Check if already unlocked
      const existing = await storage.getHabitAchievements(userId);
      if (existing.some(a => a.achievementType === achievementType)) {
        return res.status(409).json({ message: "Achievement already unlocked" });
      }
      
      const achievement = await storage.createHabitAchievement({
        userId,
        achievementType,
        habitId: habitId || null,
        unlockedAt: new Date(unlockedAt),
        metadata: metadata || null,
      });
      res.status(201).json(achievement);
    } catch (error) {
      console.error("Error creating habit achievement:", error);
      res.status(500).json({ message: "Failed to create achievement" });
    }
  });

  // Habit Templates routes
  // Seed default templates (idempotent)
  app.post("/api/habit-templates/seed", isAuthenticated, async (req: any, res) => {
    try {
      const existingTemplates = await storage.getHabitTemplates({ publicOnly: true });
      const defaultTemplates = [
        {
          name: "Morning Person",
          description: "Start your day with energy and purpose",
          categoryName: "productivity",
          icon: "sunrise",
          color: "#F59E0B",
          subHabits: [
            { name: "Wake up on time", estimatedDuration: 5, displayOrder: 0 },
            { name: "Exercise or stretch", estimatedDuration: 20, displayOrder: 1 },
            { name: "Healthy breakfast", estimatedDuration: 15, displayOrder: 2 },
            { name: "Plan your day", estimatedDuration: 10, displayOrder: 3 },
          ],
          recurrence: "daily",
          startTime: "06:00",
          endTime: "09:00",
          isPublic: true,
        },
        {
          name: "Power Morning",
          description: "High-intensity start to maximize productivity",
          categoryName: "fitness",
          icon: "zap",
          color: "#EF4444",
          subHabits: [
            { name: "Workout session", estimatedDuration: 30, displayOrder: 0 },
            { name: "Cold shower", estimatedDuration: 5, displayOrder: 1 },
            { name: "Review daily goals", estimatedDuration: 10, displayOrder: 2 },
          ],
          recurrence: "daily",
          startTime: "05:30",
          endTime: "07:00",
          isPublic: true,
        },
        {
          name: "Wind Down",
          description: "Prepare for restful sleep",
          categoryName: "health",
          icon: "moon",
          color: "#8B5CF6",
          subHabits: [
            { name: "Light dinner", estimatedDuration: 30, displayOrder: 0 },
            { name: "Read for 20 minutes", estimatedDuration: 20, displayOrder: 1 },
            { name: "Skincare routine", estimatedDuration: 10, displayOrder: 2 },
            { name: "Prep tomorrow's outfit", estimatedDuration: 5, displayOrder: 3 },
          ],
          recurrence: "daily",
          startTime: "20:00",
          endTime: "22:00",
          isPublic: true,
        },
        {
          name: "Athlete's Daily",
          description: "Complete training routine for athletes",
          categoryName: "fitness",
          icon: "dumbbell",
          color: "#10B981",
          subHabits: [
            { name: "Warm-up stretches", estimatedDuration: 10, displayOrder: 0 },
            { name: "Main workout", estimatedDuration: 45, displayOrder: 1 },
            { name: "Protein shake", estimatedDuration: 5, displayOrder: 2 },
            { name: "Cool-down stretch", estimatedDuration: 10, displayOrder: 3 },
          ],
          recurrence: "daily",
          startTime: "07:00",
          endTime: "09:00",
          isPublic: true,
        },
        {
          name: "Deep Work",
          description: "Focused productivity without distractions",
          categoryName: "productivity",
          icon: "target",
          color: "#3B82F6",
          subHabits: [
            { name: "Set up time blocks", estimatedDuration: 5, displayOrder: 0 },
            { name: "Focus session (90 min)", estimatedDuration: 90, displayOrder: 1 },
            { name: "Take a break", estimatedDuration: 15, displayOrder: 2 },
          ],
          recurrence: "daily",
          startTime: "09:00",
          endTime: "12:00",
          isPublic: true,
        },
        {
          name: "Mindfulness Practice",
          description: "Daily mental wellness routine",
          categoryName: "mindfulness",
          icon: "brain",
          color: "#EC4899",
          subHabits: [
            { name: "Morning meditation", estimatedDuration: 15, displayOrder: 0 },
            { name: "Breathing exercises", estimatedDuration: 5, displayOrder: 1 },
            { name: "Gratitude journal", estimatedDuration: 10, displayOrder: 2 },
          ],
          recurrence: "daily",
          startTime: "07:00",
          endTime: "08:00",
          isPublic: true,
        },
      ];

      let seededCount = 0;
      for (const template of defaultTemplates) {
        const exists = existingTemplates.some(t => t.name === template.name);
        if (!exists) {
          await storage.createHabitTemplate(template);
          seededCount++;
        }
      }

      res.json({ message: `Seeded ${seededCount} new templates`, total: existingTemplates.length + seededCount });
    } catch (error) {
      console.error("Error seeding templates:", error);
      res.status(500).json({ message: "Failed to seed templates" });
    }
  });

  app.get("/api/habit-templates", isAuthenticated, async (req: any, res) => {
    try {
      const publicOnly = req.query.publicOnly === 'true';
      const categoryName = req.query.categoryName as string | undefined;
      let templates = await storage.getHabitTemplates({ publicOnly, categoryName });
      
      // Auto-seed if no templates exist
      if (templates.length === 0) {
        const defaultTemplates = [
          {
            name: "Morning Person",
            description: "Start your day with energy and purpose",
            categoryName: "productivity",
            icon: "sunrise",
            color: "#F59E0B",
            subHabits: [
              { name: "Wake up on time", estimatedDuration: 5, displayOrder: 0 },
              { name: "Exercise or stretch", estimatedDuration: 20, displayOrder: 1 },
              { name: "Healthy breakfast", estimatedDuration: 15, displayOrder: 2 },
              { name: "Plan your day", estimatedDuration: 10, displayOrder: 3 },
            ],
            recurrence: "daily",
            startTime: "06:00",
            endTime: "09:00",
            isPublic: true,
          },
          {
            name: "Power Morning",
            description: "High-intensity start to maximize productivity",
            categoryName: "fitness",
            icon: "zap",
            color: "#EF4444",
            subHabits: [
              { name: "Workout session", estimatedDuration: 30, displayOrder: 0 },
              { name: "Cold shower", estimatedDuration: 5, displayOrder: 1 },
              { name: "Review daily goals", estimatedDuration: 10, displayOrder: 2 },
            ],
            recurrence: "daily",
            startTime: "05:30",
            endTime: "07:00",
            isPublic: true,
          },
          {
            name: "Wind Down",
            description: "Prepare for restful sleep",
            categoryName: "health",
            icon: "moon",
            color: "#8B5CF6",
            subHabits: [
              { name: "Light dinner", estimatedDuration: 30, displayOrder: 0 },
              { name: "Read for 20 minutes", estimatedDuration: 20, displayOrder: 1 },
              { name: "Skincare routine", estimatedDuration: 10, displayOrder: 2 },
              { name: "Prep tomorrow's outfit", estimatedDuration: 5, displayOrder: 3 },
            ],
            recurrence: "daily",
            startTime: "20:00",
            endTime: "22:00",
            isPublic: true,
          },
          {
            name: "Athlete's Daily",
            description: "Complete training routine for athletes",
            categoryName: "fitness",
            icon: "dumbbell",
            color: "#10B981",
            subHabits: [
              { name: "Warm-up stretches", estimatedDuration: 10, displayOrder: 0 },
              { name: "Main workout", estimatedDuration: 45, displayOrder: 1 },
              { name: "Protein shake", estimatedDuration: 5, displayOrder: 2 },
              { name: "Cool-down stretch", estimatedDuration: 10, displayOrder: 3 },
            ],
            recurrence: "daily",
            startTime: "07:00",
            endTime: "09:00",
            isPublic: true,
          },
          {
            name: "Deep Work",
            description: "Focused productivity without distractions",
            categoryName: "productivity",
            icon: "target",
            color: "#3B82F6",
            subHabits: [
              { name: "Set up time blocks", estimatedDuration: 5, displayOrder: 0 },
              { name: "Focus session (90 min)", estimatedDuration: 90, displayOrder: 1 },
              { name: "Take a break", estimatedDuration: 15, displayOrder: 2 },
            ],
            recurrence: "daily",
            startTime: "09:00",
            endTime: "12:00",
            isPublic: true,
          },
          {
            name: "Mindfulness Practice",
            description: "Daily mental wellness routine",
            categoryName: "mindfulness",
            icon: "brain",
            color: "#EC4899",
            subHabits: [
              { name: "Morning meditation", estimatedDuration: 15, displayOrder: 0 },
              { name: "Breathing exercises", estimatedDuration: 5, displayOrder: 1 },
              { name: "Gratitude journal", estimatedDuration: 10, displayOrder: 2 },
            ],
            recurrence: "daily",
            startTime: "07:00",
            endTime: "08:00",
            isPublic: true,
          },
        ];
        
        for (const template of defaultTemplates) {
          await storage.createHabitTemplate(template);
        }
        templates = await storage.getHabitTemplates({ publicOnly, categoryName });
      }
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching habit templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/habit-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getHabitTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching habit template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post("/api/habit-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertHabitTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid template data", errors: parsed.error.errors });
      }
      const template = await storage.createHabitTemplate({ ...parsed.data, createdBy: userId });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating habit template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.post("/api/habit-templates/:id/apply", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const template = await storage.getHabitTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Create habit from template
      const habit = await storage.createHabit({
        userId,
        name: template.name,
        description: template.description,
        frequency: template.frequency,
        targetCount: template.targetCount,
        color: template.color,
        icon: template.icon,
        timeOfDay: template.timeOfDay,
        reminderTime: template.reminderTime,
        daysOfWeek: template.daysOfWeek,
      });

      // Increment template usage count
      await storage.incrementHabitTemplateUsage(req.params.id);

      res.status(201).json(habit);
    } catch (error) {
      console.error("Error applying habit template:", error);
      res.status(500).json({ message: "Failed to apply template" });
    }
  });

  // Habit Analytics routes
  app.get("/api/habits/analytics/heatmap", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 90;
      const heatmapData = await storage.getHabitHeatmapData(userId, days);
      res.json(heatmapData);
    } catch (error) {
      console.error("Error fetching habit heatmap data:", error);
      res.status(500).json({ message: "Failed to fetch heatmap data" });
    }
  });

  app.get("/api/habits/analytics/time-patterns", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const patterns = await storage.getHabitTimePatterns(userId);
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching habit time patterns:", error);
      res.status(500).json({ message: "Failed to fetch time patterns" });
    }
  });

  app.get("/api/habits/analytics/day-patterns", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const patterns = await storage.getHabitDayPatterns(userId);
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching habit day patterns:", error);
      res.status(500).json({ message: "Failed to fetch day patterns" });
    }
  });

  app.get("/api/habits/analytics/performance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const breakdown = await storage.getHabitPerformanceBreakdown(userId);
      res.json(breakdown);
    } catch (error) {
      console.error("Error fetching habit performance breakdown:", error);
      res.status(500).json({ message: "Failed to fetch performance breakdown" });
    }
  });

  app.get("/api/habits/analytics/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const period = (req.query.period as 'today' | 'week' | 'month') || 'week';
      const metrics = await storage.getHabitMetrics(userId, period);
      
      // Get additional trend data
      const heatmapData = await storage.getHabitHeatmapData(userId, 30);
      const performance = await storage.getHabitPerformanceBreakdown(userId);
      
      // Calculate trends
      const thisWeekRate = heatmapData.slice(-7).reduce((acc, d) => acc + d.completionRate, 0) / 7;
      const lastWeekRate = heatmapData.slice(-14, -7).reduce((acc, d) => acc + d.completionRate, 0) / 7;
      const trend = thisWeekRate > lastWeekRate ? 'up' : thisWeekRate < lastWeekRate ? 'down' : 'stable';
      
      res.json({
        ...metrics,
        trend,
        topHabits: performance.slice(0, 5),
        needsAttention: performance.filter(p => p.completionRate < 50).slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching habit analytics metrics:", error);
      res.status(500).json({ message: "Failed to fetch analytics metrics" });
    }
  });

  app.get("/api/habits/:id/sub-habits/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getSubHabitStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching sub-habit stats:", error);
      res.status(500).json({ message: "Failed to fetch sub-habit stats" });
    }
  });

  // Schedule settings routes
  app.get("/api/schedule/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const settings = await storage.getScheduleSettings(userId);
      res.json(settings || {
        workStartTime: '08:00',
        workEndTime: '22:00',
        minTaskDuration: 15,
        maxTaskDuration: 120,
        breakDuration: 10,
        breakFrequency: 90,
        preferMorningTasks: false,
        workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      });
    } catch (error) {
      console.error("Error fetching schedule settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/schedule/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertScheduleSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid settings data", errors: parsed.error.errors });
      }
      const settings = await storage.upsertScheduleSettings(userId, parsed.data);
      res.json(settings);
    } catch (error) {
      console.error("Error updating schedule settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Time blocks routes
  app.get("/api/schedule/blocks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const blocks = await storage.getTimeBlocksByUser(userId);
      res.json(blocks);
    } catch (error) {
      console.error("Error fetching time blocks:", error);
      res.status(500).json({ message: "Failed to fetch time blocks" });
    }
  });

  app.post("/api/schedule/blocks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertTimeBlockSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid block data", errors: parsed.error.errors });
      }
      const block = await storage.createTimeBlock({ ...parsed.data, userId });
      res.status(201).json(block);
    } catch (error) {
      console.error("Error creating time block:", error);
      res.status(500).json({ message: "Failed to create time block" });
    }
  });

  app.patch("/api/schedule/blocks/:id", isAuthenticated, async (req, res) => {
    try {
      const block = await storage.updateTimeBlock(req.params.id, req.body);
      if (!block) {
        return res.status(404).json({ message: "Time block not found" });
      }
      res.json(block);
    } catch (error) {
      console.error("Error updating time block:", error);
      res.status(500).json({ message: "Failed to update time block" });
    }
  });

  app.delete("/api/schedule/blocks/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTimeBlock(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting time block:", error);
      res.status(500).json({ message: "Failed to delete time block" });
    }
  });

  // Schedule analysis route
  app.get("/api/schedule/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const dateParam = req.query.date as string;
      const date = dateParam ? new Date(dateParam) : new Date();
      const analysis = await storage.analyzeSchedule(userId, date);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing schedule:", error);
      res.status(500).json({ message: "Failed to analyze schedule" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/overview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const projectId = req.query.projectId as string | undefined;

      const overview = await storage.getAnalyticsOverview(userId, startDate, endDate, projectId);
      res.json(overview);
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });

  app.get("/api/analytics/trends", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const period = (req.query.period as string) || "30days";
      const metric = (req.query.metric as string) || "tasks";
      const projectId = req.query.projectId as string | undefined;

      const trends = await storage.getAnalyticsTrends(userId, period, metric, projectId);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching analytics trends:", error);
      res.status(500).json({ message: "Failed to fetch analytics trends" });
    }
  });

  app.get("/api/analytics/task-metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const projectId = req.query.projectId as string | undefined;

      const metrics = await storage.getTaskMetrics(userId, startDate, endDate, projectId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching task metrics:", error);
      res.status(500).json({ message: "Failed to fetch task metrics" });
    }
  });

  app.get("/api/analytics/time-allocation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const groupBy = (req.query.groupBy as string) || "project";

      const allocation = await storage.getTimeAllocation(userId, startDate, endDate, groupBy);
      res.json(allocation);
    } catch (error) {
      console.error("Error fetching time allocation:", error);
      res.status(500).json({ message: "Failed to fetch time allocation" });
    }
  });

  app.get("/api/analytics/productivity-scores", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const scores = await storage.getProductivityScores(userId, startDate, endDate);
      res.json(scores);
    } catch (error) {
      console.error("Error fetching productivity scores:", error);
      res.status(500).json({ message: "Failed to fetch productivity scores" });
    }
  });

  app.get("/api/analytics/habits-performance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const performance = await storage.getHabitsPerformance(userId, startDate, endDate);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching habits performance:", error);
      res.status(500).json({ message: "Failed to fetch habits performance" });
    }
  });

  app.get("/api/analytics/weekly-completions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const tasks = await storage.getTasksByUser(userId);
      
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      startOfWeek.setHours(0, 0, 0, 0);
      
      const weeklyData: { date: string; completed: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const completed = tasks.filter(task => {
          if (task.status !== 'done' || !task.completedAt) return false;
          const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
          return completedDate === dateStr;
        }).length;
        
        weeklyData.push({ date: dateStr, completed });
      }
      
      res.json({ weeklyData });
    } catch (error) {
      console.error("Error fetching weekly completions:", error);
      res.status(500).json({ message: "Failed to fetch weekly completions" });
    }
  });

  // Task Templates routes
  app.get("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const templates = await storage.getTaskTemplatesByUser(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/public", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getPublicTaskTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching public templates:", error);
      res.status(500).json({ message: "Failed to fetch public templates" });
    }
  });

  app.get("/api/templates/category/:category", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getTaskTemplatesByCategory(req.params.category);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates by category:", error);
      res.status(500).json({ message: "Failed to fetch templates by category" });
    }
  });

  app.get("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getTaskTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertTaskTemplateSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid template data", errors: parsed.error.errors });
      }
      const template = await storage.createTaskTemplate(parsed.data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existing = await storage.getTaskTemplate(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Template not found" });
      }
      if (existing.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this template" });
      }
      const template = await storage.updateTaskTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existing = await storage.getTaskTemplate(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Template not found" });
      }
      if (existing.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this template" });
      }
      await storage.deleteTaskTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  app.post("/api/templates/:id/use", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { projectId } = req.body;
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }
      const task = await storage.createTaskFromTemplate(req.params.id, projectId, userId);
      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error using template:", error);
      res.status(500).json({ message: error.message || "Failed to create task from template" });
    }
  });

  // Lists routes
  app.get("/api/lists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const lists = await storage.getLists(userId);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching lists:", error);
      res.status(500).json({ message: "Failed to fetch lists" });
    }
  });

  app.get("/api/lists/:id", isAuthenticated, async (req, res) => {
    try {
      const list = await storage.getList(req.params.id);
      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }
      res.json(list);
    } catch (error) {
      console.error("Error fetching list:", error);
      res.status(500).json({ message: "Failed to fetch list" });
    }
  });

  app.post("/api/lists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertListSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid list data", errors: parsed.error.errors });
      }
      const list = await storage.createList({ ...parsed.data, userId });
      res.status(201).json(list);
    } catch (error) {
      console.error("Error creating list:", error);
      res.status(500).json({ message: "Failed to create list" });
    }
  });

  app.patch("/api/lists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existing = await storage.getList(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "List not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this list" });
      }
      const list = await storage.updateList(req.params.id, req.body);
      res.json(list);
    } catch (error) {
      console.error("Error updating list:", error);
      res.status(500).json({ message: "Failed to update list" });
    }
  });

  app.delete("/api/lists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existing = await storage.getList(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "List not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this list" });
      }
      await storage.deleteList(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting list:", error);
      res.status(500).json({ message: "Failed to delete list" });
    }
  });

  // Task Reminders routes
  app.get("/api/tasks/:taskId/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (task.creatorId !== userId) {
        const members = await storage.getProjectMembers(task.projectId);
        const isMember = members.some(m => m.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const reminders = await storage.getTaskReminders(req.params.taskId);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  app.post("/api/tasks/:taskId/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (task.creatorId !== userId) {
        const members = await storage.getProjectMembers(task.projectId);
        const isMember = members.some(m => m.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const parsed = insertTaskReminderSchema.safeParse({ ...req.body, taskId: req.params.taskId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid reminder data", errors: parsed.error.errors });
      }
      const reminder = await storage.createTaskReminder(parsed.data);
      res.status(201).json(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });

  app.patch("/api/reminders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existingReminder = await storage.getTaskReminder(req.params.id);
      if (!existingReminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      const task = await storage.getTask(existingReminder.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (task.creatorId !== userId) {
        const members = await storage.getProjectMembers(task.projectId);
        const isMember = members.some(m => m.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const parsed = insertTaskReminderSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid reminder data", errors: parsed.error.errors });
      }
      const reminder = await storage.updateTaskReminder(req.params.id, parsed.data);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      res.json(reminder);
    } catch (error) {
      console.error("Error updating reminder:", error);
      res.status(500).json({ message: "Failed to update reminder" });
    }
  });

  app.delete("/api/reminders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existingReminder = await storage.getTaskReminder(req.params.id);
      if (!existingReminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      const task = await storage.getTask(existingReminder.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (task.creatorId !== userId) {
        const members = await storage.getProjectMembers(task.projectId);
        const isMember = members.some(m => m.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const deleted = await storage.deleteTaskReminder(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      res.status(500).json({ message: "Failed to delete reminder" });
    }
  });

  // Task Sections routes (legacy)
  app.get("/api/sections", isAuthenticated, async (req, res) => {
    try {
      const listId = req.query.listId as string | undefined;
      const projectId = req.query.projectId as string | undefined;
      const sections = await storage.getTaskSections(listId, projectId);
      res.json(sections);
    } catch (error) {
      console.error("Error fetching sections:", error);
      res.status(500).json({ message: "Failed to fetch sections" });
    }
  });

  app.post("/api/sections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertTaskSectionSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid section data", errors: parsed.error.errors });
      }
      const section = await storage.createTaskSection(parsed.data);
      res.status(201).json(section);
    } catch (error) {
      console.error("Error creating section:", error);
      res.status(500).json({ message: "Failed to create section" });
    }
  });

  // Project-specific Task Sections routes
  app.get("/api/projects/:projectId/sections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { projectId } = req.params;
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.ownerId !== userId) {
        const members = await storage.getProjectMembers(projectId);
        const isMember = members.some(m => m.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "Not authorized to access this project" });
        }
      }
      const sections = await storage.getTaskSectionsByProject(projectId);
      res.json(sections);
    } catch (error) {
      console.error("Error fetching project sections:", error);
      res.status(500).json({ message: "Failed to fetch sections" });
    }
  });

  app.post("/api/projects/:projectId/sections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { projectId } = req.params;
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.ownerId !== userId) {
        const members = await storage.getProjectMembers(projectId);
        const isMember = members.some(m => m.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "Not authorized to access this project" });
        }
      }
      const parsed = insertTaskSectionSchema.safeParse({ ...req.body, projectId, userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid section data", errors: parsed.error.errors });
      }
      const section = await storage.createTaskSection(parsed.data);
      res.status(201).json(section);
    } catch (error) {
      console.error("Error creating project section:", error);
      res.status(500).json({ message: "Failed to create section" });
    }
  });

  app.put("/api/projects/:projectId/sections/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { projectId } = req.params;
      const { sectionIds } = req.body;
      if (!Array.isArray(sectionIds)) {
        return res.status(400).json({ message: "sectionIds must be an array" });
      }
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.ownerId !== userId) {
        const members = await storage.getProjectMembers(projectId);
        const isMember = members.some(m => m.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "Not authorized to access this project" });
        }
      }
      const sections = await storage.reorderTaskSections(projectId, sectionIds);
      res.json(sections);
    } catch (error) {
      console.error("Error reordering sections:", error);
      res.status(500).json({ message: "Failed to reorder sections" });
    }
  });

  app.patch("/api/sections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existingSection = await storage.getTaskSection(req.params.id);
      if (!existingSection) {
        return res.status(404).json({ message: "Section not found" });
      }
      if (existingSection.projectId) {
        const project = await storage.getProject(existingSection.projectId);
        if (project && project.ownerId !== userId) {
          const members = await storage.getProjectMembers(existingSection.projectId);
          const isMember = members.some(m => m.userId === userId);
          if (!isMember) {
            return res.status(403).json({ message: "Not authorized to update this section" });
          }
        }
      } else if (existingSection.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this section" });
      }
      const section = await storage.updateTaskSection(req.params.id, req.body);
      res.json(section);
    } catch (error) {
      console.error("Error updating section:", error);
      res.status(500).json({ message: "Failed to update section" });
    }
  });

  app.delete("/api/sections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const existingSection = await storage.getTaskSection(req.params.id);
      if (!existingSection) {
        return res.status(404).json({ message: "Section not found" });
      }
      if (existingSection.projectId) {
        const project = await storage.getProject(existingSection.projectId);
        if (project && project.ownerId !== userId) {
          const members = await storage.getProjectMembers(existingSection.projectId);
          const isMember = members.some(m => m.userId === userId);
          if (!isMember) {
            return res.status(403).json({ message: "Not authorized to delete this section" });
          }
        }
      } else if (existingSection.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this section" });
      }
      await storage.deleteTaskSection(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting section:", error);
      res.status(500).json({ message: "Failed to delete section" });
    }
  });

  // Task Section Assignment endpoint
  app.patch("/api/tasks/:id/section", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { sectionId } = req.body;
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (task.creatorId !== userId) {
        const members = await storage.getProjectMembers(task.projectId);
        const isMember = members.some(m => m.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "Not authorized to update this task" });
        }
      }
      if (sectionId) {
        const section = await storage.getTaskSection(sectionId);
        if (!section) {
          return res.status(404).json({ message: "Section not found" });
        }
        if (section.projectId !== task.projectId) {
          return res.status(400).json({ message: "Section does not belong to the same project" });
        }
      }
      const updatedTask = await storage.updateTask(req.params.id, { sectionId: sectionId || null });
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task section:", error);
      res.status(500).json({ message: "Failed to update task section" });
    }
  });

  // Task Activities routes
  app.get("/api/tasks/:id/activities", isAuthenticated, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      const activities = await storage.getActivitiesByTask(req.params.id);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching task activities:", error);
      res.status(500).json({ message: "Failed to fetch task activities" });
    }
  });

  app.post("/api/tasks/:id/activities", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      const parsed = insertActivitySchema.safeParse({
        ...req.body,
        taskId: req.params.id,
        userId,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid activity data", errors: parsed.error.errors });
      }
      const activity = await storage.createActivity(parsed.data);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // Dashboard endpoint - returns comprehensive dashboard data
  app.get("/api/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const dashboardData = await storage.getDashboardData(userId);
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Activity Feed endpoint with pagination
  app.get("/api/activity-feed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const activities = await storage.getActivityFeed(userId, limit, offset);
      res.json({
        data: activities,
        pagination: {
          limit,
          offset,
          hasMore: activities.length === limit,
        },
      });
    } catch (error) {
      console.error("Error fetching activity feed:", error);
      res.status(500).json({ message: "Failed to fetch activity feed" });
    }
  });

  // Create activity feed entry
  app.post("/api/activity", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertActivityFeedSchema.safeParse({
        ...req.body,
        userId,
        actorId: req.body.actorId || userId,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid activity data", errors: parsed.error.errors });
      }
      const activity = await storage.createActivityFeed(parsed.data);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // Productivity Insights endpoints
  app.get("/api/insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const insights = await storage.getInsights(userId);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching insights:", error);
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });

  app.post("/api/insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertProductivityInsightSchema.safeParse({
        ...req.body,
        userId,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid insight data", errors: parsed.error.errors });
      }
      const insight = await storage.createInsight(parsed.data);
      res.status(201).json(insight);
    } catch (error) {
      console.error("Error creating insight:", error);
      res.status(500).json({ message: "Failed to create insight" });
    }
  });

  app.patch("/api/insights/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      await storage.markInsightRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking insight as read:", error);
      res.status(500).json({ message: "Failed to mark insight as read" });
    }
  });

  app.post("/api/insights/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { generateInsightsForUser } = await import("./insightGenerator");
      const newInsights = await generateInsightsForUser(userId);
      res.json({ generated: newInsights.length, insights: newInsights });
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // User Goals endpoints
  app.get("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const goals = await storage.getUserGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertUserGoalSchema.safeParse({
        ...req.body,
        userId,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid goal data", errors: parsed.error.errors });
      }
      const goal = await storage.upsertUserGoal(parsed.data);
      res.status(201).json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

  app.patch("/api/goals/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const { value } = req.body;
      if (typeof value !== 'number') {
        return res.status(400).json({ message: "Value must be a number" });
      }
      await storage.updateGoalProgress(req.params.id, value);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating goal progress:", error);
      res.status(500).json({ message: "Failed to update goal progress" });
    }
  });

  // ============================================
  // Flexible Tasks endpoints
  // ============================================

  app.get("/api/flexible-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const activeOnly = req.query.activeOnly === "true";
      const tasks = await storage.getFlexibleTasksByUser(userId, activeOnly);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching flexible tasks:", error);
      res.status(500).json({ message: "Failed to fetch flexible tasks" });
    }
  });

  app.post("/api/flexible-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertFlexibleTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid flexible task data", errors: parsed.error.errors });
      }
      
      // Also create a regular task in the inbox (no projectId)
      const inboxTask = await storage.createTask({
        title: parsed.data.title,
        description: parsed.data.description || null,
        status: "todo",
        priority: parsed.data.priority || "medium",
        projectId: null, // No project = goes to inbox
        creatorId: userId,
        estimatedTime: parsed.data.estimatedDuration || null,
        energyLevel: parsed.data.energyLevel || null,
      });
      
      // Create the flexible task and link it to the inbox task
      const flexibleTaskData = {
        ...parsed.data,
        linkedTaskId: inboxTask.id,
      };
      const task = await storage.createFlexibleTask(userId, flexibleTaskData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating flexible task:", error);
      res.status(500).json({ message: "Failed to create flexible task" });
    }
  });

  app.get("/api/flexible-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const tasks = await storage.getFlexibleTasksByUser(userId);
      const task = tasks.find(t => t.id === req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Flexible task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching flexible task:", error);
      res.status(500).json({ message: "Failed to fetch flexible task" });
    }
  });

  app.patch("/api/flexible-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.updateFlexibleTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ message: "Flexible task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating flexible task:", error);
      res.status(500).json({ message: "Failed to update flexible task" });
    }
  });

  app.delete("/api/flexible-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      // First get the flexible task to find linked inbox task
      const tasks = await storage.getFlexibleTasksByUser(userId);
      const flexibleTask = tasks.find(t => t.id === req.params.id);
      
      // Delete the flexible task
      await storage.deleteFlexibleTask(req.params.id);
      
      // Also delete the linked inbox task if it exists
      if (flexibleTask?.linkedTaskId) {
        try {
          await storage.deleteTask(flexibleTask.linkedTaskId);
        } catch (e) {
          // Ignore if task was already deleted
        }
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting flexible task:", error);
      res.status(500).json({ message: "Failed to delete flexible task" });
    }
  });

  app.post("/api/flexible-tasks/:id/schedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { date, startTime, endTime } = req.body;
      
      if (!date || !startTime || !endTime) {
        return res.status(400).json({ message: "date, startTime, and endTime are required" });
      }
      
      const tasks = await storage.getFlexibleTasksByUser(userId);
      const flexibleTask = tasks.find(t => t.id === req.params.id);
      
      if (!flexibleTask) {
        return res.status(404).json({ message: "Flexible task not found" });
      }
      
      const timeBlock = await storage.createTimeBlock({
        userId: userId,
        title: flexibleTask.title,
        date: new Date(date),
        startTime: startTime,
        endTime: endTime,
        blockType: "task",
        color: null,
        taskId: flexibleTask.linkedTaskId,
        habitId: null,
        isRecurring: false,
        recurrenceDays: [],
        description: flexibleTask.description,
      });
      
      const updatedTask = await storage.updateFlexibleTask(req.params.id, {
        status: "scheduled",
        linkedTimeBlockId: timeBlock.id,
        scheduledDate: new Date(date),
        scheduledStartTime: startTime,
        scheduledEndTime: endTime,
      });
      
      res.status(201).json({ timeBlock, flexibleTask: updatedTask });
    } catch (error) {
      console.error("Error scheduling flexible task:", error);
      res.status(500).json({ message: "Failed to schedule flexible task" });
    }
  });

  // ============================================
  // Schedule Suggestions endpoints
  // ============================================

  app.post("/api/schedule-suggestions/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { startDate, endDate, taskIds } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      
      const result = await generateScheduleSuggestions(
        userId,
        new Date(startDate),
        new Date(endDate),
        taskIds
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error generating schedule suggestions:", error);
      res.status(500).json({ message: "Failed to generate schedule suggestions" });
    }
  });

  app.get("/api/schedule-suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { status, startDate, endDate } = req.query;
      
      if (startDate && endDate) {
        const suggestions = await storage.getScheduleSuggestionsByDateRange(
          userId,
          new Date(startDate as string),
          new Date(endDate as string)
        );
        res.json(suggestions);
      } else {
        const suggestions = await storage.getScheduleSuggestionsByUser(userId, status as string | undefined);
        res.json(suggestions);
      }
    } catch (error) {
      console.error("Error fetching schedule suggestions:", error);
      res.status(500).json({ message: "Failed to fetch schedule suggestions" });
    }
  });

  app.get("/api/schedule-suggestions/by-task/:flexibleTaskId", isAuthenticated, async (req: any, res) => {
    try {
      const suggestions = await storage.getScheduleSuggestionsByTask(req.params.flexibleTaskId);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions for task:", error);
      res.status(500).json({ message: "Failed to fetch suggestions for task" });
    }
  });

  app.patch("/api/schedule-suggestions/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const suggestions = await storage.getScheduleSuggestionsByUser(userId);
      const suggestion = suggestions.find(s => s.id === req.params.id);
      
      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }
      
      // Create a time block for the accepted suggestion
      const timeBlock = await storage.createTimeBlock({
        userId,
        title: suggestion.flexibleTask?.title || "Scheduled Task",
        startTime: suggestion.suggestedStartTime,
        endTime: suggestion.suggestedEndTime,
        blockType: "task",
        flexibleTaskId: suggestion.flexibleTaskId,
        isFixed: false,
      });
      
      // Update suggestion status to accepted
      const updatedSuggestion = await storage.updateScheduleSuggestion(req.params.id, {
        status: "accepted",
        timeBlockId: timeBlock.id,
      });
      
      res.json({ suggestion: updatedSuggestion, timeBlock });
    } catch (error) {
      console.error("Error accepting suggestion:", error);
      res.status(500).json({ message: "Failed to accept suggestion" });
    }
  });

  app.patch("/api/schedule-suggestions/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const suggestion = await storage.updateScheduleSuggestion(req.params.id, {
        status: "rejected",
      });
      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }
      res.json(suggestion);
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
      res.status(500).json({ message: "Failed to reject suggestion" });
    }
  });

  app.post("/api/schedule-suggestions/batch-accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { suggestionIds } = req.body;
      
      if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
        return res.status(400).json({ message: "suggestionIds array is required" });
      }
      
      const results: { accepted: any[]; failed: { id: string; error: string }[] } = {
        accepted: [],
        failed: [],
      };
      
      const allSuggestions = await storage.getScheduleSuggestionsByUser(userId);
      
      for (const id of suggestionIds) {
        try {
          const suggestion = allSuggestions.find(s => s.id === id);
          if (!suggestion) {
            results.failed.push({ id, error: "Suggestion not found" });
            continue;
          }
          
          const timeBlock = await storage.createTimeBlock({
            userId,
            title: suggestion.flexibleTask?.title || "Scheduled Task",
            startTime: suggestion.suggestedStartTime,
            endTime: suggestion.suggestedEndTime,
            blockType: "task",
            flexibleTaskId: suggestion.flexibleTaskId,
            isFixed: false,
          });
          
          const updated = await storage.updateScheduleSuggestion(id, {
            status: "accepted",
            timeBlockId: timeBlock.id,
          });
          
          results.accepted.push({ suggestion: updated, timeBlock });
        } catch (error) {
          results.failed.push({ id, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error batch accepting suggestions:", error);
      res.status(500).json({ message: "Failed to batch accept suggestions" });
    }
  });

  app.delete("/api/schedule-suggestions/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteScheduleSuggestion(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting suggestion:", error);
      res.status(500).json({ message: "Failed to delete suggestion" });
    }
  });

  // ============================================
  // User Availability endpoints
  // ============================================

  app.get("/api/user-availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const availability = await storage.getUserAvailability(userId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching user availability:", error);
      res.status(500).json({ message: "Failed to fetch user availability" });
    }
  });

  app.post("/api/user-availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertUserAvailabilitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid availability data", errors: parsed.error.errors });
      }
      const availability = await storage.createUserAvailability(userId, parsed.data);
      res.status(201).json(availability);
    } catch (error) {
      console.error("Error creating user availability:", error);
      res.status(500).json({ message: "Failed to create user availability" });
    }
  });

  app.patch("/api/user-availability/:id", isAuthenticated, async (req: any, res) => {
    try {
      const availability = await storage.updateUserAvailability(req.params.id, req.body);
      if (!availability) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      res.json(availability);
    } catch (error) {
      console.error("Error updating user availability:", error);
      res.status(500).json({ message: "Failed to update user availability" });
    }
  });

  app.delete("/api/user-availability/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteUserAvailability(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user availability:", error);
      res.status(500).json({ message: "Failed to delete user availability" });
    }
  });

  // ============================================
  // Scheduling Preferences endpoints
  // ============================================

  app.get("/api/scheduling-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const preferences = await storage.getSchedulingPreferences(userId);
      res.json(preferences || null);
    } catch (error) {
      console.error("Error fetching scheduling preferences:", error);
      res.status(500).json({ message: "Failed to fetch scheduling preferences" });
    }
  });

  app.put("/api/scheduling-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertSchedulingPreferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid preferences data", errors: parsed.error.errors });
      }
      const preferences = await storage.upsertSchedulingPreferences(userId, parsed.data);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating scheduling preferences:", error);
      res.status(500).json({ message: "Failed to update scheduling preferences" });
    }
  });

  // ============================================
  // Unified Timeline endpoint (combines time blocks, tasks, habits)
  // ============================================

  app.get("/api/unified-timeline/:date?", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const dateParam = req.params.date || req.query.date;
      
      if (!dateParam) {
        return res.status(400).json({ message: "date parameter is required" });
      }
      
      const targetDate = new Date(dateParam as string);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // 1. Fetch time blocks for the date
      const timeBlocks = await storage.getTimeBlocksByDate(userId, targetDate);
      
      // 2. Fetch tasks with dueDate on this day that have dueTime set (timed tasks)
      // and tasks that are all-day tasks for this day
      const allTasks = await storage.getTasksByUser(userId);
      const tasksForDate = allTasks.filter(task => {
        if (task.isArchived) return false;
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        const isOnDate = dueDate >= startOfDay && dueDate <= endOfDay;
        // Include if: has due time (timed task) OR is all-day task OR is in progress
        return isOnDate && (task.dueTime || task.allDayTask || task.status === "in_progress");
      });
      
      // Separate timed tasks vs all-day tasks
      const timedTasks = tasksForDate.filter(t => t.dueTime && !t.allDayTask);
      const allDayTasks = tasksForDate.filter(t => t.allDayTask || (!t.dueTime && t.status !== "in_progress"));
      
      // Fetch subtasks for each parent task
      const tasksWithSubtasks = await Promise.all(
        tasksForDate.map(async (task) => {
          const subtasks = await storage.getSubtasks(task.id);
          return {
            ...task,
            subtasks: subtasks || [],
            itemType: "task" as const,
          };
        })
      );
      
      // 3. Fetch habits that should occur on this date
      // First get all parent habits for the user
      const allUserHabits = await storage.getHabitsByUser(userId);
      const parentHabits = allUserHabits.filter(h => !h.parentHabitId && !h.isArchived);
      
      // Get existing occurrences for this date
      const habitOccurrencesResult = await storage.getHabitOccurrencesByDate(userId, targetDate);
      
      // Check which habits should occur on this date based on recurrence
      const dayOfWeek = targetDate.getDay(); // 0=Sunday, 1=Monday, etc.
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayName = dayNames[dayOfWeek];
      
      // Build habit details for habits that should occur today
      const habitsWithDetails = await Promise.all(
        parentHabits.map(async (habit) => {
          // Check if this habit should occur on this day based on recurrence
          let shouldOccurToday = false;
          
          if (habit.recurrence === 'daily') {
            shouldOccurToday = true;
          } else if (habit.recurrence === 'weekly') {
            // Check if requiredDays includes this day
            const requiredDays = habit.requiredDays as string[] | null;
            if (requiredDays && requiredDays.length > 0) {
              shouldOccurToday = requiredDays.includes(targetDayName);
            } else {
              // If no specific days set, assume it should occur
              shouldOccurToday = true;
            }
          } else if (habit.recurrence === 'weekdays') {
            shouldOccurToday = dayOfWeek >= 1 && dayOfWeek <= 5;
          } else if (habit.recurrence === 'weekends') {
            shouldOccurToday = dayOfWeek === 0 || dayOfWeek === 6;
          } else {
            // For other recurrence types, default to showing
            shouldOccurToday = true;
          }
          
          if (!shouldOccurToday) return null;
          
          // Find existing occurrence for this habit on this date
          const existingOccurrence = habitOccurrencesResult.find(o => o.habitId === habit.id);
          
          // Check if this habit has a time window
          const hasTimeWindow = habit.timeWindowEnabled && habit.startTime && habit.endTime;
          
          // Get sub-habits if this is a parent habit
          const subHabits = allUserHabits.filter(h => h.parentHabitId === habit.id && !h.isArchived);
          
          // Get occurrences for sub-habits on this date
          const subHabitsWithStatus = subHabits.map(subHabit => {
            const subOccurrence = habitOccurrencesResult.find(o => o.habitId === subHabit.id);
            return {
              ...subHabit,
              occurrence: subOccurrence || null,
              isCompleted: subOccurrence?.status === "completed",
            };
          });
          
          // Calculate time window status
          let windowStatus: "early" | "active" | "grace" | "closed" = "closed";
          if (hasTimeWindow && habit.startTime && habit.endTime) {
            const now = new Date();
            const [startH, startM] = habit.startTime.split(":").map(Number);
            const [endH, endM] = habit.endTime.split(":").map(Number);
            
            const windowStart = new Date(targetDate);
            windowStart.setHours(startH, startM, 0, 0);
            const windowEnd = new Date(targetDate);
            windowEnd.setHours(endH, endM, 0, 0);
            const graceEnd = new Date(windowEnd);
            graceEnd.setMinutes(graceEnd.getMinutes() + (habit.gracePeriodMinutes || 0));
            
            if (now < windowStart) {
              windowStatus = "early";
            } else if (now >= windowStart && now <= windowEnd) {
              windowStatus = "active";
            } else if (now > windowEnd && now <= graceEnd) {
              windowStatus = "grace";
            } else {
              windowStatus = "closed";
            }
          }
          
          return {
            id: existingOccurrence?.id || `pending-${habit.id}`,
            habitId: habit.id,
            scheduledDate: targetDate,
            status: existingOccurrence?.status || "pending",
            completedAt: existingOccurrence?.completedAt || null,
            habit: {
              ...habit,
              subHabits: subHabitsWithStatus,
            },
            hasTimeWindow,
            windowStatus,
            startTime: habit.startTime,
            endTime: habit.endTime,
            itemType: "habit" as const,
          };
        })
      );
      
      const validHabits = habitsWithDetails.filter(h => h !== null);
      
      // Separate timed habits vs all-day habits
      const timedHabits = validHabits.filter(h => h.hasTimeWindow);
      const allDayHabits = validHabits.filter(h => !h.hasTimeWindow);
      
      // 4. Format time blocks with itemType
      const formattedBlocks = timeBlocks.map(block => ({
        ...block,
        itemType: "timeBlock" as const,
      }));
      
      // 5. Calculate capacity metrics including all items
      const settings = await storage.getScheduleSettings(userId);
      const workStart = settings ? timeToMinutes(settings.workStartTime) : 540; // 9 AM
      const workEnd = settings ? timeToMinutes(settings.workEndTime) : 1080; // 6 PM
      const totalWorkMinutes = workEnd - workStart;
      
      // Calculate scheduled time from all sources
      let scheduledMinutes = 0;
      
      // Time blocks
      formattedBlocks.forEach(block => {
        scheduledMinutes += timeToMinutes(block.endTime) - timeToMinutes(block.startTime);
      });
      
      // Timed tasks with estimated time
      timedTasks.forEach(task => {
        if (task.estimatedTime) {
          scheduledMinutes += task.estimatedTime;
        } else if (task.dueTime) {
          scheduledMinutes += 30; // Default 30 min for tasks without estimates
        }
      });
      
      // Timed habits with duration
      timedHabits.forEach(habit => {
        if (habit.startTime && habit.endTime) {
          scheduledMinutes += timeToMinutes(habit.endTime) - timeToMinutes(habit.startTime);
        } else if (habit.habit?.estimatedDuration) {
          scheduledMinutes += habit.habit.estimatedDuration;
        }
      });
      
      const availableMinutes = Math.max(0, totalWorkMinutes - scheduledMinutes);
      const scheduledPercentage = totalWorkMinutes > 0 
        ? Math.round((scheduledMinutes / totalWorkMinutes) * 100) 
        : 0;
      
      // 6. Calculate dynamic time range based on scheduled items
      const timePoints: number[] = [];
      
      // Collect time points from time blocks
      formattedBlocks.forEach(block => {
        timePoints.push(timeToMinutes(block.startTime));
        timePoints.push(timeToMinutes(block.endTime));
      });
      
      // Collect time points from timed tasks
      const filteredTimedTasks = tasksWithSubtasks.filter(t => t.dueTime && !t.allDayTask);
      filteredTimedTasks.forEach(task => {
        if (task.dueTime) {
          const startMins = timeToMinutes(task.dueTime);
          timePoints.push(startMins);
          // Add end time based on estimated duration or default 30 min
          const duration = task.estimatedTime || 30;
          timePoints.push(startMins + duration);
        }
      });
      
      // Collect time points from timed habits
      timedHabits.forEach(habit => {
        if (habit.startTime) {
          timePoints.push(timeToMinutes(habit.startTime));
        }
        if (habit.endTime) {
          timePoints.push(timeToMinutes(habit.endTime));
        }
      });
      
      // Calculate dynamic range
      let recommendedStartTime = "08:00";
      let recommendedEndTime = "18:00";
      let hasScheduledItems = timePoints.length > 0;
      
      if (hasScheduledItems) {
        const earliestMinutes = Math.min(...timePoints);
        const latestMinutes = Math.max(...timePoints);
        
        // Apply buffer of 30 minutes before and after
        const bufferMinutes = 30;
        let rangeStart = earliestMinutes - bufferMinutes;
        let rangeEnd = latestMinutes + bufferMinutes;
        
        // Round to clean hour boundaries
        rangeStart = Math.floor(rangeStart / 60) * 60;
        rangeEnd = Math.ceil(rangeEnd / 60) * 60;
        
        // Apply constraints (min 2 hours visible, max 24 hours)
        const minRangeMinutes = 120;
        if (rangeEnd - rangeStart < minRangeMinutes) {
          const center = (rangeStart + rangeEnd) / 2;
          rangeStart = center - minRangeMinutes / 2;
          rangeEnd = center + minRangeMinutes / 2;
        }
        
        // Clamp to valid day range (0-1440 minutes)
        rangeStart = Math.max(0, rangeStart);
        rangeEnd = Math.min(1440, rangeEnd);
        
        // Convert back to time strings
        const startHours = Math.floor(rangeStart / 60);
        const startMins = rangeStart % 60;
        const endHours = Math.floor(rangeEnd / 60);
        const endMins = rangeEnd % 60;
        
        recommendedStartTime = `${String(startHours).padStart(2, '0')}:${String(startMins).padStart(2, '0')}`;
        recommendedEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
      }
      
      res.json({
        date: targetDate.toISOString(),
        timeBlocks: formattedBlocks,
        timedTasks: filteredTimedTasks,
        allDayTasks: tasksWithSubtasks.filter(t => t.allDayTask || (!t.dueTime)),
        timedHabits,
        allDayHabits,
        metrics: {
          totalWorkMinutes,
          scheduledMinutes,
          availableMinutes,
          scheduledPercentage,
          isOverbooked: scheduledMinutes > totalWorkMinutes,
        },
        dynamicRange: {
          recommendedStartTime,
          recommendedEndTime,
          hasScheduledItems,
        },
      });
    } catch (error) {
      console.error("Error fetching unified timeline:", error);
      res.status(500).json({ message: "Failed to fetch unified timeline" });
    }
  });

  // Helper function for time conversion
  function timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const [hours, mins] = timeStr.split(":").map(Number);
    return (hours || 0) * 60 + (mins || 0);
  }

  // ===============================================
  // INSPIRATION HUB ROUTES
  // ===============================================

  // Quotes
  app.get("/api/inspiration/quotes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { category, favorites, active } = req.query;
      const quotes = await storage.getInspirationQuotes(userId, {
        category: category as string,
        favoritesOnly: favorites === "true",
        activeOnly: active === "true",
      });
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get("/api/inspiration/quotes/random", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const quote = await storage.getRandomQuote(userId);
      res.json(quote || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch random quote" });
    }
  });

  app.get("/api/inspiration/quotes/daily", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let daily = await storage.getDailyInspiration(userId, today);
      if (!daily) {
        const randomQuote = await storage.getRandomQuote(userId);
        if (randomQuote) {
          daily = await storage.createDailyInspiration({
            userId,
            date: today,
            quoteId: randomQuote.id,
          });
        }
      }
      
      if (daily?.quoteId) {
        const quote = await storage.getInspirationQuote(daily.quoteId);
        res.json({ daily, quote });
      } else {
        res.json({ daily: null, quote: null });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily quote" });
    }
  });

  app.post("/api/inspiration/quotes/daily/refresh", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const randomQuote = await storage.getRandomQuote(userId);
      if (!randomQuote) {
        return res.status(404).json({ message: "No quotes available" });
      }
      
      let daily = await storage.getDailyInspiration(userId, today);
      if (daily) {
        daily = await storage.updateDailyInspiration(daily.id, { quoteId: randomQuote.id });
      } else {
        daily = await storage.createDailyInspiration({
          userId,
          date: today,
          quoteId: randomQuote.id,
        });
      }
      
      res.json({ daily, quote: randomQuote });
    } catch (error) {
      res.status(500).json({ message: "Failed to refresh daily quote" });
    }
  });

  app.get("/api/inspiration/quotes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const quote = await storage.getInspirationQuote(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.post("/api/inspiration/quotes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const quote = await storage.createInspirationQuote(userId, req.body);
      res.status(201).json(quote);
    } catch (error) {
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.patch("/api/inspiration/quotes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const quote = await storage.updateInspirationQuote(req.params.id, req.body);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.delete("/api/inspiration/quotes/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInspirationQuote(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  app.post("/api/inspiration/quotes/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const quote = await storage.toggleQuoteFavorite(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  // Bible Verses
  app.get("/api/inspiration/verses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { category, book, favorites } = req.query;
      const verses = await storage.getInspirationVerses(userId, {
        category: category as string,
        book: book as string,
        favoritesOnly: favorites === "true",
      });
      res.json(verses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch verses" });
    }
  });

  app.get("/api/inspiration/verses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const verse = await storage.getInspirationVerse(req.params.id);
      if (!verse) return res.status(404).json({ message: "Verse not found" });
      res.json(verse);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch verse" });
    }
  });

  app.post("/api/inspiration/verses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const verse = await storage.createInspirationVerse(userId, req.body);
      res.status(201).json(verse);
    } catch (error) {
      res.status(500).json({ message: "Failed to create verse" });
    }
  });

  app.patch("/api/inspiration/verses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const verse = await storage.updateInspirationVerse(req.params.id, req.body);
      if (!verse) return res.status(404).json({ message: "Verse not found" });
      res.json(verse);
    } catch (error) {
      res.status(500).json({ message: "Failed to update verse" });
    }
  });

  app.delete("/api/inspiration/verses/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInspirationVerse(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete verse" });
    }
  });

  app.post("/api/inspiration/verses/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const verse = await storage.toggleVerseFavorite(req.params.id);
      if (!verse) return res.status(404).json({ message: "Verse not found" });
      res.json(verse);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  // Videos
  app.get("/api/inspiration/videos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { category, favorites } = req.query;
      const videos = await storage.getInspirationVideos(userId, {
        category: category as string,
        favoritesOnly: favorites === "true",
      });
      res.json(videos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get("/api/inspiration/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const video = await storage.getInspirationVideo(req.params.id);
      if (!video) return res.status(404).json({ message: "Video not found" });
      res.json(video);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch video" });
    }
  });

  app.post("/api/inspiration/videos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const video = await storage.createInspirationVideo(userId, req.body);
      res.status(201).json(video);
    } catch (error) {
      res.status(500).json({ message: "Failed to create video" });
    }
  });

  app.patch("/api/inspiration/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const video = await storage.updateInspirationVideo(req.params.id, req.body);
      if (!video) return res.status(404).json({ message: "Video not found" });
      res.json(video);
    } catch (error) {
      res.status(500).json({ message: "Failed to update video" });
    }
  });

  app.delete("/api/inspiration/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInspirationVideo(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  app.post("/api/inspiration/videos/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const video = await storage.toggleVideoFavorite(req.params.id);
      if (!video) return res.status(404).json({ message: "Video not found" });
      res.json(video);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  app.post("/api/inspiration/videos/:id/watch", isAuthenticated, async (req: any, res) => {
    try {
      await storage.incrementVideoWatched(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to log watch" });
    }
  });

  // Music
  app.get("/api/inspiration/music", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { mood, playlistId, favorites } = req.query;
      const music = await storage.getInspirationMusic(userId, {
        mood: mood as string,
        playlistId: playlistId as string,
        favoritesOnly: favorites === "true",
      });
      res.json(music);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch music" });
    }
  });

  app.get("/api/inspiration/music/focus", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const music = await storage.getFocusMusic(userId);
      res.json(music);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch focus music" });
    }
  });

  app.get("/api/inspiration/music/:id", isAuthenticated, async (req: any, res) => {
    try {
      const music = await storage.getInspirationMusicItem(req.params.id);
      if (!music) return res.status(404).json({ message: "Music not found" });
      res.json(music);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch music" });
    }
  });

  app.post("/api/inspiration/music", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const music = await storage.createInspirationMusic(userId, req.body);
      res.status(201).json(music);
    } catch (error) {
      res.status(500).json({ message: "Failed to create music" });
    }
  });

  app.patch("/api/inspiration/music/:id", isAuthenticated, async (req: any, res) => {
    try {
      const music = await storage.updateInspirationMusic(req.params.id, req.body);
      if (!music) return res.status(404).json({ message: "Music not found" });
      res.json(music);
    } catch (error) {
      res.status(500).json({ message: "Failed to update music" });
    }
  });

  app.delete("/api/inspiration/music/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInspirationMusic(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete music" });
    }
  });

  app.post("/api/inspiration/music/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const music = await storage.toggleMusicFavorite(req.params.id);
      if (!music) return res.status(404).json({ message: "Music not found" });
      res.json(music);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  app.post("/api/inspiration/music/:id/play", isAuthenticated, async (req: any, res) => {
    try {
      await storage.incrementMusicPlayed(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to log play" });
    }
  });

  // Images
  app.get("/api/inspiration/images", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { category, favorites, usageContext } = req.query;
      const images = await storage.getInspirationImages(userId, {
        category: category as string,
        favoritesOnly: favorites === "true",
        usageContext: usageContext as string,
      });
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  app.get("/api/inspiration/images/backgrounds", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const images = await storage.getBackgroundImages(userId);
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch background images" });
    }
  });

  app.get("/api/inspiration/images/:id", isAuthenticated, async (req: any, res) => {
    try {
      const image = await storage.getInspirationImage(req.params.id);
      if (!image) return res.status(404).json({ message: "Image not found" });
      res.json(image);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch image" });
    }
  });

  app.post("/api/inspiration/images", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const image = await storage.createInspirationImage(userId, req.body);
      res.status(201).json(image);
    } catch (error) {
      res.status(500).json({ message: "Failed to create image" });
    }
  });

  app.patch("/api/inspiration/images/:id", isAuthenticated, async (req: any, res) => {
    try {
      const image = await storage.updateInspirationImage(req.params.id, req.body);
      if (!image) return res.status(404).json({ message: "Image not found" });
      res.json(image);
    } catch (error) {
      res.status(500).json({ message: "Failed to update image" });
    }
  });

  app.delete("/api/inspiration/images/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInspirationImage(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  app.post("/api/inspiration/images/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const image = await storage.toggleImageFavorite(req.params.id);
      if (!image) return res.status(404).json({ message: "Image not found" });
      res.json(image);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  // Inspiration Stats
  app.get("/api/inspiration/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const stats = await storage.getInspirationStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Inspiration Dashboard
  app.get("/api/inspiration/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const dashboard = await storage.getInspirationDashboard(userId);
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching inspiration dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard" });
    }
  });

  // Inspiration Playlists
  app.get("/api/inspiration/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const playlists = await storage.getInspirationPlaylists(userId);
      res.json(playlists);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  app.get("/api/inspiration/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const playlist = await storage.getInspirationPlaylist(req.params.id);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      console.error("Error fetching playlist:", error);
      res.status(500).json({ message: "Failed to fetch playlist" });
    }
  });

  app.post("/api/inspiration/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const playlist = await storage.createInspirationPlaylist(userId, req.body);
      res.status(201).json(playlist);
    } catch (error) {
      console.error("Error creating playlist:", error);
      res.status(500).json({ message: "Failed to create playlist" });
    }
  });

  app.patch("/api/inspiration/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const playlist = await storage.updateInspirationPlaylist(req.params.id, req.body);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      console.error("Error updating playlist:", error);
      res.status(500).json({ message: "Failed to update playlist" });
    }
  });

  app.delete("/api/inspiration/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInspirationPlaylist(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting playlist:", error);
      res.status(500).json({ message: "Failed to delete playlist" });
    }
  });

  // Inspiration Links
  app.get("/api/inspiration/links", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const { inspirationType, linkedType, linkedId } = req.query;
      const links = await storage.getInspirationLinks(userId, {
        inspirationType: inspirationType as string,
        linkedType: linkedType as string,
        linkedId: linkedId as string,
      });
      res.json(links);
    } catch (error) {
      console.error("Error fetching inspiration links:", error);
      res.status(500).json({ message: "Failed to fetch links" });
    }
  });

  app.post("/api/inspiration/links", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as User).id;
      const link = await storage.createInspirationLink(userId, req.body);
      res.status(201).json(link);
    } catch (error) {
      console.error("Error creating inspiration link:", error);
      res.status(500).json({ message: "Failed to create link" });
    }
  });

  app.delete("/api/inspiration/links/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteInspirationLink(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inspiration link:", error);
      res.status(500).json({ message: "Failed to delete link" });
    }
  });

  // Featured Toggle Endpoints
  app.post("/api/inspiration/quotes/:id/toggle-featured", isAuthenticated, async (req: any, res) => {
    try {
      const quote = await storage.toggleQuoteFeatured(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error toggling quote featured:", error);
      res.status(500).json({ message: "Failed to toggle featured" });
    }
  });

  app.post("/api/inspiration/videos/:id/toggle-featured", isAuthenticated, async (req: any, res) => {
    try {
      const video = await storage.toggleVideoFeatured(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error toggling video featured:", error);
      res.status(500).json({ message: "Failed to toggle featured" });
    }
  });

  app.post("/api/inspiration/images/:id/toggle-featured", isAuthenticated, async (req: any, res) => {
    try {
      const image = await storage.toggleImageFeatured(req.params.id);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      res.json(image);
    } catch (error) {
      console.error("Error toggling image featured:", error);
      res.status(500).json({ message: "Failed to toggle featured" });
    }
  });

  app.post("/api/inspiration/music/:id/toggle-featured", isAuthenticated, async (req: any, res) => {
    try {
      const music = await storage.toggleMusicFeatured(req.params.id);
      if (!music) {
        return res.status(404).json({ message: "Music not found" });
      }
      res.json(music);
    } catch (error) {
      console.error("Error toggling music featured:", error);
      res.status(500).json({ message: "Failed to toggle featured" });
    }
  });

  return httpServer;
}
