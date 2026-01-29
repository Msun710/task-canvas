import { useState, useMemo, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Layers } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { ViewOptionsToolbar, type ViewMode, type SortOption, type GroupByOption } from "./ViewOptionsToolbar";
import { TaskSection } from "./TaskSection";
import { EnhancedTaskCard } from "./EnhancedTaskCard";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { DurationSummary, DurationSummaryInline } from "./DurationSummary";
import type { Task, TaskSection as TaskSectionType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";

interface EnhancedListViewProps {
  tasks: Task[];
  sections: TaskSectionType[];
  projectId: string;
  onTaskClick: (task: Task) => void;
  onAddTask: (sectionId?: string) => void;
  onAddSection?: () => void;
  onEditSection?: (section: TaskSectionType) => void;
  onDeleteSection?: (sectionId: string) => void;
}

export function EnhancedListView({
  tasks,
  sections,
  projectId,
  onTaskClick,
  onAddTask,
  onAddSection,
  onEditSection,
  onDeleteSection,
}: EnhancedListViewProps) {
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortOption>("manual");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [showCompleted, setShowCompleted] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: { taskIds: string[]; data: Partial<Task> }) => {
      const promises = updates.taskIds.map((taskId) =>
        apiRequest("PATCH", `/api/tasks/${taskId}`, updates.data)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      setSelectedTasks(new Set());
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tasks",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const promises = taskIds.map((taskId) =>
        apiRequest("DELETE", `/api/tasks/${taskId}`)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      setSelectedTasks(new Set());
      toast({
        title: "Success",
        description: "Tasks deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tasks",
        variant: "destructive",
      });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<Task> }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
    },
  });

  const moveTaskToSectionMutation = useMutation({
    mutationFn: async ({ taskId, sectionId, position }: { taskId: string; sectionId: string | null; position: number }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}/section`, { sectionId, position });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to move task",
        variant: "destructive",
      });
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: async (sectionIds: string[]) => {
      return apiRequest("PUT", `/api/projects/${projectId}/sections/reorder`, { sectionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "sections"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder sections",
        variant: "destructive",
      });
    },
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!showCompleted && task.status === "done") {
        return false;
      }
      return true;
    });
  }, [tasks, showCompleted]);

  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];

    switch (sortBy) {
      case "dueDate":
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case "priority":
        const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
        sorted.sort((a, b) => {
          return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4);
        });
        break;
      case "created":
        sorted.sort((a, b) => {
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "manual":
      default:
        sorted.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        break;
    }

    return sorted;
  }, [filteredTasks, sortBy]);

  const groupedTasks = useMemo(() => {
    if (groupBy === "none") {
      const sectionMap = new Map<string | null, Task[]>();
      
      sections.forEach((section) => {
        sectionMap.set(section.id, []);
      });
      sectionMap.set(null, []);

      sortedTasks.forEach((task) => {
        const sectionId = task.sectionId || null;
        if (!sectionMap.has(sectionId)) {
          sectionMap.set(sectionId, []);
        }
        sectionMap.get(sectionId)!.push(task);
      });

      return sectionMap;
    }

    const groups = new Map<string, Task[]>();

    if (groupBy === "dueDate") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      groups.set("Overdue", []);
      groups.set("Today", []);
      groups.set("Tomorrow", []);
      groups.set("This Week", []);
      groups.set("Later", []);
      groups.set("No Due Date", []);

      sortedTasks.forEach((task) => {
        if (!task.dueDate) {
          groups.get("No Due Date")!.push(task);
          return;
        }

        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < today && task.status !== "done") {
          groups.get("Overdue")!.push(task);
        } else if (dueDate.getTime() === today.getTime()) {
          groups.get("Today")!.push(task);
        } else if (dueDate.getTime() === tomorrow.getTime()) {
          groups.get("Tomorrow")!.push(task);
        } else if (dueDate < nextWeek) {
          groups.get("This Week")!.push(task);
        } else {
          groups.get("Later")!.push(task);
        }
      });
    } else if (groupBy === "priority") {
      groups.set("Urgent", []);
      groups.set("High", []);
      groups.set("Medium", []);
      groups.set("Low", []);
      groups.set("None", []);

      sortedTasks.forEach((task) => {
        const priority = task.priority || "none";
        const groupKey = priority.charAt(0).toUpperCase() + priority.slice(1);
        if (groups.has(groupKey)) {
          groups.get(groupKey)!.push(task);
        } else {
          groups.get("None")!.push(task);
        }
      });
    } else if (groupBy === "status") {
      groups.set("To Do", []);
      groups.set("In Progress", []);
      groups.set("Done", []);

      sortedTasks.forEach((task) => {
        const status = task.status || "todo";
        if (status === "todo") {
          groups.get("To Do")!.push(task);
        } else if (status === "in_progress") {
          groups.get("In Progress")!.push(task);
        } else if (status === "done") {
          groups.get("Done")!.push(task);
        }
      });
    } else if (groupBy === "project") {
      groups.set("Current Project", sortedTasks);
    }

    return groups;
  }, [sortedTasks, groupBy, sections]);

  const handleToggleSectionCollapse = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const handleSelectTask = useCallback((taskId: string, selected: boolean) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  }, []);

  const handleToggleComplete = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const newStatus = task.status === "done" ? "todo" : "done";
      toggleTaskMutation.mutate({ taskId, status: newStatus });
    }
  }, [tasks, toggleTaskMutation]);

  const handleToggleImportant = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      updateTaskMutation.mutate({ taskId, data: { isImportant: !task.isImportant } });
    }
  }, [tasks, updateTaskMutation]);

  const handleSetPriority = useCallback((taskId: string, priority: string) => {
    updateTaskMutation.mutate({ taskId, data: { priority } });
  }, [updateTaskMutation]);

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  const handleBulkComplete = useCallback(() => {
    bulkUpdateMutation.mutate({
      taskIds: Array.from(selectedTasks),
      data: { status: "done" },
    });
  }, [selectedTasks, bulkUpdateMutation]);

  const handleBulkUncomplete = useCallback(() => {
    bulkUpdateMutation.mutate({
      taskIds: Array.from(selectedTasks),
      data: { status: "todo" },
    });
  }, [selectedTasks, bulkUpdateMutation]);

  const handleBulkSetPriority = useCallback((priority: string) => {
    bulkUpdateMutation.mutate({
      taskIds: Array.from(selectedTasks),
      data: { priority },
    });
  }, [selectedTasks, bulkUpdateMutation]);

  const handleBulkSetDueDate = useCallback((date: Date | null) => {
    bulkUpdateMutation.mutate({
      taskIds: Array.from(selectedTasks),
      data: { dueDate: date },
    });
  }, [selectedTasks, bulkUpdateMutation]);

  const handleBulkDelete = useCallback(() => {
    bulkDeleteMutation.mutate(Array.from(selectedTasks));
  }, [selectedTasks, bulkDeleteMutation]);

  const handleFilterClick = useCallback(() => {
    toast({
      title: "Filter",
      description: "Advanced filter panel coming soon",
    });
  }, [toast]);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === "SECTION") {
      const sortedSections = [...sections].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const reorderedSections = Array.from(sortedSections);
      const [removed] = reorderedSections.splice(source.index, 1);
      reorderedSections.splice(destination.index, 0, removed);
      
      const sectionIds = reorderedSections.map(s => s.id);
      reorderSectionsMutation.mutate(sectionIds);
      return;
    }

    if (type === "TASK") {
      const sourceSectionId = source.droppableId === "no-section" ? null : source.droppableId;
      const destSectionId = destination.droppableId === "no-section" ? null : destination.droppableId;

      const sourceTasks = groupedTasks.get(sourceSectionId) || [];
      const taskToMove = sourceTasks[source.index];
      
      if (!taskToMove) return;

      if (sourceSectionId === destSectionId) {
        const reorderedTasks = Array.from(sourceTasks);
        const [removed] = reorderedTasks.splice(source.index, 1);
        reorderedTasks.splice(destination.index, 0, removed);
        
        reorderedTasks.forEach((task, index) => {
          if (task.position !== index) {
            updateTaskMutation.mutate({ taskId: task.id, data: { position: index } });
          }
        });
      } else {
        moveTaskToSectionMutation.mutate({
          taskId: taskToMove.id,
          sectionId: destSectionId,
          position: destination.index,
        });
      }
    }
  }, [sections, groupedTasks, reorderSectionsMutation, updateTaskMutation, moveTaskToSectionMutation]);

  const renderTaskCard = useCallback(
    (task: Task, index: number, dragHandleProps: DraggableProvidedDragHandleProps | null, isDragging: boolean) => (
      <EnhancedTaskCard
        key={task.id}
        task={task}
        isSelected={selectedTasks.has(task.id)}
        isCompact={isCompact}
        onSelect={handleSelectTask}
        onToggleComplete={handleToggleComplete}
        onToggleImportant={handleToggleImportant}
        onClick={onTaskClick}
        onSetPriority={handleSetPriority}
        onDelete={(taskId) => bulkDeleteMutation.mutate([taskId])}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
      />
    ),
    [selectedTasks, isCompact, handleSelectTask, handleToggleComplete, handleToggleImportant, onTaskClick, handleSetPriority, bulkDeleteMutation]
  );

  const enableDragDrop = sortBy === "manual" && groupBy === "none";

  const renderListView = () => {
    if (groupBy === "none") {
      const noSectionTasks = groupedTasks.get(null) || [];
      const sortedSections = [...sections].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      const content = (
        <>
          {noSectionTasks.length > 0 && (
            <TaskSection
              section={null}
              tasks={noSectionTasks}
              isCollapsed={collapsedSections.has("no-section")}
              onToggleCollapse={() => handleToggleSectionCollapse("no-section")}
              onAddTask={(sectionId) => onAddTask(sectionId ?? undefined)}
              onEditSection={() => {}}
              onDeleteSection={() => {}}
              renderTask={renderTaskCard}
              enableDragDrop={enableDragDrop}
            />
          )}

          {enableDragDrop ? (
            <Droppable droppableId="sections-list" type="SECTION">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={snapshot.isDraggingOver ? "bg-accent/10 rounded-md" : ""}
                >
                  {sortedSections.map((section, index) => {
                    const sectionTasks = groupedTasks.get(section.id) || [];
                    return (
                      <Draggable key={section.id} draggableId={`section-${section.id}`} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                          >
                            <TaskSection
                              section={{
                                id: section.id,
                                name: section.name || "Untitled Section",
                                position: section.sortOrder ?? 0,
                              }}
                              tasks={sectionTasks}
                              isCollapsed={collapsedSections.has(section.id)}
                              onToggleCollapse={() => handleToggleSectionCollapse(section.id)}
                              onAddTask={(sectionId) => onAddTask(sectionId ?? undefined)}
                              onEditSection={(s) => onEditSection?.({ ...section, name: s.name })}
                              onDeleteSection={(sectionId) => onDeleteSection?.(sectionId)}
                              renderTask={renderTaskCard}
                              enableDragDrop={enableDragDrop}
                              sectionDragHandleProps={dragProvided.dragHandleProps}
                              isSectionDragging={dragSnapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ) : (
            sortedSections.map((section) => {
              const sectionTasks = groupedTasks.get(section.id) || [];
              return (
                <TaskSection
                  key={section.id}
                  section={{
                    id: section.id,
                    name: section.name || "Untitled Section",
                    position: section.sortOrder ?? 0,
                  }}
                  tasks={sectionTasks}
                  isCollapsed={collapsedSections.has(section.id)}
                  onToggleCollapse={() => handleToggleSectionCollapse(section.id)}
                  onAddTask={(sectionId) => onAddTask(sectionId ?? undefined)}
                  onEditSection={(s) => onEditSection?.({ ...section, name: s.name })}
                  onDeleteSection={(sectionId) => onDeleteSection?.(sectionId)}
                  renderTask={renderTaskCard}
                  enableDragDrop={false}
                />
              );
            })
          )}
        </>
      );

      if (enableDragDrop) {
        return (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="space-y-2">
              {content}
            </div>
          </DragDropContext>
        );
      }

      return <div className="space-y-2">{content}</div>;
    }

    const groupEntries = Array.from(groupedTasks.entries())
      .filter(([key, tasks]) => key !== null && tasks.length > 0) as [string, Task[]][];

    return (
      <div className="space-y-2">
        {groupEntries.map(([groupName, groupTasks]) => (
          <TaskSection
            key={groupName}
            section={{
              id: groupName,
              name: groupName,
              position: 0,
            }}
            tasks={groupTasks}
            isCollapsed={collapsedSections.has(groupName)}
            onToggleCollapse={() => handleToggleSectionCollapse(groupName)}
            onAddTask={() => onAddTask()}
            onEditSection={() => {}}
            onDeleteSection={() => {}}
            renderTask={renderTaskCard}
            enableDragDrop={false}
          />
        ))}
      </div>
    );
  };

  const renderPlaceholder = (mode: string) => (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <Layers className="h-12 w-12 mb-4 opacity-50" />
      <p className="text-lg font-medium">{mode} View</p>
      <p className="text-sm">Coming soon</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full" data-testid="enhanced-list-view">
      <div className="flex items-center justify-between gap-4 border-b">
        <ViewOptionsToolbar
          viewMode={viewMode}
          setViewMode={setViewMode}
          sortBy={sortBy}
          setSortBy={setSortBy}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          showCompleted={showCompleted}
          setShowCompleted={setShowCompleted}
          isCompact={isCompact}
          setIsCompact={setIsCompact}
          onFilterClick={handleFilterClick}
        />
        <DurationSummaryInline tasks={filteredTasks} className="pr-4" />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {viewMode === "list" && renderListView()}
          {viewMode === "kanban" && renderPlaceholder("Kanban")}
          {viewMode === "calendar" && renderPlaceholder("Calendar")}
          {viewMode === "timeline" && renderPlaceholder("Timeline")}

          {viewMode === "list" && groupBy === "none" && (
            <Button
              variant="ghost"
              className="w-full mt-4 text-muted-foreground"
              onClick={onAddSection}
              data-testid="button-add-section"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          )}
        </div>
      </ScrollArea>

      <BulkActionsToolbar
        selectedCount={selectedTasks.size}
        onClearSelection={handleClearSelection}
        onBulkComplete={handleBulkComplete}
        onBulkUncomplete={handleBulkUncomplete}
        onBulkSetPriority={handleBulkSetPriority}
        onBulkSetDueDate={handleBulkSetDueDate}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  );
}
