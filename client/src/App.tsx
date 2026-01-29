import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { AppSidebar } from "@/components/AppSidebar";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { QuickAddTask } from "@/components/QuickAddTask";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { PomodoroProvider } from "@/hooks/use-pomodoro";
import { PreferencesProvider } from "@/hooks/use-preferences";
import { useMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

import type { Task } from "@shared/schema";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home";
import ProjectsPage from "@/pages/projects";
import ProjectDetailPage from "@/pages/project-detail";
import InboxPage from "@/pages/inbox";
import SettingsPage from "@/pages/settings";
import GroupsPage from "@/pages/groups";
import GroupDetailPage from "@/pages/group-detail";
import GroupMembersPage from "@/pages/group-members";
import NotificationSettingsPage from "@/pages/notification-settings";
import NotFound from "@/pages/not-found";

const TasksPage = lazy(() => import("@/pages/tasks"));
const TimePage = lazy(() => import("@/pages/time"));
const FocusPage = lazy(() => import("@/pages/focus"));
const HabitsPage = lazy(() => import("@/pages/habits"));
const HabitMetricsPage = lazy(() => import("@/pages/habit-metrics"));
const SchedulePage = lazy(() => import("@/pages/schedule"));
const SmartSchedulePage = lazy(() => import("@/pages/smart-schedule"));
const UnifiedSchedulerPage = lazy(() => import("@/pages/unified-scheduler"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const TemplatesPage = lazy(() => import("@/pages/templates"));
const InspirationHubPage = lazy(() => import("@/pages/inspiration-hub"));

import type { Project } from "@shared/schema";

const SIDEBAR_WIDTH_KEY = "taskflow-sidebar-width";
const MIN_SIDEBAR_WIDTH = 192; // 12rem in pixels
const MAX_SIDEBAR_WIDTH = 384; // 24rem in pixels
const DEFAULT_SIDEBAR_WIDTH = 256; // 16rem in pixels

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function SidebarResizeHandle({ 
  onResize, 
  isResizing, 
  onResizeStart 
}: { 
  onResize: (width: number) => void;
  isResizing: boolean;
  onResizeStart: () => void;
}) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onResizeStart();
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
      onResize(newWidth);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [onResize, onResizeStart]);

  return (
    <div
      className={cn(
        "absolute right-0 top-0 h-full w-1 cursor-col-resize z-20 group",
        "hover:bg-primary/50 transition-colors",
        isResizing && "bg-primary"
      )}
      onMouseDown={handleMouseDown}
      data-testid="sidebar-resize-handle"
    >
      <div 
        className={cn(
          "absolute right-0 top-0 h-full w-4 -translate-x-1/2",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      />
    </div>
  );
}

function AuthenticatedApp() {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const { isMobile } = useMobile();
  
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return stored ? parseInt(stored, 10) : DEFAULT_SIDEBAR_WIDTH;
  });
  
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: inboxTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", "inbox"],
    queryFn: async () => {
      const response = await fetch("/api/tasks?inbox=true");
      if (!response.ok) throw new Error("Failed to fetch inbox tasks");
      return response.json();
    },
  });

  const hasInboxItems = inboxTasks.length > 0;

  const handleAddClick = useCallback(() => {
    setIsQuickAddOpen(true);
  }, []);

  const handleResize = useCallback((width: number) => {
    setSidebarWidth(width);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, width.toString());
  }, []);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [isResizing]);

  const style = {
    "--sidebar-width": `${sidebarWidth}px`,
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        {!isMobile && (
          <div className="relative hidden md:block">
            <AppSidebar 
              projects={projects} 
              onNewProject={() => setIsCreateProjectOpen(true)} 
            />
            <SidebarResizeHandle 
              onResize={handleResize}
              isResizing={isResizing}
              onResizeStart={handleResizeStart}
            />
          </div>
        )}
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 h-16 px-4 border-b bg-background shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="hidden md:flex" />
            <div className="flex-1 md:hidden" />
            <div className="flex items-center gap-1">
              <NotificationCenter />
              <ThemeToggle />
            </div>
          </header>
          <main className={cn(
            "flex-1 overflow-auto",
            isMobile && "pb-20"
          )}>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/inbox" component={InboxPage} />
                <Route path="/projects" component={ProjectsPage} />
                <Route path="/projects/:id" component={ProjectDetailPage} />
                <Route path="/tasks" component={TasksPage} />
                <Route path="/time" component={TimePage} />
                <Route path="/focus" component={FocusPage} />
                <Route path="/habits" component={HabitsPage} />
                <Route path="/habits/metrics" component={HabitMetricsPage} />
                <Route path="/schedule" component={SchedulePage} />
                <Route path="/smart-schedule" component={SmartSchedulePage} />
                <Route path="/unified-scheduler" component={UnifiedSchedulerPage} />
                <Route path="/inspiration" component={InspirationHubPage} />
                <Route path="/analytics" component={AnalyticsPage} />
                <Route path="/templates" component={TemplatesPage} />
                <Route path="/settings" component={SettingsPage} />
                <Route path="/notification-settings" component={NotificationSettingsPage} />
                <Route path="/groups" component={GroupsPage} />
                <Route path="/groups/new" component={GroupsPage} />
                <Route path="/groups/:id" component={GroupDetailPage} />
                <Route path="/groups/:id/members" component={GroupMembersPage} />
                <Route component={NotFound} />
                </Switch>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <CreateProjectModal 
        open={isCreateProjectOpen} 
        onOpenChange={setIsCreateProjectOpen} 
      />
      <QuickAddTask open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen} />
      {isMobile && <MobileBottomNav onAddClick={handleAddClick} />}
      <FloatingActionButton onClick={handleAddClick} hasInboxItems={hasInboxItems} />
    </SidebarProvider>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  return (
    <PreferencesProvider>
      <AuthenticatedApp />
    </PreferencesProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <PomodoroProvider>
            <AppContent />
          </PomodoroProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
