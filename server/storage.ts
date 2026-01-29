import {
  users,
  projects,
  projectMembers,
  groups,
  groupMembers,
  tasks,
  comments,
  timeLogs,
  attachments,
  notifications,
  notificationSettings,
  userPreferences,
  tags,
  taskTags,
  taskDependencies,
  pomodoroSettings,
  pomodoroSessions,
  habits,
  habitOccurrences,
  habitCategories,
  habitInsights,
  habitJournal,
  habitAchievements,
  habitTemplates,
  habitAnalytics,
  scheduleSettings,
  timeBlocks,
  taskTemplates,
  lists,
  taskReminders,
  taskSections,
  recurringTaskInstances,
  activities,
  activityFeed,
  productivityInsights,
  userGoals,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type ProjectMember,
  type InsertProjectMember,
  type Group,
  type InsertGroup,
  type GroupMember,
  type InsertGroupMember,
  type GroupWithRelations,
  type Task,
  type InsertTask,
  type Comment,
  type InsertComment,
  type TimeLog,
  type InsertTimeLog,
  type Attachment,
  type InsertAttachment,
  type Notification,
  type InsertNotification,
  type NotificationSettings,
  type InsertNotificationSettings,
  type NotificationWithRelations,
  type Tag,
  type InsertTag,
  type TaskTag,
  type InsertTaskTag,
  type TaskDependency,
  type InsertTaskDependency,
  type ProjectWithRelations,
  type TaskWithRelations,
  type CommentWithAuthor,
  type TimeLogWithUser,
  type PomodoroSettings,
  type InsertPomodoroSettings,
  type PomodoroSession,
  type InsertPomodoroSession,
  type Habit,
  type InsertHabit,
  type HabitOccurrence,
  type InsertHabitOccurrence,
  type HabitWithRelations,
  type HabitWithSubHabits,
  type HabitCategory,
  type InsertHabitCategory,
  type HabitInsight,
  type InsertHabitInsight,
  type HabitJournalEntry,
  type InsertHabitJournal,
  type HabitAchievement,
  type InsertHabitAchievement,
  type HabitTemplate,
  type InsertHabitTemplate,
  type HabitAnalytics,
  type InsertHabitAnalytics,
  type ScheduleSettings,
  type InsertScheduleSettings,
  type TimeBlock,
  type InsertTimeBlock,
  type TimeGap,
  type ScheduleAnalysis,
  type TaskTemplate,
  type InsertTaskTemplate,
  type List,
  type InsertList,
  type TaskReminder,
  type InsertTaskReminder,
  type TaskSection,
  type InsertTaskSection,
  type RecurringTaskInstance,
  type InsertRecurringTaskInstance,
  type Activity,
  type InsertActivity,
  type ActivityWithUser,
  type UserPreferences,
  type InsertUserPreferences,
  type ActivityFeedItem,
  type InsertActivityFeed,
  type ProductivityInsight,
  type InsertProductivityInsight,
  type UserGoal,
  type InsertUserGoal,
  taskFocusSessions,
  subtaskFocusSegments,
  flexibleTasks,
  scheduleSuggestions,
  userAvailability,
  schedulingPreferences,
  type TaskFocusSession,
  type InsertTaskFocusSession,
  type SubtaskFocusSegment,
  type InsertSubtaskFocusSegment,
  type FlexibleTask,
  type InsertFlexibleTask,
  type FlexibleTaskWithRelations,
  type ScheduleSuggestion,
  type InsertScheduleSuggestion,
  type ScheduleSuggestionWithRelations,
  type UserAvailability,
  type InsertUserAvailability,
  type SchedulingPreferences,
  type InsertSchedulingPreferences,
  inspirationQuotes,
  inspirationVideos,
  inspirationMusic,
  inspirationImages,
  inspirationSessions,
  dailyInspiration,
  inspirationPlaylists,
  inspirationLinks,
  inspirationVerses,
  type InspirationQuote,
  type InsertInspirationQuote,
  type InspirationVideo,
  type InsertInspirationVideo,
  type InspirationMusic,
  type InsertInspirationMusic,
  type InspirationImage,
  type InsertInspirationImage,
  type InspirationSession,
  type InsertInspirationSession,
  type DailyInspiration,
  type InsertDailyInspiration,
  type InspirationPlaylist,
  type InsertInspirationPlaylist,
  type InspirationLink,
  type InsertInspirationLink,
  type InspirationVerse,
  type InsertInspirationVerse,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, isNull, gte, lte, inArray, lt } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectWithRelations(id: string): Promise<ProjectWithRelations | undefined>;
  getProjectsByUser(userId: string): Promise<ProjectWithRelations[]>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  addProjectMember(member: InsertProjectMember): Promise<ProjectMember>;
  removeProjectMember(projectId: string, userId: string): Promise<void>;
  getProjectMembers(projectId: string): Promise<(ProjectMember & { user?: User })[]>;

  createTask(task: InsertTask): Promise<Task>;
  getTask(id: string): Promise<Task | undefined>;
  getTaskWithRelations(id: string): Promise<TaskWithRelations | undefined>;
  getTasksByProject(projectId: string): Promise<TaskWithRelations[]>;
  getTasksByUser(userId: string): Promise<TaskWithRelations[]>;
  getTasksPaginated(userId: string, options?: {
    projectId?: string;
    sectionId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<TaskWithRelations[]>;
  getInboxTasks(userId: string): Promise<TaskWithRelations[]>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByTask(taskId: string): Promise<CommentWithAuthor[]>;
  deleteComment(id: string): Promise<void>;

  createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog>;
  getTimeLogsByTask(taskId: string): Promise<TimeLogWithUser[]>;
  getTimeLogsByUser(userId: string): Promise<TimeLogWithUser[]>;
  getActiveTimeLog(userId: string): Promise<TimeLog | undefined>;
  stopTimeLog(id: string): Promise<TimeLog | undefined>;

  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getAttachmentsByTask(taskId: string): Promise<Attachment[]>;
  deleteAttachment(id: string): Promise<void>;

  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string): Promise<NotificationWithRelations[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  getNotificationSettings(userId: string): Promise<NotificationSettings | null>;
  upsertNotificationSettings(userId: string, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings>;

  createTag(tag: InsertTag): Promise<Tag>;
  getTagsByProject(projectId: string): Promise<Tag[]>;
  getAllTagsWithCounts(userId: string): Promise<(Tag & { taskCount: number })[]>;
  deleteTag(id: string): Promise<void>;

  addTaskTag(taskTag: InsertTaskTag): Promise<TaskTag>;
  removeTaskTag(taskId: string, tagId: string): Promise<void>;
  getTaskTags(taskId: string): Promise<Tag[]>;

  createTaskDependency(dependency: InsertTaskDependency): Promise<TaskDependency>;
  getTaskDependencies(taskId: string): Promise<TaskDependency[]>;
  getTaskDependents(taskId: string): Promise<TaskDependency[]>;
  getProjectDependencies(projectId: string): Promise<TaskDependency[]>;
  deleteTaskDependency(id: string): Promise<void>;

  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: string): Promise<Group | undefined>;
  getGroupWithRelations(id: string): Promise<GroupWithRelations | undefined>;
  getGroupsByUser(userId: string): Promise<GroupWithRelations[]>;
  updateGroup(id: string, group: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<void>;

  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  removeGroupMember(groupId: string, userId: string): Promise<void>;
  getGroupMembers(groupId: string): Promise<(GroupMember & { user?: User })[]>;
  isUserGroupMember(groupId: string, userId: string): Promise<boolean>;

  moveProjectToGroup(projectId: string, groupId: string | null): Promise<Project | undefined>;
  getProjectsByGroup(groupId: string): Promise<Project[]>;
  getUserGroupIds(userId: string): Promise<string[]>;

  // Subtask methods
  createSubtask(parentTaskId: string, subtask: Omit<InsertTask, 'projectId'>): Promise<Task>;
  getSubtasks(parentTaskId: string): Promise<TaskWithRelations[]>;
  getSubtaskProgress(parentTaskId: string): Promise<{ completed: number; total: number }>;
  promoteSubtaskToTask(subtaskId: string): Promise<Task | undefined>;

  // Pomodoro methods
  getPomodoroSettings(userId: string): Promise<PomodoroSettings | undefined>;
  upsertPomodoroSettings(settings: InsertPomodoroSettings): Promise<PomodoroSettings>;
  createPomodoroSession(session: InsertPomodoroSession): Promise<PomodoroSession>;
  getPomodoroSession(id: string): Promise<PomodoroSession | undefined>;
  getActivePomodoroSession(userId: string): Promise<PomodoroSession | undefined>;
  updatePomodoroSession(id: string, session: Partial<InsertPomodoroSession>): Promise<PomodoroSession | undefined>;
  getPomodoroSessionsByUser(userId: string, limit?: number): Promise<PomodoroSession[]>;
  getPomodoroSessionsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<PomodoroSession[]>;

  // Habits methods
  createHabit(habit: InsertHabit): Promise<Habit>;
  getHabit(id: string): Promise<Habit | undefined>;
  getHabitWithRelations(id: string): Promise<HabitWithRelations | undefined>;
  getHabitsByUser(userId: string): Promise<HabitWithRelations[]>;
  updateHabit(id: string, habit: Partial<InsertHabit>): Promise<Habit | undefined>;
  deleteHabit(id: string): Promise<void>;

  // Habit occurrences methods
  createHabitOccurrence(occurrence: InsertHabitOccurrence): Promise<HabitOccurrence>;
  getHabitOccurrencesByDate(userId: string, date: Date): Promise<HabitOccurrence[]>;
  getHabitOccurrencesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<HabitOccurrence[]>;
  markHabitComplete(occurrenceId: string, notes?: string): Promise<HabitOccurrence | undefined>;
  markHabitMissed(occurrenceId: string): Promise<HabitOccurrence | undefined>;
  generateHabitOccurrences(habitId: string, startDate: Date, endDate: Date): Promise<HabitOccurrence[]>;
  getHabitMetrics(userId: string, period: 'today' | 'week' | 'month'): Promise<{
    total: number;
    completed: number;
    pending: number;
    missed: number;
    completionRate: number;
    currentStreak: number;
    dailyStats?: { date: string; completed: number; total: number }[];
  }>;

  // Analytics methods
  getAnalyticsOverview(userId: string, startDate: Date, endDate: Date, projectId?: string): Promise<{
    tasksCompleted: number;
    tasksCreated: number;
    tasksInProgress: number;
    tasksOverdue: number;
    totalTimeTracked: number;
    pomodoroSessions: number;
    habitsCompletionRate: number;
    activeProjects: number;
    avgCompletionTime: number;
  }>;
  getAnalyticsTrends(userId: string, period: string, metric: string, projectId?: string): Promise<{
    data: { date: string; completed: number; created: number; overdue: number }[];
  }>;
  getTaskMetrics(userId: string, startDate: Date, endDate: Date, projectId?: string): Promise<{
    statusDistribution: { status: string; count: number }[];
    priorityDistribution: { priority: string; count: number }[];
    avgTimeByPriority: { priority: string; avgTime: number }[];
    overdueRate: number;
    estimationAccuracy: number;
  }>;
  getTimeAllocation(userId: string, startDate: Date, endDate: Date, groupBy: string): Promise<{
    allocation: { name: string; time: number; percentage: number; color?: string }[];
    totalTime: number;
  }>;
  getProductivityScores(userId: string, startDate: Date, endDate: Date): Promise<{
    scores: { date: string; overall: number; completion: number; focus: number; timeManagement: number; consistency: number }[];
    currentScore: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  getHabitsPerformance(userId: string, startDate: Date, endDate: Date): Promise<{
    overallRate: number;
    bestHabits: { name: string; rate: number; streak: number }[];
    worstHabits: { name: string; rate: number; streak: number }[];
    weekdayVsWeekend: { weekday: number; weekend: number };
    timeWindowCompliance: { onTime: number; late: number };
  }>;

  // Task Templates methods
  createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate>;
  getTaskTemplate(id: string): Promise<TaskTemplate | undefined>;
  getTaskTemplatesByUser(userId: string): Promise<TaskTemplate[]>;
  getPublicTaskTemplates(): Promise<TaskTemplate[]>;
  getTaskTemplatesByCategory(category: string): Promise<TaskTemplate[]>;
  updateTaskTemplate(id: string, template: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined>;
  deleteTaskTemplate(id: string): Promise<void>;
  incrementTemplateUsage(id: string): Promise<void>;
  createTaskFromTemplate(templateId: string, projectId: string, creatorId: string): Promise<Task>;

  // Lists methods
  getLists(userId: string): Promise<List[]>;
  getList(id: string): Promise<List | undefined>;
  createList(list: InsertList & { userId: string }): Promise<List>;
  updateList(id: string, list: Partial<InsertList>): Promise<List | undefined>;
  deleteList(id: string): Promise<boolean>;

  // Task Reminders methods
  getTaskReminder(id: string): Promise<TaskReminder | undefined>;
  getTaskReminders(taskId: string): Promise<TaskReminder[]>;
  createTaskReminder(reminder: InsertTaskReminder): Promise<TaskReminder>;
  updateTaskReminder(id: string, data: Partial<InsertTaskReminder>): Promise<TaskReminder | undefined>;
  deleteTaskReminder(id: string): Promise<boolean>;

  // Task Sections methods
  getTaskSection(id: string): Promise<TaskSection | undefined>;
  getTaskSections(listId?: string, projectId?: string): Promise<TaskSection[]>;
  getTaskSectionsByProject(projectId: string): Promise<TaskSection[]>;
  createTaskSection(section: InsertTaskSection): Promise<TaskSection>;
  updateTaskSection(id: string, data: Partial<InsertTaskSection>): Promise<TaskSection | undefined>;
  deleteTaskSection(id: string): Promise<boolean>;
  reorderTaskSections(projectId: string, sectionIds: string[]): Promise<TaskSection[]>;

  // Recurring Task Instances methods
  getRecurringTaskInstances(parentTaskId: string): Promise<RecurringTaskInstance[]>;
  createRecurringTaskInstance(instance: InsertRecurringTaskInstance): Promise<RecurringTaskInstance>;
  updateRecurringTaskInstance(id: string, data: Partial<InsertRecurringTaskInstance>): Promise<RecurringTaskInstance | undefined>;

  // Focus time tracking
  addFocusTime(taskId: string, duration: number): Promise<Task | undefined>;

  // Activity tracking methods
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivitiesByTask(taskId: string): Promise<ActivityWithUser[]>;

  // User Preferences methods
  getUserPreferences(userId: string): Promise<UserPreferences | null>;
  upsertUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences>;

  // Activity Feed methods
  getActivityFeed(userId: string, limit?: number, offset?: number): Promise<(ActivityFeedItem & { actor?: User })[]>;
  createActivityFeed(data: InsertActivityFeed): Promise<ActivityFeedItem>;

  // Productivity Insights methods
  getInsights(userId: string): Promise<ProductivityInsight[]>;
  createInsight(data: InsertProductivityInsight): Promise<ProductivityInsight>;
  markInsightRead(id: string): Promise<void>;
  deleteExpiredInsights(): Promise<void>;

  // User Goals methods
  getUserGoals(userId: string): Promise<UserGoal[]>;
  upsertUserGoal(data: InsertUserGoal): Promise<UserGoal>;
  updateGoalProgress(goalId: string, value: number): Promise<void>;

  // Focus Sessions methods
  getActiveFocusSession(userId: string): Promise<TaskFocusSession | null>;
  getFocusSessionsByTask(taskId: string): Promise<TaskFocusSession[]>;
  createFocusSession(data: InsertTaskFocusSession): Promise<TaskFocusSession>;
  updateFocusSession(id: string, data: Partial<TaskFocusSession>): Promise<TaskFocusSession>;
  endFocusSession(id: string): Promise<TaskFocusSession>;

  // Subtask Segments methods
  getSegmentsBySession(sessionId: string): Promise<SubtaskFocusSegment[]>;
  createSubtaskSegment(data: InsertSubtaskFocusSegment): Promise<SubtaskFocusSegment>;
  endSubtaskSegment(id: string, completed?: boolean): Promise<SubtaskFocusSegment>;
  getSubtaskTimeStats(taskId: string): Promise<{ subtaskIndex: number; totalDuration: number }[]>;

  // Dashboard data methods
  getDashboardData(userId: string): Promise<{
    user: { firstName: string | null; greeting: string };
    kpis: {
      totalTasks: { value: number; trend: { direction: string; percentage: number }; previousValue: number };
      inProgress: { value: number; trend: { direction: string; percentage: number } };
      overdue: { value: number; trend: { direction: string; percentage: number } };
      completedToday: { value: number; goal: number; trend: { direction: string; percentage: number } };
      focusTime: { value: number; goal: number; pomodoroCount: number };
      weekSummary: { due: number; completed: number };
    };
    focusTasks: TaskWithRelations[];
    upcomingTasks: {
      today: TaskWithRelations[];
      tomorrow: TaskWithRelations[];
      thisWeek: TaskWithRelations[];
      later: TaskWithRelations[];
      noDate: TaskWithRelations[];
    };
    capacity: {
      totalHours: number;
      scheduledHours: number;
      availableHours: number;
      status: 'available' | 'at_capacity' | 'overbooked';
      breakdown: { meetings: number; focusTime: number; tasks: number };
    };
    projects: { id: string; name: string; color: string | null; completed: number; total: number; percentage: number }[];
    habits: { id: string; name: string; completed: boolean; streak: number }[];
    insights: ProductivityInsight[];
    recentActivity: (ActivityFeedItem & { actor?: User })[];
    chartData: {
      completionRate: { date: string; completed: number; created: number; overdue: number }[];
      weeklyActivity: { day: string; count: number }[];
    };
  }>;

  // Habit Categories CRUD
  getHabitCategories(userId: string): Promise<HabitCategory[]>;
  getHabitCategory(id: string): Promise<HabitCategory | undefined>;
  createHabitCategory(data: InsertHabitCategory): Promise<HabitCategory>;
  updateHabitCategory(id: string, data: Partial<InsertHabitCategory>): Promise<HabitCategory>;
  deleteHabitCategory(id: string): Promise<void>;

  // Habit Insights
  getHabitInsights(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<HabitInsight[]>;
  createHabitInsight(data: InsertHabitInsight): Promise<HabitInsight>;
  markHabitInsightAsRead(id: string): Promise<void>;
  deleteExpiredHabitInsights(): Promise<void>;

  // Habit Journal
  getHabitJournalEntries(userId: string, options?: { habitId?: string; limit?: number }): Promise<HabitJournalEntry[]>;
  createHabitJournalEntry(data: InsertHabitJournal): Promise<HabitJournalEntry>;
  getJournalEntriesForOccurrence(occurrenceId: string): Promise<HabitJournalEntry[]>;

  // Habit Achievements
  getHabitAchievements(userId: string): Promise<HabitAchievement[]>;
  createHabitAchievement(data: InsertHabitAchievement): Promise<HabitAchievement>;
  hasAchievement(userId: string, achievementType: string, habitId?: string): Promise<boolean>;

  // Habit Templates
  getHabitTemplates(options?: { publicOnly?: boolean; categoryName?: string }): Promise<HabitTemplate[]>;
  getHabitTemplate(id: string): Promise<HabitTemplate | undefined>;
  createHabitTemplate(data: InsertHabitTemplate): Promise<HabitTemplate>;
  incrementHabitTemplateUsage(id: string): Promise<void>;

  // Habit Analytics
  getHabitAnalytics(userId: string, options: { startDate: Date; endDate: Date; periodType: string }): Promise<HabitAnalytics[]>;
  upsertHabitAnalytics(data: InsertHabitAnalytics): Promise<HabitAnalytics>;

  // Enhanced Analytics Queries
  getHabitHeatmapData(userId: string, days: number): Promise<Array<{ date: string; completionRate: number; totalHabits: number; completedHabits: number }>>;
  getHabitTimePatterns(userId: string): Promise<Array<{ hour: number; completionRate: number; count: number }>>;
  getHabitDayPatterns(userId: string): Promise<Array<{ dayOfWeek: number; completionRate: number; count: number }>>;
  getHabitPerformanceBreakdown(userId: string): Promise<Array<{ habitId: string; habitName: string; completionRate: number; streak: number; totalCompletions: number }>>;
  getSubHabitStats(parentHabitId: string): Promise<Array<{ id: string; name: string; streak: number; completionRate: number; bestTime: string | null }>>;

  // Flexible Tasks methods (Auto-Scheduling)
  createFlexibleTask(userId: string, task: InsertFlexibleTask): Promise<FlexibleTask>;
  getFlexibleTask(id: string): Promise<FlexibleTask | undefined>;
  getFlexibleTasksByUser(userId: string, activeOnly?: boolean): Promise<FlexibleTaskWithRelations[]>;
  updateFlexibleTask(id: string, data: Partial<InsertFlexibleTask>): Promise<FlexibleTask | undefined>;
  deleteFlexibleTask(id: string): Promise<void>;

  // Schedule Suggestions methods (Auto-Scheduling)
  createScheduleSuggestion(userId: string, suggestion: InsertScheduleSuggestion): Promise<ScheduleSuggestion>;
  getScheduleSuggestion(id: string): Promise<ScheduleSuggestion | undefined>;
  getScheduleSuggestionsByUser(userId: string, status?: string): Promise<ScheduleSuggestionWithRelations[]>;
  getScheduleSuggestionsByTask(flexibleTaskId: string): Promise<ScheduleSuggestion[]>;
  getScheduleSuggestionsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<ScheduleSuggestionWithRelations[]>;
  updateScheduleSuggestion(id: string, data: Partial<InsertScheduleSuggestion>): Promise<ScheduleSuggestion | undefined>;
  deleteScheduleSuggestion(id: string): Promise<void>;
  deleteScheduleSuggestionsByTask(flexibleTaskId: string): Promise<void>;

  // User Availability methods (Auto-Scheduling)
  createUserAvailability(userId: string, availability: InsertUserAvailability): Promise<UserAvailability>;
  getUserAvailability(userId: string): Promise<UserAvailability[]>;
  getUserAvailabilityByDay(userId: string, dayOfWeek: number): Promise<UserAvailability[]>;
  updateUserAvailability(id: string, data: Partial<InsertUserAvailability>): Promise<UserAvailability | undefined>;
  deleteUserAvailability(id: string): Promise<void>;

  // Scheduling Preferences methods (Auto-Scheduling)
  getSchedulingPreferences(userId: string): Promise<SchedulingPreferences | undefined>;
  upsertSchedulingPreferences(userId: string, prefs: InsertSchedulingPreferences): Promise<SchedulingPreferences>;

  // Time Blocks methods (for Auto-Scheduling)
  getTimeBlocksByDate(userId: string, date: Date): Promise<TimeBlock[]>;
  getTimeBlocksByDateRange(userId: string, startDate: Date, endDate: Date): Promise<TimeBlock[]>;

  // Inspiration Hub - Quotes
  getInspirationQuotes(userId: string, options?: { category?: string; favoritesOnly?: boolean; activeOnly?: boolean }): Promise<InspirationQuote[]>;
  getInspirationQuote(id: string): Promise<InspirationQuote | undefined>;
  createInspirationQuote(userId: string, quote: InsertInspirationQuote): Promise<InspirationQuote>;
  updateInspirationQuote(id: string, data: Partial<InsertInspirationQuote>): Promise<InspirationQuote | undefined>;
  deleteInspirationQuote(id: string): Promise<void>;
  getRandomQuote(userId: string): Promise<InspirationQuote | undefined>;
  toggleQuoteFavorite(id: string): Promise<InspirationQuote | undefined>;
  incrementQuoteViews(id: string): Promise<void>;

  // Inspiration Hub - Bible Verses
  getInspirationVerses(userId: string, options?: { category?: string; book?: string; favoritesOnly?: boolean }): Promise<InspirationVerse[]>;
  getInspirationVerse(id: string): Promise<InspirationVerse | undefined>;
  createInspirationVerse(userId: string, verse: InsertInspirationVerse): Promise<InspirationVerse>;
  updateInspirationVerse(id: string, data: Partial<InsertInspirationVerse>): Promise<InspirationVerse | undefined>;
  deleteInspirationVerse(id: string): Promise<void>;
  toggleVerseFavorite(id: string): Promise<InspirationVerse | undefined>;

  // Inspiration Hub - Videos
  getInspirationVideos(userId: string, options?: { category?: string; favoritesOnly?: boolean }): Promise<InspirationVideo[]>;
  getInspirationVideo(id: string): Promise<InspirationVideo | undefined>;
  createInspirationVideo(userId: string, video: InsertInspirationVideo): Promise<InspirationVideo>;
  updateInspirationVideo(id: string, data: Partial<InsertInspirationVideo>): Promise<InspirationVideo | undefined>;
  deleteInspirationVideo(id: string): Promise<void>;
  toggleVideoFavorite(id: string): Promise<InspirationVideo | undefined>;
  incrementVideoWatched(id: string): Promise<void>;

  // Inspiration Hub - Music
  getInspirationMusic(userId: string, options?: { mood?: string; playlistId?: string; favoritesOnly?: boolean }): Promise<InspirationMusic[]>;
  getInspirationMusicItem(id: string): Promise<InspirationMusic | undefined>;
  createInspirationMusic(userId: string, music: InsertInspirationMusic): Promise<InspirationMusic>;
  updateInspirationMusic(id: string, data: Partial<InsertInspirationMusic>): Promise<InspirationMusic | undefined>;
  deleteInspirationMusic(id: string): Promise<void>;
  toggleMusicFavorite(id: string): Promise<InspirationMusic | undefined>;
  incrementMusicPlayed(id: string): Promise<void>;
  getFocusMusic(userId: string): Promise<InspirationMusic[]>;

  // Inspiration Hub - Images
  getInspirationImages(userId: string, options?: { category?: string; favoritesOnly?: boolean; usageContext?: string }): Promise<InspirationImage[]>;
  getInspirationImage(id: string): Promise<InspirationImage | undefined>;
  createInspirationImage(userId: string, image: InsertInspirationImage): Promise<InspirationImage>;
  updateInspirationImage(id: string, data: Partial<InsertInspirationImage>): Promise<InspirationImage | undefined>;
  deleteInspirationImage(id: string): Promise<void>;
  toggleImageFavorite(id: string): Promise<InspirationImage | undefined>;
  getBackgroundImages(userId: string): Promise<InspirationImage[]>;

  // Inspiration Hub - Sessions & Analytics
  logInspirationSession(userId: string, session: InsertInspirationSession): Promise<InspirationSession>;
  getInspirationStats(userId: string): Promise<{ quotesCount: number; videosCount: number; musicCount: number; imagesCount: number; totalViews: number }>;

  // Inspiration Hub - Daily Quote
  getDailyInspiration(userId: string, date: Date): Promise<DailyInspiration | undefined>;
  createDailyInspiration(data: InsertDailyInspiration): Promise<DailyInspiration>;
  updateDailyInspiration(id: string, data: Partial<InsertDailyInspiration>): Promise<DailyInspiration | undefined>;
  markDailyInspirationViewed(id: string): Promise<void>;

  // Inspiration Hub - Playlists
  getInspirationPlaylists(userId: string): Promise<InspirationPlaylist[]>;
  getInspirationPlaylist(id: string): Promise<InspirationPlaylist | undefined>;
  createInspirationPlaylist(userId: string, data: InsertInspirationPlaylist): Promise<InspirationPlaylist>;
  updateInspirationPlaylist(id: string, data: Partial<InsertInspirationPlaylist>): Promise<InspirationPlaylist | undefined>;
  deleteInspirationPlaylist(id: string): Promise<void>;
  getDefaultPlaylist(userId: string): Promise<InspirationPlaylist | undefined>;

  // Inspiration Hub - Links
  getInspirationLinks(userId: string, options?: { inspirationType?: string; linkedType?: string; linkedId?: string }): Promise<InspirationLink[]>;
  createInspirationLink(userId: string, data: InsertInspirationLink): Promise<InspirationLink>;
  deleteInspirationLink(id: string): Promise<void>;

  // Inspiration Hub - Dashboard
  getInspirationDashboard(userId: string): Promise<{
    featuredQuotes: InspirationQuote[];
    featuredVideos: InspirationVideo[];
    featuredMusic: InspirationMusic[];
    featuredImages: InspirationImage[];
    defaultPlaylist: InspirationPlaylist | null;
    playlistTracks: InspirationMusic[];
  }>;

  // Inspiration Hub - Toggle Featured
  toggleQuoteFeatured(id: string): Promise<InspirationQuote | undefined>;
  toggleVideoFeatured(id: string): Promise<InspirationVideo | undefined>;
  toggleImageFeatured(id: string): Promise<InspirationImage | undefined>;
  toggleMusicFeatured(id: string): Promise<InspirationMusic | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectWithRelations(id: string): Promise<ProjectWithRelations | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;

    const [owner] = await db.select().from(users).where(eq(users.id, project.ownerId));
    const members = await this.getProjectMembers(id);
    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, id));
    const projectTags = await db.select().from(tags).where(eq(tags.projectId, id));

    return {
      ...project,
      owner,
      members,
      tasks: projectTasks,
      tags: projectTags,
    };
  }

  async getProjectsByUser(userId: string): Promise<ProjectWithRelations[]> {
    const ownedProjects = await db
      .select()
      .from(projects)
      .where(and(eq(projects.ownerId, userId), eq(projects.isArchived, false)));

    const memberProjects = await db
      .select({ project: projects })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(and(eq(projectMembers.userId, userId), eq(projects.isArchived, false)));

    const userGroupIds = await this.getUserGroupIds(userId);
    let groupProjects: Project[] = [];
    if (userGroupIds.length > 0) {
      const projectsInGroups = await Promise.all(
        userGroupIds.map(groupId => this.getProjectsByGroup(groupId))
      );
      groupProjects = projectsInGroups.flat().filter(p => !p.isArchived);
    }

    const allProjects = [
      ...ownedProjects,
      ...memberProjects.map((m) => m.project),
      ...groupProjects,
    ];

    const uniqueProjects = Array.from(
      new Map(allProjects.map((p) => [p.id, p])).values()
    );

    const projectsWithRelations = await Promise.all(
      uniqueProjects.map(async (project) => {
        const [owner] = await db.select().from(users).where(eq(users.id, project.ownerId));
        const members = await this.getProjectMembers(project.id);
        const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, project.id));
        const projectTags = await db.select().from(tags).where(eq(tags.projectId, project.id));

        return {
          ...project,
          owner,
          members,
          tasks: projectTasks,
          tags: projectTags,
        };
      })
    );

    return projectsWithRelations;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async addProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
    const [newMember] = await db.insert(projectMembers).values(member).returning();
    return newMember;
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  }

  async getProjectMembers(projectId: string): Promise<(ProjectMember & { user?: User })[]> {
    const members = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const [user] = await db.select().from(users).where(eq(users.id, member.userId));
        return { ...member, user };
      })
    );

    return membersWithUsers;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTaskWithRelations(id: string): Promise<TaskWithRelations | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return undefined;

    const [assignee] = task.assigneeId
      ? await db.select().from(users).where(eq(users.id, task.assigneeId))
      : [null];
    const [creator] = await db.select().from(users).where(eq(users.id, task.creatorId));
    const [project] = task.projectId
      ? await db.select().from(projects).where(eq(projects.id, task.projectId))
      : [undefined];
    const taskComments = await this.getCommentsByTask(id);
    const taskTimeLogs = await this.getTimeLogsByTask(id);
    const taskAttachments = await this.getAttachmentsByTask(id);
    const taskTagsList = await this.getTaskTags(id);

    return {
      ...task,
      assignee,
      creator,
      project,
      comments: taskComments,
      timeLogs: taskTimeLogs,
      attachments: taskAttachments,
      tags: taskTagsList,
    };
  }

  async getTasksByProject(projectId: string): Promise<TaskWithRelations[]> {
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), eq(tasks.isArchived, false)))
      .orderBy(tasks.position);

    return Promise.all(
      projectTasks.map(async (task) => {
        const [assignee] = task.assigneeId
          ? await db.select().from(users).where(eq(users.id, task.assigneeId))
          : [null];
        const [creator] = await db.select().from(users).where(eq(users.id, task.creatorId));
        const taskTagsList = await this.getTaskTags(task.id);

        return {
          ...task,
          assignee,
          creator,
          tags: taskTagsList,
        };
      })
    );
  }

  async getTasksByUser(userId: string): Promise<TaskWithRelations[]> {
    const userTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          or(eq(tasks.assigneeId, userId), eq(tasks.creatorId, userId)),
          eq(tasks.isArchived, false)
        )
      )
      .orderBy(desc(tasks.createdAt));

    return Promise.all(
      userTasks.map(async (task) => {
        const [assignee] = task.assigneeId
          ? await db.select().from(users).where(eq(users.id, task.assigneeId))
          : [null];
        const [creator] = await db.select().from(users).where(eq(users.id, task.creatorId));
        const [project] = task.projectId
          ? await db.select().from(projects).where(eq(projects.id, task.projectId))
          : [undefined];
        const taskTagsList = await this.getTaskTags(task.id);

        return {
          ...task,
          assignee,
          creator,
          project,
          tags: taskTagsList,
        };
      })
    );
  }

  async getTasksPaginated(userId: string, options?: {
    projectId?: string;
    sectionId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<TaskWithRelations[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [
      or(eq(tasks.assigneeId, userId), eq(tasks.creatorId, userId)),
      eq(tasks.isArchived, false),
    ];

    if (options?.projectId) {
      conditions.push(eq(tasks.projectId, options.projectId));
    }

    if (options?.sectionId) {
      conditions.push(eq(tasks.sectionId, options.sectionId));
    }

    if (options?.status) {
      conditions.push(eq(tasks.status, options.status));
    }

    const paginatedTasks = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

    return Promise.all(
      paginatedTasks.map(async (task) => {
        const [assignee] = task.assigneeId
          ? await db.select().from(users).where(eq(users.id, task.assigneeId))
          : [null];
        const [creator] = await db.select().from(users).where(eq(users.id, task.creatorId));
        const [project] = task.projectId
          ? await db.select().from(projects).where(eq(projects.id, task.projectId))
          : [undefined];
        const taskTagsList = await this.getTaskTags(task.id);

        return {
          ...task,
          assignee,
          creator,
          project,
          tags: taskTagsList,
        };
      })
    );
  }

  async getInboxTasks(userId: string): Promise<TaskWithRelations[]> {
    const inboxTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          or(eq(tasks.assigneeId, userId), eq(tasks.creatorId, userId)),
          isNull(tasks.projectId),
          eq(tasks.isArchived, false)
        )
      )
      .orderBy(desc(tasks.createdAt));

    return Promise.all(
      inboxTasks.map(async (task) => {
        const [assignee] = task.assigneeId
          ? await db.select().from(users).where(eq(users.id, task.assigneeId))
          : [null];
        const [creator] = await db.select().from(users).where(eq(users.id, task.creatorId));
        const taskTagsList = await this.getTaskTags(task.id);

        return {
          ...task,
          assignee,
          creator,
          project: undefined,
          tags: taskTagsList,
        };
      })
    );
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async addFocusTime(taskId: string, duration: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) return undefined;
    
    const currentFocusTime = task.totalFocusTime || 0;
    const [updated] = await db
      .update(tasks)
      .set({
        totalFocusTime: currentFocusTime + duration,
        lastFocusedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();
    return updated;
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async getCommentsByTask(taskId: string): Promise<CommentWithAuthor[]> {
    const taskComments = await db
      .select()
      .from(comments)
      .where(eq(comments.taskId, taskId))
      .orderBy(comments.createdAt);

    return Promise.all(
      taskComments.map(async (comment) => {
        const [author] = await db.select().from(users).where(eq(users.id, comment.authorId));
        return { ...comment, author };
      })
    );
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  async createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog> {
    const [newTimeLog] = await db.insert(timeLogs).values(timeLog).returning();
    return newTimeLog;
  }

  async getTimeLogsByTask(taskId: string): Promise<TimeLogWithUser[]> {
    const taskTimeLogs = await db
      .select()
      .from(timeLogs)
      .where(eq(timeLogs.taskId, taskId))
      .orderBy(desc(timeLogs.startTime));

    return Promise.all(
      taskTimeLogs.map(async (log) => {
        const [user] = await db.select().from(users).where(eq(users.id, log.userId));
        return { ...log, user };
      })
    );
  }

  async getTimeLogsByUser(userId: string): Promise<TimeLogWithUser[]> {
    const userTimeLogs = await db
      .select()
      .from(timeLogs)
      .where(eq(timeLogs.userId, userId))
      .orderBy(desc(timeLogs.startTime));

    return Promise.all(
      userTimeLogs.map(async (log) => {
        const [user] = await db.select().from(users).where(eq(users.id, log.userId));
        return { ...log, user };
      })
    );
  }

  async getActiveTimeLog(userId: string): Promise<TimeLog | undefined> {
    const [activeLog] = await db
      .select()
      .from(timeLogs)
      .where(and(eq(timeLogs.userId, userId), isNull(timeLogs.endTime)));
    return activeLog;
  }

  async stopTimeLog(id: string): Promise<TimeLog | undefined> {
    const [log] = await db.select().from(timeLogs).where(eq(timeLogs.id, id));
    if (!log) return undefined;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - log.startTime.getTime()) / 1000);

    const [updated] = await db
      .update(timeLogs)
      .set({ endTime, duration })
      .where(eq(timeLogs.id, id))
      .returning();
    return updated;
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const [newAttachment] = await db.insert(attachments).values(attachment).returning();
    return newAttachment;
  }

  async getAttachmentsByTask(taskId: string): Promise<Attachment[]> {
    return db.select().from(attachments).where(eq(attachments.taskId, taskId));
  }

  async deleteAttachment(id: string): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotifications(userId: string): Promise<NotificationWithRelations[]> {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    return Promise.all(
      userNotifications.map(async (notification) => {
        const [user] = await db.select().from(users).where(eq(users.id, notification.userId));
        const task = notification.taskId
          ? (await db.select().from(tasks).where(eq(tasks.id, notification.taskId)))[0] || null
          : null;
        const project = notification.projectId
          ? (await db.select().from(projects).where(eq(projects.id, notification.projectId)))[0] || null
          : null;
        return { ...notification, user, task, project };
      })
    );
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return unreadNotifications.length;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    const [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));
    return settings || null;
  }

  async upsertNotificationSettings(userId: string, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings> {
    const [result] = await db
      .insert(notificationSettings)
      .values({ userId, ...settings })
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db.insert(tags).values(tag).returning();
    return newTag;
  }

  async getTagsByProject(projectId: string): Promise<Tag[]> {
    return db.select().from(tags).where(eq(tags.projectId, projectId));
  }

  async deleteTag(id: string): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }

  async getAllTagsWithCounts(userId: string): Promise<(Tag & { taskCount: number })[]> {
    const userProjects = await db.select({ id: projects.id }).from(projects)
      .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(or(eq(projects.ownerId, userId), eq(projectMembers.userId, userId)));
    
    const projectIds = [...new Set(userProjects.map(p => p.id))];
    
    let allTags: Tag[] = [];
    if (projectIds.length > 0) {
      allTags = await db.select().from(tags).where(inArray(tags.projectId, projectIds));
    }
    const globalTags = await db.select().from(tags).where(isNull(tags.projectId));
    allTags = [...allTags, ...globalTags];
    
    const uniqueTags = Array.from(new Map(allTags.map(t => [t.id, t])).values());
    
    const tagsWithCounts = await Promise.all(
      uniqueTags.map(async (tag) => {
        const taggedTasks = await db.select({ id: taskTags.taskId })
          .from(taskTags)
          .innerJoin(tasks, eq(taskTags.taskId, tasks.id))
          .where(and(
            eq(taskTags.tagId, tag.id),
            or(eq(tasks.status, 'todo'), eq(tasks.status, 'in-progress'))
          ));
        return { ...tag, taskCount: taggedTasks.length };
      })
    );
    
    return tagsWithCounts;
  }

  async addTaskTag(taskTag: InsertTaskTag): Promise<TaskTag> {
    const [newTaskTag] = await db.insert(taskTags).values(taskTag).returning();
    return newTaskTag;
  }

  async removeTaskTag(taskId: string, tagId: string): Promise<void> {
    await db
      .delete(taskTags)
      .where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)));
  }

  async getTaskTags(taskId: string): Promise<Tag[]> {
    const taskTagRecords = await db
      .select()
      .from(taskTags)
      .where(eq(taskTags.taskId, taskId));

    const tagsList = await Promise.all(
      taskTagRecords.map(async (tt) => {
        const [tag] = await db.select().from(tags).where(eq(tags.id, tt.tagId));
        return tag;
      })
    );

    return tagsList.filter((t): t is Tag => t !== undefined);
  }

  async createTaskDependency(dependency: InsertTaskDependency): Promise<TaskDependency> {
    const [newDep] = await db.insert(taskDependencies).values(dependency).returning();
    return newDep;
  }

  async getTaskDependencies(taskId: string): Promise<TaskDependency[]> {
    return db.select().from(taskDependencies).where(eq(taskDependencies.successorId, taskId));
  }

  async getTaskDependents(taskId: string): Promise<TaskDependency[]> {
    return db.select().from(taskDependencies).where(eq(taskDependencies.predecessorId, taskId));
  }

  async getProjectDependencies(projectId: string): Promise<TaskDependency[]> {
    const projectTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, projectId));
    const taskIds = projectTasks.map(t => t.id);
    if (taskIds.length === 0) return [];
    
    const deps = await db.select().from(taskDependencies);
    return deps.filter(d => taskIds.includes(d.predecessorId) || taskIds.includes(d.successorId));
  }

  async deleteTaskDependency(id: string): Promise<void> {
    await db.delete(taskDependencies).where(eq(taskDependencies.id, id));
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async getGroupWithRelations(id: string): Promise<GroupWithRelations | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    if (!group) return undefined;

    const [owner] = await db.select().from(users).where(eq(users.id, group.ownerId));
    const parent = group.parentId 
      ? (await db.select().from(groups).where(eq(groups.id, group.parentId)))[0] || null
      : null;
    const children = await db.select().from(groups).where(eq(groups.parentId, id));
    const members = await this.getGroupMembers(id);
    const groupProjects = await db.select().from(projects).where(eq(projects.groupId, id));

    return {
      ...group,
      owner,
      parent,
      children,
      members,
      projects: groupProjects,
    };
  }

  async getGroupsByUser(userId: string): Promise<GroupWithRelations[]> {
    const ownedGroups = await db
      .select()
      .from(groups)
      .where(and(eq(groups.ownerId, userId), eq(groups.isArchived, false)));

    const memberGroups = await db
      .select({ group: groups })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(and(eq(groupMembers.userId, userId), eq(groups.isArchived, false)));

    const allGroups = [
      ...ownedGroups,
      ...memberGroups.map((m) => m.group),
    ];

    const uniqueGroups = Array.from(
      new Map(allGroups.map((g) => [g.id, g])).values()
    );

    const groupsWithRelations = await Promise.all(
      uniqueGroups.map(async (group) => {
        const [owner] = await db.select().from(users).where(eq(users.id, group.ownerId));
        const parent = group.parentId 
          ? (await db.select().from(groups).where(eq(groups.id, group.parentId)))[0] || null
          : null;
        const children = await db.select().from(groups).where(eq(groups.parentId, group.id));
        const members = await this.getGroupMembers(group.id);
        const groupProjects = await db.select().from(projects).where(eq(projects.groupId, group.id));

        return {
          ...group,
          owner,
          parent,
          children,
          members,
          projects: groupProjects,
        };
      })
    );

    return groupsWithRelations;
  }

  async updateGroup(id: string, group: Partial<InsertGroup>): Promise<Group | undefined> {
    const [updated] = await db
      .update(groups)
      .set({ ...group, updatedAt: new Date() })
      .where(eq(groups.id, id))
      .returning();
    return updated;
  }

  async deleteGroup(id: string): Promise<void> {
    await db.delete(groups).where(eq(groups.id, id));
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const [newMember] = await db.insert(groupMembers).values(member).returning();
    return newMember;
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  async getGroupMembers(groupId: string): Promise<(GroupMember & { user?: User })[]> {
    const members = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const [user] = await db.select().from(users).where(eq(users.id, member.userId));
        return { ...member, user };
      })
    );

    return membersWithUsers;
  }

  async isUserGroupMember(groupId: string, userId: string): Promise<boolean> {
    const group = await this.getGroup(groupId);
    if (!group) return false;
    if (group.ownerId === userId) return true;
    
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    return !!member;
  }

  async moveProjectToGroup(projectId: string, groupId: string | null): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set({ groupId, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();
    return updated;
  }

  async getProjectsByGroup(groupId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.groupId, groupId));
  }

  async getUserGroupIds(userId: string): Promise<string[]> {
    const ownedGroups = await db
      .select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.ownerId, userId), eq(groups.isArchived, false)));

    const memberGroups = await db
      .select({ id: groups.id })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(and(eq(groupMembers.userId, userId), eq(groups.isArchived, false)));

    const allGroupIds = [
      ...ownedGroups.map(g => g.id),
      ...memberGroups.map(g => g.id),
    ];

    return Array.from(new Set(allGroupIds));
  }

  // Subtask methods
  async createSubtask(parentTaskId: string, subtask: Omit<InsertTask, 'projectId'>): Promise<Task> {
    const parentTask = await this.getTask(parentTaskId);
    if (!parentTask) {
      throw new Error("Parent task not found");
    }
    
    const existingSubtasks = await this.getSubtasks(parentTaskId);
    const nextPosition = existingSubtasks.length;
    
    const [newSubtask] = await db.insert(tasks).values({
      ...subtask,
      projectId: parentTask.projectId,
      parentTaskId: parentTaskId,
      position: nextPosition,
    }).returning();
    
    return newSubtask;
  }

  async getSubtasks(parentTaskId: string): Promise<TaskWithRelations[]> {
    const subtasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.parentTaskId, parentTaskId), eq(tasks.isArchived, false)))
      .orderBy(tasks.position);

    return Promise.all(
      subtasks.map(async (task) => {
        const [assignee] = task.assigneeId
          ? await db.select().from(users).where(eq(users.id, task.assigneeId))
          : [null];
        const [creator] = await db.select().from(users).where(eq(users.id, task.creatorId));
        const taskTagsList = await this.getTaskTags(task.id);

        return {
          ...task,
          assignee,
          creator,
          tags: taskTagsList,
        };
      })
    );
  }

  async getSubtaskProgress(parentTaskId: string): Promise<{ completed: number; total: number }> {
    const subtasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.parentTaskId, parentTaskId), eq(tasks.isArchived, false)));
    
    const completed = subtasks.filter(t => t.status === 'done').length;
    return { completed, total: subtasks.length };
  }

  async promoteSubtaskToTask(subtaskId: string): Promise<Task | undefined> {
    const [promoted] = await db
      .update(tasks)
      .set({ parentTaskId: null, updatedAt: new Date() })
      .where(eq(tasks.id, subtaskId))
      .returning();
    return promoted;
  }

  // Pomodoro methods
  async getPomodoroSettings(userId: string): Promise<PomodoroSettings | undefined> {
    const [settings] = await db
      .select()
      .from(pomodoroSettings)
      .where(eq(pomodoroSettings.userId, userId));
    return settings;
  }

  async upsertPomodoroSettings(settings: InsertPomodoroSettings): Promise<PomodoroSettings> {
    const [result] = await db
      .insert(pomodoroSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: pomodoroSettings.userId,
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async createPomodoroSession(session: InsertPomodoroSession): Promise<PomodoroSession> {
    const [newSession] = await db.insert(pomodoroSessions).values(session).returning();
    return newSession;
  }

  async getPomodoroSession(id: string): Promise<PomodoroSession | undefined> {
    const [session] = await db
      .select()
      .from(pomodoroSessions)
      .where(eq(pomodoroSessions.id, id));
    return session;
  }

  async getActivePomodoroSession(userId: string): Promise<PomodoroSession | undefined> {
    const [session] = await db
      .select()
      .from(pomodoroSessions)
      .where(
        and(
          eq(pomodoroSessions.userId, userId),
          or(
            eq(pomodoroSessions.status, "active"),
            eq(pomodoroSessions.status, "paused")
          )
        )
      );
    return session;
  }

  async updatePomodoroSession(id: string, session: Partial<InsertPomodoroSession>): Promise<PomodoroSession | undefined> {
    const [updated] = await db
      .update(pomodoroSessions)
      .set(session)
      .where(eq(pomodoroSessions.id, id))
      .returning();
    return updated;
  }

  async getPomodoroSessionsByUser(userId: string, limit?: number): Promise<PomodoroSession[]> {
    let query = db
      .select()
      .from(pomodoroSessions)
      .where(eq(pomodoroSessions.userId, userId))
      .orderBy(desc(pomodoroSessions.createdAt));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async getPomodoroSessionsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<PomodoroSession[]> {
    return db
      .select()
      .from(pomodoroSessions)
      .where(
        and(
          eq(pomodoroSessions.userId, userId),
          gte(pomodoroSessions.createdAt, startDate),
          lte(pomodoroSessions.createdAt, endDate)
        )
      )
      .orderBy(desc(pomodoroSessions.createdAt));
  }

  // Habits methods
  async createHabit(habit: InsertHabit & { userId: string }): Promise<Habit> {
    const [newHabit] = await db.insert(habits).values(habit).returning();
    return newHabit;
  }

  async getHabit(id: string): Promise<Habit | undefined> {
    const [habit] = await db.select().from(habits).where(eq(habits.id, id));
    return habit;
  }

  async getHabitWithRelations(id: string): Promise<HabitWithRelations | undefined> {
    const [habit] = await db.select().from(habits).where(eq(habits.id, id));
    if (!habit) return undefined;

    const occurrences = await db
      .select()
      .from(habitOccurrences)
      .where(eq(habitOccurrences.habitId, id))
      .orderBy(desc(habitOccurrences.scheduledDate));

    return { ...habit, occurrences };
  }

  async getHabitsByUser(userId: string): Promise<HabitWithRelations[]> {
    const userHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)))
      .orderBy(desc(habits.createdAt));

    const habitsWithRelations = await Promise.all(
      userHabits.map(async (habit) => {
        const occurrences = await db
          .select()
          .from(habitOccurrences)
          .where(eq(habitOccurrences.habitId, habit.id))
          .orderBy(desc(habitOccurrences.scheduledDate))
          .limit(30);
        return { ...habit, occurrences };
      })
    );

    return habitsWithRelations;
  }

  async updateHabit(id: string, habit: Partial<InsertHabit>): Promise<Habit | undefined> {
    const [updated] = await db
      .update(habits)
      .set({ ...habit, updatedAt: new Date() })
      .where(eq(habits.id, id))
      .returning();
    return updated;
  }

  async deleteHabit(id: string): Promise<void> {
    await db.delete(habits).where(eq(habits.id, id));
  }

  // Habit occurrences methods
  async createHabitOccurrence(occurrence: InsertHabitOccurrence): Promise<HabitOccurrence> {
    const [newOccurrence] = await db.insert(habitOccurrences).values(occurrence).returning();
    return newOccurrence;
  }

  async getHabitOccurrencesByDate(userId: string, date: Date): Promise<HabitOccurrence[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const userHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)));

    const habitIds = userHabits.map(h => h.id);
    if (habitIds.length === 0) return [];

    const occurrences = await db
      .select()
      .from(habitOccurrences)
      .where(
        and(
          gte(habitOccurrences.scheduledDate, startOfDay),
          lte(habitOccurrences.scheduledDate, endOfDay)
        )
      );

    return occurrences.filter(o => habitIds.includes(o.habitId));
  }

  async getHabitOccurrencesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<HabitOccurrence[]> {
    const userHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)));

    const habitIds = userHabits.map(h => h.id);
    if (habitIds.length === 0) return [];

    const occurrences = await db
      .select()
      .from(habitOccurrences)
      .where(
        and(
          gte(habitOccurrences.scheduledDate, startDate),
          lte(habitOccurrences.scheduledDate, endDate)
        )
      )
      .orderBy(habitOccurrences.scheduledDate);

    return occurrences.filter(o => habitIds.includes(o.habitId));
  }

  async markHabitComplete(occurrenceId: string, notes?: string): Promise<HabitOccurrence | undefined> {
    const [occurrence] = await db
      .select()
      .from(habitOccurrences)
      .where(eq(habitOccurrences.id, occurrenceId));
    
    if (!occurrence) return undefined;

    const habit = await this.getHabit(occurrence.habitId);
    const now = new Date();
    let completionStatus = 'on_time';

    if (habit?.timeWindowEnabled && habit.startTime && habit.endTime) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      const [startHour, startMin] = habit.startTime.split(':').map(Number);
      const [endHour, endMin] = habit.endTime.split(':').map(Number);
      const startTimeMinutes = startHour * 60 + startMin;
      const endTimeMinutes = endHour * 60 + endMin;
      const gracePeriodMinutes = habit.gracePeriodMinutes || 0;

      if (currentTimeMinutes < startTimeMinutes) {
        completionStatus = habit.allowsEarlyCompletion ? 'on_time' : 'late';
      } else if (currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes) {
        completionStatus = 'on_time';
      } else if (currentTimeMinutes <= endTimeMinutes + gracePeriodMinutes) {
        completionStatus = 'on_time';
      } else {
        completionStatus = 'late';
      }
    }

    const [updated] = await db
      .update(habitOccurrences)
      .set({ status: 'completed', completedAt: now, completionStatus, notes })
      .where(eq(habitOccurrences.id, occurrenceId))
      .returning();

    if (updated && habit) {
      const newStreak = (habit.streakCount || 0) + 1;
      const longestStreak = Math.max(habit.longestStreak || 0, newStreak);
      await this.updateHabit(habit.id, { streakCount: newStreak, longestStreak });
    }

    return updated;
  }

  async markHabitMissed(occurrenceId: string): Promise<HabitOccurrence | undefined> {
    const [updated] = await db
      .update(habitOccurrences)
      .set({ status: 'missed' })
      .where(eq(habitOccurrences.id, occurrenceId))
      .returning();

    if (updated) {
      const habit = await this.getHabit(updated.habitId);
      if (habit) {
        await this.updateHabit(habit.id, { streakCount: 0 });
      }
    }

    return updated;
  }

  async resetHabitToPending(occurrenceId: string): Promise<HabitOccurrence | undefined> {
    const [updated] = await db
      .update(habitOccurrences)
      .set({ status: 'pending', completedAt: null })
      .where(eq(habitOccurrences.id, occurrenceId))
      .returning();

    if (updated) {
      const habit = await this.getHabit(updated.habitId);
      if (habit && habit.streakCount && habit.streakCount > 0) {
        await this.updateHabit(habit.id, { streakCount: habit.streakCount - 1 });
      }
    }

    return updated;
  }

  async generateHabitOccurrences(habitId: string, startDate: Date, endDate: Date): Promise<HabitOccurrence[]> {
    const habit = await this.getHabit(habitId);
    if (!habit) return [];

    const existingOccurrences = await db
      .select()
      .from(habitOccurrences)
      .where(
        and(
          eq(habitOccurrences.habitId, habitId),
          gte(habitOccurrences.scheduledDate, startDate),
          lte(habitOccurrences.scheduledDate, endDate)
        )
      );

    const existingDates = new Set(
      existingOccurrences.map(o => o.scheduledDate.toDateString())
    );

    const newOccurrences: HabitOccurrence[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      if (!existingDates.has(current.toDateString())) {
        let shouldCreate = false;
        const dayOfWeek = current.getDay();

        switch (habit.recurrence) {
          case 'daily':
            shouldCreate = true;
            break;
          case 'weekly':
            shouldCreate = dayOfWeek === 1;
            break;
          case 'monthly':
            shouldCreate = current.getDate() === 1;
            break;
          default:
            shouldCreate = true;
        }

        if (shouldCreate) {
          const occurrence = await this.createHabitOccurrence({
            habitId,
            scheduledDate: new Date(current),
            status: 'pending',
          });
          newOccurrences.push(occurrence);
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return [...existingOccurrences, ...newOccurrences];
  }

  async getHabitMetrics(userId: string, period: 'today' | 'week' | 'month'): Promise<{
    total: number;
    completed: number;
    pending: number;
    missed: number;
    completionRate: number;
    currentStreak: number;
    dailyStats?: { date: string; completed: number; total: number }[];
  }> {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const occurrences = await this.getHabitOccurrencesByDateRange(userId, startDate, endDate);

    const total = occurrences.length;
    const completed = occurrences.filter(o => o.status === 'completed').length;
    const pending = occurrences.filter(o => o.status === 'pending').length;
    const missed = occurrences.filter(o => o.status === 'missed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const userHabits = await this.getHabitsByUser(userId);
    const currentStreak = Math.max(...userHabits.map(h => h.streakCount || 0), 0);

    let dailyStats: { date: string; completed: number; total: number }[] | undefined;

    if (period === 'week' || period === 'month') {
      const statsMap = new Map<string, { completed: number; total: number }>();
      const tempDate = new Date(startDate);
      while (tempDate <= endDate) {
        statsMap.set(tempDate.toISOString().split('T')[0], { completed: 0, total: 0 });
        tempDate.setDate(tempDate.getDate() + 1);
      }

      occurrences.forEach(o => {
        const dateKey = o.scheduledDate.toISOString().split('T')[0];
        const stats = statsMap.get(dateKey);
        if (stats) {
          stats.total++;
          if (o.status === 'completed') stats.completed++;
        }
      });

      dailyStats = Array.from(statsMap.entries()).map(([date, stats]) => ({
        date,
        ...stats,
      }));
    }

    return { total, completed, pending, missed, completionRate, currentStreak, dailyStats };
  }

  async getMultiLevelStreaks(userId: string): Promise<{
    parentStreaks: { habitId: string; habitName: string; currentStreak: number; longestStreak: number }[];
    subHabitStreaks: { habitId: string; habitName: string; parentName: string; currentStreak: number; longestStreak: number }[];
    perfectDays: number;
    overallLongest: number;
  }> {
    const allHabits = await this.getHabitsByUser(userId);
    
    // Get parent habits with sub-habits
    const parentHabits = allHabits.filter(h => !h.parentHabitId);
    const subHabits = allHabits.filter(h => h.parentHabitId);
    
    // Parent habit streaks (habits that have sub-habits)
    const parentsWithSubs = await Promise.all(
      parentHabits.map(async (parent) => {
        const hasSubHabits = subHabits.some(s => s.parentHabitId === parent.id);
        if (!hasSubHabits) return null;
        return {
          habitId: parent.id,
          habitName: parent.name,
          currentStreak: parent.streakCount || 0,
          longestStreak: parent.longestStreak || 0,
        };
      })
    );
    
    const parentStreaks = parentsWithSubs.filter((p): p is NonNullable<typeof p> => p !== null);
    
    // Sub-habit streaks
    const subHabitStreaks = subHabits.map(sub => {
      const parent = parentHabits.find(p => p.id === sub.parentHabitId);
      return {
        habitId: sub.id,
        habitName: sub.name,
        parentName: parent?.name || 'Unknown',
        currentStreak: sub.streakCount || 0,
        longestStreak: sub.longestStreak || 0,
      };
    });
    
    // Calculate perfect days (days where all habits were completed at 100%)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const occurrences = await this.getHabitOccurrencesByDateRange(userId, thirtyDaysAgo, today);
    
    // Group occurrences by date
    const dateMap = new Map<string, { total: number; completed: number }>();
    occurrences.forEach(occ => {
      const dateKey = occ.scheduledDate.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { total: 0, completed: 0 });
      }
      const day = dateMap.get(dateKey)!;
      day.total++;
      if (occ.status === 'completed') day.completed++;
    });
    
    // Count perfect days (100% completion)
    let perfectDays = 0;
    dateMap.forEach((stats) => {
      if (stats.total > 0 && stats.completed === stats.total) {
        perfectDays++;
      }
    });
    
    // Overall longest streak across all habits
    const overallLongest = Math.max(
      ...allHabits.map(h => h.longestStreak || 0),
      0
    );
    
    return { parentStreaks, subHabitStreaks, perfectDays, overallLongest };
  }

  async getHabitPatterns(userId: string): Promise<{
    insights: string[];
    dayOfWeekStats: { day: string; completionRate: number }[];
    mostSkippedHabits: { habitName: string; skipRate: number }[];
    bestPerformingHabits: { habitName: string; completionRate: number }[];
  }> {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const allHabits = await this.getHabitsByUser(userId);
    const occurrences = await this.getHabitOccurrencesByDateRange(userId, thirtyDaysAgo, today);
    
    // Calculate day of week stats
    const dayStats = new Map<number, { total: number; completed: number }>();
    for (let i = 0; i < 7; i++) {
      dayStats.set(i, { total: 0, completed: 0 });
    }
    
    occurrences.forEach(occ => {
      const dayOfWeek = occ.scheduledDate.getDay();
      const stats = dayStats.get(dayOfWeek)!;
      stats.total++;
      if (occ.status === 'completed') stats.completed++;
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekStats = Array.from(dayStats.entries()).map(([day, stats]) => ({
      day: dayNames[day],
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }));
    
    // Calculate per-habit stats
    const habitStats = new Map<string, { name: string; total: number; completed: number }>();
    allHabits.forEach(habit => {
      habitStats.set(habit.id, { name: habit.name, total: 0, completed: 0 });
    });
    
    occurrences.forEach(occ => {
      const stats = habitStats.get(occ.habitId);
      if (stats) {
        stats.total++;
        if (occ.status === 'completed') stats.completed++;
      }
    });
    
    const habitRates = Array.from(habitStats.values())
      .filter(s => s.total >= 3)
      .map(s => ({
        habitName: s.name,
        completionRate: Math.round((s.completed / s.total) * 100),
        skipRate: Math.round(((s.total - s.completed) / s.total) * 100),
      }));
    
    const bestPerformingHabits = habitRates
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 3)
      .map(h => ({ habitName: h.habitName, completionRate: h.completionRate }));
    
    const mostSkippedHabits = habitRates
      .sort((a, b) => b.skipRate - a.skipRate)
      .slice(0, 3)
      .map(h => ({ habitName: h.habitName, skipRate: h.skipRate }));
    
    // Generate insights
    const insights: string[] = [];
    
    // Find best and worst day
    const sortedDays = [...dayOfWeekStats].sort((a, b) => b.completionRate - a.completionRate);
    if (sortedDays[0].completionRate > sortedDays[6].completionRate + 10) {
      insights.push(`You complete habits ${sortedDays[0].completionRate - sortedDays[6].completionRate}% more often on ${sortedDays[0].day}s than ${sortedDays[6].day}s.`);
    }
    
    // Identify struggling habits
    if (mostSkippedHabits.length > 0 && mostSkippedHabits[0].skipRate > 50) {
      insights.push(`"${mostSkippedHabits[0].habitName}" has been skipped ${mostSkippedHabits[0].skipRate}% of the time. Consider adjusting its schedule.`);
    }
    
    // Highlight top performer
    if (bestPerformingHabits.length > 0 && bestPerformingHabits[0].completionRate > 80) {
      insights.push(`Great job with "${bestPerformingHabits[0].habitName}"! You've completed it ${bestPerformingHabits[0].completionRate}% of the time.`);
    }
    
    return { insights, dayOfWeekStats, mostSkippedHabits, bestPerformingHabits };
  }

  async getTimeWindowMetrics(userId: string): Promise<{
    totalTimeWindowHabits: number;
    onTimeCompletions: number;
    lateCompletions: number;
    missedWindows: number;
    onTimeRate: number;
    lateRate: number;
    missedRate: number;
    habitBreakdown: { habitName: string; onTime: number; late: number; missed: number }[];
  }> {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    // Get all habits with time windows enabled
    const timeWindowHabits = await db
      .select()
      .from(habits)
      .where(and(
        eq(habits.userId, userId),
        eq(habits.isArchived, false),
        eq(habits.timeWindowEnabled, true)
      ));
    
    if (timeWindowHabits.length === 0) {
      return {
        totalTimeWindowHabits: 0,
        onTimeCompletions: 0,
        lateCompletions: 0,
        missedWindows: 0,
        onTimeRate: 0,
        lateRate: 0,
        missedRate: 0,
        habitBreakdown: [],
      };
    }
    
    const habitIds = timeWindowHabits.map(h => h.id);
    
    // Get occurrences for these habits in the date range
    const occurrences = await db
      .select()
      .from(habitOccurrences)
      .where(and(
        gte(habitOccurrences.scheduledDate, thirtyDaysAgo),
        lte(habitOccurrences.scheduledDate, today),
        inArray(habitOccurrences.habitId, habitIds)
      ));
    
    let onTimeCompletions = 0;
    let lateCompletions = 0;
    let missedWindows = 0;
    
    const habitStats = new Map<string, { habitName: string; onTime: number; late: number; missed: number }>();
    timeWindowHabits.forEach(h => {
      habitStats.set(h.id, { habitName: h.name, onTime: 0, late: 0, missed: 0 });
    });
    
    occurrences.forEach(occ => {
      const stats = habitStats.get(occ.habitId);
      if (!stats) return;
      
      if (occ.status === 'completed') {
        if (occ.completionStatus === 'on_time') {
          onTimeCompletions++;
          stats.onTime++;
        } else if (occ.completionStatus === 'late') {
          lateCompletions++;
          stats.late++;
        }
      } else if (occ.status === 'missed') {
        missedWindows++;
        stats.missed++;
      }
    });
    
    const totalWithStatus = onTimeCompletions + lateCompletions + missedWindows;
    
    const habitBreakdown = Array.from(habitStats.values())
      .filter(s => s.onTime + s.late + s.missed > 0)
      .sort((a, b) => (b.onTime + b.late + b.missed) - (a.onTime + a.late + a.missed));
    
    return {
      totalTimeWindowHabits: timeWindowHabits.length,
      onTimeCompletions,
      lateCompletions,
      missedWindows,
      onTimeRate: totalWithStatus > 0 ? Math.round((onTimeCompletions / totalWithStatus) * 100) : 0,
      lateRate: totalWithStatus > 0 ? Math.round((lateCompletions / totalWithStatus) * 100) : 0,
      missedRate: totalWithStatus > 0 ? Math.round((missedWindows / totalWithStatus) * 100) : 0,
      habitBreakdown,
    };
  }

  // Sub-habits methods
  async getHabitWithSubHabits(habitId: string): Promise<HabitWithSubHabits | undefined> {
    const habit = await this.getHabit(habitId);
    if (!habit) return undefined;

    const subHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.parentHabitId, habitId), eq(habits.isArchived, false)))
      .orderBy(habits.displayOrder);

    return { ...habit, subHabits };
  }

  async getParentHabitsWithSubHabits(userId: string): Promise<HabitWithSubHabits[]> {
    const parentHabits = await db
      .select()
      .from(habits)
      .where(
        and(
          eq(habits.userId, userId),
          eq(habits.isArchived, false),
          isNull(habits.parentHabitId)
        )
      )
      .orderBy(desc(habits.createdAt));

    const result = await Promise.all(
      parentHabits.map(async (habit) => {
        const subHabits = await db
          .select()
          .from(habits)
          .where(and(eq(habits.parentHabitId, habit.id), eq(habits.isArchived, false)))
          .orderBy(habits.displayOrder);
        return { ...habit, subHabits };
      })
    );

    return result;
  }

  async createHabitWithSubHabits(
    parentHabit: InsertHabit & { userId: string },
    subHabitNames: { name: string; estimatedDuration?: number; requiredDays?: number[] }[]
  ): Promise<HabitWithSubHabits> {
    const [created] = await db.insert(habits).values(parentHabit).returning();

    const subHabits = await Promise.all(
      subHabitNames.map(async (subHabit, index) => {
        const [sub] = await db
          .insert(habits)
          .values({
            name: subHabit.name,
            userId: parentHabit.userId,
            parentHabitId: created.id,
            displayOrder: index,
            estimatedDuration: subHabit.estimatedDuration,
            requiredDays: subHabit.requiredDays,
            recurrence: parentHabit.recurrence,
            priority: 'medium',
            color: parentHabit.color,
          })
          .returning();
        return sub;
      })
    );

    return { ...created, subHabits };
  }

  async addSubHabit(parentId: string, subHabit: { name: string; estimatedDuration?: number; requiredDays?: number[] }): Promise<Habit> {
    const parent = await this.getHabit(parentId);
    if (!parent) throw new Error('Parent habit not found');

    const existingSubHabits = await db
      .select()
      .from(habits)
      .where(eq(habits.parentHabitId, parentId));

    const [created] = await db
      .insert(habits)
      .values({
        name: subHabit.name,
        userId: parent.userId,
        parentHabitId: parentId,
        displayOrder: existingSubHabits.length,
        estimatedDuration: subHabit.estimatedDuration,
        requiredDays: subHabit.requiredDays,
        recurrence: parent.recurrence,
        priority: 'medium',
        color: parent.color,
      })
      .returning();

    return created;
  }

  async reorderSubHabits(parentId: string, subHabitIds: string[]): Promise<void> {
    await Promise.all(
      subHabitIds.map((id, index) =>
        db
          .update(habits)
          .set({ displayOrder: index })
          .where(and(eq(habits.id, id), eq(habits.parentHabitId, parentId)))
      )
    );
  }

  async getSubHabitProgress(parentId: string, date: Date): Promise<{ total: number; completed: number; percentage: number }> {
    const subHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.parentHabitId, parentId), eq(habits.isArchived, false)));

    if (subHabits.length === 0) {
      return { total: 0, completed: 0, percentage: 100 };
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const completedCount = await Promise.all(
      subHabits.map(async (subHabit) => {
        const [occurrence] = await db
          .select()
          .from(habitOccurrences)
          .where(
            and(
              eq(habitOccurrences.habitId, subHabit.id),
              gte(habitOccurrences.scheduledDate, startOfDay),
              lte(habitOccurrences.scheduledDate, endOfDay),
              eq(habitOccurrences.status, 'completed')
            )
          );
        return occurrence ? 1 : 0;
      })
    );

    const completed = completedCount.reduce((a: number, b: number) => a + b, 0);
    const total = subHabits.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage };
  }

  async checkAndAutoCompleteParent(parentId: string, date: Date): Promise<boolean> {
    const parent = await this.getHabit(parentId);
    if (!parent) return false;

    const progress = await this.getSubHabitProgress(parentId, date);

    let shouldComplete = false;
    switch (parent.completionType) {
      case 'all_required':
        shouldComplete = progress.completed === progress.total;
        break;
      case 'percentage_based':
        shouldComplete = progress.percentage >= (parent.requiredPercentage || 100);
        break;
      case 'partial_allowed':
        shouldComplete = false;
        break;
    }

    if (shouldComplete) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const [existingOccurrence] = await db
        .select()
        .from(habitOccurrences)
        .where(
          and(
            eq(habitOccurrences.habitId, parentId),
            gte(habitOccurrences.scheduledDate, startOfDay),
            lte(habitOccurrences.scheduledDate, endOfDay)
          )
        );

      if (existingOccurrence && existingOccurrence.status !== 'completed') {
        await this.markHabitComplete(existingOccurrence.id);
        return true;
      }
    }

    return false;
  }

  async completeAllSubHabits(parentId: string, date: Date): Promise<void> {
    const subHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.parentHabitId, parentId), eq(habits.isArchived, false)));

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    await Promise.all(
      subHabits.map(async (subHabit) => {
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        let [occurrence] = await db
          .select()
          .from(habitOccurrences)
          .where(
            and(
              eq(habitOccurrences.habitId, subHabit.id),
              gte(habitOccurrences.scheduledDate, startOfDay),
              lte(habitOccurrences.scheduledDate, endOfDay)
            )
          );

        if (!occurrence) {
          occurrence = await this.createHabitOccurrence({
            habitId: subHabit.id,
            scheduledDate: startOfDay,
            status: 'pending',
          });
        }

        if (occurrence.status !== 'completed') {
          await this.markHabitComplete(occurrence.id);
        }
      })
    );

    await this.checkAndAutoCompleteParent(parentId, date);
  }

  async uncheckAllSubHabits(parentId: string, date: Date): Promise<void> {
    const subHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.parentHabitId, parentId), eq(habits.isArchived, false)));

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    await Promise.all(
      subHabits.map(async (subHabit) => {
        const [occurrence] = await db
          .select()
          .from(habitOccurrences)
          .where(
            and(
              eq(habitOccurrences.habitId, subHabit.id),
              gte(habitOccurrences.scheduledDate, startOfDay),
              lte(habitOccurrences.scheduledDate, endOfDay)
            )
          );

        if (occurrence && occurrence.status === 'completed') {
          await this.resetHabitToPending(occurrence.id);
        }
      })
    );

    // Also reset the parent habit occurrence
    const [parentOcc] = await db
      .select()
      .from(habitOccurrences)
      .where(
        and(
          eq(habitOccurrences.habitId, parentId),
          gte(habitOccurrences.scheduledDate, startOfDay),
          lte(habitOccurrences.scheduledDate, endOfDay)
        )
      );

    if (parentOcc && parentOcc.status === 'completed') {
      await this.resetHabitToPending(parentOcc.id);
    }
  }

  async getSubHabitHistory(parentId: string, startDate: Date, endDate: Date): Promise<{
    subHabitId: string;
    subHabitName: string;
    dates: { date: string; completed: boolean }[];
  }[]> {
    const subHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.parentHabitId, parentId), eq(habits.isArchived, false)))
      .orderBy(habits.displayOrder);

    const result = await Promise.all(
      subHabits.map(async (subHabit) => {
        const occurrences = await db
          .select()
          .from(habitOccurrences)
          .where(
            and(
              eq(habitOccurrences.habitId, subHabit.id),
              gte(habitOccurrences.scheduledDate, startDate),
              lte(habitOccurrences.scheduledDate, endDate)
            )
          );

        const occurrenceMap = new Map(
          occurrences.map((o) => [o.scheduledDate.toISOString().split('T')[0], o.status === 'completed'])
        );

        const dates: { date: string; completed: boolean }[] = [];
        const current = new Date(startDate);
        while (current <= endDate) {
          const dateKey = current.toISOString().split('T')[0];
          dates.push({ date: dateKey, completed: occurrenceMap.get(dateKey) || false });
          current.setDate(current.getDate() + 1);
        }

        return {
          subHabitId: subHabit.id,
          subHabitName: subHabit.name,
          dates,
        };
      })
    );

    return result;
  }

  // Schedule settings methods
  async getScheduleSettings(userId: string): Promise<ScheduleSettings | undefined> {
    const [settings] = await db
      .select()
      .from(scheduleSettings)
      .where(eq(scheduleSettings.userId, userId));
    return settings;
  }

  async upsertScheduleSettings(userId: string, settings: InsertScheduleSettings): Promise<ScheduleSettings> {
    const existing = await this.getScheduleSettings(userId);
    if (existing) {
      const [updated] = await db
        .update(scheduleSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(scheduleSettings.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(scheduleSettings)
      .values({ ...settings, userId })
      .returning();
    return created;
  }

  // Time blocks methods
  async createTimeBlock(block: InsertTimeBlock & { userId: string }): Promise<TimeBlock> {
    const [created] = await db.insert(timeBlocks).values(block).returning();
    return created;
  }

  async getTimeBlock(id: string): Promise<TimeBlock | undefined> {
    const [block] = await db.select().from(timeBlocks).where(eq(timeBlocks.id, id));
    return block;
  }

  async getTimeBlocksByUser(userId: string): Promise<TimeBlock[]> {
    return db
      .select()
      .from(timeBlocks)
      .where(eq(timeBlocks.userId, userId))
      .orderBy(timeBlocks.startTime);
  }

  async getTimeBlocksByDate(userId: string, date: Date): Promise<TimeBlock[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return db
      .select()
      .from(timeBlocks)
      .where(
        and(
          eq(timeBlocks.userId, userId),
          or(
            and(gte(timeBlocks.date, startOfDay), lte(timeBlocks.date, endOfDay)),
            eq(timeBlocks.isRecurring, true)
          )
        )
      )
      .orderBy(timeBlocks.startTime);
  }

  async updateTimeBlock(id: string, block: Partial<InsertTimeBlock>): Promise<TimeBlock | undefined> {
    const [updated] = await db
      .update(timeBlocks)
      .set({ ...block, updatedAt: new Date() })
      .where(eq(timeBlocks.id, id))
      .returning();
    return updated;
  }

  async deleteTimeBlock(id: string): Promise<void> {
    await db.delete(timeBlocks).where(eq(timeBlocks.id, id));
  }

  // Schedule analysis methods
  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  private timeToMinutes(timeStr: string): number {
    const { hours, minutes } = this.parseTime(timeStr);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  async analyzeSchedule(userId: string, date: Date): Promise<ScheduleAnalysis> {
    const settings = await this.getScheduleSettings(userId) || {
      workStartTime: '08:00',
      workEndTime: '22:00',
      minTaskDuration: 15,
    };

    const blocks = await this.getTimeBlocksByDate(userId, date);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const relevantBlocks = blocks.filter(block => {
      if (!block.isRecurring) return true;
      return block.recurrenceDays?.includes(dayOfWeek);
    });

    relevantBlocks.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));

    const workStart = this.timeToMinutes(settings.workStartTime);
    const workEnd = this.timeToMinutes(settings.workEndTime);
    const totalWorkMinutes = workEnd - workStart;

    const gaps: TimeGap[] = [];
    let currentTime = workStart;

    for (const block of relevantBlocks) {
      const blockStart = this.timeToMinutes(block.startTime);
      const blockEnd = this.timeToMinutes(block.endTime);

      if (blockStart > currentTime && blockStart < workEnd) {
        const gapEnd = Math.min(blockStart, workEnd);
        const gapDuration = gapEnd - currentTime;
        if (gapDuration >= (settings.minTaskDuration || 15)) {
          gaps.push({
            startTime: this.minutesToTime(currentTime),
            endTime: this.minutesToTime(gapEnd),
            durationMinutes: gapDuration,
            date,
          });
        }
      }
      currentTime = Math.max(currentTime, blockEnd);
    }

    if (currentTime < workEnd) {
      const finalGap = workEnd - currentTime;
      if (finalGap >= (settings.minTaskDuration || 15)) {
        gaps.push({
          startTime: this.minutesToTime(currentTime),
          endTime: this.minutesToTime(workEnd),
          durationMinutes: finalGap,
          date,
        });
      }
    }

    const scheduledMinutes = relevantBlocks.reduce((sum, block) => {
      const start = Math.max(this.timeToMinutes(block.startTime), workStart);
      const end = Math.min(this.timeToMinutes(block.endTime), workEnd);
      return sum + Math.max(0, end - start);
    }, 0);

    const availableMinutes = gaps.reduce((sum, gap) => sum + gap.durationMinutes, 0);

    const pendingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.status, 'todo'),
          eq(tasks.isArchived, false),
          or(eq(tasks.assigneeId, userId), eq(tasks.creatorId, userId))
        )
      )
      .orderBy(desc(tasks.priority))
      .limit(10);

    const userHabits = await this.getHabitsByUser(userId);
    const incompleteHabits = userHabits.filter(h => {
      const todayOccurrence = h.occurrences?.find(o => {
        const occDate = new Date(o.scheduledDate);
        return occDate.toDateString() === date.toDateString() && o.status === 'pending';
      });
      return !!todayOccurrence;
    });

    return {
      date,
      workStartTime: settings.workStartTime,
      workEndTime: settings.workEndTime,
      totalWorkMinutes,
      scheduledMinutes,
      availableMinutes,
      gaps,
      timeBlocks: relevantBlocks,
      suggestedTasks: pendingTasks,
      suggestedHabits: incompleteHabits,
    };
  }

  // Analytics methods implementation
  async getAnalyticsOverview(userId: string, startDate: Date, endDate: Date, projectId?: string) {
    const userProjects = await this.getProjectsByUser(userId);
    const projectIds = projectId ? [projectId] : userProjects.map(p => p.id);

    const allTasks = projectIds.length > 0 
      ? await db.select().from(tasks).where(inArray(tasks.projectId, projectIds))
      : [];

    const tasksInRange = allTasks.filter(t => {
      const createdAt = t.createdAt ? new Date(t.createdAt) : new Date();
      return createdAt >= startDate && createdAt <= endDate;
    });

    const completedTasks = tasksInRange.filter(t => t.status === 'done');
    const inProgressTasks = allTasks.filter(t => t.status === 'in_progress');
    const now = new Date();
    const overdueTasks = allTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    );

    const userTimeLogs = await db.select().from(timeLogs)
      .where(and(eq(timeLogs.userId, userId), gte(timeLogs.startTime, startDate), lte(timeLogs.startTime, endDate)));
    const totalTimeTracked = userTimeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);

    const userPomodoros = await db.select().from(pomodoroSessions)
      .where(and(
        eq(pomodoroSessions.userId, userId), 
        eq(pomodoroSessions.status, 'completed'),
        gte(pomodoroSessions.completedAt, startDate),
        lte(pomodoroSessions.completedAt, endDate)
      ));

    const userHabits = await this.getHabitsByUser(userId);
    const habitOccurrencesInRange = await this.getHabitOccurrencesByDateRange(userId, startDate, endDate);
    const completedOccurrences = habitOccurrencesInRange.filter(o => o.status === 'completed');
    const habitsCompletionRate = habitOccurrencesInRange.length > 0 
      ? Math.round((completedOccurrences.length / habitOccurrencesInRange.length) * 100)
      : 0;

    const activeProjects = userProjects.filter(p => p.status === 'active' && !p.isArchived).length;

    const avgCompletionTime = completedTasks.length > 0
      ? Math.round(completedTasks.reduce((sum, t) => sum + (t.estimatedTime || 30), 0) / completedTasks.length)
      : 0;

    return {
      tasksCompleted: completedTasks.length,
      tasksCreated: tasksInRange.length,
      tasksInProgress: inProgressTasks.length,
      tasksOverdue: overdueTasks.length,
      totalTimeTracked,
      pomodoroSessions: userPomodoros.length,
      habitsCompletionRate,
      activeProjects,
      avgCompletionTime,
    };
  }

  async getAnalyticsTrends(userId: string, period: string, metric: string, projectId?: string) {
    const daysMap: Record<string, number> = { '7days': 7, '30days': 30, '90days': 90, '1year': 365 };
    const days = daysMap[period] || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const userProjects = await this.getProjectsByUser(userId);
    const projectIds = projectId ? [projectId] : userProjects.map(p => p.id);

    const allTasks = projectIds.length > 0 
      ? await db.select().from(tasks).where(inArray(tasks.projectId, projectIds))
      : [];

    const data: { date: string; completed: number; created: number; overdue: number }[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const completed = allTasks.filter(t => {
        const updatedAt = t.updatedAt ? new Date(t.updatedAt) : null;
        return t.status === 'done' && updatedAt && updatedAt.toISOString().split('T')[0] === dateStr;
      }).length;

      const created = allTasks.filter(t => {
        const createdAt = t.createdAt ? new Date(t.createdAt) : null;
        return createdAt && createdAt.toISOString().split('T')[0] === dateStr;
      }).length;

      const overdue = allTasks.filter(t => {
        const dueDate = t.dueDate ? new Date(t.dueDate) : null;
        return dueDate && dueDate.toISOString().split('T')[0] === dateStr && t.status !== 'done';
      }).length;

      data.push({ date: dateStr, completed, created, overdue });
    }

    return { data };
  }

  async getTaskMetrics(userId: string, startDate: Date, endDate: Date, projectId?: string) {
    const userProjects = await this.getProjectsByUser(userId);
    const projectIds = projectId ? [projectId] : userProjects.map(p => p.id);

    const allTasks = projectIds.length > 0 
      ? await db.select().from(tasks).where(inArray(tasks.projectId, projectIds))
      : [];

    const statusCounts: Record<string, number> = { todo: 0, in_progress: 0, review: 0, done: 0 };
    const priorityCounts: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    const priorityTimes: Record<string, number[]> = { urgent: [], high: [], medium: [], low: [] };

    let overdueCount = 0;
    let totalEstimated = 0;
    let totalActual = 0;
    const now = new Date();

    allTasks.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      
      if (t.estimatedTime) {
        priorityTimes[t.priority]?.push(t.estimatedTime);
        totalEstimated += t.estimatedTime;
      }

      if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'done') {
        overdueCount++;
      }
    });

    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
    const priorityDistribution = Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count }));
    const avgTimeByPriority = Object.entries(priorityTimes).map(([priority, times]) => ({
      priority,
      avgTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
    }));

    const overdueRate = allTasks.length > 0 ? Math.round((overdueCount / allTasks.length) * 100) : 0;
    const estimationAccuracy = totalEstimated > 0 && totalActual > 0 
      ? Math.round((1 - Math.abs(totalActual - totalEstimated) / totalEstimated) * 100)
      : 75;

    return {
      statusDistribution,
      priorityDistribution,
      avgTimeByPriority,
      overdueRate,
      estimationAccuracy,
    };
  }

  async getTimeAllocation(userId: string, startDate: Date, endDate: Date, groupBy: string) {
    const userProjects = await this.getProjectsByUser(userId);
    const projectMap = new Map(userProjects.map(p => [p.id, p]));

    const userTimeLogs = await db.select().from(timeLogs)
      .where(and(eq(timeLogs.userId, userId), gte(timeLogs.startTime, startDate), lte(timeLogs.startTime, endDate)));

    const allocationMap: Record<string, { time: number; color?: string }> = {};

    for (const log of userTimeLogs) {
      const task = await this.getTask(log.taskId);
      let key = 'Other';
      let color: string | undefined;

      if (groupBy === 'project' && task && task.projectId) {
        const project = projectMap.get(task.projectId);
        key = project?.name || 'Unknown Project';
        color = project?.color || undefined;
      } else if (groupBy === 'priority' && task) {
        key = task.priority || 'medium';
      }

      if (!allocationMap[key]) {
        allocationMap[key] = { time: 0, color };
      }
      allocationMap[key].time += log.duration || 0;
    }

    const totalTime = Object.values(allocationMap).reduce((sum, a) => sum + a.time, 0);
    const allocation = Object.entries(allocationMap).map(([name, data]) => ({
      name,
      time: data.time,
      percentage: totalTime > 0 ? Math.round((data.time / totalTime) * 100) : 0,
      color: data.color,
    }));

    return { allocation, totalTime };
  }

  async getProductivityScores(userId: string, startDate: Date, endDate: Date) {
    const scores: { date: string; overall: number; completion: number; focus: number; timeManagement: number; consistency: number }[] = [];
    
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const completion = Math.floor(Math.random() * 30) + 50;
      const focus = Math.floor(Math.random() * 30) + 50;
      const timeManagement = Math.floor(Math.random() * 30) + 50;
      const consistency = Math.floor(Math.random() * 30) + 50;
      const overall = Math.round((completion * 0.3 + focus * 0.25 + timeManagement * 0.25 + consistency * 0.2));

      scores.push({ date: dateStr, overall, completion, focus, timeManagement, consistency });
    }

    const recentScores = scores.slice(-7);
    const currentScore = recentScores.length > 0 
      ? Math.round(recentScores.reduce((sum, s) => sum + s.overall, 0) / recentScores.length)
      : 70;

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    const firstAvg = firstHalf.reduce((sum, s) => sum + s.overall, 0) / Math.max(firstHalf.length, 1);
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.overall, 0) / Math.max(secondHalf.length, 1);
    const trend: 'up' | 'down' | 'stable' = secondAvg > firstAvg + 5 ? 'up' : secondAvg < firstAvg - 5 ? 'down' : 'stable';

    return { scores, currentScore, trend };
  }

  async getHabitsPerformance(userId: string, startDate: Date, endDate: Date) {
    const userHabits = await this.getHabitsByUser(userId);
    const occurrences = await this.getHabitOccurrencesByDateRange(userId, startDate, endDate);
    
    const completedCount = occurrences.filter(o => o.status === 'completed').length;
    const overallRate = occurrences.length > 0 ? Math.round((completedCount / occurrences.length) * 100) : 0;

    const habitStats: Record<string, { completed: number; total: number; streak: number; name: string }> = {};
    
    for (const habit of userHabits.filter(h => !h.parentHabitId)) {
      habitStats[habit.id] = { 
        completed: 0, 
        total: 0, 
        streak: habit.streakCount || 0, 
        name: habit.name 
      };
    }

    for (const occ of occurrences) {
      if (habitStats[occ.habitId]) {
        habitStats[occ.habitId].total++;
        if (occ.status === 'completed') {
          habitStats[occ.habitId].completed++;
        }
      }
    }

    const habitPerformance = Object.values(habitStats)
      .map(h => ({ 
        name: h.name, 
        rate: h.total > 0 ? Math.round((h.completed / h.total) * 100) : 0, 
        streak: h.streak 
      }))
      .sort((a, b) => b.rate - a.rate);

    const bestHabits = habitPerformance.slice(0, 5);
    const worstHabits = habitPerformance.slice(-5).reverse();

    const weekdayOcc = occurrences.filter(o => {
      const day = new Date(o.scheduledDate).getDay();
      return day !== 0 && day !== 6;
    });
    const weekendOcc = occurrences.filter(o => {
      const day = new Date(o.scheduledDate).getDay();
      return day === 0 || day === 6;
    });

    const weekdayCompleted = weekdayOcc.filter(o => o.status === 'completed').length;
    const weekendCompleted = weekendOcc.filter(o => o.status === 'completed').length;

    const weekdayVsWeekend = {
      weekday: weekdayOcc.length > 0 ? Math.round((weekdayCompleted / weekdayOcc.length) * 100) : 0,
      weekend: weekendOcc.length > 0 ? Math.round((weekendCompleted / weekendOcc.length) * 100) : 0,
    };

    const onTimeCount = occurrences.filter(o => o.completionStatus === 'on_time').length;
    const lateCount = occurrences.filter(o => o.completionStatus === 'late').length;

    return {
      overallRate,
      bestHabits,
      worstHabits,
      weekdayVsWeekend,
      timeWindowCompliance: { onTime: onTimeCount, late: lateCount },
    };
  }

  async createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate> {
    const [newTemplate] = await db.insert(taskTemplates).values(template as any).returning();
    return newTemplate;
  }

  async getTaskTemplate(id: string): Promise<TaskTemplate | undefined> {
    const [template] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id));
    return template;
  }

  async getTaskTemplatesByUser(userId: string): Promise<TaskTemplate[]> {
    return db.select().from(taskTemplates)
      .where(eq(taskTemplates.ownerId, userId))
      .orderBy(desc(taskTemplates.updatedAt));
  }

  async getPublicTaskTemplates(): Promise<TaskTemplate[]> {
    return db.select().from(taskTemplates)
      .where(eq(taskTemplates.isPublic, true))
      .orderBy(desc(taskTemplates.usageCount));
  }

  async getTaskTemplatesByCategory(category: string): Promise<TaskTemplate[]> {
    return db.select().from(taskTemplates)
      .where(eq(taskTemplates.category, category))
      .orderBy(desc(taskTemplates.updatedAt));
  }

  async updateTaskTemplate(id: string, template: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined> {
    const updateData = { ...template, updatedAt: new Date() };
    const [updated] = await db.update(taskTemplates)
      .set(updateData as any)
      .where(eq(taskTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteTaskTemplate(id: string): Promise<void> {
    await db.delete(taskTemplates).where(eq(taskTemplates.id, id));
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    const template = await this.getTaskTemplate(id);
    if (template) {
      await db.update(taskTemplates)
        .set({ usageCount: (template.usageCount || 0) + 1 })
        .where(eq(taskTemplates.id, id));
    }
  }

  async createTaskFromTemplate(templateId: string, projectId: string, creatorId: string): Promise<Task> {
    const template = await this.getTaskTemplate(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const taskData: InsertTask = {
      title: template.taskTitle,
      description: template.taskDescription || undefined,
      priority: template.priority || "medium",
      estimatedTime: template.estimatedTime || undefined,
      projectId,
      creatorId,
      status: "todo",
    };

    const newTask = await this.createTask(taskData);

    if (template.subtasks && Array.isArray(template.subtasks)) {
      for (const subtask of template.subtasks) {
        await this.createSubtask(newTask.id, {
          title: subtask.title,
          description: subtask.description,
          priority: "medium",
          creatorId,
          status: "todo",
        });
      }
    }

    await this.incrementTemplateUsage(templateId);

    return newTask;
  }

  // Lists methods
  async getLists(userId: string): Promise<List[]> {
    return db.select().from(lists)
      .where(eq(lists.userId, userId))
      .orderBy(lists.sortOrder);
  }

  async getList(id: string): Promise<List | undefined> {
    const [list] = await db.select().from(lists).where(eq(lists.id, id));
    return list;
  }

  async createList(list: InsertList & { userId: string }): Promise<List> {
    const [newList] = await db.insert(lists).values(list).returning();
    return newList;
  }

  async updateList(id: string, list: Partial<InsertList>): Promise<List | undefined> {
    const [updated] = await db.update(lists)
      .set(list)
      .where(eq(lists.id, id))
      .returning();
    return updated;
  }

  async deleteList(id: string): Promise<boolean> {
    const result = await db.delete(lists).where(eq(lists.id, id));
    return true;
  }

  // Task Reminders methods
  async getTaskReminder(id: string): Promise<TaskReminder | undefined> {
    const [reminder] = await db.select().from(taskReminders).where(eq(taskReminders.id, id));
    return reminder;
  }

  async getTaskReminders(taskId: string): Promise<TaskReminder[]> {
    return db.select().from(taskReminders)
      .where(eq(taskReminders.taskId, taskId))
      .orderBy(taskReminders.reminderTime);
  }

  async createTaskReminder(reminder: InsertTaskReminder): Promise<TaskReminder> {
    const [newReminder] = await db.insert(taskReminders).values(reminder).returning();
    return newReminder;
  }

  async updateTaskReminder(id: string, data: Partial<InsertTaskReminder>): Promise<TaskReminder | undefined> {
    const [updated] = await db.update(taskReminders)
      .set(data)
      .where(eq(taskReminders.id, id))
      .returning();
    return updated;
  }

  async deleteTaskReminder(id: string): Promise<boolean> {
    await db.delete(taskReminders).where(eq(taskReminders.id, id));
    return true;
  }

  // Task Sections methods
  async getTaskSection(id: string): Promise<TaskSection | undefined> {
    const [section] = await db.select().from(taskSections).where(eq(taskSections.id, id));
    return section;
  }

  async getTaskSections(listId?: string, projectId?: string): Promise<TaskSection[]> {
    if (listId) {
      return db.select().from(taskSections)
        .where(eq(taskSections.listId, listId))
        .orderBy(taskSections.sortOrder);
    }
    if (projectId) {
      return db.select().from(taskSections)
        .where(eq(taskSections.projectId, projectId))
        .orderBy(taskSections.sortOrder);
    }
    return [];
  }

  async getTaskSectionsByProject(projectId: string): Promise<TaskSection[]> {
    return db.select().from(taskSections)
      .where(eq(taskSections.projectId, projectId))
      .orderBy(taskSections.sortOrder);
  }

  async createTaskSection(section: InsertTaskSection): Promise<TaskSection> {
    const [newSection] = await db.insert(taskSections).values(section).returning();
    return newSection;
  }

  async updateTaskSection(id: string, data: Partial<InsertTaskSection>): Promise<TaskSection | undefined> {
    const [updated] = await db.update(taskSections)
      .set(data)
      .where(eq(taskSections.id, id))
      .returning();
    return updated;
  }

  async deleteTaskSection(id: string): Promise<boolean> {
    await db.delete(taskSections).where(eq(taskSections.id, id));
    return true;
  }

  async reorderTaskSections(projectId: string, sectionIds: string[]): Promise<TaskSection[]> {
    const updatedSections: TaskSection[] = [];
    for (let i = 0; i < sectionIds.length; i++) {
      const [updated] = await db.update(taskSections)
        .set({ sortOrder: i })
        .where(and(eq(taskSections.id, sectionIds[i]), eq(taskSections.projectId, projectId)))
        .returning();
      if (updated) {
        updatedSections.push(updated);
      }
    }
    return updatedSections;
  }

  // Recurring Task Instances methods
  async getRecurringTaskInstances(parentTaskId: string): Promise<RecurringTaskInstance[]> {
    return db.select().from(recurringTaskInstances)
      .where(eq(recurringTaskInstances.parentTaskId, parentTaskId))
      .orderBy(recurringTaskInstances.instanceDate);
  }

  async createRecurringTaskInstance(instance: InsertRecurringTaskInstance): Promise<RecurringTaskInstance> {
    const [newInstance] = await db.insert(recurringTaskInstances).values(instance).returning();
    return newInstance;
  }

  async updateRecurringTaskInstance(id: string, data: Partial<InsertRecurringTaskInstance>): Promise<RecurringTaskInstance | undefined> {
    const [updated] = await db.update(recurringTaskInstances)
      .set(data)
      .where(eq(recurringTaskInstances.id, id))
      .returning();
    return updated;
  }

  // Activity tracking methods
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async getActivitiesByTask(taskId: string): Promise<ActivityWithUser[]> {
    const taskActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.taskId, taskId))
      .orderBy(desc(activities.createdAt));

    return Promise.all(
      taskActivities.map(async (activity) => {
        const [user] = await db.select().from(users).where(eq(users.id, activity.userId));
        return { ...activity, user };
      })
    );
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs || null;
  }

  async upsertUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const [result] = await db
      .insert(userPreferences)
      .values({ userId, ...prefs })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          ...prefs,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Activity Feed methods
  async getActivityFeed(userId: string, limit = 20, offset = 0): Promise<(ActivityFeedItem & { actor?: User })[]> {
    const feedItems = await db
      .select()
      .from(activityFeed)
      .where(eq(activityFeed.userId, userId))
      .orderBy(desc(activityFeed.createdAt))
      .limit(limit)
      .offset(offset);

    return Promise.all(
      feedItems.map(async (item) => {
        let actor: User | undefined;
        if (item.actorId) {
          const [actorUser] = await db.select().from(users).where(eq(users.id, item.actorId));
          actor = actorUser;
        }
        return { ...item, actor };
      })
    );
  }

  async createActivityFeed(data: InsertActivityFeed): Promise<ActivityFeedItem> {
    const [newItem] = await db.insert(activityFeed).values(data).returning();
    return newItem;
  }

  // Productivity Insights methods
  async getInsights(userId: string): Promise<ProductivityInsight[]> {
    const now = new Date();
    return db
      .select()
      .from(productivityInsights)
      .where(
        and(
          eq(productivityInsights.userId, userId),
          or(
            isNull(productivityInsights.expiresAt),
            gte(productivityInsights.expiresAt, now)
          )
        )
      )
      .orderBy(desc(productivityInsights.priority), desc(productivityInsights.createdAt));
  }

  async createInsight(data: InsertProductivityInsight): Promise<ProductivityInsight> {
    const [newInsight] = await db.insert(productivityInsights).values(data).returning();
    return newInsight;
  }

  async markInsightRead(id: string): Promise<void> {
    await db
      .update(productivityInsights)
      .set({ isRead: true })
      .where(eq(productivityInsights.id, id));
  }

  async deleteExpiredInsights(): Promise<void> {
    const now = new Date();
    await db
      .delete(productivityInsights)
      .where(lt(productivityInsights.expiresAt, now));
  }

  // User Goals methods
  async getUserGoals(userId: string): Promise<UserGoal[]> {
    return db
      .select()
      .from(userGoals)
      .where(and(eq(userGoals.userId, userId), eq(userGoals.isActive, true)))
      .orderBy(userGoals.type);
  }

  async upsertUserGoal(data: InsertUserGoal): Promise<UserGoal> {
    const [result] = await db
      .insert(userGoals)
      .values(data)
      .onConflictDoUpdate({
        target: [userGoals.userId, userGoals.type, userGoals.period],
        set: {
          targetValue: data.targetValue,
          startDate: data.startDate,
          endDate: data.endDate,
          isActive: data.isActive ?? true,
        },
      })
      .returning();
    return result;
  }

  async updateGoalProgress(goalId: string, value: number): Promise<void> {
    await db
      .update(userGoals)
      .set({ currentValue: value })
      .where(eq(userGoals.id, goalId));
  }

  // Focus Sessions methods
  async getActiveFocusSession(userId: string): Promise<TaskFocusSession | null> {
    const [session] = await db
      .select()
      .from(taskFocusSessions)
      .where(and(
        eq(taskFocusSessions.userId, userId),
        eq(taskFocusSessions.status, 'active')
      ))
      .orderBy(desc(taskFocusSessions.startedAt))
      .limit(1);
    return session || null;
  }

  async getFocusSessionsByTask(taskId: string): Promise<TaskFocusSession[]> {
    return db
      .select()
      .from(taskFocusSessions)
      .where(eq(taskFocusSessions.taskId, taskId))
      .orderBy(desc(taskFocusSessions.startedAt));
  }

  async createFocusSession(data: InsertTaskFocusSession): Promise<TaskFocusSession> {
    const [session] = await db
      .insert(taskFocusSessions)
      .values(data)
      .returning();
    return session;
  }

  async updateFocusSession(id: string, data: Partial<TaskFocusSession>): Promise<TaskFocusSession> {
    const [session] = await db
      .update(taskFocusSessions)
      .set(data)
      .where(eq(taskFocusSessions.id, id))
      .returning();
    return session;
  }

  async endFocusSession(id: string): Promise<TaskFocusSession> {
    const now = new Date();
    const [existing] = await db
      .select()
      .from(taskFocusSessions)
      .where(eq(taskFocusSessions.id, id));
    
    if (!existing) {
      throw new Error('Focus session not found');
    }

    const startedAt = new Date(existing.startedAt);
    const totalDuration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    const [session] = await db
      .update(taskFocusSessions)
      .set({
        status: 'completed',
        endedAt: now,
        totalDuration,
      })
      .where(eq(taskFocusSessions.id, id))
      .returning();
    return session;
  }

  // Subtask Segments methods
  async getSegmentsBySession(sessionId: string): Promise<SubtaskFocusSegment[]> {
    return db
      .select()
      .from(subtaskFocusSegments)
      .where(eq(subtaskFocusSegments.sessionId, sessionId))
      .orderBy(subtaskFocusSegments.startedAt);
  }

  async createSubtaskSegment(data: InsertSubtaskFocusSegment): Promise<SubtaskFocusSegment> {
    const [segment] = await db
      .insert(subtaskFocusSegments)
      .values(data)
      .returning();
    return segment;
  }

  async endSubtaskSegment(id: string, completed: boolean = false): Promise<SubtaskFocusSegment> {
    const now = new Date();
    const [existing] = await db
      .select()
      .from(subtaskFocusSegments)
      .where(eq(subtaskFocusSegments.id, id));
    
    if (!existing) {
      throw new Error('Subtask segment not found');
    }

    const startedAt = new Date(existing.startedAt);
    const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    const [segment] = await db
      .update(subtaskFocusSegments)
      .set({
        endedAt: now,
        duration,
        completedDuringSegment: completed,
      })
      .where(eq(subtaskFocusSegments.id, id))
      .returning();
    return segment;
  }

  async getSubtaskTimeStats(taskId: string): Promise<{ subtaskIndex: number; totalDuration: number }[]> {
    const sessions = await db
      .select()
      .from(taskFocusSessions)
      .where(eq(taskFocusSessions.taskId, taskId));
    
    if (sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map(s => s.id);
    const segments = await db
      .select()
      .from(subtaskFocusSegments)
      .where(inArray(subtaskFocusSegments.sessionId, sessionIds));

    const statsMap = new Map<number, number>();
    for (const segment of segments) {
      const currentTotal = statsMap.get(segment.subtaskIndex) || 0;
      statsMap.set(segment.subtaskIndex, currentTotal + (segment.duration || 0));
    }

    return Array.from(statsMap.entries())
      .map(([subtaskIndex, totalDuration]) => ({ subtaskIndex, totalDuration }))
      .sort((a, b) => a.subtaskIndex - b.subtaskIndex);
  }

  // Dashboard data methods
  async getDashboardData(userId: string): Promise<{
    user: { firstName: string | null; greeting: string };
    kpis: {
      totalTasks: { value: number; trend: { direction: string; percentage: number }; previousValue: number };
      inProgress: { value: number; trend: { direction: string; percentage: number } };
      overdue: { value: number; trend: { direction: string; percentage: number } };
      completedToday: { value: number; goal: number; trend: { direction: string; percentage: number } };
      focusTime: { value: number; goal: number; pomodoroCount: number };
      weekSummary: { due: number; completed: number };
    };
    focusTasks: TaskWithRelations[];
    upcomingTasks: {
      today: TaskWithRelations[];
      tomorrow: TaskWithRelations[];
      thisWeek: TaskWithRelations[];
      later: TaskWithRelations[];
      noDate: TaskWithRelations[];
    };
    capacity: {
      totalHours: number;
      scheduledHours: number;
      availableHours: number;
      status: 'available' | 'at_capacity' | 'overbooked';
      breakdown: { meetings: number; focusTime: number; tasks: number };
    };
    projects: { id: string; name: string; color: string | null; completed: number; total: number; percentage: number }[];
    habits: { id: string; name: string; completed: boolean; streak: number }[];
    insights: ProductivityInsight[];
    recentActivity: (ActivityFeedItem & { actor?: User })[];
    chartData: {
      completionRate: { date: string; completed: number; created: number; overdue: number }[];
      weeklyActivity: { day: string; count: number }[];
    };
  }> {
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return { direction: 'neutral', percentage: 0 };
      const change = ((current - previous) / previous) * 100;
      return {
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
        percentage: Math.abs(Math.round(change)),
      };
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - today.getDay());
    const lastWeekStart = new Date(startOfWeek);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Get user info
    const user = await this.getUser(userId);
    const firstName = user?.firstName || null;
    const hour = now.getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    // Get all tasks for user
    const allTasks = await this.getTasksByUser(userId);
    const activeTasks = allTasks.filter(t => !t.isArchived);
    const completedTasks = activeTasks.filter(t => t.status === 'done');
    const inProgressTasks = activeTasks.filter(t => t.status === 'in_progress');
    const overdueTasks = activeTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < today && t.status !== 'done'
    );
    const completedToday = completedTasks.filter(t => 
      t.completedAt && new Date(t.completedAt) >= today
    );

    // Get last week's data for trends
    const tasksCompletedLastWeek = completedTasks.filter(t =>
      t.completedAt && new Date(t.completedAt) >= lastWeekStart && new Date(t.completedAt) < startOfWeek
    );

    // KPIs with trends
    const kpis = {
      totalTasks: {
        value: activeTasks.filter(t => t.status !== 'done').length,
        trend: calculateTrend(activeTasks.length, allTasks.length),
        previousValue: allTasks.length,
      },
      inProgress: {
        value: inProgressTasks.length,
        trend: calculateTrend(inProgressTasks.length, Math.max(1, inProgressTasks.length - 1)),
      },
      overdue: {
        value: overdueTasks.length,
        trend: calculateTrend(overdueTasks.length, Math.max(1, overdueTasks.length)),
      },
      completedToday: {
        value: completedToday.length,
        goal: 5,
        trend: calculateTrend(completedToday.length, tasksCompletedLastWeek.length / 7),
      },
      focusTime: {
        value: 0,
        goal: 4 * 60,
        pomodoroCount: 0,
      },
      weekSummary: {
        due: activeTasks.filter(t => 
          t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) < endOfWeek
        ).length,
        completed: completedTasks.filter(t =>
          t.completedAt && new Date(t.completedAt) >= startOfWeek
        ).length,
      },
    };

    // Get pomodoro sessions for focus time
    const todaySessions = await this.getPomodoroSessionsByDateRange(userId, today, now);
    const completedSessions = todaySessions.filter(s => s.status === 'completed');
    kpis.focusTime.pomodoroCount = completedSessions.length;
    kpis.focusTime.value = completedSessions.reduce((acc, s) => acc + (s.duration || 0), 0);

    // Focus tasks (starred, high priority, or due today)
    const focusTasks = activeTasks
      .filter(t => t.status !== 'done' && (t.isStarred || t.priority === 'urgent' || t.priority === 'high' || (t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString())))
      .slice(0, 5);

    // Upcoming tasks categorized
    const pendingTasks = activeTasks.filter(t => t.status !== 'done');
    const upcomingTasks = {
      today: pendingTasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString()),
      tomorrow: pendingTasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === tomorrow.toDateString()),
      thisWeek: pendingTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due > tomorrow && due < endOfWeek;
      }),
      later: pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) >= endOfWeek),
      noDate: pendingTasks.filter(t => !t.dueDate),
    };

    // Capacity planning
    const scheduleAnalysis = await this.analyzeSchedule(userId, today, today);
    const totalWorkHours = 8;
    const scheduledHours = scheduleAnalysis.totalScheduledHours || 0;
    const availableHours = Math.max(0, totalWorkHours - scheduledHours);
    const status: 'available' | 'at_capacity' | 'overbooked' = 
      availableHours > 2 ? 'available' : availableHours > 0 ? 'at_capacity' : 'overbooked';

    const capacity = {
      totalHours: totalWorkHours,
      scheduledHours,
      availableHours,
      status,
      breakdown: {
        meetings: 0,
        focusTime: kpis.focusTime.value / 60,
        tasks: scheduledHours,
      },
    };

    // Project progress
    const userProjects = await this.getProjectsByUser(userId);
    const projectsProgress = await Promise.all(
      userProjects.slice(0, 6).map(async (project) => {
        const projectTasks = await this.getTasksByProject(project.id);
        const total = projectTasks.length;
        const completed = projectTasks.filter(t => t.status === 'done').length;
        return {
          id: project.id,
          name: project.name,
          color: project.color,
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      })
    );

    // Habits progress
    const userHabits = await this.getHabitsByUser(userId);
    const todayOccurrences = await this.getHabitOccurrencesByDate(userId, today);
    const habitsProgress = userHabits.slice(0, 5).map(habit => {
      const todayOccurrence = todayOccurrences.find(o => o.habitId === habit.id);
      return {
        id: habit.id,
        name: habit.name,
        completed: todayOccurrence?.status === 'completed',
        streak: habit.streakCount || 0,
      };
    });

    // Get insights
    const insights = await this.getInsights(userId);

    // Get recent activity
    const recentActivity = await this.getActivityFeed(userId, 10);

    // Chart data - last 7 days
    const chartData = {
      completionRate: [] as { date: string; completed: number; created: number; overdue: number }[],
      weeklyActivity: [] as { day: string; count: number }[],
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const completed = completedTasks.filter(t =>
        t.completedAt && new Date(t.completedAt).toDateString() === date.toDateString()
      ).length;
      
      const created = allTasks.filter(t =>
        t.createdAt && new Date(t.createdAt).toDateString() === date.toDateString()
      ).length;
      
      const overdue = allTasks.filter(t =>
        t.dueDate && new Date(t.dueDate).toDateString() === date.toDateString() && t.status !== 'done'
      ).length;

      chartData.completionRate.push({ date: dateStr, completed, created, overdue });
      chartData.weeklyActivity.push({ day: dayNames[date.getDay()], count: completed });
    }

    return {
      user: { firstName, greeting },
      kpis,
      focusTasks,
      upcomingTasks,
      capacity,
      projects: projectsProgress,
      habits: habitsProgress,
      insights,
      recentActivity,
      chartData,
    };
  }

  // Habit Categories CRUD
  async getHabitCategories(userId: string): Promise<HabitCategory[]> {
    return db.select().from(habitCategories).where(eq(habitCategories.userId, userId)).orderBy(habitCategories.sortOrder);
  }

  async getHabitCategory(id: string): Promise<HabitCategory | undefined> {
    const [category] = await db.select().from(habitCategories).where(eq(habitCategories.id, id));
    return category;
  }

  async createHabitCategory(data: InsertHabitCategory): Promise<HabitCategory> {
    const [category] = await db.insert(habitCategories).values(data).returning();
    return category;
  }

  async updateHabitCategory(id: string, data: Partial<InsertHabitCategory>): Promise<HabitCategory> {
    const [category] = await db.update(habitCategories).set({ ...data, updatedAt: new Date() }).where(eq(habitCategories.id, id)).returning();
    return category;
  }

  async deleteHabitCategory(id: string): Promise<void> {
    await db.delete(habitCategories).where(eq(habitCategories.id, id));
  }

  // Habit Insights
  async getHabitInsights(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<HabitInsight[]> {
    let query = db.select().from(habitInsights).where(eq(habitInsights.userId, userId));
    
    if (options?.unreadOnly) {
      query = db.select().from(habitInsights).where(and(eq(habitInsights.userId, userId), eq(habitInsights.isRead, false)));
    }
    
    const results = await query.orderBy(desc(habitInsights.generatedAt));
    
    if (options?.limit) {
      return results.slice(0, options.limit);
    }
    return results;
  }

  async createHabitInsight(data: InsertHabitInsight): Promise<HabitInsight> {
    const [insight] = await db.insert(habitInsights).values(data).returning();
    return insight;
  }

  async markHabitInsightAsRead(id: string): Promise<void> {
    await db.update(habitInsights).set({ isRead: true, readAt: new Date() }).where(eq(habitInsights.id, id));
  }

  async deleteExpiredHabitInsights(): Promise<void> {
    const now = new Date();
    await db.delete(habitInsights).where(and(lte(habitInsights.expiresAt, now)));
  }

  // Habit Journal
  async getHabitJournalEntries(userId: string, options?: { habitId?: string; limit?: number }): Promise<HabitJournalEntry[]> {
    let conditions = [eq(habitJournal.userId, userId)];
    
    if (options?.habitId) {
      conditions.push(eq(habitJournal.habitId, options.habitId));
    }
    
    const results = await db.select().from(habitJournal).where(and(...conditions)).orderBy(desc(habitJournal.createdAt));
    
    if (options?.limit) {
      return results.slice(0, options.limit);
    }
    return results;
  }

  async createHabitJournalEntry(data: InsertHabitJournal): Promise<HabitJournalEntry> {
    const [entry] = await db.insert(habitJournal).values(data).returning();
    return entry;
  }

  async getJournalEntriesForOccurrence(occurrenceId: string): Promise<HabitJournalEntry[]> {
    return db.select().from(habitJournal).where(eq(habitJournal.occurrenceId, occurrenceId)).orderBy(desc(habitJournal.createdAt));
  }

  // Habit Achievements
  async getHabitAchievements(userId: string): Promise<HabitAchievement[]> {
    return db.select().from(habitAchievements).where(eq(habitAchievements.userId, userId)).orderBy(desc(habitAchievements.unlockedAt));
  }

  async createHabitAchievement(data: InsertHabitAchievement): Promise<HabitAchievement> {
    const [achievement] = await db.insert(habitAchievements).values(data).returning();
    return achievement;
  }

  async hasAchievement(userId: string, achievementType: string, habitId?: string): Promise<boolean> {
    let conditions = [eq(habitAchievements.userId, userId), eq(habitAchievements.achievementType, achievementType)];
    
    if (habitId) {
      conditions.push(eq(habitAchievements.habitId, habitId));
    }
    
    const [result] = await db.select().from(habitAchievements).where(and(...conditions)).limit(1);
    return !!result;
  }

  // Habit Templates
  async getHabitTemplates(options?: { publicOnly?: boolean; categoryName?: string }): Promise<HabitTemplate[]> {
    let conditions: any[] = [];
    
    if (options?.publicOnly) {
      conditions.push(eq(habitTemplates.isPublic, true));
    }
    
    if (options?.categoryName) {
      conditions.push(eq(habitTemplates.category, options.categoryName));
    }
    
    if (conditions.length > 0) {
      return db.select().from(habitTemplates).where(and(...conditions)).orderBy(desc(habitTemplates.usageCount));
    }
    
    return db.select().from(habitTemplates).orderBy(desc(habitTemplates.usageCount));
  }

  async getHabitTemplate(id: string): Promise<HabitTemplate | undefined> {
    const [template] = await db.select().from(habitTemplates).where(eq(habitTemplates.id, id));
    return template;
  }

  async createHabitTemplate(data: InsertHabitTemplate): Promise<HabitTemplate> {
    const [template] = await db.insert(habitTemplates).values(data).returning();
    return template;
  }

  async incrementHabitTemplateUsage(id: string): Promise<void> {
    const [template] = await db.select().from(habitTemplates).where(eq(habitTemplates.id, id));
    if (template) {
      await db.update(habitTemplates).set({ usageCount: (template.usageCount || 0) + 1 }).where(eq(habitTemplates.id, id));
    }
  }

  // Habit Analytics
  async getHabitAnalytics(userId: string, options: { startDate: Date; endDate: Date; periodType: string }): Promise<HabitAnalytics[]> {
    return db.select().from(habitAnalytics)
      .where(and(
        eq(habitAnalytics.userId, userId),
        eq(habitAnalytics.periodType, options.periodType),
        gte(habitAnalytics.periodStart, options.startDate),
        lte(habitAnalytics.periodEnd, options.endDate)
      ))
      .orderBy(desc(habitAnalytics.periodStart));
  }

  async upsertHabitAnalytics(data: InsertHabitAnalytics): Promise<HabitAnalytics> {
    const [analytics] = await db.insert(habitAnalytics)
      .values(data)
      .onConflictDoUpdate({
        target: [habitAnalytics.userId, habitAnalytics.habitId, habitAnalytics.periodType, habitAnalytics.periodStart],
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();
    return analytics;
  }

  // Enhanced Analytics Queries
  async getHabitHeatmapData(userId: string, days: number): Promise<Array<{ date: string; completionRate: number; totalHabits: number; completedHabits: number }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // First get user's habits, then their occurrences
    const userHabits = await db.select().from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)));
    const habitIds = userHabits.map(h => h.id);
    
    if (habitIds.length === 0) {
      const result: Array<{ date: string; completionRate: number; totalHabits: number; completedHabits: number }> = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        result.push({ date: date.toISOString().split('T')[0], completionRate: 0, totalHabits: 0, completedHabits: 0 });
      }
      return result;
    }
    
    const occurrences = await db.select().from(habitOccurrences)
      .where(and(
        inArray(habitOccurrences.habitId, habitIds),
        gte(habitOccurrences.scheduledDate, startDate),
        lte(habitOccurrences.scheduledDate, endDate)
      ));
    
    const dateMap = new Map<string, { total: number; completed: number }>();
    
    for (const occ of occurrences) {
      const dateStr = new Date(occ.scheduledDate).toISOString().split('T')[0];
      const existing = dateMap.get(dateStr) || { total: 0, completed: 0 };
      existing.total++;
      if (occ.status === 'completed') {
        existing.completed++;
      }
      dateMap.set(dateStr, existing);
    }
    
    const result: Array<{ date: string; completionRate: number; totalHabits: number; completedHabits: number }> = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const stats = dateMap.get(dateStr) || { total: 0, completed: 0 };
      result.push({
        date: dateStr,
        completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
        totalHabits: stats.total,
        completedHabits: stats.completed,
      });
    }
    
    return result;
  }

  async getHabitTimePatterns(userId: string): Promise<Array<{ hour: number; completionRate: number; count: number }>> {
    // First get user's habits, then their completed occurrences
    const userHabits = await db.select().from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)));
    const habitIds = userHabits.map(h => h.id);
    
    if (habitIds.length === 0) {
      const result: Array<{ hour: number; completionRate: number; count: number }> = [];
      for (let i = 0; i < 24; i++) {
        result.push({ hour: i, completionRate: 0, count: 0 });
      }
      return result;
    }
    
    const occurrences = await db.select().from(habitOccurrences)
      .where(and(
        inArray(habitOccurrences.habitId, habitIds),
        eq(habitOccurrences.status, 'completed')
      ));
    
    const hourMap = new Map<number, { completed: number; total: number }>();
    
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { completed: 0, total: 0 });
    }
    
    for (const occ of occurrences) {
      if (occ.completedAt) {
        const hour = new Date(occ.completedAt).getHours();
        const existing = hourMap.get(hour)!;
        existing.completed++;
        existing.total++;
        hourMap.set(hour, existing);
      }
    }
    
    return Array.from(hourMap.entries()).map(([hour, stats]) => ({
      hour,
      completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
      count: stats.completed,
    }));
  }

  async getHabitDayPatterns(userId: string): Promise<Array<{ dayOfWeek: number; completionRate: number; count: number }>> {
    const occurrences = await db.select().from(habitOccurrences)
      .where(eq(habitOccurrences.userId, userId));
    
    const dayMap = new Map<number, { completed: number; total: number }>();
    
    for (let i = 0; i < 7; i++) {
      dayMap.set(i, { completed: 0, total: 0 });
    }
    
    for (const occ of occurrences) {
      const day = new Date(occ.scheduledDate).getDay();
      const existing = dayMap.get(day)!;
      existing.total++;
      if (occ.status === 'completed') {
        existing.completed++;
      }
      dayMap.set(day, existing);
    }
    
    return Array.from(dayMap.entries()).map(([dayOfWeek, stats]) => ({
      dayOfWeek,
      completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
      count: stats.completed,
    }));
  }

  async getHabitPerformanceBreakdown(userId: string): Promise<Array<{ habitId: string; habitName: string; completionRate: number; streak: number; totalCompletions: number }>> {
    const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
    
    const result = await Promise.all(userHabits.map(async (habit) => {
      const occurrences = await db.select().from(habitOccurrences).where(eq(habitOccurrences.habitId, habit.id));
      const completed = occurrences.filter(o => o.status === 'completed').length;
      const total = occurrences.length;
      
      return {
        habitId: habit.id,
        habitName: habit.name,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        streak: habit.streakCount || 0,
        totalCompletions: completed,
      };
    }));
    
    return result.sort((a, b) => b.completionRate - a.completionRate);
  }

  async getSubHabitStats(parentHabitId: string): Promise<Array<{ id: string; name: string; streak: number; completionRate: number; bestTime: string | null }>> {
    const subHabits = await db.select().from(habits).where(eq(habits.parentHabitId, parentHabitId));
    
    const result = await Promise.all(subHabits.map(async (habit) => {
      const occurrences = await db.select().from(habitOccurrences).where(eq(habitOccurrences.habitId, habit.id));
      const completed = occurrences.filter(o => o.status === 'completed').length;
      const total = occurrences.length;
      
      let bestTime: string | null = null;
      const completedOccs = occurrences.filter(o => o.status === 'completed' && o.completedAt);
      if (completedOccs.length > 0) {
        const hourCounts = new Map<number, number>();
        for (const occ of completedOccs) {
          const hour = new Date(occ.completedAt!).getHours();
          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        }
        const maxHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];
        if (maxHour) {
          bestTime = `${maxHour[0].toString().padStart(2, '0')}:00`;
        }
      }
      
      return {
        id: habit.id,
        name: habit.name,
        streak: habit.streakCount || 0,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        bestTime,
      };
    }));
    
    return result;
  }

  // ===============================
  // AUTO-SCHEDULING METHODS
  // ===============================

  // Flexible Tasks
  async createFlexibleTask(userId: string, task: InsertFlexibleTask): Promise<FlexibleTask> {
    const [newTask] = await db.insert(flexibleTasks).values({ ...task, userId }).returning();
    return newTask;
  }

  async getFlexibleTask(id: string): Promise<FlexibleTask | undefined> {
    const [task] = await db.select().from(flexibleTasks).where(eq(flexibleTasks.id, id));
    return task;
  }

  async getFlexibleTasksByUser(userId: string, activeOnly: boolean = false): Promise<FlexibleTaskWithRelations[]> {
    const conditions = [eq(flexibleTasks.userId, userId)];
    if (activeOnly) {
      conditions.push(eq(flexibleTasks.isActive, true));
    }
    
    const userFlexibleTasks = await db.select().from(flexibleTasks).where(and(...conditions));
    
    const tasksWithRelations = await Promise.all(
      userFlexibleTasks.map(async (task) => {
        const [user] = await db.select().from(users).where(eq(users.id, task.userId));
        const linkedTask = task.linkedTaskId 
          ? (await db.select().from(tasks).where(eq(tasks.id, task.linkedTaskId)))[0] || null 
          : null;
        const linkedHabit = task.linkedHabitId 
          ? (await db.select().from(habits).where(eq(habits.id, task.linkedHabitId)))[0] || null 
          : null;
        const suggestions = await db.select().from(scheduleSuggestions).where(eq(scheduleSuggestions.flexibleTaskId, task.id));
        
        return {
          ...task,
          user,
          linkedTask,
          linkedHabit,
          suggestions,
        };
      })
    );
    
    return tasksWithRelations;
  }

  async updateFlexibleTask(id: string, data: Partial<InsertFlexibleTask>): Promise<FlexibleTask | undefined> {
    const [updated] = await db
      .update(flexibleTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(flexibleTasks.id, id))
      .returning();
    return updated;
  }

  async deleteFlexibleTask(id: string): Promise<void> {
    await db.delete(flexibleTasks).where(eq(flexibleTasks.id, id));
  }

  // Schedule Suggestions
  async createScheduleSuggestion(userId: string, suggestion: InsertScheduleSuggestion): Promise<ScheduleSuggestion> {
    const [newSuggestion] = await db.insert(scheduleSuggestions).values({ ...suggestion, userId }).returning();
    return newSuggestion;
  }

  async getScheduleSuggestion(id: string): Promise<ScheduleSuggestion | undefined> {
    const [suggestion] = await db.select().from(scheduleSuggestions).where(eq(scheduleSuggestions.id, id));
    return suggestion;
  }

  async getScheduleSuggestionsByUser(userId: string, status?: string): Promise<ScheduleSuggestionWithRelations[]> {
    const conditions = [eq(scheduleSuggestions.userId, userId)];
    if (status) {
      conditions.push(eq(scheduleSuggestions.status, status));
    }
    
    const userSuggestions = await db.select().from(scheduleSuggestions).where(and(...conditions));
    
    const suggestionsWithRelations = await Promise.all(
      userSuggestions.map(async (suggestion) => {
        const [flexibleTask] = await db.select().from(flexibleTasks).where(eq(flexibleTasks.id, suggestion.flexibleTaskId));
        const [user] = await db.select().from(users).where(eq(users.id, suggestion.userId));
        const createdTimeBlock = suggestion.createdTimeBlockId 
          ? (await db.select().from(timeBlocks).where(eq(timeBlocks.id, suggestion.createdTimeBlockId)))[0] || null 
          : null;
        
        return {
          ...suggestion,
          flexibleTask,
          user,
          createdTimeBlock,
        };
      })
    );
    
    return suggestionsWithRelations;
  }

  async getScheduleSuggestionsByTask(flexibleTaskId: string): Promise<ScheduleSuggestion[]> {
    return db.select().from(scheduleSuggestions).where(eq(scheduleSuggestions.flexibleTaskId, flexibleTaskId));
  }

  async getScheduleSuggestionsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<ScheduleSuggestionWithRelations[]> {
    const suggestions = await db
      .select()
      .from(scheduleSuggestions)
      .where(
        and(
          eq(scheduleSuggestions.userId, userId),
          gte(scheduleSuggestions.suggestedDate, startDate),
          lte(scheduleSuggestions.suggestedDate, endDate)
        )
      );
    
    const suggestionsWithRelations = await Promise.all(
      suggestions.map(async (suggestion) => {
        const [flexibleTask] = await db.select().from(flexibleTasks).where(eq(flexibleTasks.id, suggestion.flexibleTaskId));
        const [user] = await db.select().from(users).where(eq(users.id, suggestion.userId));
        const createdTimeBlock = suggestion.createdTimeBlockId 
          ? (await db.select().from(timeBlocks).where(eq(timeBlocks.id, suggestion.createdTimeBlockId)))[0] || null 
          : null;
        
        return {
          ...suggestion,
          flexibleTask,
          user,
          createdTimeBlock,
        };
      })
    );
    
    return suggestionsWithRelations;
  }

  async updateScheduleSuggestion(id: string, data: Partial<InsertScheduleSuggestion>): Promise<ScheduleSuggestion | undefined> {
    const [updated] = await db
      .update(scheduleSuggestions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scheduleSuggestions.id, id))
      .returning();
    return updated;
  }

  async deleteScheduleSuggestion(id: string): Promise<void> {
    await db.delete(scheduleSuggestions).where(eq(scheduleSuggestions.id, id));
  }

  async deleteScheduleSuggestionsByTask(flexibleTaskId: string): Promise<void> {
    await db.delete(scheduleSuggestions).where(eq(scheduleSuggestions.flexibleTaskId, flexibleTaskId));
  }

  // User Availability
  async createUserAvailability(userId: string, availability: InsertUserAvailability): Promise<UserAvailability> {
    const [newAvailability] = await db.insert(userAvailability).values({ ...availability, userId }).returning();
    return newAvailability;
  }

  async getUserAvailability(userId: string): Promise<UserAvailability[]> {
    return db.select().from(userAvailability).where(eq(userAvailability.userId, userId));
  }

  async getUserAvailabilityByDay(userId: string, dayOfWeek: number): Promise<UserAvailability[]> {
    return db
      .select()
      .from(userAvailability)
      .where(and(eq(userAvailability.userId, userId), eq(userAvailability.dayOfWeek, dayOfWeek)));
  }

  async updateUserAvailability(id: string, data: Partial<InsertUserAvailability>): Promise<UserAvailability | undefined> {
    const [updated] = await db
      .update(userAvailability)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userAvailability.id, id))
      .returning();
    return updated;
  }

  async deleteUserAvailability(id: string): Promise<void> {
    await db.delete(userAvailability).where(eq(userAvailability.id, id));
  }

  // Scheduling Preferences
  async getSchedulingPreferences(userId: string): Promise<SchedulingPreferences | undefined> {
    const [prefs] = await db.select().from(schedulingPreferences).where(eq(schedulingPreferences.userId, userId));
    return prefs;
  }

  async upsertSchedulingPreferences(userId: string, prefs: InsertSchedulingPreferences): Promise<SchedulingPreferences> {
    const [result] = await db
      .insert(schedulingPreferences)
      .values({ ...prefs, userId })
      .onConflictDoUpdate({
        target: schedulingPreferences.userId,
        set: { ...prefs, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  // Time Blocks methods (for Auto-Scheduling)
  async getTimeBlocksByDate(userId: string, date: Date): Promise<TimeBlock[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const blocks = await db
      .select()
      .from(timeBlocks)
      .where(
        and(
          eq(timeBlocks.userId, userId),
          or(
            and(
              gte(timeBlocks.date, startOfDay),
              lte(timeBlocks.date, endOfDay)
            ),
            eq(timeBlocks.isRecurring, true)
          )
        )
      );

    return blocks.filter((block) => {
      if (block.date && block.date >= startOfDay && block.date <= endOfDay) {
        return true;
      }
      if (block.isRecurring && block.recurrenceDays) {
        return block.recurrenceDays.includes(dayName);
      }
      return false;
    });
  }

  async getTimeBlocksByDateRange(userId: string, startDate: Date, endDate: Date): Promise<TimeBlock[]> {
    return db
      .select()
      .from(timeBlocks)
      .where(
        and(
          eq(timeBlocks.userId, userId),
          or(
            and(
              gte(timeBlocks.date, startDate),
              lte(timeBlocks.date, endDate)
            ),
            eq(timeBlocks.isRecurring, true)
          )
        )
      );
  }

  // ===============================================
  // INSPIRATION HUB METHODS
  // ===============================================

  // Quotes
  async getInspirationQuotes(userId: string, options?: { category?: string; favoritesOnly?: boolean; activeOnly?: boolean }): Promise<InspirationQuote[]> {
    const conditions = [eq(inspirationQuotes.userId, userId)];
    if (options?.category) conditions.push(eq(inspirationQuotes.category, options.category));
    if (options?.favoritesOnly) conditions.push(eq(inspirationQuotes.isFavorite, true));
    if (options?.activeOnly) conditions.push(eq(inspirationQuotes.isActive, true));
    return db.select().from(inspirationQuotes).where(and(...conditions)).orderBy(desc(inspirationQuotes.createdAt));
  }

  async getInspirationQuote(id: string): Promise<InspirationQuote | undefined> {
    const [quote] = await db.select().from(inspirationQuotes).where(eq(inspirationQuotes.id, id));
    return quote;
  }

  async createInspirationQuote(userId: string, quote: InsertInspirationQuote): Promise<InspirationQuote> {
    const [newQuote] = await db.insert(inspirationQuotes).values({ ...quote, userId }).returning();
    return newQuote;
  }

  async updateInspirationQuote(id: string, data: Partial<InsertInspirationQuote>): Promise<InspirationQuote | undefined> {
    const [updated] = await db.update(inspirationQuotes).set({ ...data, updatedAt: new Date() }).where(eq(inspirationQuotes.id, id)).returning();
    return updated;
  }

  async deleteInspirationQuote(id: string): Promise<void> {
    await db.delete(inspirationQuotes).where(eq(inspirationQuotes.id, id));
  }

  async getRandomQuote(userId: string): Promise<InspirationQuote | undefined> {
    const activeQuotes = await db.select().from(inspirationQuotes).where(and(eq(inspirationQuotes.userId, userId), eq(inspirationQuotes.isActive, true)));
    if (activeQuotes.length === 0) return undefined;
    return activeQuotes[Math.floor(Math.random() * activeQuotes.length)];
  }

  async toggleQuoteFavorite(id: string): Promise<InspirationQuote | undefined> {
    const [quote] = await db.select().from(inspirationQuotes).where(eq(inspirationQuotes.id, id));
    if (!quote) return undefined;
    const [updated] = await db.update(inspirationQuotes).set({ isFavorite: !quote.isFavorite, updatedAt: new Date() }).where(eq(inspirationQuotes.id, id)).returning();
    return updated;
  }

  async incrementQuoteViews(id: string): Promise<void> {
    const [quote] = await db.select().from(inspirationQuotes).where(eq(inspirationQuotes.id, id));
    if (quote) {
      await db.update(inspirationQuotes).set({ timesViewed: (quote.timesViewed || 0) + 1 }).where(eq(inspirationQuotes.id, id));
    }
  }

  // Bible Verses
  async getInspirationVerses(userId: string, options?: { category?: string; book?: string; favoritesOnly?: boolean }): Promise<InspirationVerse[]> {
    const conditions = [eq(inspirationVerses.userId, userId)];
    if (options?.category) conditions.push(eq(inspirationVerses.category, options.category));
    if (options?.book) conditions.push(eq(inspirationVerses.book, options.book));
    if (options?.favoritesOnly) conditions.push(eq(inspirationVerses.isFavorite, true));
    return db.select().from(inspirationVerses).where(and(...conditions)).orderBy(desc(inspirationVerses.createdAt));
  }

  async getInspirationVerse(id: string): Promise<InspirationVerse | undefined> {
    const [verse] = await db.select().from(inspirationVerses).where(eq(inspirationVerses.id, id));
    return verse;
  }

  async createInspirationVerse(userId: string, verse: InsertInspirationVerse): Promise<InspirationVerse> {
    const [newVerse] = await db.insert(inspirationVerses).values({ ...verse, userId }).returning();
    return newVerse;
  }

  async updateInspirationVerse(id: string, data: Partial<InsertInspirationVerse>): Promise<InspirationVerse | undefined> {
    const [updated] = await db.update(inspirationVerses).set({ ...data, updatedAt: new Date() }).where(eq(inspirationVerses.id, id)).returning();
    return updated;
  }

  async deleteInspirationVerse(id: string): Promise<void> {
    await db.delete(inspirationVerses).where(eq(inspirationVerses.id, id));
  }

  async toggleVerseFavorite(id: string): Promise<InspirationVerse | undefined> {
    const [verse] = await db.select().from(inspirationVerses).where(eq(inspirationVerses.id, id));
    if (!verse) return undefined;
    const [updated] = await db.update(inspirationVerses).set({ isFavorite: !verse.isFavorite, updatedAt: new Date() }).where(eq(inspirationVerses.id, id)).returning();
    return updated;
  }

  // Videos
  async getInspirationVideos(userId: string, options?: { category?: string; favoritesOnly?: boolean }): Promise<InspirationVideo[]> {
    const conditions = [eq(inspirationVideos.userId, userId)];
    if (options?.category) conditions.push(eq(inspirationVideos.category, options.category));
    if (options?.favoritesOnly) conditions.push(eq(inspirationVideos.isFavorite, true));
    return db.select().from(inspirationVideos).where(and(...conditions)).orderBy(desc(inspirationVideos.createdAt));
  }

  async getInspirationVideo(id: string): Promise<InspirationVideo | undefined> {
    const [video] = await db.select().from(inspirationVideos).where(eq(inspirationVideos.id, id));
    return video;
  }

  async createInspirationVideo(userId: string, video: InsertInspirationVideo): Promise<InspirationVideo> {
    const [newVideo] = await db.insert(inspirationVideos).values({ ...video, userId }).returning();
    return newVideo;
  }

  async updateInspirationVideo(id: string, data: Partial<InsertInspirationVideo>): Promise<InspirationVideo | undefined> {
    const [updated] = await db.update(inspirationVideos).set({ ...data, updatedAt: new Date() }).where(eq(inspirationVideos.id, id)).returning();
    return updated;
  }

  async deleteInspirationVideo(id: string): Promise<void> {
    await db.delete(inspirationVideos).where(eq(inspirationVideos.id, id));
  }

  async toggleVideoFavorite(id: string): Promise<InspirationVideo | undefined> {
    const [video] = await db.select().from(inspirationVideos).where(eq(inspirationVideos.id, id));
    if (!video) return undefined;
    const [updated] = await db.update(inspirationVideos).set({ isFavorite: !video.isFavorite, updatedAt: new Date() }).where(eq(inspirationVideos.id, id)).returning();
    return updated;
  }

  async incrementVideoWatched(id: string): Promise<void> {
    const [video] = await db.select().from(inspirationVideos).where(eq(inspirationVideos.id, id));
    if (video) {
      await db.update(inspirationVideos).set({ timesWatched: (video.timesWatched || 0) + 1 }).where(eq(inspirationVideos.id, id));
    }
  }

  // Music
  async getInspirationMusic(userId: string, options?: { mood?: string; playlistId?: string; favoritesOnly?: boolean }): Promise<InspirationMusic[]> {
    const conditions = [eq(inspirationMusic.userId, userId)];
    if (options?.mood) conditions.push(eq(inspirationMusic.mood, options.mood));
    if (options?.playlistId) conditions.push(eq(inspirationMusic.playlistId, options.playlistId));
    if (options?.favoritesOnly) conditions.push(eq(inspirationMusic.isFavorite, true));
    return db.select().from(inspirationMusic).where(and(...conditions)).orderBy(desc(inspirationMusic.createdAt));
  }

  async getInspirationMusicItem(id: string): Promise<InspirationMusic | undefined> {
    const [music] = await db.select().from(inspirationMusic).where(eq(inspirationMusic.id, id));
    return music;
  }

  async createInspirationMusic(userId: string, music: InsertInspirationMusic): Promise<InspirationMusic> {
    const [newMusic] = await db.insert(inspirationMusic).values({ ...music, userId }).returning();
    return newMusic;
  }

  async updateInspirationMusic(id: string, data: Partial<InsertInspirationMusic>): Promise<InspirationMusic | undefined> {
    const [updated] = await db.update(inspirationMusic).set({ ...data, updatedAt: new Date() }).where(eq(inspirationMusic.id, id)).returning();
    return updated;
  }

  async deleteInspirationMusic(id: string): Promise<void> {
    await db.delete(inspirationMusic).where(eq(inspirationMusic.id, id));
  }

  async toggleMusicFavorite(id: string): Promise<InspirationMusic | undefined> {
    const [music] = await db.select().from(inspirationMusic).where(eq(inspirationMusic.id, id));
    if (!music) return undefined;
    const [updated] = await db.update(inspirationMusic).set({ isFavorite: !music.isFavorite, updatedAt: new Date() }).where(eq(inspirationMusic.id, id)).returning();
    return updated;
  }

  async incrementMusicPlayed(id: string): Promise<void> {
    const [music] = await db.select().from(inspirationMusic).where(eq(inspirationMusic.id, id));
    if (music) {
      await db.update(inspirationMusic).set({ timesPlayed: (music.timesPlayed || 0) + 1 }).where(eq(inspirationMusic.id, id));
    }
  }

  async getFocusMusic(userId: string): Promise<InspirationMusic[]> {
    return db.select().from(inspirationMusic).where(and(eq(inspirationMusic.userId, userId), eq(inspirationMusic.mood, 'focus'))).orderBy(desc(inspirationMusic.createdAt));
  }

  // Images
  async getInspirationImages(userId: string, options?: { category?: string; favoritesOnly?: boolean; usageContext?: string }): Promise<InspirationImage[]> {
    const conditions = [eq(inspirationImages.userId, userId)];
    if (options?.category) conditions.push(eq(inspirationImages.category, options.category));
    if (options?.favoritesOnly) conditions.push(eq(inspirationImages.isFavorite, true));
    if (options?.usageContext) conditions.push(eq(inspirationImages.usageContext, options.usageContext));
    return db.select().from(inspirationImages).where(and(...conditions)).orderBy(desc(inspirationImages.createdAt));
  }

  async getInspirationImage(id: string): Promise<InspirationImage | undefined> {
    const [image] = await db.select().from(inspirationImages).where(eq(inspirationImages.id, id));
    return image;
  }

  async createInspirationImage(userId: string, image: InsertInspirationImage): Promise<InspirationImage> {
    const [newImage] = await db.insert(inspirationImages).values({ ...image, userId }).returning();
    return newImage;
  }

  async updateInspirationImage(id: string, data: Partial<InsertInspirationImage>): Promise<InspirationImage | undefined> {
    const [updated] = await db.update(inspirationImages).set({ ...data, updatedAt: new Date() }).where(eq(inspirationImages.id, id)).returning();
    return updated;
  }

  async deleteInspirationImage(id: string): Promise<void> {
    await db.delete(inspirationImages).where(eq(inspirationImages.id, id));
  }

  async toggleImageFavorite(id: string): Promise<InspirationImage | undefined> {
    const [image] = await db.select().from(inspirationImages).where(eq(inspirationImages.id, id));
    if (!image) return undefined;
    const [updated] = await db.update(inspirationImages).set({ isFavorite: !image.isFavorite, updatedAt: new Date() }).where(eq(inspirationImages.id, id)).returning();
    return updated;
  }

  async getBackgroundImages(userId: string): Promise<InspirationImage[]> {
    return db.select().from(inspirationImages).where(and(eq(inspirationImages.userId, userId), eq(inspirationImages.usageContext, 'background'))).orderBy(desc(inspirationImages.createdAt));
  }

  // Sessions & Analytics
  async logInspirationSession(userId: string, session: InsertInspirationSession): Promise<InspirationSession> {
    const [newSession] = await db.insert(inspirationSessions).values({ ...session, userId }).returning();
    return newSession;
  }

  async getInspirationStats(userId: string): Promise<{ quotesCount: number; videosCount: number; musicCount: number; imagesCount: number; totalViews: number }> {
    const quotes = await db.select().from(inspirationQuotes).where(eq(inspirationQuotes.userId, userId));
    const videos = await db.select().from(inspirationVideos).where(eq(inspirationVideos.userId, userId));
    const music = await db.select().from(inspirationMusic).where(eq(inspirationMusic.userId, userId));
    const images = await db.select().from(inspirationImages).where(eq(inspirationImages.userId, userId));
    const totalViews = quotes.reduce((sum, q) => sum + (q.timesViewed || 0), 0) + videos.reduce((sum, v) => sum + (v.timesWatched || 0), 0) + music.reduce((sum, m) => sum + (m.timesPlayed || 0), 0);
    return { quotesCount: quotes.length, videosCount: videos.length, musicCount: music.length, imagesCount: images.length, totalViews };
  }

  // Daily Inspiration
  async getDailyInspiration(userId: string, date: Date): Promise<DailyInspiration | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const [daily] = await db.select().from(dailyInspiration).where(and(eq(dailyInspiration.userId, userId), gte(dailyInspiration.date, startOfDay), lte(dailyInspiration.date, endOfDay)));
    return daily;
  }

  async createDailyInspiration(data: InsertDailyInspiration): Promise<DailyInspiration> {
    const [daily] = await db.insert(dailyInspiration).values(data).returning();
    return daily;
  }

  async updateDailyInspiration(id: string, data: Partial<InsertDailyInspiration>): Promise<DailyInspiration | undefined> {
    const [updated] = await db.update(dailyInspiration).set(data).where(eq(dailyInspiration.id, id)).returning();
    return updated;
  }

  async markDailyInspirationViewed(id: string): Promise<void> {
    await db.update(dailyInspiration).set({ isViewed: true, viewedAt: new Date() }).where(eq(dailyInspiration.id, id));
  }

  // Playlists
  async getInspirationPlaylists(userId: string): Promise<InspirationPlaylist[]> {
    return db.select().from(inspirationPlaylists).where(eq(inspirationPlaylists.userId, userId)).orderBy(desc(inspirationPlaylists.createdAt));
  }

  async getInspirationPlaylist(id: string): Promise<InspirationPlaylist | undefined> {
    const [playlist] = await db.select().from(inspirationPlaylists).where(eq(inspirationPlaylists.id, id));
    return playlist;
  }

  async createInspirationPlaylist(userId: string, data: InsertInspirationPlaylist): Promise<InspirationPlaylist> {
    if (data.isDefault) {
      await db.update(inspirationPlaylists).set({ isDefault: false, updatedAt: new Date() }).where(eq(inspirationPlaylists.userId, userId));
    }
    const [playlist] = await db.insert(inspirationPlaylists).values({ ...data, userId }).returning();
    return playlist;
  }

  async updateInspirationPlaylist(id: string, data: Partial<InsertInspirationPlaylist>): Promise<InspirationPlaylist | undefined> {
    if (data.isDefault) {
      const [existing] = await db.select().from(inspirationPlaylists).where(eq(inspirationPlaylists.id, id));
      if (existing) {
        await db.update(inspirationPlaylists).set({ isDefault: false, updatedAt: new Date() }).where(eq(inspirationPlaylists.userId, existing.userId));
      }
    }
    const [updated] = await db.update(inspirationPlaylists).set({ ...data, updatedAt: new Date() }).where(eq(inspirationPlaylists.id, id)).returning();
    return updated;
  }

  async deleteInspirationPlaylist(id: string): Promise<void> {
    await db.delete(inspirationPlaylists).where(eq(inspirationPlaylists.id, id));
  }

  async getDefaultPlaylist(userId: string): Promise<InspirationPlaylist | undefined> {
    const [playlist] = await db.select().from(inspirationPlaylists).where(and(eq(inspirationPlaylists.userId, userId), eq(inspirationPlaylists.isDefault, true)));
    return playlist;
  }

  // Links
  async getInspirationLinks(userId: string, options?: { inspirationType?: string; linkedType?: string; linkedId?: string }): Promise<InspirationLink[]> {
    const conditions = [eq(inspirationLinks.userId, userId)];
    if (options?.inspirationType) conditions.push(eq(inspirationLinks.inspirationType, options.inspirationType));
    if (options?.linkedType) conditions.push(eq(inspirationLinks.linkedType, options.linkedType));
    if (options?.linkedId) conditions.push(eq(inspirationLinks.linkedId, options.linkedId));
    return db.select().from(inspirationLinks).where(and(...conditions)).orderBy(desc(inspirationLinks.createdAt));
  }

  async createInspirationLink(userId: string, data: InsertInspirationLink): Promise<InspirationLink> {
    const [link] = await db.insert(inspirationLinks).values({ ...data, userId }).returning();
    return link;
  }

  async deleteInspirationLink(id: string): Promise<void> {
    await db.delete(inspirationLinks).where(eq(inspirationLinks.id, id));
  }

  // Dashboard
  async getInspirationDashboard(userId: string): Promise<{
    featuredQuotes: InspirationQuote[];
    featuredVideos: InspirationVideo[];
    featuredMusic: InspirationMusic[];
    featuredImages: InspirationImage[];
    defaultPlaylist: InspirationPlaylist | null;
    playlistTracks: InspirationMusic[];
  }> {
    const featuredQuotes = await db.select().from(inspirationQuotes).where(and(eq(inspirationQuotes.userId, userId), eq(inspirationQuotes.isFeatured, true))).orderBy(desc(inspirationQuotes.createdAt)).limit(6);
    const featuredVideos = await db.select().from(inspirationVideos).where(and(eq(inspirationVideos.userId, userId), eq(inspirationVideos.isFeatured, true))).orderBy(desc(inspirationVideos.createdAt)).limit(4);
    const featuredMusic = await db.select().from(inspirationMusic).where(and(eq(inspirationMusic.userId, userId), eq(inspirationMusic.isFeatured, true))).orderBy(desc(inspirationMusic.createdAt)).limit(8);
    const featuredImages = await db.select().from(inspirationImages).where(and(eq(inspirationImages.userId, userId), eq(inspirationImages.isFeatured, true))).orderBy(desc(inspirationImages.createdAt)).limit(6);
    
    const defaultPlaylist = await this.getDefaultPlaylist(userId);
    let playlistTracks: InspirationMusic[] = [];
    if (defaultPlaylist) {
      playlistTracks = await db.select().from(inspirationMusic).where(eq(inspirationMusic.playlistId, defaultPlaylist.id)).orderBy(inspirationMusic.createdAt);
    }

    return {
      featuredQuotes,
      featuredVideos,
      featuredMusic,
      featuredImages,
      defaultPlaylist: defaultPlaylist || null,
      playlistTracks,
    };
  }

  // Toggle Featured
  async toggleQuoteFeatured(id: string): Promise<InspirationQuote | undefined> {
    const [quote] = await db.select().from(inspirationQuotes).where(eq(inspirationQuotes.id, id));
    if (!quote) return undefined;
    const [updated] = await db.update(inspirationQuotes).set({ isFeatured: !quote.isFeatured, updatedAt: new Date() }).where(eq(inspirationQuotes.id, id)).returning();
    return updated;
  }

  async toggleVideoFeatured(id: string): Promise<InspirationVideo | undefined> {
    const [video] = await db.select().from(inspirationVideos).where(eq(inspirationVideos.id, id));
    if (!video) return undefined;
    const [updated] = await db.update(inspirationVideos).set({ isFeatured: !video.isFeatured, updatedAt: new Date() }).where(eq(inspirationVideos.id, id)).returning();
    return updated;
  }

  async toggleImageFeatured(id: string): Promise<InspirationImage | undefined> {
    const [image] = await db.select().from(inspirationImages).where(eq(inspirationImages.id, id));
    if (!image) return undefined;
    const [updated] = await db.update(inspirationImages).set({ isFeatured: !image.isFeatured, updatedAt: new Date() }).where(eq(inspirationImages.id, id)).returning();
    return updated;
  }

  async toggleMusicFeatured(id: string): Promise<InspirationMusic | undefined> {
    const [music] = await db.select().from(inspirationMusic).where(eq(inspirationMusic.id, id));
    if (!music) return undefined;
    const [updated] = await db.update(inspirationMusic).set({ isFeatured: !music.isFeatured, updatedAt: new Date() }).where(eq(inspirationMusic.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
