import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompletionSound } from "@/hooks/use-sound";
import { useToast } from "@/hooks/use-toast";
import {
  Flame,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Play,
  SkipForward,
  Pencil,
  Timer,
  Clock,
  Calendar,
  CheckCheck,
  GripVertical,
  StickyNote,
  History,
  Hourglass,
  AlertTriangle,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { Habit, HabitOccurrence, HabitWithSubHabits } from "@shared/schema";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

interface HabitCardProps {
  habit: HabitWithSubHabits;
  todayOccurrences: HabitOccurrence[];
  onEdit: (habit: HabitWithSubHabits) => void;
  onDelete: (habit: HabitWithSubHabits) => void;
}

export function HabitCard({ habit, todayOccurrences, onEdit, onDelete }: HabitCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const { playChime } = useCompletionSound();
  const { toast } = useToast();

  const getTodayOccurrence = (habitId: string) => {
    return todayOccurrences.find((o) => o.habitId === habitId);
  };

  const parentOcc = getTodayOccurrence(habit.id);
  const isCompleted = parentOcc?.status === "completed";

  const progress = calculateProgress(habit, getTodayOccurrence);
  const timeStatus = getTimeWindowStatus(habit);
  const totalDuration = getTotalEstimatedDuration(habit);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress.percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress.percentage]);

  const toggleSubHabitMutation = useMutation({
    mutationFn: (subHabitId: string) =>
      apiRequest("POST", `/api/habits/${subHabitId}/toggle-complete`, {
        date: new Date().toISOString(),
      }),
    onSuccess: (data: any) => {
      if (data.occurrence?.status === "completed") {
        playChime();
      }
      if (data.parentAutoCompleted) {
        const parentStatus = data.parentOccurrence?.completionStatus;
        if (parentStatus === "on_time") {
          toast({
            title: "Routine completed on time!",
            description: "All sub-habits finished within the time window.",
          });
        } else if (parentStatus === "late") {
          toast({
            title: "Routine completed!",
            description: "Finished after the scheduled time window.",
          });
        } else {
          toast({ title: "Routine completed!", description: "All requirements met." });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/occurrences/today"] });
    },
  });

  const completeAllSubHabitsMutation = useMutation({
    mutationFn: (parentId: string) =>
      apiRequest("POST", `/api/habits/${parentId}/complete-all-sub-habits`, {
        date: new Date().toISOString(),
      }),
    onSuccess: () => {
      playChime();
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/occurrences/today"] });
      toast({ title: "All done!", description: "All sub-habits marked as complete." });
    },
  });

  const reorderSubHabitsMutation = useMutation({
    mutationFn: ({ parentId, subHabitIds }: { parentId: string; subHabitIds: string[] }) =>
      apiRequest("PUT", `/api/habits/${parentId}/reorder-sub-habits`, { subHabitIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
    },
  });

  const uncheckAllMutation = useMutation({
    mutationFn: (parentId: string) =>
      apiRequest("POST", `/api/habits/${parentId}/uncheck-all-sub-habits`, {
        date: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/occurrences/today"] });
      toast({ title: "Reset", description: "All sub-habits unchecked." });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !habit.subHabits) return;

    const items = Array.from(habit.subHabits);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const subHabitIds = items.map((item) => item.id);
    reorderSubHabitsMutation.mutate({ parentId: habit.id, subHabitIds });
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getRecurrenceLabel = (recurrence: string) => {
    switch (recurrence) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "monthly":
        return "Monthly";
      default:
        return recurrence;
    }
  };

  return (
    <Card
      className={`overflow-visible transition-all ${
        timeStatus.color ? `border-2 ${timeStatus.color}` : ""
      }`}
      data-testid={`card-habit-${habit.id}`}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                data-testid={`button-expand-${habit.id}`}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={`font-semibold text-lg ${
                      isCompleted ? "line-through text-muted-foreground" : ""
                    }`}
                    data-testid={`text-habit-title-${habit.id}`}
                  >
                    {habit.name}
                  </h3>
                  {(habit.streakCount || 0) > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-orange-500/10 text-orange-600 border-orange-500/30"
                      data-testid={`badge-streak-${habit.id}`}
                    >
                      <Flame className="h-3 w-3 mr-1" />
                      {habit.streakCount}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => completeAllSubHabitsMutation.mutate(habit.id)}
                    disabled={isCompleted}
                    title="Start All"
                    data-testid={`button-start-all-${habit.id}`}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => uncheckAllMutation.mutate(habit.id)}
                    title="Skip"
                    data-testid={`button-skip-${habit.id}`}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-menu-${habit.id}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEdit(habit)}
                        data-testid={`button-edit-${habit.id}`}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(habit)}
                        className="text-destructive"
                        data-testid={`button-delete-${habit.id}`}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{getRecurrenceLabel(habit.recurrence)}</span>
                </div>
                {totalDuration > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(totalDuration)}</span>
                  </div>
                )}
                <TimeStatusBadge
                  status={timeStatus}
                  isCompleted={isCompleted}
                  completionStatus={parentOcc?.completionStatus}
                />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {progress.completed}/{progress.total} ({progress.percentage}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ease-out rounded-full ${getProgressBarColor(
                      progress.percentage
                    )}`}
                    style={{ width: `${animatedProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={`subhabits-${habit.id}`}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="border-t px-4 py-3 space-y-1 bg-muted/30"
                >
                  {habit.subHabits?.map((subHabit, index) => {
                    const subOcc = getTodayOccurrence(subHabit.id);
                    const isSubCompleted = subOcc?.status === "completed";

                    return (
                      <Draggable
                        key={subHabit.id}
                        draggableId={subHabit.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 py-2 px-2 rounded-md ${
                              snapshot.isDragging ? "bg-muted shadow-sm" : ""
                            }`}
                            data-testid={`sub-habit-${subHabit.id}`}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab text-muted-foreground"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <CircularCheckbox
                              checked={isSubCompleted}
                              onCheckedChange={() =>
                                toggleSubHabitMutation.mutate(subHabit.id)
                              }
                              size="sm"
                              data-testid={`checkbox-sub-${subHabit.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-sm ${
                                  isSubCompleted
                                    ? "line-through text-muted-foreground"
                                    : ""
                                }`}
                              >
                                {subHabit.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {subHabit.requiredDays &&
                                subHabit.requiredDays.length > 0 &&
                                subHabit.requiredDays.length < 7 && (
                                  <Badge variant="outline" className="text-xs">
                                    {subHabit.requiredDays
                                      .map((d) => DAYS_OF_WEEK[d]?.label || "")
                                      .join("/")}
                                  </Badge>
                                )}
                              {subHabit.estimatedDuration && (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatDuration(subHabit.estimatedDuration)}
                                </Badge>
                              )}
                              {(subHabit.streakCount || 0) > 0 && (
                                <div className="flex items-center gap-1 text-xs text-orange-500">
                                  <Flame className="h-3 w-3" />
                                  <span>{subHabit.streakCount}</span>
                                </div>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    data-testid={`button-sub-menu-${subHabit.id}`}
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    data-testid={`button-sub-skip-${subHabit.id}`}
                                  >
                                    <SkipForward className="h-4 w-4 mr-2" />
                                    Skip this one
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    data-testid={`button-sub-note-${subHabit.id}`}
                                  >
                                    <StickyNote className="h-4 w-4 mr-2" />
                                    Add quick note
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    data-testid={`button-sub-timer-${subHabit.id}`}
                                  >
                                    <Timer className="h-4 w-4 mr-2" />
                                    Start timer
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    data-testid={`button-sub-history-${subHabit.id}`}
                                  >
                                    <History className="h-4 w-4 mr-2" />
                                    View history
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                data-testid={`button-timer-${subHabit.id}`}
                              >
                                <Timer className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function TimeStatusBadge({
  status,
  isCompleted,
  completionStatus,
}: {
  status: ReturnType<typeof getTimeWindowStatus>;
  isCompleted: boolean;
  completionStatus?: string | null;
}) {
  if (isCompleted && completionStatus && completionStatus !== "pending") {
    return (
      <Badge
        variant="secondary"
        className={
          completionStatus === "on_time"
            ? "bg-green-500/20 text-green-700 border-green-500/30"
            : "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
        }
      >
        <CheckCheck className="h-3 w-3 mr-1" />
        {completionStatus === "on_time" ? "On time" : "Late"}
      </Badge>
    );
  }

  if (status.status === "none" || isCompleted) return null;

  const config = {
    active: {
      className: "bg-green-500/20 text-green-700 border-green-500/30",
      icon: <Hourglass className="h-3 w-3 mr-1" />,
      label: `Active - ${formatTimeRemaining(status.minutesRemaining || 0)} left`,
    },
    grace: {
      className: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
      icon: <AlertTriangle className="h-3 w-3 mr-1" />,
      label: `Grace period - ${formatTimeRemaining(status.minutesRemaining || 0)} left`,
    },
    upcoming: {
      className: "bg-blue-500/20 text-blue-700 border-blue-500/30",
      icon: <Clock className="h-3 w-3 mr-1" />,
      label: `Opens in ${formatTimeRemaining(status.minutesRemaining || 0)}`,
    },
    expired: {
      className: "bg-orange-500/20 text-orange-700 border-orange-500/30",
      icon: <AlertTriangle className="h-3 w-3 mr-1" />,
      label: "Window closed",
    },
  };

  const currentConfig = config[status.status as keyof typeof config];
  if (!currentConfig) return null;

  return (
    <Badge variant="secondary" className={currentConfig.className}>
      {currentConfig.icon}
      {currentConfig.label}
    </Badge>
  );
}

function calculateProgress(
  habit: HabitWithSubHabits,
  getTodayOccurrence: (id: string) => HabitOccurrence | undefined
) {
  if (!habit.subHabits || habit.subHabits.length === 0) {
    return { total: 0, completed: 0, percentage: 100 };
  }
  const total = habit.subHabits.length;
  const completed = habit.subHabits.filter((sub) => {
    const occ = getTodayOccurrence(sub.id);
    return occ?.status === "completed";
  }).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentage };
}

function getTimeWindowStatus(habit: Habit) {
  if (!habit.timeWindowEnabled || !habit.startTime || !habit.endTime) {
    return { status: "none", minutesRemaining: null, color: "" };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = habit.startTime.split(":").map(Number);
  const [endH, endM] = habit.endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const gracePeriod = habit.gracePeriodMinutes || 0;

  if (currentMinutes < startMinutes) {
    return {
      status: "upcoming",
      minutesRemaining: startMinutes - currentMinutes,
      color: "border-blue-500/50",
    };
  } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    return {
      status: "active",
      minutesRemaining: endMinutes - currentMinutes,
      color: "border-green-500/50",
    };
  } else if (currentMinutes <= endMinutes + gracePeriod) {
    return {
      status: "grace",
      minutesRemaining: endMinutes + gracePeriod - currentMinutes,
      color: "border-yellow-500/50",
    };
  } else {
    return {
      status: "expired",
      minutesRemaining: 0,
      color: "border-orange-500/50",
    };
  }
}

function getTotalEstimatedDuration(habit: HabitWithSubHabits) {
  if (!habit.subHabits) return 0;
  return habit.subHabits.reduce(
    (sum, sub) => sum + (sub.estimatedDuration || 0),
    0
  );
}

function formatDuration(minutes: number) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatTimeRemaining(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes} min`;
}
