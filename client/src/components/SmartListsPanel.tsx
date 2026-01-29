import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Calendar,
  CalendarDays,
  CalendarClock,
  ListTodo,
  Star,
  CalendarX,
  CheckCircle2,
  Plus,
  Trash2,
  Filter,
  CalendarIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, isThisWeek, isPast, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { TaskWithRelations, Task, List, Project } from "@shared/schema";

type SmartListFilter = "today" | "tomorrow" | "next7days" | "all" | "important" | "nodue" | "completed";

interface SmartListOption {
  id: SmartListFilter;
  label: string;
  icon: typeof Calendar;
  description: string;
}

interface SmartFilters {
  projectIds?: string[];
  priorities?: string[];
  statuses?: string[];
  dueDateFilter?: "overdue" | "today" | "this_week" | "no_due" | "custom_range";
  customDateStart?: string;
  customDateEnd?: string;
  importantOnly?: boolean;
}

const smartListOptions: SmartListOption[] = [
  { id: "today", label: "Today", icon: Calendar, description: "Tasks due today" },
  { id: "tomorrow", label: "Tomorrow", icon: CalendarDays, description: "Tasks due tomorrow" },
  { id: "next7days", label: "Next 7 Days", icon: CalendarClock, description: "Tasks due within a week" },
  { id: "all", label: "All", icon: ListTodo, description: "All active tasks" },
  { id: "important", label: "Important", icon: Star, description: "High priority tasks" },
  { id: "nodue", label: "No Due Date", icon: CalendarX, description: "Tasks without due date" },
  { id: "completed", label: "Completed", icon: CheckCircle2, description: "Completed in last 30 days" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const statusOptions = [
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const dueDateOptions = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "no_due", label: "No Due Date" },
  { value: "custom_range", label: "Custom Range" },
];

export function filterTasksBySmartFilters(tasks: TaskWithRelations[], filters: SmartFilters): TaskWithRelations[] {
  return tasks.filter(task => {
    if (filters.projectIds && filters.projectIds.length > 0) {
      if (!filters.projectIds.includes(task.projectId)) return false;
    }
    
    if (filters.priorities && filters.priorities.length > 0) {
      if (!filters.priorities.includes(task.priority)) return false;
    }
    
    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes(task.status)) return false;
    }
    
    if (filters.dueDateFilter) {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      
      switch (filters.dueDateFilter) {
        case "overdue":
          if (!dueDate || !isPast(endOfDay(dueDate))) return false;
          break;
        case "today":
          if (!dueDate || !isToday(dueDate)) return false;
          break;
        case "this_week":
          if (!dueDate || !isThisWeek(dueDate, { weekStartsOn: 1 })) return false;
          break;
        case "no_due":
          if (dueDate) return false;
          break;
        case "custom_range":
          if (filters.customDateStart && filters.customDateEnd) {
            if (!dueDate) return false;
            const start = startOfDay(new Date(filters.customDateStart));
            const end = endOfDay(new Date(filters.customDateEnd));
            if (!isWithinInterval(dueDate, { start, end })) return false;
          }
          break;
      }
    }
    
    if (filters.importantOnly && !task.isImportant) return false;
    
    return true;
  });
}

export function filterTasksByPreset(tasks: Task[], filter: SmartListFilter): Task[] {
  const now = new Date();
  
  return tasks.filter(task => {
    if (task.isArchived) return false;
    
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    
    switch (filter) {
      case "today":
        return dueDate && isToday(dueDate) && task.status !== "done";
      case "tomorrow":
        return dueDate && isTomorrow(dueDate) && task.status !== "done";
      case "next7days":
        if (!dueDate || task.status === "done") return false;
        const weekFromNow = new Date(now);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return dueDate >= now && dueDate <= weekFromNow;
      case "all":
        return task.status !== "done";
      case "important":
        return task.isImportant && task.status !== "done";
      case "nodue":
        return !dueDate && task.status !== "done";
      case "completed":
        if (task.status !== "done") return false;
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const completedAt = task.completedAt ? new Date(task.completedAt) : null;
        return completedAt ? completedAt >= thirtyDaysAgo : true;
      default:
        return true;
    }
  });
}

interface SmartListsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onFilterChange: (filteredTasks: Task[], filterName: string) => void;
  activeFilter: string | null;
}

export function SmartListsPanel({ 
  open, 
  onOpenChange, 
  tasks, 
  onFilterChange,
  activeFilter 
}: SmartListsPanelProps) {
  const { toast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState<SmartListFilter | null>(activeFilter as SmartListFilter || null);
  const [selectedCustomListId, setSelectedCustomListId] = useState<string | null>(null);

  useEffect(() => {
    if (activeFilter) {
      const filterMap: Record<string, SmartListFilter> = {
        "Today": "today",
        "Tomorrow": "tomorrow",
        "Next 7 Days": "next7days",
        "All": "all",
        "Important": "important",
        "No Due Date": "nodue",
        "Completed": "completed",
      };
      const mappedFilter = filterMap[activeFilter];
      if (mappedFilter) {
        setSelectedFilter(mappedFilter);
        setSelectedCustomListId(null);
      }
    } else {
      setSelectedFilter(null);
      setSelectedCustomListId(null);
    }
  }, [activeFilter]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<List | null>(null);
  
  const [newListName, setNewListName] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [dueDateFilter, setDueDateFilter] = useState<string>("");
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>();
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>();
  const [importantOnly, setImportantOnly] = useState(false);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customSmartLists = [] } = useQuery<List[]>({
    queryKey: ["/api/lists"],
    select: (data) => data.filter(list => list.isSmart),
  });

  const createListMutation = useMutation({
    mutationFn: async (data: { name: string; smartFilters: SmartFilters }) => {
      return apiRequest("POST", "/api/lists", {
        name: data.name,
        isSmart: true,
        smartFilters: data.smartFilters,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({ title: "Smart list created", description: "Your custom smart list has been created." });
      resetForm();
      setCreateDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create smart list.", variant: "destructive" });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({ title: "Smart list deleted", description: "Your custom smart list has been deleted." });
      if (selectedCustomListId === listToDelete?.id) {
        setSelectedCustomListId(null);
        setSelectedFilter("all");
        onFilterChange(filterTasksByPreset(tasks, "all"), "All");
      }
      setDeleteDialogOpen(false);
      setListToDelete(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete smart list.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewListName("");
    setSelectedProjectIds([]);
    setSelectedPriorities([]);
    setSelectedStatuses([]);
    setDueDateFilter("");
    setCustomDateStart(undefined);
    setCustomDateEnd(undefined);
    setImportantOnly(false);
  };

  const handleCreateSmartList = () => {
    if (!newListName.trim()) {
      toast({ title: "Name required", description: "Please enter a name for your smart list.", variant: "destructive" });
      return;
    }

    const filters: SmartFilters = {};
    if (selectedProjectIds.length > 0) filters.projectIds = selectedProjectIds;
    if (selectedPriorities.length > 0) filters.priorities = selectedPriorities;
    if (selectedStatuses.length > 0) filters.statuses = selectedStatuses;
    if (dueDateFilter) {
      filters.dueDateFilter = dueDateFilter as SmartFilters["dueDateFilter"];
      if (dueDateFilter === "custom_range" && customDateStart && customDateEnd) {
        filters.customDateStart = customDateStart.toISOString();
        filters.customDateEnd = customDateEnd.toISOString();
      }
    }
    if (importantOnly) filters.importantOnly = true;

    createListMutation.mutate({ name: newListName, smartFilters: filters });
  };

  const handleSelectPredefined = (option: SmartListOption) => {
    setSelectedFilter(option.id);
    setSelectedCustomListId(null);
    const filtered = filterTasksByPreset(tasks, option.id);
    onFilterChange(filtered, option.label);
  };

  const handleSelectCustomList = (list: List) => {
    setSelectedCustomListId(list.id);
    setSelectedFilter(null);
    if (list.smartFilters) {
      const filtered = filterTasksBySmartFilters(tasks as TaskWithRelations[], list.smartFilters as SmartFilters);
      onFilterChange(filtered as Task[], list.name);
    }
  };

  const handleClearFilter = () => {
    setSelectedFilter(null);
    setSelectedCustomListId(null);
    onFilterChange(tasks, "");
  };

  const handleDeleteClick = (e: React.MouseEvent, list: List) => {
    e.stopPropagation();
    setListToDelete(list);
    setDeleteDialogOpen(true);
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const togglePrioritySelection = (priority: string) => {
    setSelectedPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleStatusSelection = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const getFilterDescription = (filters: SmartFilters): string => {
    const parts: string[] = [];
    if (filters.projectIds?.length) parts.push(`${filters.projectIds.length} project(s)`);
    if (filters.priorities?.length) parts.push(filters.priorities.join(", ") + " priority");
    if (filters.statuses?.length) parts.push(filters.statuses.join(", "));
    if (filters.dueDateFilter) {
      const option = dueDateOptions.find(o => o.value === filters.dueDateFilter);
      if (option) parts.push(option.label);
    }
    if (filters.importantOnly) parts.push("Important only");
    return parts.length > 0 ? parts.join(" • ") : "No filters applied";
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Smart Lists
              </SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-close-smart-lists">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Quick Filters
                </span>
                {(selectedFilter || selectedCustomListId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilter}
                    className="h-7 text-xs"
                    data-testid="button-clear-filter"
                  >
                    Clear
                  </Button>
                )}
              </div>
              
              <nav className="space-y-1">
                {smartListOptions.map((option) => {
                  const IconComponent = option.icon;
                  const isActive = selectedFilter === option.id && !selectedCustomListId;
                  return (
                    <button
                      key={option.id}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => handleSelectPredefined(option)}
                      data-testid={`smart-filter-${option.id}`}
                    >
                      <IconComponent className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </nav>

              {customSmartLists.length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Custom Lists
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setCreateDialogOpen(true)}
                      data-testid="button-create-smart-list"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <nav className="space-y-1">
                    {customSmartLists.map((list) => {
                      const isActive = selectedCustomListId === list.id;
                      return (
                        <button
                          key={list.id}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors group",
                            isActive 
                              ? "bg-primary/10 text-primary" 
                              : "hover:bg-muted"
                          )}
                          onClick={() => handleSelectCustomList(list)}
                          data-testid={`smart-list-custom-${list.id}`}
                        >
                          <Filter className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{list.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {list.smartFilters ? getFilterDescription(list.smartFilters as SmartFilters) : "Custom filters"}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteClick(e, list)}
                            data-testid={`button-delete-smart-list-${list.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </button>
                      );
                    })}
                  </nav>
                </>
              )}

              {customSmartLists.length === 0 && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setCreateDialogOpen(true)}
                    data-testid="button-create-smart-list"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Custom List
                  </Button>
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Smart List</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">Name</Label>
              <Input
                id="list-name"
                placeholder="My Smart List"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                data-testid="input-smart-list-name"
              />
            </div>

            <div className="space-y-3">
              <Label>Projects</Label>
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors",
                      selectedProjectIds.includes(project.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover-elevate"
                    )}
                    onClick={() => toggleProjectSelection(project.id)}
                    data-testid={`checkbox-project-${project.id}`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color || "#6B7280" }}
                    />
                    <span className="text-sm">{project.name}</span>
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="text-sm text-muted-foreground">No projects available</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Priority</Label>
              <div className="flex flex-wrap gap-3">
                {priorityOptions.map((priority) => (
                  <label
                    key={priority.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedPriorities.includes(priority.value)}
                      onCheckedChange={() => togglePrioritySelection(priority.value)}
                      data-testid={`checkbox-priority-${priority.value}`}
                    />
                    <span className="text-sm">{priority.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-3">
                {statusOptions.map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedStatuses.includes(status.value)}
                      onCheckedChange={() => toggleStatusSelection(status.value)}
                      data-testid={`checkbox-status-${status.value}`}
                    />
                    <span className="text-sm">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Due Date</Label>
              <div className="flex flex-wrap gap-2">
                {dueDateOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={dueDateFilter === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDueDateFilter(dueDateFilter === option.value ? "" : option.value)}
                    data-testid={`button-duedate-${option.value}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              
              {dueDateFilter === "custom_range" && (
                <div className="flex gap-2 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {customDateStart ? format(customDateStart, "MMM d") : "Start"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customDateStart}
                        onSelect={setCustomDateStart}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="flex items-center text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {customDateEnd ? format(customDateEnd, "MMM d") : "End"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customDateEnd}
                        onSelect={setCustomDateEnd}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="important-only"
                checked={importantOnly}
                onCheckedChange={setImportantOnly}
                data-testid="switch-important-only"
              />
              <Label htmlFor="important-only" className="cursor-pointer">
                Important tasks only
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSmartList}
              disabled={createListMutation.isPending}
              data-testid="button-save-smart-list"
            >
              {createListMutation.isPending ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Smart List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{listToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => listToDelete && deleteListMutation.mutate(listToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
