import { useQuery } from "@tanstack/react-query";
import type { NotificationWithRelations } from "@shared/schema";

export function useNotifications() {
  const { data: notifications = [], isLoading: isLoadingNotifications, refetch: refetchNotifications } = useQuery<NotificationWithRelations[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const { data: unreadCount = 0, isLoading: isLoadingCount, refetch: refetchCount } = useQuery<number>({
    queryKey: ["/api/notifications/count"],
    refetchInterval: 30000,
  });

  const refetch = async () => {
    await Promise.all([refetchNotifications(), refetchCount()]);
  };

  return {
    notifications,
    unreadCount,
    isLoading: isLoadingNotifications || isLoadingCount,
    refetch,
  };
}
