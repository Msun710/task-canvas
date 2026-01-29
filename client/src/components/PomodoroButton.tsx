import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePomodoro } from "@/hooks/use-pomodoro";
import type { Task } from "@shared/schema";

interface PomodoroButtonProps {
  task: Task;
  className?: string;
}

export function PomodoroButton({ task, className }: PomodoroButtonProps) {
  const { isRunning, isPaused, currentTask, startTimer } = usePomodoro();

  const isDisabled = (isRunning || isPaused) && currentTask?.id !== task.id;
  const isActive = currentTask?.id === task.id && (isRunning || isPaused);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled && !isActive) {
      startTimer(task);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleClick}
          disabled={isDisabled}
          className={className}
          data-testid={`button-pomodoro-task-${task.id}`}
        >
          <Timer className={isActive ? "h-4 w-4 text-emerald-500" : "h-4 w-4"} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isActive
          ? "Focus session active"
          : isDisabled
            ? "Another session is running"
            : "Start Focus Session"}
      </TooltipContent>
    </Tooltip>
  );
}
