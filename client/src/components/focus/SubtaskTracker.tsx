import { Check, Clock, Play } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Task } from "@shared/schema";
import type { SubtaskFocusSegment } from "@/hooks/use-focus-session";

interface SubtaskTrackerProps {
  task: Task;
  subtasks: Task[];
  activeSubtaskIndex: number | null;
  segments: SubtaskFocusSegment[];
  onSwitchSubtask: (index: number) => void;
  onCompleteSubtask: (index: number) => void;
  isSessionActive: boolean;
  getSubtaskDuration: (index: number) => number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

export function SubtaskTracker({
  task,
  subtasks,
  activeSubtaskIndex,
  segments,
  onSwitchSubtask,
  onCompleteSubtask,
  isSessionActive,
  getSubtaskDuration,
}: SubtaskTrackerProps) {
  const completedCount = subtasks.filter(s => s.status === "done").length;
  const totalCount = subtasks.length;

  if (subtasks.length === 0) {
    return null;
  }

  return (
    <div
      className="w-full max-w-md bg-white/5 backdrop-blur-sm rounded-lg border border-white/10"
      data-testid="subtask-tracker"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
        <h4 className="text-sm font-medium text-white/80">Subtasks</h4>
        <Badge variant="outline" className="border-white/20 text-white/60">
          {completedCount}/{totalCount} complete
        </Badge>
      </div>
      <ScrollArea className="max-h-64">
        <div className="p-2 space-y-1">
          {subtasks.map((subtask, index) => {
            const isActive = activeSubtaskIndex === index;
            const isCompleted = subtask.status === "done";
            const duration = getSubtaskDuration(index);

            return (
              <div
                key={subtask.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md transition-colors cursor-pointer",
                  isActive && "bg-emerald-500/20 border border-emerald-500/30",
                  !isActive && !isCompleted && "hover:bg-white/5",
                  isCompleted && "opacity-60"
                )}
                onClick={() => {
                  if (!isCompleted && isSessionActive) {
                    onSwitchSubtask(index);
                  }
                }}
                data-testid={`subtask-item-${index}`}
              >
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onCompleteSubtask(index);
                    }
                  }}
                  disabled={!isSessionActive && !isCompleted}
                  className="border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`checkbox-subtask-${index}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm flex-1 truncate",
                        isCompleted ? "text-white/40 line-through" : "text-white/80"
                      )}
                    >
                      {subtask.title}
                    </span>
                    {isActive && isSessionActive && (
                      <Badge className="bg-emerald-500/30 text-emerald-300 border-0">
                        <Play className="h-3 w-3 mr-1 fill-current" />
                        Active
                      </Badge>
                    )}
                    {isCompleted && (
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  {duration > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(duration)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      {isSessionActive && activeSubtaskIndex === null && (
        <div className="px-4 py-3 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">
            Click a subtask to start tracking time on it
          </p>
        </div>
      )}
    </div>
  );
}
