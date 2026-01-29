import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TaskListView } from "@/components/TaskListView";
import { CalendarView } from "@/components/CalendarView";
import { KanbanBoard } from "@/components/KanbanBoard";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { PageHeaderSkeleton, TaskListSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyState } from "@/components/ui/empty-states";
import { ErrorState } from "@/components/ui/error-state";
import { Plus, List, Calendar, CheckSquare, ChevronDown, FileText, Copy, LayoutGrid, FolderKanban, MoreHorizontal, Pencil, Trash2, Clock, ListTodo, Globe, Lock, Sparkles, Layers, Filter, X } from "lucide-react";
import { SmartListsPanel } from "@/components/SmartListsPanel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, User, Project, TaskWithRelations, TaskTemplate } from "@shared/schema";

const CATEGORIES = [
  { value: "development", label: "Development" },
  { value: "design", label: "Design" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "research", label: "Research" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-green-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "urgent", label: "Urgent", color: "bg-red-500" },
];

const PRESET_COLORS = [
  "#6B7280", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4",
];

interface TemplateFormState {
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  taskTitle: string;
  taskDescription: string;
  priority: string;
  estimatedTime: number | null;
  subtasks: { title: string; description?: string }[];
  isPublic: boolean;
}

const initialFormState: TemplateFormState = {
  name: "",
  description: "",
  category: "other",
  icon: "",
  color: "#3B82F6",
  taskTitle: "",
  taskDescription: "",
  priority: "medium",
  estimatedTime: null,
  subtasks: [],
  isPublic: false,
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    development: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    design: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    marketing: "bg-green-500/10 text-green-600 dark:text-green-400",
    operations: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    research: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    personal: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    other: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  };
  return colors[category] || colors.other;
};

export default function TasksPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<TaskTemplate | null>(null);
  const [formState, setFormState] = useState<TemplateFormState>(initialFormState);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedProjectForTemplate, setSelectedProjectForTemplate] = useState<string>("");
  const [view, setView] = useState<"list" | "board" | "calendar">("list");
  const [isSmartListsPanelOpen, setIsSmartListsPanelOpen] = useState(false);
  const [activeSmartFilter, setActiveSmartFilter] = useState<string | null>(null);
  const [filteredTasks, setFilteredTasks] = useState<Task[] | null>(null);
  const { toast } = useToast();
  const [location] = useLocation();

  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError, error: tasksErrorDetails, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const filterParam = searchParams.get("filter");
    
    if (!filterParam) {
      setFilteredTasks(null);
      setActiveSmartFilter(null);
      return;
    }
    
    if (tasks.length > 0) {
      let filtered: Task[] = [];
      let filterName = "";
      
      switch (filterParam) {
        case "important":
          filtered = tasks.filter(t => t.isImportant);
          filterName = "Important";
          break;
        case "completed":
          filtered = tasks.filter(t => t.status === "done");
          filterName = "Completed";
          break;
        case "today":
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          filtered = tasks.filter(t => {
            if (!t.dueDate) return false;
            const dueDate = new Date(t.dueDate);
            return dueDate >= today && dueDate < tomorrow;
          });
          filterName = "Today";
          break;
        default:
          return;
      }
      
      if (filterName) {
        setFilteredTasks(filtered);
        setActiveSmartFilter(filterName);
      }
    }
  }, [location, tasks]);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const { data: publicTemplates = [], isLoading: publicTemplatesLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/templates/public"],
  });

  const invalidateTemplateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    queryClient.invalidateQueries({ queryKey: ["/api/templates/public"] });
  };

  const createTemplateMutation = useMutation({
    mutationFn: (data: Partial<TemplateFormState>) => apiRequest("POST", "/api/templates", data),
    onSuccess: () => {
      invalidateTemplateQueries();
      setIsTemplateFormOpen(false);
      setFormState(initialFormState);
      toast({ title: "Template created", description: "Your template has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template.", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TemplateFormState> }) =>
      apiRequest("PATCH", `/api/templates/${id}`, data),
    onSuccess: () => {
      invalidateTemplateQueries();
      setEditingTemplate(null);
      setIsTemplateFormOpen(false);
      setFormState(initialFormState);
      toast({ title: "Template updated", description: "Changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template.", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/templates/${id}`),
    onSuccess: () => {
      invalidateTemplateQueries();
      setDeleteConfirmTemplate(null);
      toast({ title: "Template deleted", description: "The template has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template.", variant: "destructive" });
    },
  });

  const { data: selectedTask } = useQuery<TaskWithRelations>({
    queryKey: ["/api/tasks", selectedTaskId],
    queryFn: async ({ queryKey }) => {
      const [, taskId] = queryKey;
      if (!taskId) throw new Error("No task ID provided");
      const response = await fetch(`/api/tasks/${taskId}`);
      if (!response.ok) throw new Error("Failed to fetch task");
      return response.json();
    },
    enabled: !!selectedTaskId,
  });

  const invalidateAllTaskQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
  };

  const updateTaskMutation = useMutation({
    mutationFn: async (data: Partial<TaskWithRelations>) => {
      const { id, ...rest } = data;
      const response = await apiRequest("PATCH", `/api/tasks/${id}`, rest);
      return response.json();
    },
    onSuccess: () => {
      invalidateAllTaskQueries();
      toast({ title: "Task updated" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      invalidateAllTaskQueries();
      setSelectedTaskId(null);
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const response = await apiRequest("POST", "/api/comments", { taskId, content });
      return response.json();
    },
    onSuccess: () => {
      invalidateAllTaskQueries();
      if (selectedTaskId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", selectedTaskId] });
      }
      toast({ title: "Comment added" });
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const useTemplateMutation = useMutation({
    mutationFn: async ({ templateId, projectId }: { templateId: string; projectId: string }) => {
      const response = await apiRequest("POST", `/api/templates/${templateId}/use`, { projectId });
      return response.json();
    },
    onSuccess: () => {
      invalidateAllTaskQueries();
      setIsTemplateDialogOpen(false);
      setSelectedTemplate("");
      setSelectedProjectForTemplate("");
      toast({ title: "Task created from template" });
    },
    onError: () => {
      toast({ title: "Failed to create task from template", variant: "destructive" });
    },
  });

  const handleUseTemplate = () => {
    if (selectedTemplate && selectedProjectForTemplate) {
      useTemplateMutation.mutate({ templateId: selectedTemplate, projectId: selectedProjectForTemplate });
    }
  };

  const handleTemplateSubmit = () => {
    if (!formState.name || !formState.taskTitle) {
      toast({ title: "Error", description: "Template name and task title are required.", variant: "destructive" });
      return;
    }
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: formState });
    } else {
      createTemplateMutation.mutate(formState);
    }
  };

  const handleEditTemplate = (template: TaskTemplate) => {
    setFormState({
      name: template.name,
      description: template.description || "",
      category: template.category || "other",
      icon: template.icon || "",
      color: template.color || "#3B82F6",
      taskTitle: template.taskTitle,
      taskDescription: template.taskDescription || "",
      priority: template.priority || "medium",
      estimatedTime: template.estimatedTime,
      subtasks: (template.subtasks as any) || [],
      isPublic: template.isPublic || false,
    });
    setEditingTemplate(template);
    setIsTemplateFormOpen(true);
  };

  const handleUseTemplateFromManager = (template: TaskTemplate) => {
    setSelectedTemplate(template.id);
    setIsTemplateManagerOpen(false);
    setIsTemplateDialogOpen(true);
  };

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setFormState({
      ...formState,
      subtasks: [...formState.subtasks, { title: newSubtaskTitle.trim() }],
    });
    setNewSubtaskTitle("");
  };

  const removeSubtask = (index: number) => {
    setFormState({
      ...formState,
      subtasks: formState.subtasks.filter((_, i) => i !== index),
    });
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate) || publicTemplates.find(t => t.id === selectedTemplate);
  const allTemplatesForSelect = [...templates, ...publicTemplates.filter(pt => !templates.some(t => t.id === pt.id))];

  const handleSmartFilterChange = (filtered: Task[], filterName: string) => {
    if (filterName) {
      setFilteredTasks(filtered);
      setActiveSmartFilter(filterName);
    } else {
      setFilteredTasks(null);
      setActiveSmartFilter(null);
    }
  };

  const clearSmartFilter = () => {
    setFilteredTasks(null);
    setActiveSmartFilter(null);
  };

  const displayedTasks = filteredTasks ?? tasks;

  if (tasksLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeaderSkeleton />
        <TaskListSkeleton count={5} />
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="p-6">
        <ErrorState 
          title="Failed to load tasks"
          message={tasksErrorDetails?.message || "An error occurred while loading your tasks."}
          onRetry={() => refetchTasks()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">My Tasks</h1>
          {activeSmartFilter && (
            <Badge variant="secondary" className="gap-1 px-3 py-1">
              <Filter className="h-3 w-3" />
              {activeSmartFilter}
              <button
                onClick={clearSmartFilter}
                className="ml-1 hover:text-destructive"
                data-testid="button-clear-smart-filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={activeSmartFilter ? "default" : "outline"}
            onClick={() => setIsSmartListsPanelOpen(true)}
            data-testid="button-smart-lists"
          >
            <Filter className="h-4 w-4 mr-2" />
            Smart Lists
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsTemplateManagerOpen(true)}
            data-testid="button-manage-templates"
          >
            <FolderKanban className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="button-create-task">
                <Plus className="h-4 w-4 mr-2" />
                New Task
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsCreateOpen(true)} data-testid="button-new-blank-task">
                <Plus className="h-4 w-4 mr-2" />
                Blank Task
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setIsTemplateDialogOpen(true)} 
                disabled={allTemplatesForSelect.length === 0}
                data-testid="button-new-from-template"
              >
                <FileText className="h-4 w-4 mr-2" />
                From Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {displayedTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={activeSmartFilter ? `No ${activeSmartFilter.toLowerCase()} tasks` : "No tasks yet"}
          description={activeSmartFilter 
            ? "No tasks match the current filter criteria." 
            : "Create your first task to get started tracking your work."}
          action={activeSmartFilter ? {
            label: "Clear Filter",
            onClick: clearSmartFilter,
          } : {
            label: "Create Task",
            onClick: () => setIsCreateOpen(true),
          }}
        />
      ) : (
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="list" data-testid="tab-list">
              <List className="h-4 w-4 mr-2" />
              List
            </TabsTrigger>
            <TabsTrigger value="board" data-testid="tab-board">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Board
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <TaskListView
              tasks={displayedTasks}
              users={users}
              projects={projects}
              onTaskClick={(task) => setSelectedTaskId(task.id)}
              onTaskStatusChange={(taskId, status) => {
                updateTaskMutation.mutate({ id: taskId, status });
              }}
              onSubtaskStatusChange={(subtaskId, status) => {
                updateTaskMutation.mutate({ id: subtaskId, status });
              }}
              showProject
            />
          </TabsContent>

          <TabsContent value="board" className="mt-4">
            <KanbanBoard
              tasks={displayedTasks as TaskWithRelations[]}
              onTaskClick={(task) => setSelectedTaskId(task.id)}
              onTaskMove={(taskId, newStatus) => {
                updateTaskMutation.mutate({ id: taskId, status: newStatus });
              }}
              onSubtaskStatusChange={(subtaskId, status) => {
                updateTaskMutation.mutate({ id: subtaskId, status });
              }}
              onAddTask={(status) => setIsCreateOpen(true)}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <CalendarView
              tasks={displayedTasks}
              onTaskClick={(task) => setSelectedTaskId(task.id)}
            />
          </TabsContent>
        </Tabs>
      )}

      <CreateTaskModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projects={projects}
      />

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task from Template</DialogTitle>
            <DialogDescription>
              Select a template and project to create a new task.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {allTemplatesForSelect.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: template.color || "#6B7280" }}
                        />
                        {template.name}
                        {template.isPublic && !templates.some(t => t.id === template.id) && (
                          <Globe className="w-3 h-3 text-muted-foreground ml-1" />
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProjectForTemplate} onValueChange={setSelectedProjectForTemplate}>
                <SelectTrigger data-testid="select-project-for-template">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateData && (
              <div className="p-4 bg-muted/50 rounded-md space-y-2">
                <div className="font-medium">{selectedTemplateData.taskTitle}</div>
                {selectedTemplateData.taskDescription && (
                  <p className="text-sm text-muted-foreground">{selectedTemplateData.taskDescription}</p>
                )}
                {selectedTemplateData.subtasks && (selectedTemplateData.subtasks as any[]).length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    + {(selectedTemplateData.subtasks as any[]).length} subtasks
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUseTemplate}
              disabled={!selectedTemplate || !selectedProjectForTemplate || useTemplateMutation.isPending}
              data-testid="button-confirm-use-template"
            >
              <Copy className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTaskId}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
          users={users}
          onSave={(task) => updateTaskMutation.mutate(task)}
          onDelete={(taskId) => deleteTaskMutation.mutate(taskId)}
          onAddComment={(taskId, content) => addCommentMutation.mutate({ taskId, content })}
        />
      )}

      {/* Template Manager Dialog */}
      <Dialog open={isTemplateManagerOpen} onOpenChange={setIsTemplateManagerOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Task Templates
            </DialogTitle>
            <DialogDescription>
              Create and manage reusable task templates
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="my-templates" className="h-full flex flex-col">
              <div className="flex items-center justify-between gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="my-templates" data-testid="tab-my-templates">
                    <Lock className="w-4 h-4 mr-2" />
                    My Templates
                  </TabsTrigger>
                  <TabsTrigger value="public" data-testid="tab-public-templates">
                    <Globe className="w-4 h-4 mr-2" />
                    Public Templates
                  </TabsTrigger>
                </TabsList>
                <Button 
                  onClick={() => {
                    setFormState(initialFormState);
                    setEditingTemplate(null);
                    setIsTemplateFormOpen(true);
                  }} 
                  data-testid="button-create-template"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="my-templates" className="mt-0">
                  {templatesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i}>
                          <CardHeader>
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-16 w-full" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="font-medium text-lg mb-2">No templates yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first template to speed up task creation.
                      </p>
                      <Button 
                        onClick={() => {
                          setFormState(initialFormState);
                          setEditingTemplate(null);
                          setIsTemplateFormOpen(true);
                        }}
                        data-testid="button-create-first-template"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((template) => (
                        <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: template.color || "#6B7280" }}
                                  />
                                  <span className="truncate">{template.name}</span>
                                </CardTitle>
                                {template.description && (
                                  <CardDescription className="mt-1 line-clamp-2">{template.description}</CardDescription>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-template-menu-${template.id}`}>
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleUseTemplateFromManager(template)} data-testid={`button-use-template-${template.id}`}>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Use Template
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditTemplate(template)} data-testid={`button-edit-template-${template.id}`}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteConfirmTemplate(template)}
                                    className="text-red-600"
                                    data-testid={`button-delete-template-${template.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {template.category && (
                                <Badge variant="secondary" className={getCategoryColor(template.category)}>
                                  {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                                </Badge>
                              )}
                              {template.isPublic && (
                                <Badge variant="outline" className="gap-1">
                                  <Globe className="w-3 h-3" />
                                  Public
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm">
                              <div className="font-medium text-muted-foreground mb-1">Task:</div>
                              <div className="truncate">{template.taskTitle}</div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {template.estimatedTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {template.estimatedTime}m
                                </span>
                              )}
                              {template.subtasks && (template.subtasks as any[]).length > 0 && (
                                <span className="flex items-center gap-1">
                                  <ListTodo className="w-3 h-3" />
                                  {(template.subtasks as any[]).length} subtasks
                                </span>
                              )}
                              {template.usageCount && template.usageCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  Used {template.usageCount}x
                                </span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => handleUseTemplateFromManager(template)}
                              data-testid={`button-use-template-card-${template.id}`}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Use Template
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="public" className="mt-0">
                  {publicTemplatesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i}>
                          <CardHeader>
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-16 w-full" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : publicTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Globe className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="font-medium text-lg mb-2">No public templates</h3>
                      <p className="text-muted-foreground">
                        Public templates shared by others will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {publicTemplates.map((template) => (
                        <Card key={template.id} className="hover-elevate" data-testid={`card-public-template-${template.id}`}>
                          <CardHeader className="pb-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: template.color || "#6B7280" }}
                                />
                                <span className="truncate">{template.name}</span>
                              </CardTitle>
                              {template.description && (
                                <CardDescription className="mt-1 line-clamp-2">{template.description}</CardDescription>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {template.category && (
                                <Badge variant="secondary" className={getCategoryColor(template.category)}>
                                  {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm">
                              <div className="font-medium text-muted-foreground mb-1">Task:</div>
                              <div className="truncate">{template.taskTitle}</div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {template.estimatedTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {template.estimatedTime}m
                                </span>
                              )}
                              {template.subtasks && (template.subtasks as any[]).length > 0 && (
                                <span className="flex items-center gap-1">
                                  <ListTodo className="w-3 h-3" />
                                  {(template.subtasks as any[]).length} subtasks
                                </span>
                              )}
                              {template.usageCount && template.usageCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  Used {template.usageCount}x
                                </span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => handleUseTemplateFromManager(template)}
                              data-testid={`button-use-public-template-${template.id}`}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Use Template
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Form Dialog */}
      <Dialog open={isTemplateFormOpen} onOpenChange={(open) => {
        if (!open) {
          setIsTemplateFormOpen(false);
          setEditingTemplate(null);
          setFormState(initialFormState);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              Create a reusable task template to quickly add similar tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="e.g., Bug Report"
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formState.category}
                  onValueChange={(v) => setFormState({ ...formState, category: v })}
                >
                  <SelectTrigger data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="Describe when to use this template..."
                data-testid="input-template-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-md border-2 transition-all ${
                      formState.color === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormState({ ...formState, color })}
                    data-testid={`button-color-${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Task Details
              </h4>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Task Title *</Label>
                  <Input
                    value={formState.taskTitle}
                    onChange={(e) => setFormState({ ...formState, taskTitle: e.target.value })}
                    placeholder="e.g., Fix [Component] - [Issue]"
                    data-testid="input-task-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Task Description</Label>
                  <Textarea
                    value={formState.taskDescription}
                    onChange={(e) => setFormState({ ...formState, taskDescription: e.target.value })}
                    placeholder="Default description for tasks created from this template..."
                    data-testid="input-task-description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={formState.priority}
                      onValueChange={(v) => setFormState({ ...formState, priority: v })}
                    >
                      <SelectTrigger data-testid="select-task-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${p.color}`} />
                              {p.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Time (minutes)</Label>
                    <Input
                      type="number"
                      value={formState.estimatedTime || ""}
                      onChange={(e) => setFormState({ ...formState, estimatedTime: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="e.g., 30"
                      data-testid="input-estimated-time"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Subtasks
              </h4>

              <div className="space-y-3">
                {formState.subtasks.map((subtask, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <span className="flex-1 text-sm">{subtask.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSubtask(index)}
                      data-testid={`button-remove-subtask-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a subtask..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                    data-testid="input-new-subtask"
                  />
                  <Button variant="outline" size="icon" onClick={addSubtask} data-testid="button-add-subtask">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Make Public</Label>
                  <p className="text-xs text-muted-foreground">Allow others to discover and use this template</p>
                </div>
                <Switch
                  checked={formState.isPublic}
                  onCheckedChange={(v) => setFormState({ ...formState, isPublic: v })}
                  data-testid="switch-is-public"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTemplateFormOpen(false);
                setEditingTemplate(null);
                setFormState(initialFormState);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTemplateSubmit}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmTemplate} onOpenChange={(open) => !open && setDeleteConfirmTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmTemplate && deleteTemplateMutation.mutate(deleteConfirmTemplate.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-template"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SmartListsPanel
        open={isSmartListsPanelOpen}
        onOpenChange={setIsSmartListsPanelOpen}
        tasks={tasks}
        onFilterChange={handleSmartFilterChange}
        activeFilter={activeSmartFilter}
      />
    </div>
  );
}
