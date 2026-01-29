import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import {
  List,
  Columns,
  CalendarDays,
  GanttChart,
  Filter,
} from "lucide-react";

export type ViewMode = "list" | "kanban" | "calendar" | "timeline";
export type SortOption = "manual" | "dueDate" | "priority" | "created" | "title";
export type GroupByOption = "none" | "dueDate" | "priority" | "project" | "status";

interface ViewOptionsToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  groupBy: GroupByOption;
  setGroupBy: (group: GroupByOption) => void;
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
  isCompact: boolean;
  setIsCompact: (compact: boolean) => void;
  onFilterClick: () => void;
}

export function ViewOptionsToolbar({
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  groupBy,
  setGroupBy,
  showCompleted,
  setShowCompleted,
  isCompact,
  setIsCompact,
  onFilterClick,
}: ViewOptionsToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 flex-wrap">
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(value) => value && setViewMode(value as ViewMode)}
        data-testid="toggle-view-mode"
      >
        <ToggleGroupItem value="list" aria-label="List view" data-testid="toggle-view-list">
          <List className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="kanban" aria-label="Kanban view" data-testid="toggle-view-kanban">
          <Columns className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="calendar" aria-label="Calendar view" data-testid="toggle-view-calendar">
          <CalendarDays className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="timeline" aria-label="Timeline view" data-testid="toggle-view-timeline">
          <GanttChart className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" className="h-6" />

      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
        <SelectTrigger className="w-[140px]" data-testid="select-sort-by">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">My Order</SelectItem>
          <SelectItem value="dueDate">Due Date</SelectItem>
          <SelectItem value="priority">Priority</SelectItem>
          <SelectItem value="created">Date Created</SelectItem>
          <SelectItem value="title">Title (A-Z)</SelectItem>
        </SelectContent>
      </Select>

      <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
        <SelectTrigger className="w-[140px]" data-testid="select-group-by">
          <SelectValue placeholder="Group by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="dueDate">Due Date</SelectItem>
          <SelectItem value="priority">Priority</SelectItem>
          <SelectItem value="project">Project</SelectItem>
          <SelectItem value="status">Status</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={onFilterClick} data-testid="button-filter">
        <Filter className="h-4 w-4 mr-2" />
        Filter
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-2">
        <Switch
          id="show-completed"
          checked={showCompleted}
          onCheckedChange={setShowCompleted}
          data-testid="switch-show-completed"
        />
        <Label htmlFor="show-completed" className="text-sm cursor-pointer">
          Completed
        </Label>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-2">
        <Label htmlFor="view-density" className="text-sm">
          {isCompact ? "Compact" : "Comfortable"}
        </Label>
        <Switch
          id="view-density"
          checked={isCompact}
          onCheckedChange={setIsCompact}
          data-testid="switch-view-density"
        />
      </div>
    </div>
  );
}
