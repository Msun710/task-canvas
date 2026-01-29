import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ProjectContextMenu } from "@/components/ProjectContextMenu";
import { useConfirm } from "@/hooks/use-confirm";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Flame,
  CalendarClock,
  Sparkles,
  Inbox,
  Calendar,
  CalendarDays,
  Star,
  List,
  CheckCircle,
  Tag,
  Search,
} from "lucide-react";
import { startOfDay, endOfDay, addDays, isWithinInterval, parseISO } from "date-fns";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import type { Project, Group, Task, Tag as TagType } from "@shared/schema";

interface TagWithCount extends TagType {
  taskCount: number;
}

interface AppSidebarProps {
  projects?: Project[];
  onNewProject?: () => void;
  onQuickAdd?: () => void;
  onEditProject?: (project: Project) => void;
  onAddTaskToProject?: (projectId: string) => void;
}

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Habits", url: "/habits", icon: Flame },
  { title: "Scheduler", url: "/unified-scheduler", icon: CalendarClock },
  { title: "Time Tracking", url: "/time", icon: Clock },
  { title: "Inspiration", url: "/inspiration", icon: Star },
];

interface GroupTreeNode extends Group {
  children: GroupTreeNode[];
  projects: Project[];
}

function buildGroupTree(groups: Group[], projects: Project[]): { tree: GroupTreeNode[]; ungroupedProjects: Project[] } {
  const groupMap = new Map<string, GroupTreeNode>();
  
  groups.forEach(group => {
    groupMap.set(group.id, { ...group, children: [], projects: [] });
  });

  projects.forEach(project => {
    if (project.groupId && groupMap.has(project.groupId)) {
      groupMap.get(project.groupId)!.projects.push(project);
    }
  });

  const ungroupedProjects = projects.filter(p => !p.groupId);
  const rootGroups: GroupTreeNode[] = [];

  groupMap.forEach(node => {
    if (node.parentId && groupMap.has(node.parentId)) {
      groupMap.get(node.parentId)!.children.push(node);
    } else {
      rootGroups.push(node);
    }
  });

  return { tree: rootGroups, ungroupedProjects };
}

interface ProjectHandlers {
  onAddTask: (projectId: string) => void;
  onAddSection: (projectId: string) => void;
  onRename: (project: Project) => void;
  onColorChange: (projectId: string, color: string) => void;
  onSort: (projectId: string, sortBy: string) => void;
  onClearCompleted: (projectId: string) => void;
  onArchive: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

interface GroupItemProps {
  group: GroupTreeNode;
  location: string;
  depth?: number;
  projectHandlers: ProjectHandlers;
}

function GroupItem({ group, location, depth = 0, projectHandlers }: GroupItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = group.children.length > 0 || group.projects.length > 0;

  return (
    <SidebarMenuItem>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center">
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                data-testid={`button-toggle-group-${group.id}`}
              >
                {isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="h-6 w-6 shrink-0" />
          )}
          <SidebarMenuButton
            asChild
            isActive={location === `/groups/${group.id}`}
            className="flex-1"
            data-testid={`nav-group-${group.id}`}
          >
            <Link href={`/groups/${group.id}`}>
              {isOpen ? (
                <FolderOpen className="h-4 w-4" style={{ color: group.color || "#6B7280" }} />
              ) : (
                <Folder className="h-4 w-4" style={{ color: group.color || "#6B7280" }} />
              )}
              <span className="truncate">{group.name}</span>
            </Link>
          </SidebarMenuButton>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {group.children.map(child => (
                <GroupItem key={child.id} group={child} location={location} depth={depth + 1} projectHandlers={projectHandlers} />
              ))}
              {group.projects.map(project => (
                <SidebarMenuSubItem key={project.id}>
                  <ProjectContextMenu
                    project={project}
                    onAddTask={() => projectHandlers.onAddTask(project.id)}
                    onAddSection={() => projectHandlers.onAddSection(project.id)}
                    onRename={() => projectHandlers.onRename(project)}
                    onColorChange={(color) => projectHandlers.onColorChange(project.id, color)}
                    onSort={(sortBy) => projectHandlers.onSort(project.id, sortBy)}
                    onClearCompleted={() => projectHandlers.onClearCompleted(project.id)}
                    onArchive={() => projectHandlers.onArchive(project.id)}
                    onDelete={() => projectHandlers.onDelete(project.id)}
                  >
                    <SidebarMenuSubButton
                      asChild
                      isActive={location === `/projects/${project.id}`}
                      data-testid={`nav-project-${project.id}`}
                    >
                      <Link href={`/projects/${project.id}`}>
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color || "#3B82F6" }}
                        />
                        <span className="truncate">{project.name}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </ProjectContextMenu>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ projects = [], onNewProject, onQuickAdd, onEditProject, onAddTaskToProject }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const { data: searchResults = [], isLoading: isSearching } = useQuery<Task[]>({
    queryKey: ["/api/tasks/search", debouncedSearchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/search?q=${encodeURIComponent(debouncedSearchQuery)}`);
      if (!response.ok) throw new Error("Failed to search tasks");
      return response.json();
    },
    enabled: debouncedSearchQuery.length > 0,
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, updates }: { projectId: string; updates: Partial<Project> }) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const clearCompletedMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/completed-tasks`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const projectHandlers: ProjectHandlers = {
    onAddTask: (projectId: string) => {
      if (onAddTaskToProject) {
        onAddTaskToProject(projectId);
      } else {
        setLocation(`/projects/${projectId}?addTask=true`);
      }
    },
    onAddSection: (projectId: string) => {
      setLocation(`/projects/${projectId}?addSection=true`);
    },
    onRename: (project: Project) => {
      if (onEditProject) {
        onEditProject(project);
      } else {
        setLocation(`/projects/${project.id}/edit`);
      }
    },
    onColorChange: (projectId: string, color: string) => {
      updateProjectMutation.mutate({ projectId, updates: { color } });
    },
    onSort: (projectId: string, sortBy: string) => {
      localStorage.setItem(`project-${projectId}-sort`, sortBy);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
    onClearCompleted: async (projectId: string) => {
      const confirmed = await confirm({
        title: "Clear Completed Tasks",
        description: "Are you sure you want to remove all completed tasks from this project? This action cannot be undone.",
        confirmLabel: "Clear",
        variant: "destructive",
      });
      if (confirmed) {
        clearCompletedMutation.mutate(projectId);
      }
    },
    onArchive: async (projectId: string) => {
      const confirmed = await confirm({
        title: "Archive Project",
        description: "Are you sure you want to archive this project? You can restore it later from the archived projects.",
        confirmLabel: "Archive",
        variant: "default",
      });
      if (confirmed) {
        updateProjectMutation.mutate({ projectId, updates: { isArchived: true } });
      }
    },
    onDelete: async (projectId: string) => {
      const confirmed = await confirm({
        title: "Delete Project",
        description: "Are you sure you want to delete this project? This action cannot be undone and all tasks in this project will be permanently deleted.",
        confirmLabel: "Delete",
        variant: "destructive",
      });
      if (confirmed) {
        deleteProjectMutation.mutate(projectId);
      }
    },
  };

  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      setLocation(`/tasks?q=${encodeURIComponent(query.trim())}`);
    }
  }, [setLocation]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const { data: inboxTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", "inbox"],
    queryFn: async () => {
      const response = await fetch("/api/tasks?inbox=true");
      if (!response.ok) throw new Error("Failed to fetch inbox tasks");
      return response.json();
    },
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: tagsWithCounts = [] } = useQuery<TagWithCount[]>({
    queryKey: ["/api/tags"],
  });

  const inboxCount = inboxTasks.length;

  const importantCount = allTasks.filter(
    (task) => task.isImportant && task.status !== "completed"
  ).length;

  const allIncompleteCount = allTasks.filter(
    (task) => task.status !== "completed"
  ).length;

  const completedCount = allTasks.filter(
    (task) => task.status === "completed"
  ).length;

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const upcomingEnd = endOfDay(addDays(today, 7));

  const todayCount = allTasks.filter((task) => {
    if (!task.dueDate || task.status === "completed") return false;
    const dueDate = typeof task.dueDate === "string" ? parseISO(task.dueDate) : new Date(task.dueDate);
    return isWithinInterval(dueDate, { start: todayStart, end: todayEnd });
  }).length;

  const upcomingCount = allTasks.filter((task) => {
    if (!task.dueDate || task.status === "completed") return false;
    const dueDate = typeof task.dueDate === "string" ? parseISO(task.dueDate) : new Date(task.dueDate);
    return isWithinInterval(dueDate, { start: todayStart, end: upcomingEnd });
  }).length;

  const { tree: groupTree, ungroupedProjects } = buildGroupTree(groups, projects);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">TaskFlow</span>
            <span className="text-xs text-muted-foreground">Project Manager</span>
          </div>
        </div>
        <form onSubmit={handleSearchSubmit} className="mt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(e.target.value.length > 0);
              }}
              onFocus={() => setShowSearchResults(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              className="pl-8 pr-12"
              data-testid="input-sidebar-search"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
          {showSearchResults && debouncedSearchQuery.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 mx-4 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              {isSearching ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No tasks found
                </div>
              ) : (
                <div className="py-1">
                  {searchResults.slice(0, 8).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover-elevate flex items-center gap-2"
                      onClick={() => {
                        setLocation(`/tasks?taskId=${task.id}`);
                        setSearchQuery("");
                        setShowSearchResults(false);
                      }}
                      data-testid={`search-result-${task.id}`}
                    >
                      <CheckSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{task.title}</span>
                    </button>
                  ))}
                  {searchResults.length > 8 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                      +{searchResults.length - 8} more results
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-2">
              Quick Actions
            </span>
          </div>
          <SidebarGroupContent className="px-2">
            <Button
              variant="default"
              className="w-full justify-start gap-2 mb-2"
              onClick={onQuickAdd}
              data-testid="button-quick-add"
            >
              <Plus className="h-4 w-4" />
              Quick Add
            </Button>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/tasks?filter=today"}
                  data-testid="nav-today"
                >
                  <Link href="/tasks?filter=today">
                    <Calendar className="h-4 w-4" />
                    <span className="flex-1">Today</span>
                    {todayCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-auto h-5 min-w-5 px-1.5 text-xs bg-muted"
                        data-testid="badge-today-count"
                      >
                        {todayCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/inbox"}
                  data-testid="nav-inbox"
                >
                  <Link href="/inbox">
                    <Inbox className="h-4 w-4" />
                    <span className="flex-1">Inbox</span>
                    {inboxCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-auto h-5 min-w-5 px-1.5 text-xs bg-rose-500"
                        data-testid="badge-inbox-count"
                      >
                        {inboxCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/tasks?filter=upcoming"}
                  data-testid="nav-upcoming"
                >
                  <Link href="/tasks?filter=upcoming">
                    <CalendarDays className="h-4 w-4" />
                    <span className="flex-1">Upcoming</span>
                    {upcomingCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-auto h-5 min-w-5 px-1.5 text-xs bg-muted"
                        data-testid="badge-upcoming-count"
                      >
                        {upcomingCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <div className="flex items-center justify-between gap-2 px-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 px-2">
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Smart Lists
                  </span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/tasks?filter=important"}
                      data-testid="nav-smart-important"
                    >
                      <Link href="/tasks?filter=important">
                        <Star className="h-4 w-4 text-amber-500" />
                        <span className="flex-1">Important</span>
                        {importantCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 min-w-5 px-1.5 text-xs bg-muted"
                            data-testid="badge-important-count"
                          >
                            {importantCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/tasks"}
                      data-testid="nav-smart-all-tasks"
                    >
                      <Link href="/tasks">
                        <List className="h-4 w-4" />
                        <span className="flex-1">All Tasks</span>
                        {allIncompleteCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 min-w-5 px-1.5 text-xs bg-muted"
                            data-testid="badge-all-tasks-count"
                          >
                            {allIncompleteCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/tasks?filter=completed"}
                      data-testid="nav-smart-completed"
                    >
                      <Link href="/tasks?filter=completed">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="flex-1">Completed</span>
                        {completedCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 min-w-5 px-1.5 text-xs bg-muted"
                            data-testid="badge-completed-count"
                          >
                            {completedCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <div className="flex items-center justify-between gap-2 px-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 px-2">
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Groups
                  </span>
                </Button>
              </CollapsibleTrigger>
              <Link href="/groups/new">
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="button-new-group"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupTree.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-muted-foreground">
                      No groups yet
                    </div>
                  ) : (
                    groupTree.map((group) => (
                      <GroupItem key={group.id} group={group} location={location} projectHandlers={projectHandlers} />
                    ))
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <div className="flex items-center justify-between gap-2 px-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 px-2">
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Projects
                  </span>
                </Button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNewProject}
                data-testid="button-new-project"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ungroupedProjects.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-muted-foreground">
                      No ungrouped projects
                    </div>
                  ) : (
                    ungroupedProjects.map((project) => (
                      <SidebarMenuItem key={project.id}>
                        <ProjectContextMenu
                          project={project}
                          onAddTask={() => projectHandlers.onAddTask(project.id)}
                          onAddSection={() => projectHandlers.onAddSection(project.id)}
                          onRename={() => projectHandlers.onRename(project)}
                          onColorChange={(color) => projectHandlers.onColorChange(project.id, color)}
                          onSort={(sortBy) => projectHandlers.onSort(project.id, sortBy)}
                          onClearCompleted={() => projectHandlers.onClearCompleted(project.id)}
                          onArchive={() => projectHandlers.onArchive(project.id)}
                          onDelete={() => projectHandlers.onDelete(project.id)}
                        >
                          <SidebarMenuButton
                            asChild
                            isActive={location === `/projects/${project.id}`}
                            data-testid={`nav-project-${project.id}`}
                          >
                            <Link href={`/projects/${project.id}`}>
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: project.color || "#3B82F6" }}
                              />
                              <span className="truncate">{project.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </ProjectContextMenu>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <div className="flex items-center justify-between gap-2 px-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 px-2">
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tags
                  </span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {tagsWithCounts.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-muted-foreground">
                      No tags yet
                    </div>
                  ) : (
                    tagsWithCounts.map((tag) => (
                      <SidebarMenuItem key={tag.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === `/tasks?tag=${tag.id}`}
                          data-testid={`nav-tag-${tag.id}`}
                        >
                          <Link href={`/tasks?tag=${tag.id}`}>
                            <div
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: tag.color || "#6B7280" }}
                            />
                            <span className="flex-1 truncate">{tag.name}</span>
                            {tag.taskCount > 0 && (
                              <Badge
                                variant="secondary"
                                className="ml-auto h-5 min-w-5 px-1.5 text-xs bg-muted"
                                data-testid={`badge-tag-count-${tag.id}`}
                              >
                                {tag.taskCount}
                              </Badge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              alt={user?.firstName || "User"}
              className="object-cover"
            />
            <AvatarFallback className="text-xs">
              {getInitials(user?.firstName, user?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">
              {user?.firstName || user?.email || "User"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.email}
            </span>
          </div>
          <Link href="/settings">
            <Button variant="ghost" size="icon" data-testid="button-settings">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </SidebarFooter>
      {ConfirmDialog}
    </Sidebar>
  );
}
