import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  CheckCircle,
  Circle,
  Flag,
  Calendar,
  MessageSquare,
  Paperclip,
  Tag,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  User,
  ArrowRight,
} from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface Activity {
  id: string;
  taskId: string;
  userId: string;
  activityType: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  metadata: string | null;
  createdAt: string;
  user: UserType;
}

interface ActivityFeedProps {
  taskId: string;
  className?: string;
}

interface GroupedActivity {
  id: string;
  user: UserType;
  activities: Activity[];
  timestamp: string;
  isGrouped: boolean;
}

function getActivityIcon(activityType: string, field?: string | null) {
  switch (activityType) {
    case "created":
      return <Plus className="h-3 w-3" />;
    case "completed":
    case "status_change":
      if (field === "status") return <Circle className="h-3 w-3" />;
      return <CheckCircle className="h-3 w-3" />;
    case "field_change":
      if (field === "priority") return <Flag className="h-3 w-3" />;
      if (field === "dueDate" || field === "startDate")
        return <Calendar className="h-3 w-3" />;
      if (field === "assigneeId") return <User className="h-3 w-3" />;
      return <Edit className="h-3 w-3" />;
    case "comment_added":
      return <MessageSquare className="h-3 w-3" />;
    case "attachment_added":
      return <Paperclip className="h-3 w-3" />;
    case "subtask_completed":
      return <CheckCircle className="h-3 w-3" />;
    case "tag_added":
    case "tag_removed":
      return <Tag className="h-3 w-3" />;
    case "deleted":
      return <Trash2 className="h-3 w-3" />;
    default:
      return <Circle className="h-3 w-3" />;
  }
}

function formatFieldValue(field: string | null, value: string | null): string {
  if (!value) return "none";

  if (field === "dueDate" || field === "startDate") {
    try {
      const date = new Date(value);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }

  if (field === "priority") {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  if (field === "status") {
    const statusMap: Record<string, string> = {
      todo: "Todo",
      in_progress: "In Progress",
      done: "Done",
      blocked: "Blocked",
    };
    return statusMap[value] || value;
  }

  return value;
}

function formatActivityDescription(activity: Activity): JSX.Element {
  const { activityType, field, oldValue, newValue, metadata } = activity;

  switch (activityType) {
    case "created":
      return <span>created this task</span>;

    case "completed":
      return <span>completed this task</span>;

    case "field_change":
      if (field === "status") {
        return (
          <span>
            changed status from{" "}
            <Badge variant="outline" className="mx-1 text-xs">
              {formatFieldValue(field, oldValue)}
            </Badge>
            <ArrowRight className="inline h-3 w-3 mx-1" />
            <Badge variant="outline" className="mx-1 text-xs">
              {formatFieldValue(field, newValue)}
            </Badge>
          </span>
        );
      }
      if (field === "priority") {
        if (!oldValue) {
          return (
            <span>
              set priority to{" "}
              <Badge variant="outline" className="ml-1 text-xs">
                {formatFieldValue(field, newValue)}
              </Badge>
            </span>
          );
        }
        return (
          <span>
            changed priority from{" "}
            <Badge variant="outline" className="mx-1 text-xs">
              {formatFieldValue(field, oldValue)}
            </Badge>
            <ArrowRight className="inline h-3 w-3 mx-1" />
            <Badge variant="outline" className="mx-1 text-xs">
              {formatFieldValue(field, newValue)}
            </Badge>
          </span>
        );
      }
      if (field === "dueDate") {
        if (!oldValue) {
          return (
            <span>set due date to {formatFieldValue(field, newValue)}</span>
          );
        }
        return (
          <span>
            changed due date from {formatFieldValue(field, oldValue)} to{" "}
            {formatFieldValue(field, newValue)}
          </span>
        );
      }
      if (field === "startDate") {
        if (!oldValue) {
          return (
            <span>set start date to {formatFieldValue(field, newValue)}</span>
          );
        }
        return (
          <span>
            changed start date from {formatFieldValue(field, oldValue)} to{" "}
            {formatFieldValue(field, newValue)}
          </span>
        );
      }
      if (field === "title") {
        return <span>updated the title</span>;
      }
      if (field === "description") {
        return <span>updated the description</span>;
      }
      if (field === "assigneeId") {
        if (!oldValue && newValue) {
          return <span>assigned this task</span>;
        }
        if (oldValue && !newValue) {
          return <span>unassigned this task</span>;
        }
        return <span>reassigned this task</span>;
      }
      return (
        <span>
          updated {field?.replace(/([A-Z])/g, " $1").toLowerCase()}
        </span>
      );

    case "comment_added":
      return <span>added a comment</span>;

    case "attachment_added": {
      const filename = metadata || newValue || "file";
      return (
        <span>
          added attachment{" "}
          <span className="font-medium text-foreground">{filename}</span>
        </span>
      );
    }

    case "subtask_completed": {
      const subtaskName = metadata || newValue || "subtask";
      return (
        <span>
          completed subtask{" "}
          <span className="font-medium text-foreground">'{subtaskName}'</span>
        </span>
      );
    }

    case "tag_added": {
      const tagName = newValue || metadata || "tag";
      return (
        <span>
          added tag{" "}
          <Badge variant="secondary" className="ml-1 text-xs">
            {tagName}
          </Badge>
        </span>
      );
    }

    case "tag_removed": {
      const tagName = oldValue || metadata || "tag";
      return (
        <span>
          removed tag{" "}
          <Badge variant="secondary" className="ml-1 text-xs">
            {tagName}
          </Badge>
        </span>
      );
    }

    default:
      return <span>made changes</span>;
  }
}

function getUserInitials(user: UserType): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.firstName) {
    return user.firstName.slice(0, 2).toUpperCase();
  }
  return user.username.slice(0, 2).toUpperCase();
}

function getUserDisplayName(user: UserType): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) {
    return user.firstName;
  }
  return user.username;
}

function groupActivities(activities: Activity[]): GroupedActivity[] {
  if (!activities.length) return [];

  const grouped: GroupedActivity[] = [];
  let currentGroup: Activity[] = [];
  let currentUserId: string | null = null;
  let currentTimestamp: Date | null = null;

  for (const activity of activities) {
    const activityTime = new Date(activity.createdAt);

    if (
      currentUserId === activity.userId &&
      currentTimestamp &&
      differenceInMinutes(currentTimestamp, activityTime) <= 5
    ) {
      currentGroup.push(activity);
    } else {
      if (currentGroup.length > 0) {
        grouped.push({
          id: currentGroup[0].id,
          user: currentGroup[0].user,
          activities: currentGroup,
          timestamp: currentGroup[0].createdAt,
          isGrouped: currentGroup.length > 1,
        });
      }
      currentGroup = [activity];
      currentUserId = activity.userId;
      currentTimestamp = activityTime;
    }
  }

  if (currentGroup.length > 0) {
    grouped.push({
      id: currentGroup[0].id,
      user: currentGroup[0].user,
      activities: currentGroup,
      timestamp: currentGroup[0].createdAt,
      isGrouped: currentGroup.length > 1,
    });
  }

  return grouped;
}

function ActivityItemSingle({ activity }: { activity: Activity }) {
  return (
    <div
      className="flex items-start gap-3 py-3"
      data-testid={`activity-item-${activity.id}`}
    >
      <div className="relative flex flex-col items-center">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {getActivityIcon(activity.activityType, activity.field)}
        </div>
        <div className="absolute top-6 w-px h-[calc(100%+12px)] bg-border -z-10" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar className="h-5 w-5">
            <AvatarImage src={activity.user.profileImageUrl || undefined} />
            <AvatarFallback className="text-[10px]">
              {getUserInitials(activity.user)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm">
            {getUserDisplayName(activity.user)}
          </span>
          <span className="text-muted-foreground text-sm">
            {formatActivityDescription(activity)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(activity.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </div>
  );
}

function ActivityItemGrouped({ group }: { group: GroupedActivity }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className="flex items-start gap-3 py-3"
        data-testid={`activity-group-${group.id}`}
      >
        <div className="relative flex flex-col items-center">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Edit className="h-3 w-3" />
          </div>
          <div className="absolute top-6 w-px h-[calc(100%+12px)] bg-border -z-10" />
        </div>
        <div className="flex-1 min-w-0">
          <CollapsibleTrigger className="flex items-center gap-2 flex-wrap w-full text-left group">
            <Avatar className="h-5 w-5">
              <AvatarImage src={group.user.profileImageUrl || undefined} />
              <AvatarFallback className="text-[10px]">
                {getUserInitials(group.user)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">
              {getUserDisplayName(group.user)}
            </span>
            <span className="text-muted-foreground text-sm">
              updated {group.activities.length} fields
            </span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(group.timestamp), {
              addSuffix: true,
            })}
          </p>
          <CollapsibleContent>
            <div className="mt-2 space-y-2 pl-7 border-l border-border ml-0">
              {group.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-2 text-sm py-1"
                  data-testid={`activity-grouped-item-${activity.id}`}
                >
                  <div className="flex h-5 w-5 items-center justify-center text-muted-foreground">
                    {getActivityIcon(activity.activityType, activity.field)}
                  </div>
                  <span className="text-muted-foreground">
                    {formatActivityDescription(activity)}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 py-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityFeed({ taskId, className }: ActivityFeedProps) {
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/tasks", taskId, "activities"],
  });

  if (isLoading) {
    return (
      <div className={cn("", className)} data-testid="activity-feed-loading">
        <ActivityFeedSkeleton />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div
        className={cn("text-center py-8", className)}
        data-testid="activity-feed-empty"
      >
        <Circle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  const groupedActivities = groupActivities(activities);

  return (
    <div className={cn("", className)} data-testid="activity-feed">
      <div className="relative">
        {groupedActivities.map((group, index) => (
          <div
            key={group.id}
            className={cn(index === groupedActivities.length - 1 && "[&>div>div>.bg-border]:hidden")}
          >
            {group.isGrouped ? (
              <ActivityItemGrouped group={group} />
            ) : (
              <ActivityItemSingle activity={group.activities[0]} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
