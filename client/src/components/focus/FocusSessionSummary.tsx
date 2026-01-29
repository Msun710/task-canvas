import { useState } from "react";
import { Clock, CheckCircle2, Target, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Task } from "@shared/schema";
import type { TaskFocusSession, SubtaskFocusSegment } from "@/hooks/use-focus-session";

interface FocusSessionSummaryProps {
  session: TaskFocusSession;
  segments: SubtaskFocusSegment[];
  task: Task;
  subtasks: Task[];
  onClose: () => void;
  onSaveNotes?: (notes: string) => void;
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

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

export function FocusSessionSummary({
  session,
  segments,
  task,
  subtasks,
  onClose,
  onSaveNotes,
}: FocusSessionSummaryProps) {
  const [notes, setNotes] = useState(session.notes || "");
  const [notesSaved, setNotesSaved] = useState(false);

  const completedSubtasks = subtasks.filter(s => s.status === "done");
  const totalDuration = session.totalDuration;

  const subtaskDurations = new Map<string, number>();
  segments.forEach(seg => {
    const current = subtaskDurations.get(seg.subtaskId) || 0;
    subtaskDurations.set(seg.subtaskId, current + seg.duration);
  });

  const maxDuration = Math.max(...Array.from(subtaskDurations.values()), 1);

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      onSaveNotes(notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      data-testid="focus-session-summary"
    >
      <div className="w-full max-w-lg bg-gradient-to-b from-zinc-900 to-black rounded-xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-white">Session Complete</h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={onClose}
            data-testid="button-close-summary"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-medium text-white mb-2">{task.title}</h3>
            <div className="flex items-center justify-center gap-4 text-sm text-white/60">
              <span>{formatTime(session.startTime)} - {formatTime(session.endTime || Date.now())}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-400" />
                <span className="text-sm text-white/60">Total Time</span>
              </div>
              <span className="text-2xl font-bold text-white" data-testid="text-total-duration">
                {formatDuration(totalDuration)}
              </span>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-white/60">Subtasks Done</span>
              </div>
              <span className="text-2xl font-bold text-white" data-testid="text-completed-count">
                {completedSubtasks.length}/{subtasks.length}
              </span>
            </div>
          </div>

          {subtasks.length > 0 && subtaskDurations.size > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/80">Time Breakdown</h4>
              <div className="space-y-2">
                {subtasks.map(subtask => {
                  const duration = subtaskDurations.get(subtask.id) || 0;
                  if (duration === 0) return null;
                  const percentage = (duration / maxDuration) * 100;
                  
                  return (
                    <div key={subtask.id} className="space-y-1" data-testid={`breakdown-${subtask.id}`}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className={cn(
                          "truncate flex-1",
                          subtask.status === "done" ? "text-white/40" : "text-white/80"
                        )}>
                          {subtask.title}
                        </span>
                        <span className="text-white/60 shrink-0">
                          {formatDuration(duration)}
                        </span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-2 bg-white/10"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-white/80">Session Notes</h4>
              {notesSaved && (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-0">
                  Saved
                </Badge>
              )}
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this session..."
              className="min-h-[80px] bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              data-testid="textarea-session-notes"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-white/10 bg-white/5">
          {onSaveNotes && (
            <Button
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
              onClick={handleSaveNotes}
              data-testid="button-save-notes"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Notes
            </Button>
          )}
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onClose}
            data-testid="button-done"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
