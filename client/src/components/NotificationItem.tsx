import { formatDistanceToNow } from "date-fns";
import { X, Clock, AlertTriangle, UserPlus, MessageSquare, Repeat, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Notification } from "@shared/schema";

const notificationTypeConfig: Record<string, { icon: typeof Clock; colorClass: string }> = {
  task_due_soon: { icon: Clock, colorClass: "text-amber-500 dark:text-amber-400" },
  task_overdue: { icon: AlertTriangle, colorClass: "text-red-500 dark:text-red-400" },
  task_assigned: { icon: UserPlus, colorClass: "text-blue-500 dark:text-blue-400" },
  comment_added: { icon: MessageSquare, colorClass: "text-purple-500 dark:text-purple-400" },
  recurring_created: { icon: Repeat, colorClass: "text-green-500 dark:text-green-400" },
  task_completed: { icon: CheckCircle, colorClass: "text-emerald-500 dark:text-emerald-400" },
  project_deadline: { icon: Calendar, colorClass: "text-orange-500 dark:text-orange-400" },
};

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
}

export function NotificationItem({ notification, onRead, onDelete, onClick }: NotificationItemProps) {
  const config = notificationTypeConfig[notification.type] || { icon: Clock, colorClass: "text-muted-foreground" };
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id);
    }
    onClick?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 p-3 cursor-pointer hover-elevate rounded-md",
        !notification.isRead && "bg-muted/50"
      )}
      onClick={handleClick}
      data-testid={`notification-item-${notification.id}`}
    >
      {!notification.isRead && (
        <span 
          className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500"
          data-testid={`notification-unread-indicator-${notification.id}`}
        />
      )}
      
      <div className={cn("shrink-0 mt-0.5", config.colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium leading-tight" data-testid={`notification-title-${notification.id}`}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`notification-message-${notification.id}`}>
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground" data-testid={`notification-time-${notification.id}`}>
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 invisible group-hover:visible h-6 w-6"
        onClick={handleDelete}
        data-testid={`button-delete-notification-${notification.id}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
