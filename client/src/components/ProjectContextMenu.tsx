import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Plus,
  LayoutList,
  Pencil,
  Palette,
  ArrowUpDown,
  CheckCircle,
  Archive,
  Trash2,
} from "lucide-react";
import type { Project } from "@shared/schema";

interface ProjectContextMenuProps {
  project: Project;
  children: React.ReactNode;
  onAddTask: () => void;
  onAddSection: () => void;
  onRename: () => void;
  onColorChange: (color: string) => void;
  onSort: (sortBy: string) => void;
  onClearCompleted: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const colorOptions = [
  { value: "#EF4444", label: "Red" },
  { value: "#F97316", label: "Orange" },
  { value: "#EAB308", label: "Yellow" },
  { value: "#22C55E", label: "Green" },
  { value: "#3B82F6", label: "Blue" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
  { value: "#6B7280", label: "Gray" },
];

const sortOptions = [
  { value: "priority", label: "By Priority" },
  { value: "due_date", label: "By Due Date" },
  { value: "created_date", label: "By Created Date" },
  { value: "title", label: "By Title (A-Z)" },
  { value: "status", label: "By Status" },
  { value: "manual", label: "Manual (default)" },
];

export function ProjectContextMenu({
  project,
  children,
  onAddTask,
  onAddSection,
  onRename,
  onColorChange,
  onSort,
  onClearCompleted,
  onArchive,
  onDelete,
}: ProjectContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56" data-testid={`project-context-menu-${project.id}`}>
        <ContextMenuItem
          onClick={onAddTask}
          data-testid={`project-context-add-task-${project.id}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </ContextMenuItem>

        <ContextMenuItem
          onClick={onAddSection}
          data-testid={`project-context-add-section-${project.id}`}
        >
          <LayoutList className="h-4 w-4 mr-2" />
          Add Section
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onRename}
          data-testid={`project-context-rename-${project.id}`}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Rename
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger data-testid={`project-context-color-${project.id}`}>
            <Palette className="h-4 w-4 mr-2" />
            Change Color
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40">
            {colorOptions.map((option) => (
              <ContextMenuItem
                key={option.value}
                onClick={() => onColorChange(option.value)}
                data-testid={`project-context-color-${option.label.toLowerCase()}-${project.id}`}
              >
                <span
                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: option.value }}
                />
                {option.label}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger data-testid={`project-context-sort-${project.id}`}>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort Tasks
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {sortOptions.map((option) => (
              <ContextMenuItem
                key={option.value}
                onClick={() => onSort(option.value)}
                data-testid={`project-context-sort-${option.value}-${project.id}`}
              >
                {option.label}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onClearCompleted}
          data-testid={`project-context-clear-completed-${project.id}`}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Clear Completed
        </ContextMenuItem>

        <ContextMenuItem
          onClick={onArchive}
          data-testid={`project-context-archive-${project.id}`}
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive Project
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
          data-testid={`project-context-delete-${project.id}`}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Project
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
