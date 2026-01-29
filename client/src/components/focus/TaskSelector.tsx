import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Star, Clock, ChevronDown, Check, ListTodo, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Task, Project } from "@shared/schema";

interface TaskSelectorProps {
  onSelectTask: (task: Task) => void;
  selectedTaskId?: string;
  disabled?: boolean;
}

export function TaskSelector({ onSelectTask, selectedTaskId, disabled }: TaskSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  const getSubtaskCount = (taskId: string) => {
    return tasks.filter(t => t.parentTaskId === taskId).length;
  };

  const parentTasks = useMemo(() => {
    return tasks.filter(t => 
      !t.parentTaskId && 
      t.status !== "done" &&
      !t.isArchived
    );
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let filtered = parentTasks;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
      );
    }

    const importantTasks = filtered.filter(t => t.isImportant);
    const recentTasks = filtered
      .filter(t => t.lastFocusedAt)
      .sort((a, b) => {
        const aTime = a.lastFocusedAt ? new Date(a.lastFocusedAt).getTime() : 0;
        const bTime = b.lastFocusedAt ? new Date(b.lastFocusedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
    const otherTasks = filtered.filter(t => 
      !t.isImportant && 
      !recentTasks.some(r => r.id === t.id)
    );

    const uniqueTasks = new Map<string, Task>();
    [...importantTasks, ...recentTasks, ...otherTasks].forEach(t => {
      if (!uniqueTasks.has(t.id)) {
        uniqueTasks.set(t.id, t);
      }
    });

    return Array.from(uniqueTasks.values());
  }, [parentTasks, searchQuery]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const handleSelect = (task: Task) => {
    onSelectTask(task);
    setOpen(false);
    setSearchQuery("");
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between min-w-[280px] text-left font-normal",
            !selectedTask && "text-muted-foreground"
          )}
          data-testid="button-task-selector"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ListTodo className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {selectedTask ? selectedTask.title : "Select a task to focus on..."}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-task-search"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[320px]">
          {tasksLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? "No tasks found" : "No active tasks available"}
            </div>
          ) : (
            <div className="p-2">
              {filteredTasks.some(t => t.isImportant) && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Important
                  </div>
                  {filteredTasks
                    .filter(t => t.isImportant)
                    .map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        isSelected={task.id === selectedTaskId}
                        project={task.projectId ? projectMap.get(task.projectId) : undefined}
                        subtaskCount={getSubtaskCount(task.id)}
                        onSelect={handleSelect}
                        getPriorityVariant={getPriorityVariant}
                      />
                    ))}
                </div>
              )}
              {filteredTasks.some(t => t.lastFocusedAt && !t.isImportant) && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Recent
                  </div>
                  {filteredTasks
                    .filter(t => t.lastFocusedAt && !t.isImportant)
                    .slice(0, 5)
                    .map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        isSelected={task.id === selectedTaskId}
                        project={task.projectId ? projectMap.get(task.projectId) : undefined}
                        subtaskCount={getSubtaskCount(task.id)}
                        onSelect={handleSelect}
                        getPriorityVariant={getPriorityVariant}
                      />
                    ))}
                </div>
              )}
              {filteredTasks.some(t => !t.isImportant && !filteredTasks.filter(r => r.lastFocusedAt && !r.isImportant).slice(0, 5).some(r => r.id === t.id)) && (
                <div>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    All Tasks
                  </div>
                  {filteredTasks
                    .filter(t => !t.isImportant)
                    .filter(t => !filteredTasks.filter(r => r.lastFocusedAt && !r.isImportant).slice(0, 5).some(r => r.id === t.id))
                    .map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        isSelected={task.id === selectedTaskId}
                        project={task.projectId ? projectMap.get(task.projectId) : undefined}
                        subtaskCount={getSubtaskCount(task.id)}
                        onSelect={handleSelect}
                        getPriorityVariant={getPriorityVariant}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  project?: Project;
  subtaskCount: number;
  onSelect: (task: Task) => void;
  getPriorityVariant: (priority: string) => "default" | "secondary" | "destructive" | "outline";
}

function TaskItem({ task, isSelected, project, subtaskCount, onSelect, getPriorityVariant }: TaskItemProps) {
  return (
    <button
      className={cn(
        "w-full flex items-start gap-3 p-2 rounded-md text-left transition-colors hover-elevate",
        isSelected && "bg-accent"
      )}
      onClick={() => onSelect(task)}
      data-testid={`task-option-${task.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {task.isImportant && (
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{task.title}</span>
          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {project && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <FolderOpen className="h-3 w-3" />
              {project.name}
            </span>
          )}
          {subtaskCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {subtaskCount} subtask{subtaskCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {task.priority && task.priority !== "medium" && (
            <Badge variant={getPriorityVariant(task.priority)} className="text-xs">
              {task.priority}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
