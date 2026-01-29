import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuCheckboxItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Star,
  Pencil,
  Copy,
  Calendar as CalendarIcon,
  CalendarCheck,
  Flag,
  Tag as TagIcon,
  FolderKanban,
  Trash2,
  Plus,
  Inbox,
  X,
} from "lucide-react";
import type { Task, Project, Tag } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TaskContextMenuProps {
  task: Task;
  projects: Project[];
  tags: Tag[];
  children: React.ReactNode;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (task: Task) => void;
  onEdit: (task: Task) => void;
  onCreateTag?: () => void;
}

export function TaskContextMenu({
  task,
  projects,
  tags,
  children,
  onUpdate,
  onDelete,
  onDuplicate,
  onEdit,
  onCreateTag,
}: TaskContextMenuProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const isCompleted = task.status === "done";
  const taskTags = (task as any).tags || [];
  const taskTagIds = taskTags.map((t: Tag) => t.id);

  const handleToggleComplete = () => {
    onUpdate(task.id, { status: isCompleted ? "todo" : "done" });
  };

  const handleToggleStar = () => {
    onUpdate(task.id, { isImportant: !task.isImportant });
  };

  const handleSetDueDate = (date: Date | null) => {
    onUpdate(task.id, { dueDate: date });
  };

  const handleSetPriority = (priority: string) => {
    onUpdate(task.id, { priority });
  };

  const handleToggleTag = (tagId: string) => {
    const hasTag = taskTagIds.includes(tagId);
    const newTagIds = hasTag
      ? taskTagIds.filter((id: string) => id !== tagId)
      : [...taskTagIds, tagId];
    onUpdate(task.id, { tagIds: newTagIds } as any);
  };

  const handleMoveToProject = (projectId: string | null) => {
    onUpdate(task.id, { projectId });
  };

  const handleAddToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    onUpdate(task.id, { dueDate: today });
  };

  const getDatePreset = (preset: string): Date => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    switch (preset) {
      case "today":
        return date;
      case "tomorrow":
        date.setDate(date.getDate() + 1);
        return date;
      case "next_week":
        date.setDate(date.getDate() + 7);
        return date;
      case "next_month":
        date.setMonth(date.getMonth() + 1);
        return date;
      default:
        return date;
    }
  };

  const priorityOptions = [
    { value: "urgent", label: "Urgent", color: "bg-red-500" },
    { value: "high", label: "High", color: "bg-orange-500" },
    { value: "medium", label: "Medium", color: "bg-yellow-500" },
    { value: "low", label: "Low", color: "bg-gray-400" },
  ];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56" data-testid={`context-menu-${task.id}`}>
        <ContextMenuCheckboxItem
          checked={isCompleted}
          onCheckedChange={handleToggleComplete}
          data-testid={`context-complete-${task.id}`}
        >
          {isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
        </ContextMenuCheckboxItem>

        <ContextMenuItem
          onClick={handleToggleStar}
          data-testid={`context-star-${task.id}`}
        >
          <Star
            className={cn(
              "h-4 w-4 mr-2",
              task.isImportant && "fill-current text-yellow-500"
            )}
          />
          {task.isImportant ? "Unstar" : "Star"}
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={() => onEdit(task)}
          data-testid={`context-edit-${task.id}`}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </ContextMenuItem>

        <ContextMenuItem
          onClick={() => onDuplicate(task)}
          data-testid={`context-duplicate-${task.id}`}
        >
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger data-testid={`context-due-date-${task.id}`}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Set Due Date
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem
              onClick={() => handleSetDueDate(getDatePreset("today"))}
              data-testid={`context-due-today-${task.id}`}
            >
              Today
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => handleSetDueDate(getDatePreset("tomorrow"))}
              data-testid={`context-due-tomorrow-${task.id}`}
            >
              Tomorrow
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => handleSetDueDate(getDatePreset("next_week"))}
              data-testid={`context-due-next-week-${task.id}`}
            >
              Next Week
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => handleSetDueDate(getDatePreset("next_month"))}
              data-testid={`context-due-next-month-${task.id}`}
            >
              Next Month
            </ContextMenuItem>
            <ContextMenuSeparator />
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <ContextMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setDatePickerOpen(true);
                  }}
                  data-testid={`context-pick-date-${task.id}`}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Pick Date...
                </ContextMenuItem>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={task.dueDate ? new Date(task.dueDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      handleSetDueDate(date);
                    }
                    setDatePickerOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => handleSetDueDate(null)}
              data-testid={`context-clear-date-${task.id}`}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Date
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger data-testid={`context-priority-${task.id}`}>
            <Flag className="h-4 w-4 mr-2" />
            Set Priority
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40">
            {priorityOptions.map((option) => (
              <ContextMenuItem
                key={option.value}
                onClick={() => handleSetPriority(option.value)}
                data-testid={`context-priority-${option.value}-${task.id}`}
              >
                <span className={cn("w-2 h-2 rounded-full mr-2", option.color)} />
                {option.label}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger data-testid={`context-tags-${task.id}`}>
            <TagIcon className="h-4 w-4 mr-2" />
            Add Tag
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 max-h-64 overflow-y-auto">
            {tags.length === 0 ? (
              <ContextMenuItem disabled className="text-muted-foreground">
                No tags available
              </ContextMenuItem>
            ) : (
              tags.map((tag) => (
                <ContextMenuCheckboxItem
                  key={tag.id}
                  checked={taskTagIds.includes(tag.id)}
                  onCheckedChange={() => handleToggleTag(tag.id)}
                  data-testid={`context-tag-${tag.id}-${task.id}`}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: tag.color || "#6B7280" }}
                  />
                  <span className="truncate">{tag.name}</span>
                </ContextMenuCheckboxItem>
              ))
            )}
            {onCreateTag && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={onCreateTag}
                  data-testid={`context-create-tag-${task.id}`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Tag...
                </ContextMenuItem>
              </>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger data-testid={`context-move-project-${task.id}`}>
            <FolderKanban className="h-4 w-4 mr-2" />
            Move to Project
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 max-h-64 overflow-y-auto">
            <ContextMenuItem
              onClick={() => handleMoveToProject(null)}
              data-testid={`context-move-inbox-${task.id}`}
            >
              <Inbox className="h-4 w-4 mr-2" />
              Inbox
            </ContextMenuItem>
            {projects.length > 0 && <ContextMenuSeparator />}
            {projects.map((project) => (
              <ContextMenuItem
                key={project.id}
                onClick={() => handleMoveToProject(project.id)}
                data-testid={`context-move-project-${project.id}-${task.id}`}
              >
                <span
                  className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: project.color || "#3B82F6" }}
                />
                <span className="truncate">{project.name}</span>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem
          onClick={handleAddToToday}
          data-testid={`context-add-today-${task.id}`}
        >
          <CalendarCheck className="h-4 w-4 mr-2" />
          Add to Today
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={() => onDelete(task.id)}
          className="text-destructive focus:text-destructive"
          data-testid={`context-delete-${task.id}`}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
