import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { TaskWithRelations } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface VirtualTaskListProps {
  projectId?: string;
  sectionId?: string;
  status?: string;
  renderTask: (task: TaskWithRelations) => React.ReactNode;
  estimateSize?: number;
  className?: string;
}

export function VirtualTaskList({ 
  projectId, 
  sectionId, 
  status, 
  renderTask, 
  estimateSize = 60,
  className = "" 
}: VirtualTaskListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ["/api/tasks", { projectId, sectionId, status, paginated: true }],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      if (sectionId) params.set("sectionId", sectionId);
      if (status) params.set("status", status);
      params.set("limit", "50");
      params.set("offset", String(pageParam * 50));
      const res = await fetch(`/api/tasks?${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch tasks");
      }
      return res.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 50 ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });

  const allTasks: TaskWithRelations[] = data?.pages.flatMap(page => page) ?? [];

  const virtualizer = useVirtualizer({
    count: hasNextPage ? allTasks.length + 1 : allTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems.at(-1);
    if (lastItem && lastItem.index >= allTasks.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [virtualItems, hasNextPage, fetchNextPage, isFetchingNextPage, allTasks.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8" data-testid="virtual-task-list-loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-muted-foreground" data-testid="virtual-task-list-error">
        Failed to load tasks
      </div>
    );
  }

  if (allTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-muted-foreground" data-testid="virtual-task-list-empty">
        No tasks found
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className={`h-full overflow-auto ${className}`}
      data-testid="virtual-task-list"
    >
      <div 
        style={{ 
          height: virtualizer.getTotalSize(), 
          position: "relative",
          width: "100%"
        }}
      >
        {virtualItems.map((virtualRow) => {
          const task = allTasks[virtualRow.index];
          if (!task) {
            return (
              <div 
                key="loader" 
                className="flex items-center justify-center"
                style={{ 
                  position: "absolute", 
                  top: virtualRow.start, 
                  left: 0,
                  width: "100%",
                  height: virtualRow.size 
                }}
                data-testid="virtual-task-list-loader"
              >
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
              </div>
            );
          }
          return (
            <div
              key={task.id}
              style={{ 
                position: "absolute", 
                top: virtualRow.start, 
                left: 0,
                width: "100%", 
                height: virtualRow.size 
              }}
              data-testid={`virtual-task-item-${task.id}`}
            >
              {renderTask(task)}
            </div>
          );
        })}
      </div>
      {isFetchingNextPage && (
        <div className="flex items-center justify-center p-4" data-testid="virtual-task-list-fetching">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
