import { useState, useMemo, useCallback } from "react";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Filter,
  SortAsc,
  Plus,
  X,
} from "lucide-react";
import type { TaskWithRelations, User, Project } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/use-debounce";

interface TaskListViewProps {
  tasks: TaskWithRelations[];
  users?: User[];
  projects?: Project[];
  showProject?: boolean;
  onTaskClick?: (task: TaskWithRelations) => void;
  onTaskStatusChange?: (taskId: string, status: string) => void;
  onSubtaskStatusChange?: (subtaskId: string, status: string) => void;
  onAddTask?: () => void;
}

type SortOption = "dueDate" | "priority" | "created" | "title";
type FilterStatus = "all" | "todo" | "in_progress" | "review" | "done";
type FilterPriority = "all" | "urgent" | "high" | "medium" | "low";

export function TaskListView({
  tasks,
  users = [],
  projects = [],
  showProject = false,
  onTaskClick,
  onTaskStatusChange,
  onSubtaskStatusChange,
  onAddTask,
}: TaskListViewProps) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [sortBy, setSortBy] = useState<SortOption>("dueDate");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");
  const [showCompleted, setShowCompleted] = useState(true);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    result = result.filter((task) => !task.parentTaskId);

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filterStatus !== "all") {
      result = result.filter((task) => task.status === filterStatus);
    }

    if (filterPriority !== "all") {
      result = result.filter((task) => task.priority === filterPriority);
    }

    if (!showCompleted) {
      result = result.filter((task) => task.status !== "done");
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "dueDate":
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "priority":
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
                 (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
        case "created":
          return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, debouncedSearch, sortBy, filterStatus, filterPriority, showCompleted]);

  const activeFiltersCount = useMemo(() => [
    filterStatus !== "all",
    filterPriority !== "all",
    !showCompleted,
  ].filter(Boolean).length, [filterStatus, filterPriority, showCompleted]);

  const clearFilters = useCallback(() => {
    setFilterStatus("all");
    setFilterPriority("all");
    setShowCompleted(true);
  }, []);

  const subtasksByParentId = useMemo(() => {
    const map: Record<string, typeof tasks> = {};
    for (const task of tasks) {
      if (task.parentTaskId) {
        if (!map[task.parentTaskId]) {
          map[task.parentTaskId] = [];
        }
        map[task.parentTaskId].push(task);
      }
    }
    return map;
  }, [tasks]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 pb-4 border-b">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              data-testid="input-search-tasks"
            />
          </div>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[140px]" data-testid="select-sort">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-[130px]" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as FilterPriority)}>
            <SelectTrigger className="w-[130px]" data-testid="select-priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={onAddTask} data-testid="button-add-task">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={showCompleted}
              onCheckedChange={(checked) => setShowCompleted(!!checked)}
              data-testid="checkbox-show-completed"
            />
            Show completed
          </label>

          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Clear filters ({activeFiltersCount})
            </Button>
          )}

          <span className="text-sm text-muted-foreground ml-auto">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="py-4">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No tasks found</p>
              <p className="text-sm">Try adjusting your filters or create a new task</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map((task) => {
                const taskSubtasks = subtasksByParentId[task.id] || [];
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    subtasks={taskSubtasks}
                    onClick={() => onTaskClick?.(task)}
                    onStatusChange={(status) => onTaskStatusChange?.(task.id, status)}
                    onSubtaskStatusChange={onSubtaskStatusChange}
                  />
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
