import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  X,
  CheckCircle,
  Circle,
  Flag,
  CalendarIcon,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkComplete: () => void;
  onBulkUncomplete: () => void;
  onBulkSetPriority: (priority: string) => void;
  onBulkSetDueDate: (date: Date | null) => void;
  onBulkDelete: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onBulkComplete,
  onBulkUncomplete,
  onBulkSetPriority,
  onBulkSetDueDate,
  onBulkDelete,
}: BulkActionsToolbarProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    onBulkSetDueDate(date || null);
    setIsCalendarOpen(false);
  };

  const handleClearDate = () => {
    setSelectedDate(undefined);
    onBulkSetDueDate(null);
    setIsCalendarOpen(false);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "bg-background border shadow-lg rounded-lg",
        "flex items-center gap-2 p-3",
        "transition-all duration-200 ease-in-out",
        selectedCount > 0
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
      data-testid="bulk-actions-toolbar"
    >
      <span className="text-sm font-medium px-2" data-testid="text-selected-count">
        {selectedCount} selected
      </span>

      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        data-testid="button-clear-selection"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onBulkComplete}
        data-testid="button-bulk-complete"
      >
        <CheckCircle className="h-4 w-4 mr-1" />
        Complete
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onBulkUncomplete}
        data-testid="button-bulk-uncomplete"
      >
        <Circle className="h-4 w-4 mr-1" />
        Uncomplete
      </Button>

      <div className="h-6 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" data-testid="button-bulk-priority">
            <Flag className="h-4 w-4 mr-1" />
            Priority
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem
            onClick={() => onBulkSetPriority("none")}
            data-testid="menu-item-priority-none"
          >
            <span className="text-muted-foreground">None</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onBulkSetPriority("low")}
            data-testid="menu-item-priority-low"
          >
            <Flag className="h-4 w-4 mr-2 text-blue-500" />
            Low
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onBulkSetPriority("medium")}
            data-testid="menu-item-priority-medium"
          >
            <Flag className="h-4 w-4 mr-2 text-yellow-500" />
            Medium
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onBulkSetPriority("high")}
            data-testid="menu-item-priority-high"
          >
            <Flag className="h-4 w-4 mr-2 text-red-500" />
            High
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" data-testid="button-bulk-due-date">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Due Date
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={handleClearDate}
              data-testid="button-clear-due-date"
            >
              Clear date
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-6 w-px bg-border" />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            data-testid="button-bulk-delete"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onBulkDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
