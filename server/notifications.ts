import { storage } from "./storage";
import type { Task, Project } from "@shared/schema";

type NotificationType = 
  | "task_due_soon"
  | "task_overdue"
  | "task_assigned"
  | "comment_added"
  | "recurring_created"
  | "task_completed"
  | "project_deadline";

interface NotificationTypeMapping {
  task_due_soon: "taskDueSoon";
  task_overdue: "taskOverdue";
  task_assigned: "taskAssigned";
  comment_added: "commentAdded";
  recurring_created: "recurringCreated";
  task_completed: "taskCompleted";
  project_deadline: "projectDeadline";
}

const TYPE_TO_SETTING: NotificationTypeMapping = {
  task_due_soon: "taskDueSoon",
  task_overdue: "taskOverdue",
  task_assigned: "taskAssigned",
  comment_added: "commentAdded",
  recurring_created: "recurringCreated",
  task_completed: "taskCompleted",
  project_deadline: "projectDeadline",
};

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
}

export async function isQuietHours(userId: string): Promise<boolean> {
  try {
    const settings = await storage.getNotificationSettings(userId);
    if (!settings || !settings.quietHoursStart || !settings.quietHoursEnd) {
      return false;
    }

    const start = parseTime(settings.quietHoursStart);
    const end = parseTime(settings.quietHoursEnd);
    if (!start || !end) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch (error) {
    console.error("Error checking quiet hours:", error);
    return false;
  }
}

export async function shouldNotify(userId: string, type: NotificationType): Promise<boolean> {
  try {
    if (await isQuietHours(userId)) {
      return false;
    }

    const settings = await storage.getNotificationSettings(userId);
    if (!settings) {
      return true;
    }

    const settingKey = TYPE_TO_SETTING[type];
    return settings[settingKey] !== false;
  } catch (error) {
    console.error("Error checking notification settings:", error);
    return true;
  }
}

export async function notifyTaskDueSoon(task: Task): Promise<void> {
  try {
    const userId = task.assigneeId || task.creatorId;
    if (!await shouldNotify(userId, "task_due_soon")) return;

    await storage.createNotification({
      userId,
      type: "task_due_soon",
      title: "Task Due Soon",
      message: `"${task.title}" is due soon`,
      taskId: task.id,
      projectId: task.projectId,
    });
  } catch (error) {
    console.error("Error creating task due soon notification:", error);
  }
}

export async function notifyTaskOverdue(task: Task): Promise<void> {
  try {
    const userId = task.assigneeId || task.creatorId;
    if (!await shouldNotify(userId, "task_overdue")) return;

    await storage.createNotification({
      userId,
      type: "task_overdue",
      title: "Task Overdue",
      message: `"${task.title}" is overdue`,
      taskId: task.id,
      projectId: task.projectId,
    });
  } catch (error) {
    console.error("Error creating task overdue notification:", error);
  }
}

export async function notifyTaskAssigned(task: Task, assigneeId: string): Promise<void> {
  try {
    if (assigneeId === task.creatorId) return;
    
    if (!await shouldNotify(assigneeId, "task_assigned")) return;

    await storage.createNotification({
      userId: assigneeId,
      type: "task_assigned",
      title: "Task Assigned",
      message: `You have been assigned to "${task.title}"`,
      taskId: task.id,
      projectId: task.projectId,
    });
  } catch (error) {
    console.error("Error creating task assigned notification:", error);
  }
}

export async function notifyCommentAdded(task: Task, commenterId: string): Promise<void> {
  try {
    const usersToNotify = new Set<string>();
    
    if (task.creatorId && task.creatorId !== commenterId) {
      usersToNotify.add(task.creatorId);
    }
    if (task.assigneeId && task.assigneeId !== commenterId) {
      usersToNotify.add(task.assigneeId);
    }

    const commenter = await storage.getUser(commenterId);
    const commenterName = commenter?.firstName || commenter?.username || "Someone";

    for (const userId of Array.from(usersToNotify)) {
      if (!await shouldNotify(userId, "comment_added")) continue;

      await storage.createNotification({
        userId,
        type: "comment_added",
        title: "New Comment",
        message: `${commenterName} commented on "${task.title}"`,
        taskId: task.id,
        projectId: task.projectId,
      });
    }
  } catch (error) {
    console.error("Error creating comment notification:", error);
  }
}

export async function notifyRecurringCreated(task: Task): Promise<void> {
  try {
    const userId = task.assigneeId || task.creatorId;
    if (!await shouldNotify(userId, "recurring_created")) return;

    await storage.createNotification({
      userId,
      type: "recurring_created",
      title: "Recurring Task Created",
      message: `Next occurrence of "${task.title}" has been scheduled`,
      taskId: task.id,
      projectId: task.projectId,
    });
  } catch (error) {
    console.error("Error creating recurring task notification:", error);
  }
}

export async function notifyTaskCompleted(task: Task, completedByUserId: string): Promise<void> {
  try {
    const usersToNotify = new Set<string>();
    
    if (task.creatorId && task.creatorId !== completedByUserId) {
      usersToNotify.add(task.creatorId);
    }

    const completer = await storage.getUser(completedByUserId);
    const completerName = completer?.firstName || completer?.username || "Someone";

    for (const userId of Array.from(usersToNotify)) {
      if (!await shouldNotify(userId, "task_completed")) continue;

      await storage.createNotification({
        userId,
        type: "task_completed",
        title: "Task Completed",
        message: `${completerName} completed "${task.title}"`,
        taskId: task.id,
        projectId: task.projectId,
      });
    }
  } catch (error) {
    console.error("Error creating task completed notification:", error);
  }
}

export async function notifyProjectDeadline(project: Project): Promise<void> {
  try {
    if (!await shouldNotify(project.ownerId, "project_deadline")) return;

    await storage.createNotification({
      userId: project.ownerId,
      type: "project_deadline",
      title: "Project Deadline Approaching",
      message: `Project "${project.name}" deadline is approaching`,
      projectId: project.id,
    });
  } catch (error) {
    console.error("Error creating project deadline notification:", error);
  }
}

export const notificationService = {
  notifyTaskDueSoon,
  notifyTaskOverdue,
  notifyTaskAssigned,
  notifyCommentAdded,
  notifyRecurringCreated,
  notifyTaskCompleted,
  notifyProjectDeadline,
  shouldNotify,
  isQuietHours,
};
