import { sql, relations } from "drizzle-orm";
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 50 }).default("member"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Groups table (supports nesting via parentId)
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#6B7280"),
  icon: varchar("icon", { length: 50 }),
  parentId: varchar("parent_id"),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group members (access control for groups)
export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  color: varchar("color", { length: 7 }).default("#3B82F6"),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "set null" }),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project members (many-to-many)
export const projectMembers = pgTable("project_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lists table (custom task lists)
export const lists = pgTable("lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 50 }),
  sortOrder: integer("sort_order"),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  isInbox: boolean("is_inbox").default(false),
  isSmart: boolean("is_smart").default(false),
  smartFilters: jsonb("smart_filters"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lists_user_project").on(table.userId, table.projectId),
]);

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("todo").notNull(),
  priority: varchar("priority", { length: 20 }).default("medium").notNull(),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  assigneeId: varchar("assignee_id").references(() => users.id),
  creatorId: varchar("creator_id").references(() => users.id).notNull(),
  parentTaskId: varchar("parent_task_id"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  estimatedTime: integer("estimated_time"),
  position: integer("position").default(0),
  isArchived: boolean("is_archived").default(false),
  repeatPattern: text("repeat_pattern"),
  repeatEndDate: timestamp("repeat_end_date"),
  allDayTask: boolean("all_day_task").default(false),
  startTime: varchar("start_time", { length: 10 }),
  dueTime: varchar("due_time", { length: 10 }),
  sortOrder: integer("sort_order"),
  listId: varchar("list_id").references(() => lists.id, { onDelete: "set null" }),
  sectionId: varchar("section_id").references(() => taskSections.id, { onDelete: "set null" }),
  focusTime: integer("focus_time"),
  energyLevel: varchar("energy_level", { length: 20 }),
  isImportant: boolean("is_important").default(false),
  completedAt: timestamp("completed_at"),
  totalFocusTime: integer("total_focus_time").default(0),
  lastFocusedAt: timestamp("last_focused_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tasks_list_sort_order").on(table.listId, table.sortOrder),
  index("idx_tasks_start_due_date").on(table.startDate, table.dueDate),
  index("idx_tasks_is_important").on(table.isImportant),
]);

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Time logs table
export const timeLogs = pgTable("time_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attachments table
export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 1000 }).notNull(),
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 100 }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  uploadedById: varchar("uploaded_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notification settings table
export const notificationSettings = pgTable("notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  taskDueSoon: boolean("task_due_soon").default(true).notNull(),
  taskOverdue: boolean("task_overdue").default(true).notNull(),
  taskAssigned: boolean("task_assigned").default(true).notNull(),
  commentAdded: boolean("comment_added").default(true).notNull(),
  recurringCreated: boolean("recurring_created").default(false).notNull(),
  taskCompleted: boolean("task_completed").default(true).notNull(),
  projectDeadline: boolean("project_deadline").default(true).notNull(),
  soundEnabled: boolean("sound_enabled").default(true).notNull(),
  quietHoursStart: text("quiet_hours_start"),
  quietHoursEnd: text("quiet_hours_end"),
  showPreview: boolean("show_preview").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  
  // Appearance Settings
  theme: text("theme").default("auto").notNull(),
  accentColor: text("accent_color").default("emerald").notNull(),
  density: text("density").default("comfortable").notNull(),
  fontSize: text("font_size").default("medium").notNull(),
  taskCardStyle: text("task_card_style").default("default").notNull(),
  showDueDate: boolean("show_due_date").default(true).notNull(),
  showPriority: boolean("show_priority").default(true).notNull(),
  showTags: boolean("show_tags").default(true).notNull(),
  showProject: boolean("show_project").default(true).notNull(),
  showAssignee: boolean("show_assignee").default(true).notNull(),
  showEstimatedTime: boolean("show_estimated_time").default(true).notNull(),
  
  // Behavior Settings
  defaultListId: varchar("default_list_id").references(() => taskSections.id, { onDelete: "set null" }),
  defaultView: text("default_view").default("list").notNull(),
  smartDateParsing: boolean("smart_date_parsing").default(true).notNull(),
  confirmBeforeDelete: boolean("confirm_before_delete").default(true).notNull(),
  autoArchiveDays: integer("auto_archive_days").default(0).notNull(),
  firstDayOfWeek: text("first_day_of_week").default("sunday").notNull(),
  dateFormat: text("date_format").default("MM/DD/YYYY").notNull(),
  timeFormat: text("time_format").default("12h").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tags table
export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6B7280"),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task tags (many-to-many)
export const taskTags = pgTable("task_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  tagId: varchar("tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
});

// Task dependencies for Gantt chart (predecessor/successor relationships)
export const taskDependencies = pgTable("task_dependencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  predecessorId: varchar("predecessor_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  successorId: varchar("successor_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  dependencyType: varchar("dependency_type", { length: 20 }).default("finish_to_start").notNull(),
  lagDays: integer("lag_days").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task templates table
export const taskTemplates = pgTable("task_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 7 }).default("#6B7280"),
  taskTitle: varchar("task_title", { length: 500 }).notNull(),
  taskDescription: text("task_description"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  estimatedTime: integer("estimated_time"),
  subtasks: jsonb("subtasks").$type<{ title: string; description?: string }[]>(),
  checklist: jsonb("checklist").$type<{ item: string; checked?: boolean }[]>(),
  defaultTags: text("default_tags").array(),
  isPublic: boolean("is_public").default(false),
  usageCount: integer("usage_count").default(0),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pomodoro settings (user timer preferences)
export const pomodoroSettings = pgTable("pomodoro_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  workDuration: integer("work_duration").default(25).notNull(),
  shortBreakDuration: integer("short_break_duration").default(5).notNull(),
  longBreakDuration: integer("long_break_duration").default(15).notNull(),
  sessionsUntilLongBreak: integer("sessions_until_long_break").default(4).notNull(),
  autoStartBreaks: boolean("auto_start_breaks").default(false),
  autoStartWork: boolean("auto_start_work").default(false),
  soundEnabled: boolean("sound_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pomodoro sessions (tracking individual timer sessions)
export const pomodoroSessions = pgTable("pomodoro_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  sessionType: varchar("session_type", { length: 20 }).default("work").notNull(),
  duration: integer("duration").notNull(),
  completedDuration: integer("completed_duration").default(0),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  pausedAt: timestamp("paused_at"),
  notes: text("notes"),
  interruptions: integer("interruptions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects),
  projectMemberships: many(projectMembers),
  ownedGroups: many(groups),
  groupMemberships: many(groupMembers),
  assignedTasks: many(tasks, { relationName: "assignee" }),
  createdTasks: many(tasks, { relationName: "creator" }),
  comments: many(comments),
  timeLogs: many(timeLogs),
  notifications: many(notifications),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, { fields: [groups.ownerId], references: [users.id] }),
  parent: one(groups, { fields: [groups.parentId], references: [groups.id], relationName: "parentChild" }),
  children: many(groups, { relationName: "parentChild" }),
  members: many(groupMembers),
  projects: many(projects),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  group: one(groups, { fields: [projects.groupId], references: [groups.id] }),
  members: many(projectMembers),
  tasks: many(tasks),
  attachments: many(attachments),
  tags: many(tags),
  lists: many(lists),
  sections: many(taskSections),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id], relationName: "assignee" }),
  creator: one(users, { fields: [tasks.creatorId], references: [users.id], relationName: "creator" }),
  list: one(lists, { fields: [tasks.listId], references: [lists.id] }),
  comments: many(comments),
  timeLogs: many(timeLogs),
  attachments: many(attachments),
  taskTags: many(taskTags),
  reminders: many(taskReminders),
  recurringInstances: many(recurringTaskInstances),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const timeLogsRelations = relations(timeLogs, ({ one }) => ({
  task: one(tasks, { fields: [timeLogs.taskId], references: [tasks.id] }),
  user: one(users, { fields: [timeLogs.userId], references: [users.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  task: one(tasks, { fields: [attachments.taskId], references: [tasks.id] }),
  project: one(projects, { fields: [attachments.projectId], references: [projects.id] }),
  uploadedBy: one(users, { fields: [attachments.uploadedById], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  task: one(tasks, { fields: [notifications.taskId], references: [tasks.id] }),
  project: one(projects, { fields: [notifications.projectId], references: [projects.id] }),
}));

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(users, { fields: [notificationSettings.userId], references: [users.id] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
  defaultList: one(taskSections, { fields: [userPreferences.defaultListId], references: [taskSections.id] }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  project: one(projects, { fields: [tags.projectId], references: [projects.id] }),
  taskTags: many(taskTags),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}));

export const taskDependenciesRelations = relations(taskDependencies, ({ one }) => ({
  predecessor: one(tasks, { fields: [taskDependencies.predecessorId], references: [tasks.id], relationName: "predecessorDeps" }),
  successor: one(tasks, { fields: [taskDependencies.successorId], references: [tasks.id], relationName: "successorDeps" }),
}));

export const pomodoroSettingsRelations = relations(pomodoroSettings, ({ one }) => ({
  user: one(users, { fields: [pomodoroSettings.userId], references: [users.id] }),
}));

export const pomodoroSessionsRelations = relations(pomodoroSessions, ({ one }) => ({
  user: one(users, { fields: [pomodoroSessions.userId], references: [users.id] }),
  task: one(tasks, { fields: [pomodoroSessions.taskId], references: [tasks.id] }),
  project: one(projects, { fields: [pomodoroSessions.projectId], references: [projects.id] }),
}));

// Habit Categories table (organize habits into groups)
export const habitCategories = pgTable("habit_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 7 }).default("#3B82F6"),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Habits table
export const habits = pgTable("habits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  priority: varchar("priority", { length: 20 }).default("medium").notNull(),
  recurrence: varchar("recurrence", { length: 20 }).default("daily").notNull(),
  reminderTime: varchar("reminder_time", { length: 10 }),
  startTime: varchar("start_time", { length: 10 }),
  endTime: varchar("end_time", { length: 10 }),
  timeWindowEnabled: boolean("time_window_enabled").default(false),
  allowsEarlyCompletion: boolean("allows_early_completion").default(true),
  gracePeriodMinutes: integer("grace_period_minutes").default(0),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  color: varchar("color", { length: 7 }).default("#3B82F6"),
  streakCount: integer("streak_count").default(0),
  longestStreak: integer("longest_streak").default(0),
  isArchived: boolean("is_archived").default(false),
  parentHabitId: varchar("parent_habit_id"),
  completionType: varchar("completion_type", { length: 30 }).default("all_required"),
  requiredPercentage: integer("required_percentage").default(100),
  displayOrder: integer("display_order").default(0),
  estimatedDuration: integer("estimated_duration"),
  requiredDays: integer("required_days").array(),
  categoryId: varchar("category_id").references(() => habitCategories.id, { onDelete: "set null" }),
  totalCompletions: integer("total_completions").default(0),
  averageCompletionTime: integer("average_completion_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Habit occurrences table (tracks daily instances)
export const habitOccurrences = pgTable("habit_occurrences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  habitId: varchar("habit_id").references(() => habits.id, { onDelete: "cascade" }).notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedAt: timestamp("completed_at"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  completionStatus: varchar("completion_status", { length: 20 }).default("pending"),
  notes: text("notes"),
  completionTime: integer("completion_time"),
  journalNote: text("journal_note"),
  mood: varchar("mood", { length: 20 }),
  energyLevel: varchar("energy_level", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Habit Insights table (AI-generated insights)
export const habitInsights = pgTable("habit_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  data: jsonb("data"),
  habitId: varchar("habit_id").references(() => habits.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_habit_insights_user").on(table.userId),
]);

// Habit Journal table (quick reflection notes per completion)
export const habitJournal = pgTable("habit_journal", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  habitOccurrenceId: varchar("habit_occurrence_id").references(() => habitOccurrences.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  note: text("note"),
  mood: varchar("mood", { length: 20 }),
  energyLevel: varchar("energy_level", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_habit_journal_occurrence").on(table.habitOccurrenceId),
]);

// Habit Achievements table (track unlocked achievements and milestones)
export const habitAchievements = pgTable("habit_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  achievementType: varchar("achievement_type", { length: 50 }).notNull(),
  habitId: varchar("habit_id").references(() => habits.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_habit_achievements_user").on(table.userId),
]);

// Habit Templates table (pre-built routines users can clone)
export const habitTemplates = pgTable("habit_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryName: varchar("category_name", { length: 100 }),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 7 }),
  isPublic: boolean("is_public").default(true),
  creatorId: varchar("creator_id").references(() => users.id, { onDelete: "set null" }),
  subHabits: jsonb("sub_habits").$type<{ name: string; estimatedDuration?: number; displayOrder: number }[]>().notNull(),
  recurrence: varchar("recurrence", { length: 20 }).default("daily"),
  startTime: varchar("start_time", { length: 10 }),
  endTime: varchar("end_time", { length: 10 }),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Habit Analytics table (pre-calculated daily/weekly stats for fast loading)
export const habitAnalytics = pgTable("habit_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").notNull(),
  periodType: varchar("period_type", { length: 20 }).notNull(),
  totalHabits: integer("total_habits").default(0),
  completedHabits: integer("completed_habits").default(0),
  completionRate: integer("completion_rate").default(0),
  totalSubHabits: integer("total_sub_habits").default(0),
  completedSubHabits: integer("completed_sub_habits").default(0),
  streaksActive: integer("streaks_active").default(0),
  perfectDay: boolean("perfect_day").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_habit_analytics_user_date_period").on(table.userId, table.date, table.periodType),
]);

// Habit Categories relations
export const habitCategoriesRelations = relations(habitCategories, ({ one, many }) => ({
  user: one(users, { fields: [habitCategories.userId], references: [users.id] }),
  habits: many(habits),
}));

// Habits relations
export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, { fields: [habits.userId], references: [users.id] }),
  occurrences: many(habitOccurrences),
  parent: one(habits, { fields: [habits.parentHabitId], references: [habits.id], relationName: "parentChild" }),
  subHabits: many(habits, { relationName: "parentChild" }),
  category: one(habitCategories, { fields: [habits.categoryId], references: [habitCategories.id] }),
  insights: many(habitInsights),
  achievements: many(habitAchievements),
}));

export const habitOccurrencesRelations = relations(habitOccurrences, ({ one, many }) => ({
  habit: one(habits, { fields: [habitOccurrences.habitId], references: [habits.id] }),
  journals: many(habitJournal),
}));

// Habit Insights relations
export const habitInsightsRelations = relations(habitInsights, ({ one }) => ({
  user: one(users, { fields: [habitInsights.userId], references: [users.id] }),
  habit: one(habits, { fields: [habitInsights.habitId], references: [habits.id] }),
}));

// Habit Journal relations
export const habitJournalRelations = relations(habitJournal, ({ one }) => ({
  occurrence: one(habitOccurrences, { fields: [habitJournal.habitOccurrenceId], references: [habitOccurrences.id] }),
  user: one(users, { fields: [habitJournal.userId], references: [users.id] }),
}));

// Habit Achievements relations
export const habitAchievementsRelations = relations(habitAchievements, ({ one }) => ({
  user: one(users, { fields: [habitAchievements.userId], references: [users.id] }),
  habit: one(habits, { fields: [habitAchievements.habitId], references: [habits.id] }),
}));

// Habit Templates relations
export const habitTemplatesRelations = relations(habitTemplates, ({ one }) => ({
  creator: one(users, { fields: [habitTemplates.creatorId], references: [users.id] }),
}));

// Habit Analytics relations
export const habitAnalyticsRelations = relations(habitAnalytics, ({ one }) => ({
  user: one(users, { fields: [habitAnalytics.userId], references: [users.id] }),
}));

// Schedule settings (user work hours and preferences)
export const scheduleSettings = pgTable("schedule_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  workStartTime: varchar("work_start_time", { length: 10 }).default("08:00").notNull(),
  workEndTime: varchar("work_end_time", { length: 10 }).default("22:00").notNull(),
  minTaskDuration: integer("min_task_duration").default(15).notNull(),
  maxTaskDuration: integer("max_task_duration").default(120).notNull(),
  breakDuration: integer("break_duration").default(10).notNull(),
  breakFrequency: integer("break_frequency").default(90).notNull(),
  preferMorningTasks: boolean("prefer_morning_tasks").default(false),
  workDays: text("work_days").array().default(sql`ARRAY['monday','tuesday','wednesday','thursday','friday']`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Time blocks (scheduled events, meals, meetings, etc.)
export const timeBlocks = pgTable("time_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  blockType: varchar("block_type", { length: 50 }).default("blocked").notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  date: timestamp("date"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceDays: text("recurrence_days").array(),
  color: varchar("color", { length: 7 }).default("#9CA3AF"),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }),
  habitId: varchar("habit_id").references(() => habits.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule settings relations
export const scheduleSettingsRelations = relations(scheduleSettings, ({ one }) => ({
  user: one(users, { fields: [scheduleSettings.userId], references: [users.id] }),
}));

// Time blocks relations
export const timeBlocksRelations = relations(timeBlocks, ({ one }) => ({
  user: one(users, { fields: [timeBlocks.userId], references: [users.id] }),
  task: one(tasks, { fields: [timeBlocks.taskId], references: [tasks.id] }),
  habit: one(habits, { fields: [timeBlocks.habitId], references: [habits.id] }),
}));

// Task reminders table
export const taskReminders = pgTable("task_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  reminderTime: timestamp("reminder_time"),
  reminderType: varchar("reminder_type", { length: 20 }),
  relativeTiming: varchar("relative_timing", { length: 30 }),
  hasTriggered: boolean("has_triggered").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_task_reminders_task_time").on(table.taskId, table.reminderTime),
]);

// Recurring task instances table
export const recurringTaskInstances = pgTable("recurring_task_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentTaskId: varchar("parent_task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  instanceDate: timestamp("instance_date"),
  status: varchar("status", { length: 20 }).default("pending"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_recurring_instances_parent_date").on(table.parentTaskId, table.instanceDate),
]);

// Task sections table
export const taskSections = pgTable("task_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }),
  listId: varchar("list_id").references(() => lists.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order"),
  isCollapsed: boolean("is_collapsed").default(false),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_task_sections_list").on(table.listId),
  index("idx_task_sections_project").on(table.projectId),
]);

// Activities table (task activity log)
export const activities = pgTable("activities", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  field: varchar("field", { length: 50 }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_activities_task").on(table.taskId),
  index("idx_activities_user").on(table.userId),
]);

// Lists relations
export const listsRelations = relations(lists, ({ one, many }) => ({
  user: one(users, { fields: [lists.userId], references: [users.id] }),
  project: one(projects, { fields: [lists.projectId], references: [projects.id] }),
  tasks: many(tasks),
  sections: many(taskSections),
}));

// Task reminders relations
export const taskRemindersRelations = relations(taskReminders, ({ one }) => ({
  task: one(tasks, { fields: [taskReminders.taskId], references: [tasks.id] }),
}));

// Recurring task instances relations
export const recurringTaskInstancesRelations = relations(recurringTaskInstances, ({ one }) => ({
  parentTask: one(tasks, { fields: [recurringTaskInstances.parentTaskId], references: [tasks.id] }),
}));

// Task sections relations
export const taskSectionsRelations = relations(taskSections, ({ one }) => ({
  list: one(lists, { fields: [taskSections.listId], references: [lists.id] }),
  project: one(projects, { fields: [taskSections.projectId], references: [projects.id] }),
  user: one(users, { fields: [taskSections.userId], references: [users.id] }),
}));

// Activities relations
export const activitiesRelations = relations(activities, ({ one }) => ({
  task: one(tasks, { fields: [activities.taskId], references: [tasks.id] }),
  user: one(users, { fields: [activities.userId], references: [users.id] }),
}));

// Task Focus Sessions - Track working on a main task
export const taskFocusSessions = pgTable("task_focus_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  activeSubtaskIndex: integer("active_subtask_index"),
  pomodoroSessionId: varchar("pomodoro_session_id").references(() => pomodoroSessions.id, { onDelete: "set null" }),
  status: text("status").default("active").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  totalDuration: integer("total_duration").default(0).notNull(),
  notes: text("notes"),
}, (table) => [
  index("idx_task_focus_sessions_user").on(table.userId),
  index("idx_task_focus_sessions_task").on(table.taskId),
  index("idx_task_focus_sessions_status").on(table.status),
]);

// Subtask Focus Segments - Track time spent on each subtask
export const subtaskFocusSegments = pgTable("subtask_focus_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => taskFocusSessions.id, { onDelete: "cascade" }).notNull(),
  subtaskIndex: integer("subtask_index").notNull(),
  subtaskTitle: text("subtask_title").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration").default(0).notNull(),
  completedDuringSegment: boolean("completed_during_segment").default(false).notNull(),
}, (table) => [
  index("idx_subtask_focus_segments_session").on(table.sessionId),
  index("idx_subtask_focus_segments_subtask").on(table.sessionId, table.subtaskIndex),
]);

// Task Focus Sessions relations
export const taskFocusSessionsRelations = relations(taskFocusSessions, ({ one, many }) => ({
  user: one(users, { fields: [taskFocusSessions.userId], references: [users.id] }),
  task: one(tasks, { fields: [taskFocusSessions.taskId], references: [tasks.id] }),
  pomodoroSession: one(pomodoroSessions, { fields: [taskFocusSessions.pomodoroSessionId], references: [pomodoroSessions.id] }),
  segments: many(subtaskFocusSegments),
}));

// Subtask Focus Segments relations
export const subtaskFocusSegmentsRelations = relations(subtaskFocusSegments, ({ one }) => ({
  session: one(taskFocusSessions, { fields: [subtaskFocusSegments.sessionId], references: [taskFocusSessions.id] }),
}));

// ===============================
// AUTO-SCHEDULING SYSTEM TABLES
// ===============================

// Flexible Tasks - tasks that need auto-scheduling
export const flexibleTasks = pgTable("flexible_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  estimatedDuration: integer("estimated_duration").notNull(),
  frequencyType: varchar("frequency_type", { length: 20 }).default("weekly").notNull(),
  frequencyCount: integer("frequency_count").default(1).notNull(),
  specificDays: text("specific_days").array(),
  priority: varchar("priority", { length: 20 }).default("medium").notNull(),
  energyLevel: varchar("energy_level", { length: 20 }).default("medium").notNull(),
  deadline: timestamp("deadline"),
  isRecurring: boolean("is_recurring").default(true),
  preferredTimeStart: varchar("preferred_time_start", { length: 10 }),
  preferredTimeEnd: varchar("preferred_time_end", { length: 10 }),
  linkedTaskId: varchar("linked_task_id").references(() => tasks.id, { onDelete: "set null" }),
  linkedHabitId: varchar("linked_habit_id").references(() => habits.id, { onDelete: "set null" }),
  linkedTimeBlockId: varchar("linked_time_block_id"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  scheduledStartTime: varchar("scheduled_start_time", { length: 10 }),
  scheduledEndTime: varchar("scheduled_end_time", { length: 10 }),
  preferences: jsonb("preferences"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_flexible_tasks_user").on(table.userId),
  index("idx_flexible_tasks_active").on(table.userId, table.isActive),
  index("idx_flexible_tasks_status").on(table.userId, table.status),
]);

// Schedule Suggestions - AI-generated time slot suggestions
export const scheduleSuggestions = pgTable("schedule_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flexibleTaskId: varchar("flexible_task_id").references(() => flexibleTasks.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  suggestedDate: timestamp("suggested_date").notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  confidenceScore: integer("confidence_score").default(50).notNull(),
  reasoning: text("reasoning"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  rejectedAt: timestamp("rejected_at"),
  createdTimeBlockId: varchar("created_time_block_id").references(() => timeBlocks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_schedule_suggestions_user").on(table.userId),
  index("idx_schedule_suggestions_task").on(table.flexibleTaskId),
  index("idx_schedule_suggestions_date").on(table.suggestedDate),
  index("idx_schedule_suggestions_status").on(table.userId, table.status),
]);

// User Availability - detailed availability per day of week
export const userAvailability = pgTable("user_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  availabilityType: varchar("availability_type", { length: 30 }).default("work_hours").notNull(),
  energyLevel: varchar("energy_level", { length: 20 }).default("medium").notNull(),
  isRecurring: boolean("is_recurring").default(true),
  priority: integer("priority").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_availability_user_day").on(table.userId, table.dayOfWeek),
]);

// Scheduling Preferences - detailed scheduling preferences for auto-scheduling
export const schedulingPreferences = pgTable("scheduling_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  minBreakBetweenTasks: integer("min_break_between_tasks").default(5),
  maxTasksPerDay: integer("max_tasks_per_day").default(10),
  bufferBeforeMeetings: integer("buffer_before_meetings").default(5),
  bufferAfterMeetings: integer("buffer_after_meetings").default(5),
  preferMorning: boolean("prefer_morning").default(false),
  preferAfternoon: boolean("prefer_afternoon").default(false),
  preferEvening: boolean("prefer_evening").default(false),
  avoidWeekends: boolean("avoid_weekends").default(true),
  batchSimilarTasks: boolean("batch_similar_tasks").default(false),
  respectEnergyLevels: boolean("respect_energy_levels").default(true),
  learnFromPatterns: boolean("learn_from_patterns").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Flexible Tasks Relations
export const flexibleTasksRelations = relations(flexibleTasks, ({ one, many }) => ({
  user: one(users, { fields: [flexibleTasks.userId], references: [users.id] }),
  linkedTask: one(tasks, { fields: [flexibleTasks.linkedTaskId], references: [tasks.id] }),
  linkedHabit: one(habits, { fields: [flexibleTasks.linkedHabitId], references: [habits.id] }),
  linkedTimeBlock: one(timeBlocks, { fields: [flexibleTasks.linkedTimeBlockId], references: [timeBlocks.id] }),
  suggestions: many(scheduleSuggestions),
}));

// Schedule Suggestions Relations
export const scheduleSuggestionsRelations = relations(scheduleSuggestions, ({ one }) => ({
  flexibleTask: one(flexibleTasks, { fields: [scheduleSuggestions.flexibleTaskId], references: [flexibleTasks.id] }),
  user: one(users, { fields: [scheduleSuggestions.userId], references: [users.id] }),
  createdTimeBlock: one(timeBlocks, { fields: [scheduleSuggestions.createdTimeBlockId], references: [timeBlocks.id] }),
}));

// User Availability Relations
export const userAvailabilityRelations = relations(userAvailability, ({ one }) => ({
  user: one(users, { fields: [userAvailability.userId], references: [users.id] }),
}));

// Scheduling Preferences Relations
export const schedulingPreferencesRelations = relations(schedulingPreferences, ({ one }) => ({
  user: one(users, { fields: [schedulingPreferences.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({ id: true, createdAt: true });
// Date coercion helper for JSON string dates
const dateFromString = z.preprocess((val) => {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val;
  if (typeof val === 'string') return new Date(val);
  return val;
}, z.date().nullable().optional());

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  dueDate: dateFromString,
  startDate: dateFromString,
  repeatEndDate: dateFromString,
  completedAt: dateFromString,
  lastFocusedAt: dateFromString,
});
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTimeLogSchema = createInsertSchema(timeLogs).omit({ id: true, createdAt: true });
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTagSchema = createInsertSchema(tags).omit({ id: true, createdAt: true });
export const insertTaskTagSchema = createInsertSchema(taskTags).omit({ id: true });
export const insertTaskDependencySchema = createInsertSchema(taskDependencies).omit({ id: true, createdAt: true });
export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({ id: true, createdAt: true, updatedAt: true, usageCount: true });
export const insertPomodoroSettingsSchema = createInsertSchema(pomodoroSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPomodoroSessionSchema = createInsertSchema(pomodoroSessions).omit({ id: true, createdAt: true });
export const insertHabitCategorySchema = createInsertSchema(habitCategories).omit({ id: true, createdAt: true });
export const insertHabitSchema = createInsertSchema(habits).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertHabitOccurrenceSchema = createInsertSchema(habitOccurrences).omit({ id: true, createdAt: true });
export const insertHabitInsightSchema = createInsertSchema(habitInsights).omit({ id: true, createdAt: true });
export const insertHabitJournalSchema = createInsertSchema(habitJournal).omit({ id: true, createdAt: true });
export const insertHabitAchievementSchema = createInsertSchema(habitAchievements).omit({ id: true, createdAt: true });
export const insertHabitTemplateSchema = createInsertSchema(habitTemplates).omit({ id: true, createdAt: true, updatedAt: true, usageCount: true });
export const insertHabitAnalyticsSchema = createInsertSchema(habitAnalytics).omit({ id: true, createdAt: true });
export const insertScheduleSettingsSchema = createInsertSchema(scheduleSettings).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertTimeBlockSchema = createInsertSchema(timeBlocks).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertListSchema = createInsertSchema(lists).omit({ id: true, createdAt: true });
export const insertTaskReminderSchema = createInsertSchema(taskReminders).omit({ id: true, createdAt: true });
export const insertRecurringTaskInstanceSchema = createInsertSchema(recurringTaskInstances).omit({ id: true, createdAt: true });
export const insertTaskSectionSchema = createInsertSchema(taskSections).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertTaskFocusSessionSchema = createInsertSchema(taskFocusSessions).omit({ id: true });
export const insertSubtaskFocusSegmentSchema = createInsertSchema(subtaskFocusSegments).omit({ id: true });
export const insertFlexibleTaskSchema = createInsertSchema(flexibleTasks).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertScheduleSuggestionSchema = createInsertSchema(scheduleSuggestions).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertUserAvailabilitySchema = createInsertSchema(userAvailability).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertSchedulingPreferencesSchema = createInsertSchema(schedulingPreferences).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertTimeLog = z.infer<typeof insertTimeLogSchema>;
export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTaskTag = z.infer<typeof insertTaskTagSchema>;
export type TaskTag = typeof taskTags.$inferSelect;
export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;
export type TaskDependency = typeof taskDependencies.$inferSelect;
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertPomodoroSettings = z.infer<typeof insertPomodoroSettingsSchema>;
export type PomodoroSettings = typeof pomodoroSettings.$inferSelect;
export type InsertPomodoroSession = z.infer<typeof insertPomodoroSessionSchema>;
export type PomodoroSession = typeof pomodoroSessions.$inferSelect;
export type InsertHabitCategory = z.infer<typeof insertHabitCategorySchema>;
export type HabitCategory = typeof habitCategories.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type Habit = typeof habits.$inferSelect;
export type InsertHabitOccurrence = z.infer<typeof insertHabitOccurrenceSchema>;
export type HabitOccurrence = typeof habitOccurrences.$inferSelect;
export type InsertHabitInsight = z.infer<typeof insertHabitInsightSchema>;
export type HabitInsight = typeof habitInsights.$inferSelect;
export type InsertHabitJournal = z.infer<typeof insertHabitJournalSchema>;
export type HabitJournalEntry = typeof habitJournal.$inferSelect;
export type InsertHabitAchievement = z.infer<typeof insertHabitAchievementSchema>;
export type HabitAchievement = typeof habitAchievements.$inferSelect;
export type InsertHabitTemplate = z.infer<typeof insertHabitTemplateSchema>;
export type HabitTemplate = typeof habitTemplates.$inferSelect;
export type InsertHabitAnalytics = z.infer<typeof insertHabitAnalyticsSchema>;
export type HabitAnalytics = typeof habitAnalytics.$inferSelect;
export type InsertScheduleSettings = z.infer<typeof insertScheduleSettingsSchema>;
export type ScheduleSettings = typeof scheduleSettings.$inferSelect;
export type InsertTimeBlock = z.infer<typeof insertTimeBlockSchema>;
export type TimeBlock = typeof timeBlocks.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;
export type List = typeof lists.$inferSelect;
export type InsertTaskReminder = z.infer<typeof insertTaskReminderSchema>;
export type TaskReminder = typeof taskReminders.$inferSelect;
export type InsertRecurringTaskInstance = z.infer<typeof insertRecurringTaskInstanceSchema>;
export type RecurringTaskInstance = typeof recurringTaskInstances.$inferSelect;
export type InsertTaskSection = z.infer<typeof insertTaskSectionSchema>;
export type TaskSection = typeof taskSections.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertTaskFocusSession = z.infer<typeof insertTaskFocusSessionSchema>;
export type TaskFocusSession = typeof taskFocusSessions.$inferSelect;
export type InsertSubtaskFocusSegment = z.infer<typeof insertSubtaskFocusSegmentSchema>;
export type SubtaskFocusSegment = typeof subtaskFocusSegments.$inferSelect;
export type InsertFlexibleTask = z.infer<typeof insertFlexibleTaskSchema>;
export type FlexibleTask = typeof flexibleTasks.$inferSelect;
export type InsertScheduleSuggestion = z.infer<typeof insertScheduleSuggestionSchema>;
export type ScheduleSuggestion = typeof scheduleSuggestions.$inferSelect;
export type InsertUserAvailability = z.infer<typeof insertUserAvailabilitySchema>;
export type UserAvailability = typeof userAvailability.$inferSelect;
export type InsertSchedulingPreferences = z.infer<typeof insertSchedulingPreferencesSchema>;
export type SchedulingPreferences = typeof schedulingPreferences.$inferSelect;

// Analytics Snapshots table (daily aggregated metrics)
export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  snapshotDate: timestamp("snapshot_date").notNull(),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksCreated: integer("tasks_created").default(0),
  totalTimeSpent: integer("total_time_spent").default(0),
  pomodoroSessions: integer("pomodoro_sessions").default(0),
  habitsCompleted: integer("habits_completed").default(0),
  activeProjects: integer("active_projects").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_analytics_snapshots_user_date").on(table.userId, table.snapshotDate),
]);

// Task Completion Metrics table (individual task performance)
export const taskCompletionMetrics = pgTable("task_completion_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  estimatedTime: integer("estimated_time"),
  actualTime: integer("actual_time"),
  daysToComplete: integer("days_to_complete"),
  wasOverdue: boolean("was_overdue").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_task_metrics_user_completed").on(table.userId, table.completedAt),
  index("idx_task_metrics_project_completed").on(table.projectId, table.completedAt),
]);

// Productivity Scores table (daily calculated scores)
export const productivityScores = pgTable("productivity_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").notNull(),
  completionScore: integer("completion_score").default(0),
  timeManagementScore: integer("time_management_score").default(0),
  focusScore: integer("focus_score").default(0),
  consistencyScore: integer("consistency_score").default(0),
  overallScore: integer("overall_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_productivity_scores_user_date").on(table.userId, table.date),
]);

// Analytics relations
export const analyticsSnapshotsRelations = relations(analyticsSnapshots, ({ one }) => ({
  user: one(users, { fields: [analyticsSnapshots.userId], references: [users.id] }),
}));

export const taskCompletionMetricsRelations = relations(taskCompletionMetrics, ({ one }) => ({
  task: one(tasks, { fields: [taskCompletionMetrics.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskCompletionMetrics.userId], references: [users.id] }),
  project: one(projects, { fields: [taskCompletionMetrics.projectId], references: [projects.id] }),
}));

export const productivityScoresRelations = relations(productivityScores, ({ one }) => ({
  user: one(users, { fields: [productivityScores.userId], references: [users.id] }),
}));

// Dashboard Widgets - User's widget preferences
export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  widgetType: text("widget_type").notNull(),
  position: integer("position").default(0).notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_dashboard_widgets_user_id").on(table.userId),
]);

// Productivity Insights - Generated insights
export const productivityInsights = pgTable("productivity_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  actionUrl: text("action_url"),
  priority: integer("priority").default(0).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_productivity_insights_user_id").on(table.userId),
]);

// Activity Feed - Track user actions
export const activityFeed = pgTable("activity_feed", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }),
  actionType: text("action_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  entityTitle: text("entity_title"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_activity_feed_user_id").on(table.userId),
  index("idx_activity_feed_created_at").on(table.createdAt),
]);

// User Goals - Daily/weekly targets
export const userGoals = pgTable("user_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").default(0).notNull(),
  period: text("period").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_goals_user_id").on(table.userId),
]);

// Dashboard widgets relations
export const dashboardWidgetsRelations = relations(dashboardWidgets, ({ one }) => ({
  user: one(users, { fields: [dashboardWidgets.userId], references: [users.id] }),
}));

// Productivity insights relations
export const productivityInsightsRelations = relations(productivityInsights, ({ one }) => ({
  user: one(users, { fields: [productivityInsights.userId], references: [users.id] }),
}));

// Activity feed relations
export const activityFeedRelations = relations(activityFeed, ({ one }) => ({
  user: one(users, { fields: [activityFeed.userId], references: [users.id] }),
  actor: one(users, { fields: [activityFeed.actorId], references: [users.id] }),
}));

// User goals relations
export const userGoalsRelations = relations(userGoals, ({ one }) => ({
  user: one(users, { fields: [userGoals.userId], references: [users.id] }),
}));

// Analytics insert schemas
export const insertAnalyticsSnapshotSchema = createInsertSchema(analyticsSnapshots).omit({ id: true, createdAt: true });
export const insertTaskCompletionMetricSchema = createInsertSchema(taskCompletionMetrics).omit({ id: true, createdAt: true });
export const insertProductivityScoreSchema = createInsertSchema(productivityScores).omit({ id: true, createdAt: true });

// Dashboard insert schemas
export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets).omit({ id: true, createdAt: true });
export const insertProductivityInsightSchema = createInsertSchema(productivityInsights).omit({ id: true, createdAt: true });
export const insertActivityFeedSchema = createInsertSchema(activityFeed).omit({ id: true, createdAt: true });
export const insertUserGoalSchema = createInsertSchema(userGoals).omit({ id: true, createdAt: true });

// Analytics types
export type InsertAnalyticsSnapshot = z.infer<typeof insertAnalyticsSnapshotSchema>;
export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
export type InsertTaskCompletionMetric = z.infer<typeof insertTaskCompletionMetricSchema>;
export type TaskCompletionMetric = typeof taskCompletionMetrics.$inferSelect;
export type InsertProductivityScore = z.infer<typeof insertProductivityScoreSchema>;
export type ProductivityScore = typeof productivityScores.$inferSelect;

// Dashboard types
export type InsertDashboardWidget = z.infer<typeof insertDashboardWidgetSchema>;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type InsertProductivityInsight = z.infer<typeof insertProductivityInsightSchema>;
export type ProductivityInsight = typeof productivityInsights.$inferSelect;
export type InsertActivityFeed = z.infer<typeof insertActivityFeedSchema>;
export type ActivityFeedItem = typeof activityFeed.$inferSelect;
export type InsertUserGoal = z.infer<typeof insertUserGoalSchema>;
export type UserGoal = typeof userGoals.$inferSelect;

// ===============================================
// INSPIRATION HUB TABLES
// ===============================================

// Inspiration Quotes table
export const inspirationQuotes = pgTable("inspiration_quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  author: varchar("author", { length: 255 }),
  source: varchar("source", { length: 255 }),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array(),
  isFavorite: boolean("is_favorite").default(false),
  isFeatured: boolean("is_featured").default(false),
  isActive: boolean("is_active").default(true),
  timesViewed: integer("times_viewed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_inspiration_quotes_user").on(table.userId),
  index("idx_inspiration_quotes_category").on(table.category),
]);

// Inspiration Videos table
export const inspirationVideos = pgTable("inspiration_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  url: text("url").notNull(),
  platform: varchar("platform", { length: 50 }),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array(),
  notes: text("notes"),
  isFavorite: boolean("is_favorite").default(false),
  isFeatured: boolean("is_featured").default(false),
  timesWatched: integer("times_watched").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_inspiration_videos_user").on(table.userId),
  index("idx_inspiration_videos_category").on(table.category),
]);

// Inspiration Playlists table
export const inspirationPlaylists = pgTable("inspiration_playlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  mood: varchar("mood", { length: 50 }),
  isDefault: boolean("is_default").default(false),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_inspiration_playlists_user").on(table.userId),
]);

// Inspiration Music table
export const inspirationMusic = pgTable("inspiration_music", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }),
  url: text("url").notNull(),
  albumArt: text("album_art"),
  platform: varchar("platform", { length: 50 }),
  genre: varchar("genre", { length: 100 }),
  mood: varchar("mood", { length: 50 }),
  playlistId: varchar("playlist_id").references(() => inspirationPlaylists.id, { onDelete: "set null" }),
  duration: integer("duration"),
  tags: text("tags").array(),
  notes: text("notes"),
  isFavorite: boolean("is_favorite").default(false),
  isFeatured: boolean("is_featured").default(false),
  timesPlayed: integer("times_played").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_inspiration_music_user").on(table.userId),
  index("idx_inspiration_music_playlist").on(table.playlistId),
]);

// Inspiration Images table
export const inspirationImages = pgTable("inspiration_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  source: varchar("source", { length: 255 }),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array(),
  isFavorite: boolean("is_favorite").default(false),
  isFeatured: boolean("is_featured").default(false),
  usageContext: varchar("usage_context", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_inspiration_images_user").on(table.userId),
  index("idx_inspiration_images_category").on(table.category),
]);

// Inspiration Bible Verses table
export const inspirationVerses = pgTable("inspiration_verses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  book: varchar("book", { length: 100 }).notNull(),
  chapter: integer("chapter").notNull(),
  verseStart: integer("verse_start").notNull(),
  verseEnd: integer("verse_end"),
  text: text("text").notNull(),
  translation: varchar("translation", { length: 50 }).default("NIV"),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array(),
  notes: text("notes"),
  isFavorite: boolean("is_favorite").default(false),
  isFeatured: boolean("is_featured").default(false),
  timesViewed: integer("times_viewed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_inspiration_verses_user").on(table.userId),
  index("idx_inspiration_verses_book").on(table.book),
]);

// Inspiration Sessions table (track engagement)
export const inspirationSessions = pgTable("inspiration_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sessionType: varchar("session_type", { length: 50 }).notNull(),
  contentId: varchar("content_id").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  duration: integer("duration"),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("idx_inspiration_sessions_user").on(table.userId),
  index("idx_inspiration_sessions_content").on(table.contentType, table.contentId),
]);

// Daily Inspiration table (track daily quote rotation)
export const dailyInspiration = pgTable("daily_inspiration", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").notNull(),
  quoteId: varchar("quote_id").references(() => inspirationQuotes.id, { onDelete: "cascade" }),
  isViewed: boolean("is_viewed").default(false),
  viewedAt: timestamp("viewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_daily_inspiration_user_date").on(table.userId, table.date),
]);

// Inspiration Links table (link inspiration to tasks/projects)
export const inspirationLinks = pgTable("inspiration_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  inspirationType: varchar("inspiration_type", { length: 50 }).notNull(),
  inspirationId: varchar("inspiration_id").notNull(),
  linkedType: varchar("linked_type", { length: 50 }).notNull(),
  linkedId: varchar("linked_id").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_inspiration_links_user").on(table.userId),
  index("idx_inspiration_links_inspiration").on(table.inspirationType, table.inspirationId),
  index("idx_inspiration_links_linked").on(table.linkedType, table.linkedId),
]);

// Inspiration Hub Relations
export const inspirationQuotesRelations = relations(inspirationQuotes, ({ one }) => ({
  user: one(users, { fields: [inspirationQuotes.userId], references: [users.id] }),
}));

export const inspirationVideosRelations = relations(inspirationVideos, ({ one }) => ({
  user: one(users, { fields: [inspirationVideos.userId], references: [users.id] }),
}));

export const inspirationPlaylistsRelations = relations(inspirationPlaylists, ({ one, many }) => ({
  user: one(users, { fields: [inspirationPlaylists.userId], references: [users.id] }),
  tracks: many(inspirationMusic),
}));

export const inspirationMusicRelations = relations(inspirationMusic, ({ one }) => ({
  user: one(users, { fields: [inspirationMusic.userId], references: [users.id] }),
  playlist: one(inspirationPlaylists, { fields: [inspirationMusic.playlistId], references: [inspirationPlaylists.id] }),
}));

export const inspirationImagesRelations = relations(inspirationImages, ({ one }) => ({
  user: one(users, { fields: [inspirationImages.userId], references: [users.id] }),
}));

export const inspirationSessionsRelations = relations(inspirationSessions, ({ one }) => ({
  user: one(users, { fields: [inspirationSessions.userId], references: [users.id] }),
}));

export const dailyInspirationRelations = relations(dailyInspiration, ({ one }) => ({
  user: one(users, { fields: [dailyInspiration.userId], references: [users.id] }),
  quote: one(inspirationQuotes, { fields: [dailyInspiration.quoteId], references: [inspirationQuotes.id] }),
}));

export const inspirationLinksRelations = relations(inspirationLinks, ({ one }) => ({
  user: one(users, { fields: [inspirationLinks.userId], references: [users.id] }),
}));

export const inspirationVersesRelations = relations(inspirationVerses, ({ one }) => ({
  user: one(users, { fields: [inspirationVerses.userId], references: [users.id] }),
}));

// Inspiration Hub Insert Schemas
export const insertInspirationQuoteSchema = createInsertSchema(inspirationQuotes, {
  text: z.string().min(1).max(1000),
  author: z.string().max(255).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true, timesViewed: true });

export const insertInspirationVideoSchema = createInsertSchema(inspirationVideos, {
  title: z.string().min(1).max(255),
  url: z.string().url(),
  platform: z.enum(['youtube', 'vimeo', 'custom']).optional(),
  duration: z.number().min(0).optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true, timesWatched: true });

export const insertInspirationPlaylistSchema = createInsertSchema(inspirationPlaylists, {
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  mood: z.enum(['focus', 'energetic', 'calm', 'motivational', 'creative']).optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

export const insertInspirationMusicSchema = createInsertSchema(inspirationMusic, {
  title: z.string().min(1).max(255),
  url: z.string().url().or(z.string().min(1)),
  artist: z.string().max(255).optional(),
  genre: z.string().max(100).optional(),
  mood: z.enum(['focus', 'energetic', 'calm', 'motivational', 'creative']).optional(),
  platform: z.enum(['spotify', 'youtube', 'soundcloud', 'custom']).optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true, timesPlayed: true });

export const insertInspirationImageSchema = createInsertSchema(inspirationImages, {
  imageUrl: z.string().url().or(z.string().startsWith('/')),
  category: z.string().max(100).optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

export const insertInspirationSessionSchema = createInsertSchema(inspirationSessions).omit({ id: true, userId: true, timestamp: true });
export const insertDailyInspirationSchema = createInsertSchema(dailyInspiration).omit({ id: true, createdAt: true });
export const insertInspirationLinkSchema = createInsertSchema(inspirationLinks, {
  inspirationType: z.enum(['quote', 'video', 'music', 'image', 'verse']),
  linkedType: z.enum(['task', 'project']),
}).omit({ id: true, userId: true, createdAt: true });

export const insertInspirationVerseSchema = createInsertSchema(inspirationVerses, {
  book: z.string().min(1).max(100),
  chapter: z.number().min(1),
  verseStart: z.number().min(1),
  verseEnd: z.number().min(1).optional(),
  text: z.string().min(1),
  translation: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true, timesViewed: true });

// Inspiration Hub Types
export type InsertInspirationQuote = z.infer<typeof insertInspirationQuoteSchema>;
export type InspirationQuote = typeof inspirationQuotes.$inferSelect;
export type InsertInspirationVideo = z.infer<typeof insertInspirationVideoSchema>;
export type InspirationVideo = typeof inspirationVideos.$inferSelect;
export type InsertInspirationPlaylist = z.infer<typeof insertInspirationPlaylistSchema>;
export type InspirationPlaylist = typeof inspirationPlaylists.$inferSelect;
export type InsertInspirationMusic = z.infer<typeof insertInspirationMusicSchema>;
export type InspirationMusic = typeof inspirationMusic.$inferSelect;
export type InsertInspirationImage = z.infer<typeof insertInspirationImageSchema>;
export type InspirationImage = typeof inspirationImages.$inferSelect;
export type InsertInspirationSession = z.infer<typeof insertInspirationSessionSchema>;
export type InspirationSession = typeof inspirationSessions.$inferSelect;
export type InsertDailyInspiration = z.infer<typeof insertDailyInspirationSchema>;
export type DailyInspiration = typeof dailyInspiration.$inferSelect;
export type InsertInspirationLink = z.infer<typeof insertInspirationLinkSchema>;
export type InspirationLink = typeof inspirationLinks.$inferSelect;
export type InsertInspirationVerse = z.infer<typeof insertInspirationVerseSchema>;
export type InspirationVerse = typeof inspirationVerses.$inferSelect;

// Extended types with relations
export type GroupWithRelations = Group & {
  owner?: User;
  parent?: Group | null;
  children?: Group[];
  members?: (GroupMember & { user?: User })[];
  projects?: Project[];
};

export type TaskWithRelations = Task & {
  assignee?: User | null;
  creator?: User;
  project?: Project;
  list?: List | null;
  comments?: Comment[];
  timeLogs?: TimeLog[];
  attachments?: Attachment[];
  tags?: Tag[];
  dependencies?: TaskDependency[];
  dependents?: TaskDependency[];
  reminders?: TaskReminder[];
  recurringInstances?: RecurringTaskInstance[];
};

export type ProjectWithRelations = Project & {
  owner?: User;
  group?: Group | null;
  members?: (ProjectMember & { user?: User })[];
  tasks?: Task[];
  tags?: Tag[];
  lists?: List[];
};

export type ListWithRelations = List & {
  user?: User;
  project?: Project | null;
  tasks?: Task[];
  sections?: TaskSection[];
};

export type CommentWithAuthor = Comment & {
  author?: User;
};

export type TimeLogWithUser = TimeLog & {
  user?: User;
};

export type ActivityWithUser = Activity & {
  user?: User;
};

export type NotificationWithRelations = Notification & {
  user?: User;
  task?: Task | null;
  project?: Project | null;
};

export type HabitCategoryWithRelations = HabitCategory & {
  user?: User;
  habits?: Habit[];
};

export type HabitWithRelations = Habit & {
  user?: User;
  occurrences?: HabitOccurrence[];
  parent?: Habit | null;
  subHabits?: Habit[];
  category?: HabitCategory | null;
  insights?: HabitInsight[];
  achievements?: HabitAchievement[];
};

export type HabitWithSubHabits = Habit & {
  subHabits: Habit[];
  subHabitProgress?: {
    total: number;
    completed: number;
    percentage: number;
  };
};

export type HabitOccurrenceWithHabit = HabitOccurrence & {
  habit?: Habit;
};

export type HabitOccurrenceWithJournal = HabitOccurrence & {
  habit?: Habit;
  journals?: HabitJournalEntry[];
};

export type HabitInsightWithRelations = HabitInsight & {
  user?: User;
  habit?: Habit | null;
};

export type HabitJournalWithRelations = HabitJournalEntry & {
  occurrence?: HabitOccurrence;
  user?: User;
};

export type HabitAchievementWithRelations = HabitAchievement & {
  user?: User;
  habit?: Habit | null;
};

export type HabitTemplateWithRelations = HabitTemplate & {
  creator?: User | null;
};

export type HabitAnalyticsWithRelations = HabitAnalytics & {
  user?: User;
};

export type TimeBlockWithRelations = TimeBlock & {
  user?: User;
  task?: Task | null;
  habit?: Habit | null;
};

export type TimeGap = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  date: Date;
};

export type ScheduleAnalysis = {
  date: Date;
  workStartTime: string;
  workEndTime: string;
  totalWorkMinutes: number;
  scheduledMinutes: number;
  availableMinutes: number;
  gaps: TimeGap[];
  timeBlocks: TimeBlock[];
  suggestedTasks?: Task[];
  suggestedHabits?: Habit[];
};

export type TaskFocusSessionWithRelations = TaskFocusSession & {
  user?: User;
  task?: Task;
  pomodoroSession?: PomodoroSession | null;
  segments?: SubtaskFocusSegment[];
};

export type SubtaskFocusSegmentWithRelations = SubtaskFocusSegment & {
  session?: TaskFocusSession;
};

// Auto-Scheduling System Types
export type FlexibleTaskWithRelations = FlexibleTask & {
  user?: User;
  linkedTask?: Task | null;
  linkedHabit?: Habit | null;
  suggestions?: ScheduleSuggestion[];
};

export type ScheduleSuggestionWithRelations = ScheduleSuggestion & {
  flexibleTask?: FlexibleTask;
  user?: User;
  createdTimeBlock?: TimeBlock | null;
};

export type UserAvailabilityWithRelations = UserAvailability & {
  user?: User;
};

export type SchedulingPreferencesWithRelations = SchedulingPreferences & {
  user?: User;
};

// Auto-Scheduling Helper Types
export type AvailableSlot = {
  date: Date;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  energyLevel: string;
  dayOfWeek: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
};

export type ScoredSlot = AvailableSlot & {
  score: number;
  reasoning: string[];
};

export type ScheduleGenerationResult = {
  suggestions: ScheduleSuggestion[];
  conflicts: { taskId: string; reason: string }[];
  unschedulable: { taskId: string; reason: string }[];
  summary: {
    totalTasks: number;
    scheduledTasks: number;
    totalSuggestions: number;
  };
};
