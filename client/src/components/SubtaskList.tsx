import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Trash2, Plus, ListTodo } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useConfirm } from "@/hooks/use-confirm";
import type { TaskWithRelations } from "@shared/schema";

interface SubtaskListProps {
  parentTaskId: string;
  onSubtaskChange?: () => void;
}

export function SubtaskList({ parentTaskId, onSubtaskChange }: SubtaskListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const { data: subtasks = [], isLoading } = useQuery<TaskWithRelations[]>({
    queryKey: ["/api/tasks", parentTaskId, "subtasks"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${parentTaskId}/subtasks`);
      if (!response.ok) throw new Error("Failed to fetch subtasks");
      return response.json();
    },
  });

  const { data: progress } = useQuery<{ completed: number; total: number }>({
    queryKey: ["/api/tasks", parentTaskId, "progress"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${parentTaskId}/progress`);
      if (!response.ok) throw new Error("Failed to fetch progress");
      return response.json();
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", `/api/tasks/${parentTaskId}/subtasks`, { title });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", parentTaskId, "subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", parentTaskId, "progress"] });
      setNewSubtaskTitle("");
      setIsAdding(false);
      onSubtaskChange?.();
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", parentTaskId, "subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", parentTaskId, "progress"] });
      onSubtaskChange?.();
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", parentTaskId, "subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", parentTaskId, "progress"] });
      onSubtaskChange?.();
    },
  });

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    createSubtaskMutation.mutate(newSubtaskTitle.trim());
  };

  const handleToggleComplete = (subtask: TaskWithRelations) => {
    const newStatus = subtask.status === "done" ? "todo" : "done";
    updateSubtaskMutation.mutate({ id: subtask.id, status: newStatus });
  };

  const progressPercent = progress?.total ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          <span className="text-sm font-medium">
            Subtasks {progress?.total ? `(${progress.completed}/${progress.total})` : ""}
          </span>
        </div>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            data-testid="button-add-subtask"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {progress && progress.total > 0 && (
        <Progress value={progressPercent} className="h-2" data-testid="subtask-progress" />
      )}

      {isAdding && (
        <div className="flex gap-2">
          <Input
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            placeholder="Subtask title..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubtask();
              if (e.key === "Escape") {
                setIsAdding(false);
                setNewSubtaskTitle("");
              }
            }}
            autoFocus
            data-testid="input-new-subtask"
          />
          <Button
            size="sm"
            onClick={handleAddSubtask}
            disabled={createSubtaskMutation.isPending}
            data-testid="button-save-subtask"
          >
            Add
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAdding(false);
              setNewSubtaskTitle("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading subtasks...</div>
      ) : (
        <div className="space-y-1">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-3 p-2 rounded-md hover-elevate group"
              data-testid={`subtask-item-${subtask.id}`}
            >
              <Checkbox
                checked={subtask.status === "done"}
                onCheckedChange={() => handleToggleComplete(subtask)}
                data-testid={`checkbox-subtask-${subtask.id}`}
              />
              <span
                className={`flex-1 text-sm ${
                  subtask.status === "done" ? "line-through text-muted-foreground" : ""
                }`}
              >
                {subtask.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 visibility-hidden group-hover:visibility-visible"
                onClick={async () => {
                  const confirmed = await confirm({
                    title: "Delete Subtask",
                    description: "Are you sure you want to delete this subtask?",
                    confirmLabel: "Delete",
                    variant: "destructive",
                  });
                  if (confirmed) {
                    deleteSubtaskMutation.mutate(subtask.id);
                  }
                }}
                data-testid={`button-delete-subtask-${subtask.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
