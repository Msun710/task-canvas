import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay } from "date-fns";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  Timer,
  Flame,
  FolderKanban,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import type { Project } from "@shared/schema";

interface OverviewData {
  tasksCompleted: number;
  tasksCreated: number;
  tasksInProgress: number;
  tasksOverdue: number;
  totalTimeTracked: number;
  pomodoroSessions: number;
  habitsCompletionRate: number;
  activeProjects: number;
  avgCompletionTime: number;
}

interface TrendsData {
  data: { date: string; completed: number; created: number; overdue: number }[];
}

interface TaskMetrics {
  statusDistribution: { status: string; count: number }[];
  priorityDistribution: { priority: string; count: number }[];
  avgTimeByPriority: { priority: string; avgTime: number }[];
  overdueRate: number;
  estimationAccuracy: number;
}

interface TimeAllocation {
  allocation: { name: string; time: number; percentage: number; color?: string }[];
  totalTime: number;
}

interface ProductivityScores {
  scores: { date: string; overall: number; completion: number; focus: number; timeManagement: number; consistency: number }[];
  currentScore: number;
  trend: 'up' | 'down' | 'stable';
}

interface HabitsPerformance {
  overallRate: number;
  bestHabits: { name: string; rate: number; streak: number }[];
  worstHabits: { name: string; rate: number; streak: number }[];
  weekdayVsWeekend: { weekday: number; weekend: number };
  timeWindowCompliance: { onTime: number; late: number };
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];
const STATUS_COLORS: Record<string, string> = {
  todo: '#6b7280',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  done: '#10b981',
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30days");
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const { startDate, endDate, startDateStr, endDateStr } = useMemo(() => {
    const days = period === "7days" ? 7 : period === "30days" ? 30 : period === "90days" ? 90 : 365;
    const end = startOfDay(new Date());
    const start = subDays(end, days);
    return {
      startDate: start,
      endDate: end,
      startDateStr: start.toISOString(),
      endDateStr: end.toISOString(),
    };
  }, [period]);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const projectId = selectedProject === "all" ? undefined : selectedProject;

  const { data: overview, isLoading: overviewLoading, isError: overviewError, refetch: refetchOverview } = useQuery<OverviewData>({
    queryKey: ["/api/analytics/overview", period, projectId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
      });
      if (projectId) params.append("projectId", projectId);
      const res = await fetch(`/api/analytics/overview?${params}`);
      return res.json();
    },
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<TrendsData>({
    queryKey: ["/api/analytics/trends", period, projectId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (projectId) params.append("projectId", projectId);
      const res = await fetch(`/api/analytics/trends?${params}`);
      return res.json();
    },
  });

  const { data: taskMetrics, isLoading: metricsLoading } = useQuery<TaskMetrics>({
    queryKey: ["/api/analytics/task-metrics", period, projectId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
      });
      if (projectId) params.append("projectId", projectId);
      const res = await fetch(`/api/analytics/task-metrics?${params}`);
      return res.json();
    },
  });

  const { data: timeAllocation, isLoading: allocationLoading } = useQuery<TimeAllocation>({
    queryKey: ["/api/analytics/time-allocation", period],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
        groupBy: "project",
      });
      const res = await fetch(`/api/analytics/time-allocation?${params}`);
      return res.json();
    },
  });

  const { data: productivityScores, isLoading: scoresLoading } = useQuery<ProductivityScores>({
    queryKey: ["/api/analytics/productivity-scores", period],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
      });
      const res = await fetch(`/api/analytics/productivity-scores?${params}`);
      return res.json();
    },
  });

  const { data: habitsPerformance, isLoading: habitsLoading } = useQuery<HabitsPerformance>({
    queryKey: ["/api/analytics/habits-performance", period],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
      });
      const res = await fetch(`/api/analytics/habits-performance?${params}`);
      return res.json();
    },
  });

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  if (overviewError) {
    return (
      <div className="container mx-auto py-6 px-4">
        <ErrorState 
          title="Failed to load analytics"
          message="An error occurred while loading analytics data."
          onRetry={() => refetchOverview()}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
            <BarChart3 className="w-6 h-6" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Track your productivity and performance insights</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]" data-testid="select-period">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px]" data-testid="select-project">
              <FolderKanban className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-kpi-tasks-completed">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-tasks-completed">
                  {overview?.tasksCompleted || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview?.tasksCreated || 0} created in period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-in-progress">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-in-progress">
                  {overview?.tasksInProgress || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active tasks
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-overdue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-500" data-testid="text-overdue">
                  {overview?.tasksOverdue || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Past due date
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-habits">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Habits Rate</CardTitle>
            <Target className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-habits-rate">
                  {overview?.habitsCompletionRate || 0}%
                </div>
                <Progress value={overview?.habitsCompletionRate || 0} className="h-1 mt-2" />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-kpi-time-tracked">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Time Tracked</CardTitle>
            <Timer className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-time-tracked">
                  {formatMinutes(overview?.totalTimeTracked || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total time logged
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-pomodoro">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Pomodoro Sessions</CardTitle>
            <Flame className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-pomodoro-sessions">
                  {overview?.pomodoroSessions || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Focus sessions completed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-projects">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="w-4 h-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-active-projects">
                  {overview?.activeProjects || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently active
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-avg-time">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            <Clock className="w-4 h-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-avg-completion">
                  {formatMinutes(overview?.avgCompletionTime || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per task average
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
          <TabsTrigger value="time" data-testid="tab-time">Time</TabsTrigger>
          <TabsTrigger value="productivity" data-testid="tab-productivity">Productivity</TabsTrigger>
          <TabsTrigger value="habits" data-testid="tab-habits">Habits</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card data-testid="card-chart-trends">
            <CardHeader>
              <CardTitle>Task Activity Trends</CardTitle>
              <CardDescription>Tasks completed, created, and overdue over time</CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trends?.data || []}>
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#10b981" 
                      fill="url(#colorCompleted)"
                      name="Completed"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="created" 
                      stroke="#6366f1" 
                      fill="url(#colorCreated)"
                      name="Created"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="overdue" 
                      stroke="#ef4444" 
                      strokeDasharray="5 5"
                      name="Overdue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-chart-status">
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Tasks by current status</CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={taskMetrics?.statusDistribution || []}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(taskMetrics?.statusDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-chart-priority">
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
                <CardDescription>Tasks by priority level</CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={taskMetrics?.priorityDistribution || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis dataKey="priority" type="category" width={60} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {(taskMetrics?.priorityDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card data-testid="card-overdue-rate">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overdue Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{taskMetrics?.overdueRate || 0}%</div>
                    <Progress value={100 - (taskMetrics?.overdueRate || 0)} className="h-2 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">Lower is better</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-estimation-accuracy">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Estimation Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{taskMetrics?.estimationAccuracy || 0}%</div>
                    <Progress value={taskMetrics?.estimationAccuracy || 0} className="h-2 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">How accurate your time estimates are</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <Card data-testid="card-chart-time-allocation">
            <CardHeader>
              <CardTitle>Time Allocation by Project</CardTitle>
              <CardDescription>How your time is distributed across projects</CardDescription>
            </CardHeader>
            <CardContent>
              {allocationLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={timeAllocation?.allocation || []}
                        dataKey="time"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={60}
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                      >
                        {(timeAllocation?.allocation || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatMinutes(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Total Time: {formatMinutes(timeAllocation?.totalTime || 0)}</div>
                    {(timeAllocation?.allocation || []).map((item, index) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{formatMinutes(item.time)}</div>
                        </div>
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </div>
                    ))}
                    {(timeAllocation?.allocation || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">No time tracked in this period</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2" data-testid="card-chart-productivity">
              <CardHeader>
                <CardTitle>Productivity Score Over Time</CardTitle>
                <CardDescription>Track your daily productivity metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {scoresLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={productivityScores?.scores || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                        className="text-xs"
                      />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="overall" stroke="#6366f1" strokeWidth={2} name="Overall" />
                      <Line type="monotone" dataKey="completion" stroke="#10b981" strokeDasharray="5 5" name="Completion" />
                      <Line type="monotone" dataKey="focus" stroke="#f59e0b" strokeDasharray="5 5" name="Focus" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-current-score">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Current Score
                  {productivityScores && <TrendIcon trend={productivityScores.trend} />}
                </CardTitle>
                <CardDescription>Your 7-day average</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {scoresLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <>
                    <div className="text-5xl font-bold text-center" data-testid="text-productivity-score">
                      {productivityScores?.currentScore || 0}
                    </div>
                    <Progress value={productivityScores?.currentScore || 0} className="h-3" />
                    <div className="text-sm text-center text-muted-foreground">
                      {productivityScores?.trend === 'up' && 'Improving'}
                      {productivityScores?.trend === 'down' && 'Declining'}
                      {productivityScores?.trend === 'stable' && 'Stable'}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="habits" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-overall-habit-rate">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {habitsLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{habitsPerformance?.overallRate || 0}%</div>
                    <Progress value={habitsPerformance?.overallRate || 0} className="h-2 mt-2" />
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-weekday-rate">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Weekday Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {habitsLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{habitsPerformance?.weekdayVsWeekend.weekday || 0}%</div>
                    <Progress value={habitsPerformance?.weekdayVsWeekend.weekday || 0} className="h-2 mt-2" />
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-weekend-rate">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Weekend Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {habitsLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{habitsPerformance?.weekdayVsWeekend.weekend || 0}%</div>
                    <Progress value={habitsPerformance?.weekdayVsWeekend.weekend || 0} className="h-2 mt-2" />
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-time-compliance">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Time Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                {habitsLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-lg font-bold text-green-500">{habitsPerformance?.timeWindowCompliance.onTime || 0}</div>
                      <div className="text-xs text-muted-foreground">On Time</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-amber-500">{habitsPerformance?.timeWindowCompliance.late || 0}</div>
                      <div className="text-xs text-muted-foreground">Late</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-best-habits">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Best Performing Habits
                </CardTitle>
              </CardHeader>
              <CardContent>
                {habitsLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <div className="space-y-3">
                    {(habitsPerformance?.bestHabits || []).map((habit, index) => (
                      <div key={habit.name} className="flex items-center gap-3">
                        <div className="w-6 text-center text-sm font-medium text-muted-foreground">{index + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{habit.name}</div>
                          <div className="text-xs text-muted-foreground">{habit.streak} day streak</div>
                        </div>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">{habit.rate}%</Badge>
                      </div>
                    ))}
                    {(habitsPerformance?.bestHabits || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">No habits tracked yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-worst-habits">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  Needs Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {habitsLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <div className="space-y-3">
                    {(habitsPerformance?.worstHabits || []).map((habit, index) => (
                      <div key={habit.name} className="flex items-center gap-3">
                        <div className="w-6 text-center text-sm font-medium text-muted-foreground">{index + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{habit.name}</div>
                          <div className="text-xs text-muted-foreground">{habit.streak} day streak</div>
                        </div>
                        <Badge variant="secondary" className="bg-red-500/10 text-red-600">{habit.rate}%</Badge>
                      </div>
                    ))}
                    {(habitsPerformance?.worstHabits || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">No habits tracked yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
