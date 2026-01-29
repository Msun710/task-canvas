import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Calendar, Clock, ListTodo } from "lucide-react";
import type { Task, Project, Tag } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TaskGroup {
  today: Task[];
  tomorrow: Task[];
  thisWeek: Task[];
  later: Task[];
  noDate: Task[];
}

interface UpcomingTasksProps {
  groups: TaskGroup;
  projects?: Project[];
  onTaskClick: (task: Task) => void;
}

const INITIAL_SHOW_COUNT = 3;

function formatTime(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}:${minutes} ${suffix}`;
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-green-500";
    default:
      return "bg-gray-400";
  }
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "done") return false;
  return new Date(task.dueDate) < new Date();
}

interface TaskGroupSectionProps {
  title: string;
  tasks: Task[];
  projects?: Project[];
  onTaskClick: (task: Task) => void;
  variant?: "default" | "today" | "overdue";
  defaultOpen?: boolean;
}

function TaskGroupSection({
  title,
  tasks,
  projects = [],
  onTaskClick,
  variant = "default",
  defaultOpen = true,
}: TaskGroupSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  if (tasks.length === 0) return null;

  const displayedTasks = showAll ? tasks : tasks.slice(0, INITIAL_SHOW_COUNT);
  const remainingCount = tasks.length - INITIAL_SHOW_COUNT;

  const getProject = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId);
  };

  const getBorderClass = () => {
    switch (variant) {
      case "today":
        return "border-l-2 border-l-amber-500";
      case "overdue":
        return "border-l-2 border-l-red-500";
      default:
        return "";
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 py-2 px-1 hover-elevate rounded-md"
          data-testid={`button-toggle-group-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium text-sm">{title}</span>
          </div>
          <Badge variant="secondary" size="sm">
            {tasks.length}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={cn("space-y-1 mt-1 pl-2", getBorderClass())}>
          {displayedTasks.map((task) => {
            const project = getProject(task.projectId);
            const dueTime = formatTime(task.dueTime);
            const taskIsOverdue = isOverdue(task);

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                onClick={() => onTaskClick(task)}
                data-testid={`upcoming-task-${task.id}`}
              >
                <div
                  className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", getPriorityColor(task.priority))}
                  title={task.priority}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      taskIsOverdue && "text-red-600 dark:text-red-400"
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {project && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: project.color || "#6B7280" }}
                        />
                        {project.name}
                      </span>
                    )}
                    {dueTime && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {dueTime}
                      </span>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {task.tags.slice(0, 2).map((tag: Tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            size="sm"
                            style={{ borderColor: tag.color || undefined, color: tag.color || undefined }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {task.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{task.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {remainingCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-1 text-muted-foreground"
              data-testid={`button-show-more-${title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {showAll ? "Show less" : `Show ${remainingCount} more`}
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function UpcomingTasks({ groups, projects = [], onTaskClick }: UpcomingTasksProps) {
  const totalTasks =
    groups.today.length +
    groups.tomorrow.length +
    groups.thisWeek.length +
    groups.later.length +
    groups.noDate.length;

  return (
    <Card data-testid="card-upcoming-tasks">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Calendar className="h-4 w-4" />
          Upcoming Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalTasks === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No upcoming tasks</p>
            <p className="text-xs mt-1">Create a task to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            <TaskGroupSection
              title="Today"
              tasks={groups.today}
              projects={projects}
              onTaskClick={onTaskClick}
              variant="today"
              defaultOpen={true}
            />
            <TaskGroupSection
              title="Tomorrow"
              tasks={groups.tomorrow}
              projects={projects}
              onTaskClick={onTaskClick}
              defaultOpen={true}
            />
            <TaskGroupSection
              title="This Week"
              tasks={groups.thisWeek}
              projects={projects}
              onTaskClick={onTaskClick}
              defaultOpen={groups.today.length === 0 && groups.tomorrow.length === 0}
            />
            <TaskGroupSection
              title="Later"
              tasks={groups.later}
              projects={projects}
              onTaskClick={onTaskClick}
              defaultOpen={false}
            />
            <TaskGroupSection
              title="No Due Date"
              tasks={groups.noDate}
              projects={projects}
              onTaskClick={onTaskClick}
              defaultOpen={false}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
