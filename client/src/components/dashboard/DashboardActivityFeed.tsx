import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  Plus,
  MessageSquare,
  Edit,
  Trash2,
  FolderPlus,
  Calendar,
  Clock,
  Target,
  Activity,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityFeedItem } from "@shared/schema";

interface DashboardActivityFeedProps {
  className?: string;
  maxHeight?: number;
}

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  task_created: Plus,
  task_completed: CheckCircle,
  task_updated: Edit,
  task_deleted: Trash2,
  project_created: FolderPlus,
  comment_added: MessageSquare,
  due_date_changed: Calendar,
  time_logged: Clock,
  habit_completed: Target,
};

const ACTIVITY_COLORS: Record<string, string> = {
  task_created: "text-blue-500 bg-blue-500/10",
  task_completed: "text-green-500 bg-green-500/10",
  task_updated: "text-yellow-500 bg-yellow-500/10",
  task_deleted: "text-red-500 bg-red-500/10",
  project_created: "text-purple-500 bg-purple-500/10",
  comment_added: "text-indigo-500 bg-indigo-500/10",
  due_date_changed: "text-orange-500 bg-orange-500/10",
  time_logged: "text-cyan-500 bg-cyan-500/10",
  habit_completed: "text-emerald-500 bg-emerald-500/10",
};

function getActivityMessage(activity: ActivityFeedItem): string {
  switch (activity.actionType) {
    case "task_created":
      return `created task "${activity.entityTitle || "Untitled"}"`;
    case "task_completed":
      return `completed "${activity.entityTitle || "a task"}"`;
    case "task_updated":
      return `updated "${activity.entityTitle || "a task"}"`;
    case "task_deleted":
      return `deleted a task`;
    case "project_created":
      return `created project "${activity.entityTitle || "Untitled"}"`;
    case "comment_added":
      return `commented on "${activity.entityTitle || "a task"}"`;
    case "due_date_changed":
      return `changed due date for "${activity.entityTitle || "a task"}"`;
    case "time_logged":
      return `logged time on "${activity.entityTitle || "a task"}"`;
    case "habit_completed":
      return `completed habit "${activity.entityTitle || "Untitled"}"`;
    default:
      return `performed an action on "${activity.entityTitle || "an item"}"`;
  }
}

function getEntityUrl(activity: ActivityFeedItem): string | null {
  if (!activity.entityId) return null;
  
  switch (activity.entityType) {
    case "task":
      return `/tasks?taskId=${activity.entityId}`;
    case "project":
      return `/projects/${activity.entityId}`;
    case "habit":
      return `/habits?habitId=${activity.entityId}`;
    default:
      return null;
  }
}

function ActivityItem({ activity }: { activity: ActivityFeedItem }) {
  const IconComponent = ACTIVITY_ICONS[activity.actionType] || Activity;
  const colorClass = ACTIVITY_COLORS[activity.actionType] || "text-muted-foreground bg-muted";
  const entityUrl = getEntityUrl(activity);

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 py-2.5 px-2 rounded-md transition-colors",
        entityUrl && "hover-elevate cursor-pointer"
      )}
      data-testid={`activity-item-${activity.id}`}
    >
      <div
        className={cn(
          "flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center",
          colorClass
        )}
      >
        <IconComponent className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="text-muted-foreground">
            {getActivityMessage(activity)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );

  if (entityUrl) {
    return <Link href={entityUrl}>{content}</Link>;
  }

  return content;
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3 py-2.5 px-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardActivityFeed({
  className,
  maxHeight = 300,
}: DashboardActivityFeedProps) {
  const [limit, setLimit] = useState(10);

  const { data: response, isLoading, isRefetching } = useQuery<{ data: ActivityFeedItem[] }>({
    queryKey: ["/api/activity-feed", limit],
    queryFn: async () => {
      const res = await fetch(`/api/activity-feed?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch activity feed");
      return res.json();
    },
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const activities = response?.data || [];

  const handleLoadMore = () => {
    setLimit((prev) => prev + 10);
  };

  if (isLoading) {
    return (
      <Card className={className} data-testid="activity-feed-loading">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Activity className="h-4 w-4" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivitySkeleton />
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={className} data-testid="activity-feed-empty">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Activity className="h-4 w-4" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your actions will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="activity-feed">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Activity className="h-4 w-4" />
          Activity Feed
          {isRefetching && (
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-0.5 pr-4">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
          {activities.length >= limit && (
            <div className="pt-3 pb-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleLoadMore}
                data-testid="button-load-more-activities"
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                Load more
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
