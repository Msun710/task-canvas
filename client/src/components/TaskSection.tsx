import { type ReactNode, useCallback, memo } from "react";
import { ChevronRight, Plus, MoreHorizontal, Pencil, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Droppable, Draggable, type DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import type { Task } from "@shared/schema";

interface Section {
  id: string;
  name: string;
  position: number;
}

interface TaskSectionProps {
  section: Section | null;
  tasks: Task[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onAddTask: (sectionId: string | null) => void;
  onEditSection: (section: Section) => void;
  onDeleteSection: (sectionId: string) => void;
  renderTask: (task: Task, index: number, dragHandleProps: DraggableProvidedDragHandleProps | null, isDragging: boolean) => ReactNode;
  enableDragDrop?: boolean;
  sectionDragHandleProps?: DraggableProvidedDragHandleProps | null;
  isSectionDragging?: boolean;
}

export const TaskSection = memo(function TaskSection({
  section,
  tasks,
  isCollapsed,
  onToggleCollapse,
  onAddTask,
  onEditSection,
  onDeleteSection,
  renderTask,
  enableDragDrop = false,
  sectionDragHandleProps,
  isSectionDragging = false,
}: TaskSectionProps) {
  const sectionName = section?.name || "No Section";
  const sectionId = section?.id || "no-section";
  const taskCount = tasks.length;

  const handleAddTask = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddTask(section?.id || null);
  }, [onAddTask, section?.id]);

  const handleEditSection = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (section) {
      onEditSection(section);
    }
  }, [onEditSection, section]);

  const handleDeleteSection = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (section) {
      onDeleteSection(section.id);
    }
  }, [onDeleteSection, section]);

  const headerContent = (
    <div className={cn(
      "group flex items-center gap-2 py-2 px-2 hover-elevate cursor-pointer rounded-md transition-all duration-200",
      isSectionDragging && "shadow-lg ring-2 ring-primary/20"
    )}>
      {section && sectionDragHandleProps && (
        <div
          {...sectionDragHandleProps}
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical
            className={cn(
              "h-4 w-4 text-muted-foreground/50 cursor-grab transition-opacity",
              "invisible group-hover:visible",
              isSectionDragging && "visible"
            )}
            data-testid={`section-drag-handle-${sectionId}`}
          />
        </div>
      )}
      <ChevronRight
        className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          !isCollapsed && "rotate-90"
        )}
      />
      <span className="text-sm font-semibold flex-1">{sectionName}</span>
      <Badge variant="secondary" className="text-xs">
        {taskCount}
      </Badge>
      <Button
        size="icon"
        variant="ghost"
        className="invisible group-hover:visible"
        onClick={handleAddTask}
        data-testid={`button-add-task-section-${sectionId || "none"}`}
      >
        <Plus className="h-4 w-4" />
      </Button>
      {section && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="invisible group-hover:visible"
              onClick={(e) => e.stopPropagation()}
              data-testid={`button-section-menu-${sectionId}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleEditSection()}
              data-testid={`menu-item-edit-section-${sectionId}`}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Section
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteSection()}
              className="text-destructive focus:text-destructive"
              data-testid={`menu-item-delete-section-${sectionId}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  const renderTaskList = () => {
    if (!enableDragDrop) {
      return (
        <div className="pl-6 space-y-1">
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <div key={task.id}>{renderTask(task, index, null, false)}</div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-2 px-2">
              No tasks in this section
            </p>
          )}
        </div>
      );
    }

    return (
      <Droppable droppableId={sectionId} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "pl-6 space-y-1 min-h-[40px] rounded-md transition-colors duration-200",
              snapshot.isDraggingOver && "bg-accent/30 ring-1 ring-primary/20"
            )}
          >
            {tasks.length > 0 ? (
              tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                    >
                      {renderTask(task, index, dragProvided.dragHandleProps, dragSnapshot.isDragging)}
                    </div>
                  )}
                </Draggable>
              ))
            ) : !snapshot.isDraggingOver ? (
              <p className="text-sm text-muted-foreground py-2 px-2">
                No tasks in this section
              </p>
            ) : null}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  return (
    <div className={cn("mb-2", isSectionDragging && "opacity-90")} data-testid={`task-section-${sectionId || "none"}`}>
      {section ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <Collapsible open={!isCollapsed} onOpenChange={() => onToggleCollapse()}>
              <CollapsibleTrigger asChild>
                {headerContent}
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                {renderTaskList()}
              </CollapsibleContent>
            </Collapsible>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => handleEditSection()}
              data-testid={`context-menu-edit-section-${sectionId}`}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Section
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => handleDeleteSection()}
              className="text-destructive focus:text-destructive"
              data-testid={`context-menu-delete-section-${sectionId}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Section
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        <Collapsible open={!isCollapsed} onOpenChange={() => onToggleCollapse()}>
          <CollapsibleTrigger asChild>
            {headerContent}
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            {renderTaskList()}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
});
