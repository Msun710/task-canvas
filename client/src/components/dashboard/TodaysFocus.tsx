import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Plus, Clock, FolderKanban } from "lucide-react";
import type { Task, Project } from "@shared/schema";

interface TodaysFocusProps {
  tasks: Task[];
  projects?: Project[];
  onComplete: (taskId: string) => void;
  onAddToFocus: () => void;
  onTaskClick?: (task: Task) => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatTime(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}:${minutes} ${suffix}`;
}

export function TodaysFocus({ 
  tasks, 
  projects = [], 
  onComplete, 
  onAddToFocus,
  onTaskClick 
}: TodaysFocusProps) {
  const focusTasks = tasks
    .filter(t => t.isImportant && t.status !== "done" && !t.isArchived)
    .slice(0, 5);

  const getProject = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId);
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            Today's Focus
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onAddToFocus}
            data-testid="button-add-to-focus"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {focusTasks.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Star className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No focus tasks</p>
            <p className="text-xs mt-1">Star important tasks to add them here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {focusTasks.map((task) => {
              const project = getProject(task.projectId);
              const dueTime = formatTime(task.dueTime);
              
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/50 hover-elevate group"
                  data-testid={`focus-task-${task.id}`}
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => onComplete(task.id)}
                    className="mt-0.5"
                    data-testid={`checkbox-focus-${task.id}`}
                  />
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onTaskClick?.(task)}
                  >
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {dueTime && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {dueTime}
                        </span>
                      )}
                      {task.estimatedTime && (
                        <Badge variant="outline" size="sm">
                          {formatDuration(task.estimatedTime)}
                        </Badge>
                      )}
                      {project && (
                        <Badge 
                          variant="secondary" 
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <span 
                            className="h-2 w-2 rounded-full" 
                            style={{ backgroundColor: project.color || '#6B7280' }}
                          />
                          {project.name}
                        </Badge>
                      )}
                      {task.priority !== "medium" && (
                        <Badge variant={getPriorityVariant(task.priority)} size="sm">
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
