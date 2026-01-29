import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskListView } from "@/components/TaskListView";
import { CalendarView } from "@/components/CalendarView";
import { GanttChart } from "@/components/GanttChart";
import { EnhancedListView } from "@/components/EnhancedListView";
import { MatrixView } from "@/components/MatrixView";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { BatchTaskCreator } from "@/components/BatchTaskCreator";
import { DurationSummary } from "@/components/DurationSummary";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ErrorState } from "@/components/ui/error-state";
import { useMobile } from "@/hooks/use-mobile";
import { Plus, LayoutGrid, List, Calendar, GanttChartSquare, Layers, Grid2x2, ListPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, Task, User, TaskWithRelations, TaskDependency, TaskSection } from "@shared/schema";

type ViewType = "kanban" | "list" | "enhanced-list" | "calendar" | "gantt" | "matrix";

const VIEW_STORAGE_KEY = "project-detail-view-preference";

function getStoredView(): ViewType {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored && ["kanban", "list", "enhanced-list", "calendar", "gantt", "matrix"].includes(stored)) {
      return stored as ViewType;
    }
  } catch (e) {
    // localStorage might not be available
  }
  return "kanban";
}

function storeView(view: ViewType) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch (e) {
    // localStorage might not be available
  }
}

export default function ProjectDetailPage() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isMobile } = useMobile();
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<string>("todo");
  const [createTaskSectionId, setCreateTaskSectionId] = useState<string | undefined>(undefined);
  const [createTaskPriority, setCreateTaskPriority] = useState<string>("medium");
  const [createTaskDueDate, setCreateTaskDueDate] = useState<string>("");
  const [createTaskIsImportant, setCreateTaskIsImportant] = useState<boolean>(false);
  const [view, setView] = useState<ViewType>(() => getStoredView());

  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [editingSection, setEditingSection] = useState<TaskSection | null>(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [isBatchCreatorOpen, setIsBatchCreatorOpen] = useState(false);

  useEffect(() => {
    storeView(view);
  }, [view]);

  const { data: project, isLoading: projectLoading, isError: projectError, error: projectErrorDetails, refetch: refetchProject } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ["/api/projects", projectId, "tasks"],
    enabled: !!projectId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: dependencies = [] } = useQuery<TaskDependency[]>({
    queryKey: ["/api/projects", projectId, "dependencies"],
    enabled: !!projectId,
  });

  const { data: sections = [] } = useQuery<TaskSection[]>({
    queryKey: ["/api/projects", projectId, "sections"],
    enabled: !!projectId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<Task> }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update task", description: error.message, variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "dependencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted" });
      setSelectedTask(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const res = await apiRequest("POST", "/api/comments", { taskId, content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      toast({ title: "Comment added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add comment", description: error.message, variant: "destructive" });
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const maxSortOrder = sections.reduce((max, s) => Math.max(max, s.sortOrder ?? 0), 0);
      const res = await apiRequest("POST", `/api/projects/${projectId}/sections`, {
        name,
        sortOrder: maxSortOrder + 1,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "sections"] });
      toast({ title: "Section created" });
      setIsAddSectionOpen(false);
      setNewSectionName("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create section", description: error.message, variant: "destructive" });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ sectionId, name }: { sectionId: string; name: string }) => {
      const res = await apiRequest("PATCH", `/api/sections/${sectionId}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "sections"] });
      toast({ title: "Section updated" });
      setEditingSection(null);
      setEditSectionName("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update section", description: error.message, variant: "destructive" });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      await apiRequest("DELETE", `/api/sections/${sectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      toast({ title: "Section deleted" });
      setDeletingSectionId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete section", description: error.message, variant: "destructive" });
    },
  });

  const isLoading = projectLoading || tasksLoading;

  const handleTaskMove = (taskId: string, newStatus: string, newPosition: number) => {
    updateTaskMutation.mutate({
      taskId,
      data: { status: newStatus, position: newPosition },
    });
  };

  const handleAddTask = (status: string) => {
    setCreateTaskStatus(status);
    setCreateTaskSectionId(undefined);
    setCreateTaskPriority("medium");
    setCreateTaskDueDate("");
    setCreateTaskIsImportant(false);
    setIsCreateTaskOpen(true);
  };

  const handleAddTaskFromMatrix = (quadrant: 1 | 2 | 3 | 4) => {
    const today = new Date().toISOString().split("T")[0];
    
    switch (quadrant) {
      case 1:
        setCreateTaskPriority("urgent");
        setCreateTaskIsImportant(true);
        setCreateTaskDueDate(today);
        break;
      case 2:
        setCreateTaskPriority("high");
        setCreateTaskIsImportant(true);
        setCreateTaskDueDate("");
        break;
      case 3:
        setCreateTaskPriority("medium");
        setCreateTaskIsImportant(false);
        setCreateTaskDueDate(today);
        break;
      case 4:
        setCreateTaskPriority("low");
        setCreateTaskIsImportant(false);
        setCreateTaskDueDate("");
        break;
    }
    
    setCreateTaskStatus("todo");
    setCreateTaskSectionId(undefined);
    setIsCreateTaskOpen(true);
  };

  const handleAddTaskToSection = (sectionId?: string) => {
    setCreateTaskStatus("todo");
    setCreateTaskSectionId(sectionId);
    setCreateTaskPriority("medium");
    setCreateTaskDueDate("");
    setCreateTaskIsImportant(false);
    setIsCreateTaskOpen(true);
  };

  const handleTaskSave = (taskData: Partial<TaskWithRelations>) => {
    if (!taskData.id) return;
    updateTaskMutation.mutate({
      taskId: taskData.id,
      data: {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assigneeId: taskData.assigneeId,
        startDate: taskData.startDate,
        dueDate: taskData.dueDate,
        estimatedTime: taskData.estimatedTime,
      },
    });
    setSelectedTask(null);
  };

  const handleAddSection = () => {
    setNewSectionName("");
    setIsAddSectionOpen(true);
  };

  const handleEditSection = (section: TaskSection) => {
    setEditingSection(section);
    setEditSectionName(section.name || "");
  };

  const handleDeleteSection = (sectionId: string) => {
    setDeletingSectionId(sectionId);
  };

  const handleConfirmAddSection = () => {
    if (newSectionName.trim()) {
      addSectionMutation.mutate({ name: newSectionName.trim() });
    }
  };

  const handleConfirmEditSection = () => {
    if (editingSection && editSectionName.trim()) {
      updateSectionMutation.mutate({
        sectionId: editingSection.id,
        name: editSectionName.trim(),
      });
    }
  };

  const handleConfirmDeleteSection = () => {
    if (deletingSectionId) {
      deleteSectionMutation.mutate(deletingSectionId);
    }
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "sections"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] }),
    ]);
  }, [queryClient, projectId]);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${isMobile ? 'p-3 space-y-3' : 'p-6 space-y-6'}`}>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className={`${isMobile ? 'h-6 w-48' : 'h-8 w-64'}`} />
          <Skeleton className={`${isMobile ? 'h-9 w-24' : 'h-10 w-32'}`} />
        </div>
        <Skeleton className={`${isMobile ? 'h-[400px]' : 'h-[600px]'}`} />
      </div>
    );
  }

  if (projectError || tasksError) {
    return (
      <div className={`${isMobile ? 'p-3' : 'p-6'}`}>
        <ErrorState 
          title="Failed to load project"
          message={projectErrorDetails?.message || "An error occurred while loading this project."}
          onRetry={() => {
            refetchProject();
            refetchTasks();
          }}
        />
      </div>
    );
  }

  if (!project) {
    return (
      <div className={`text-center ${isMobile ? 'p-3' : 'p-6'}`}>
        <h1 className={`font-semibold mb-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>Project not found</h1>
        <p className="text-muted-foreground text-sm">The project you're looking for doesn't exist.</p>
      </div>
    );
  }

  const content = (
    <div className={`space-y-4 ${isMobile ? 'p-3 space-y-3' : 'p-6 space-y-6'}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={`rounded-full flex-shrink-0 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`}
            style={{ backgroundColor: project.color || "#3B82F6" }}
          />
          <h1 className={`font-semibold truncate ${isMobile ? 'text-xl' : 'text-3xl'}`} data-testid="text-project-name">
            {project.name}
          </h1>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button 
            onClick={() => setIsCreateTaskOpen(true)} 
            data-testid="button-add-task"
            size={isMobile ? "sm" : "default"}
          >
            <Plus className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4 mr-2'}`} />
            {!isMobile && "Add Task"}
          </Button>
          {!isMobile && (
            <Button variant="outline" onClick={() => setIsBatchCreatorOpen(true)} data-testid="button-batch-add">
              <ListPlus className="h-4 w-4 mr-2" />
              Batch Add
            </Button>
          )}
        </div>
      </div>

      {project.description && !isMobile && (
        <p className="text-muted-foreground max-w-2xl">{project.description}</p>
      )}

      {!isMobile && <DurationSummary tasks={tasks} compact className="mb-2" />}

      <Tabs value={view} onValueChange={(v) => setView(v as ViewType)} className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
        <TabsList className={`flex-wrap ${isMobile ? 'w-full overflow-x-auto' : ''}`}>
          <TabsTrigger value="kanban" data-testid="tab-kanban" className={isMobile ? 'flex-1' : ''}>
            <LayoutGrid className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4 mr-2'}`} />
            {!isMobile && "Kanban"}
          </TabsTrigger>
          <TabsTrigger value="list" data-testid="tab-list" className={isMobile ? 'flex-1' : ''}>
            <List className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4 mr-2'}`} />
            {!isMobile && "List"}
          </TabsTrigger>
          <TabsTrigger value="enhanced-list" data-testid="tab-enhanced-list" className={isMobile ? 'flex-1' : ''}>
            <Layers className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4 mr-2'}`} />
            {!isMobile && "Sections"}
          </TabsTrigger>
          {!isMobile && (
            <>
              <TabsTrigger value="calendar" data-testid="tab-calendar">
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="gantt" data-testid="tab-gantt">
                <GanttChartSquare className="h-4 w-4 mr-2" />
                Gantt
              </TabsTrigger>
              <TabsTrigger value="matrix" data-testid="tab-matrix">
                <Grid2x2 className="h-4 w-4 mr-2" />
                Matrix
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="kanban" className={`${isMobile ? 'mt-3' : 'mt-4'}`}>
          <KanbanBoard
            tasks={tasks as TaskWithRelations[]}
            onTaskClick={setSelectedTask}
            onTaskMove={handleTaskMove}
            onSubtaskStatusChange={(subtaskId, status) => {
              updateTaskMutation.mutate({ taskId: subtaskId, data: { status } });
            }}
            onAddTask={handleAddTask}
          />
        </TabsContent>

        <TabsContent value="list" className={`${isMobile ? 'mt-3' : 'mt-4'}`}>
          <TaskListView
            tasks={tasks as TaskWithRelations[]}
            users={users}
            onTaskClick={setSelectedTask}
            onSubtaskStatusChange={(subtaskId, status) => {
              updateTaskMutation.mutate({ taskId: subtaskId, data: { status } });
            }}
          />
        </TabsContent>

        <TabsContent value="enhanced-list" className={`${isMobile ? 'mt-3' : 'mt-4'}`}>
          <EnhancedListView
            tasks={tasks}
            sections={sections}
            projectId={projectId || ""}
            onTaskClick={(task) => setSelectedTask(task as TaskWithRelations)}
            onAddTask={handleAddTaskToSection}
            onAddSection={handleAddSection}
            onEditSection={handleEditSection}
            onDeleteSection={handleDeleteSection}
          />
        </TabsContent>

        <TabsContent value="calendar" className={`${isMobile ? 'mt-3' : 'mt-4'}`}>
          <CalendarView
            tasks={tasks as TaskWithRelations[]}
            onTaskClick={setSelectedTask}
          />
        </TabsContent>

        <TabsContent value="gantt" className={`${isMobile ? 'mt-3' : 'mt-4'}`}>
          <GanttChart
            tasks={tasks as TaskWithRelations[]}
            dependencies={dependencies}
            onTaskClick={setSelectedTask}
          />
        </TabsContent>

        <TabsContent value="matrix" className={`${isMobile ? 'mt-3' : 'mt-4'}`}>
          <MatrixView
            tasks={tasks as TaskWithRelations[]}
            onTaskClick={setSelectedTask}
            onAddTask={handleAddTaskFromMatrix}
            onTaskUpdate={(taskId, updates) => {
              updateTaskMutation.mutate({ taskId, data: updates });
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh}>
          {content}
        </PullToRefresh>
      ) : (
        content
      )}

      <CreateTaskModal
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        projectId={project.id}
        defaultStatus={createTaskStatus}
        defaultSectionId={createTaskSectionId}
        defaultPriority={createTaskPriority}
        defaultDueDate={createTaskDueDate}
        defaultIsImportant={createTaskIsImportant}
      />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          users={users}
          onSave={handleTaskSave}
          onDelete={(taskId) => deleteTaskMutation.mutate(taskId)}
          onAddComment={(taskId, content) => addCommentMutation.mutate({ taskId, content })}
        />
      )}

      <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="section-name">Section Name</Label>
            <Input
              id="section-name"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Enter section name"
              className="mt-2"
              data-testid="input-section-name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirmAddSection();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSectionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAddSection}
              disabled={!newSectionName.trim() || addSectionMutation.isPending}
              data-testid="button-confirm-add-section"
            >
              {addSectionMutation.isPending ? "Creating..." : "Add Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-section-name">Section Name</Label>
            <Input
              id="edit-section-name"
              value={editSectionName}
              onChange={(e) => setEditSectionName(e.target.value)}
              placeholder="Enter section name"
              className="mt-2"
              data-testid="input-edit-section-name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirmEditSection();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmEditSection}
              disabled={!editSectionName.trim() || updateSectionMutation.isPending}
              data-testid="button-confirm-edit-section"
            >
              {updateSectionMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSectionId} onOpenChange={(open) => !open && setDeletingSectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section? Tasks in this section will be moved to the default section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteSection}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-section"
            >
              {deleteSectionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isBatchCreatorOpen} onOpenChange={setIsBatchCreatorOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <BatchTaskCreator
            defaultProjectId={projectId}
            onClose={() => setIsBatchCreatorOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
              setIsBatchCreatorOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
