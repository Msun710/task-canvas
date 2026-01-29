import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  FolderKanban,
  ListTodo,
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiCardsRow } from "@/components/dashboard/KpiCardsRow";
import { TodaysFocus } from "@/components/dashboard/TodaysFocus";
import { CapacityPlanner } from "@/components/CapacityPlanner";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { DashboardActivityFeed } from "@/components/dashboard/DashboardActivityFeed";
import { CompletionChart } from "@/components/dashboard/CompletionChart";
import { WeeklyActivityChart } from "@/components/dashboard/WeeklyActivityChart";
import { InspirationWidget } from "@/components/dashboard/InspirationWidget";
import type { Task, Project, User, PomodoroSession } from "@shared/schema";

interface DashboardProps {
  tasks: Task[];
  projects: Project[];
  user?: User | null;
  totalTimeToday?: number;
  pomodoroSessions?: PomodoroSession[];
  onRefresh?: () => void;
  isRefetching?: boolean;
}

export function Dashboard({ 
  tasks, 
  projects, 
  user, 
  totalTimeToday = 0,
  pomodoroSessions = [],
  onRefresh,
  isRefetching = false
}: DashboardProps) {
  const { isMobile } = useMobile();
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const upcomingTasks = tasks
    .filter((t) => t.status !== "done" && t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const activeProjects = projects.filter((p) => p.status === "active" && !p.isArchived);

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, { 
        status: "done",
        completedAt: new Date().toISOString()
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    }
  });

  const handleTaskComplete = (taskId: string) => {
    completeMutation.mutate(taskId);
  };

  const handleAddToFocus = () => {
    // Navigate to tasks page where user can add tasks and mark them as important (star)
    setLocation("/tasks");
  };

  const handleKpiCardClick = (cardType: string) => {
    // Navigate or filter based on card type
    console.log('KPI card clicked:', cardType);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo": return "secondary";
      case "in_progress": return "default";
      case "review": return "outline";
      case "done": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <div className={`space-y-4 ${isMobile ? 'space-y-3' : 'space-y-6'}`}>
      <DashboardHeader
        user={user}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={onRefresh}
        isRefreshing={isRefetching}
      />

      <KpiCardsRow
        tasks={tasks}
        pomodoroSessions={pomodoroSessions}
        onCardClick={handleKpiCardClick}
      />

      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'gap-6 lg:grid-cols-3'}`}>
        <TodaysFocus
          tasks={tasks}
          projects={projects}
          onComplete={handleTaskComplete}
          onAddToFocus={handleAddToFocus}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No upcoming tasks</p>
                <p className="text-xs mt-1">Create a task to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover-elevate"
                    data-testid={`task-item-${task.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {new Date(task.dueDate!).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={getPriorityColor(task.priority)} size="sm">
                      {task.priority}
                    </Badge>
                    <Badge variant={getStatusColor(task.status)} size="sm">
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <FolderKanban className="h-4 w-4" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeProjects.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No active projects</p>
                <p className="text-xs mt-1">Create a project to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeProjects.slice(0, 4).map((project) => {
                  const projectTasks = tasks.filter((t) => t.projectId === project.id);
                  const projectCompleted = projectTasks.filter((t) => t.status === "done").length;
                  const progress = projectTasks.length > 0 
                    ? Math.round((projectCompleted / projectTasks.length) * 100) 
                    : 0;

                  return (
                    <div key={project.id} className="space-y-1.5" data-testid={`project-item-${project.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: project.color || "#3B82F6" }}
                          />
                          <span className="font-medium text-sm truncate">{project.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {projectCompleted}/{projectTasks.length}
                        </span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!isMobile && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <CompletionChart />
            <WeeklyActivityChart />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CapacityPlanner tasks={tasks} defaultCapacity={480} />
            </div>
            <InsightsPanel />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <DashboardActivityFeed maxHeight={320} />
            <InspirationWidget />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Progress value={completionRate} className="flex-1 h-2" />
                  <span className="text-xl font-bold">{completionRate}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {completedTasks} of {totalTasks} tasks completed
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {isMobile && (
        <>
          <WeeklyActivityChart />
          <InspirationWidget />
          <InsightsPanel />
          <DashboardActivityFeed maxHeight={280} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Progress value={completionRate} className="flex-1 h-2" />
                <span className="text-lg font-bold">{completionRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedTasks} of {totalTasks} tasks completed
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
