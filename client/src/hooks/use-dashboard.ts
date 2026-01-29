import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task, Project, PomodoroSession } from "@shared/schema";

interface DashboardData {
  tasks: Task[];
  projects: Project[];
  pomodoroSessions: PomodoroSession[];
}

export function useDashboard() {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const projectsQuery = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const pomodoroQuery = useQuery<PomodoroSession[]>({
    queryKey: ["/api/pomodoro/sessions"],
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading;
  const isRefetching = tasksQuery.isRefetching || projectsQuery.isRefetching;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/pomodoro/sessions"] }),
    ]);
  };

  return {
    tasks: tasksQuery.data ?? [],
    projects: projectsQuery.data ?? [],
    pomodoroSessions: pomodoroQuery.data ?? [],
    isLoading,
    isRefetching,
    refresh,
  };
}
