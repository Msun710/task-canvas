import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().default("todo"),
  priority: z.string().default("medium"),
  projectId: z.string().min(1, "Project is required"),
  dueDate: z.string().optional(),
  estimatedTime: z.coerce.number().optional(),
  sectionId: z.string().optional(),
  isImportant: z.boolean().default(false),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  projects?: Project[];
  defaultStatus?: string;
  defaultSectionId?: string;
  defaultPriority?: string;
  defaultDueDate?: string;
  defaultIsImportant?: boolean;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  projectId,
  projects: externalProjects,
  defaultStatus = "todo",
  defaultSectionId,
  defaultPriority = "medium",
  defaultDueDate = "",
  defaultIsImportant = false,
}: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: fetchedProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: !externalProjects,
  });

  const projects = externalProjects || fetchedProjects;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: defaultStatus,
      priority: defaultPriority,
      projectId: projectId || "",
      dueDate: defaultDueDate,
      estimatedTime: undefined,
      sectionId: defaultSectionId || "",
      isImportant: defaultIsImportant,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: "",
        status: defaultStatus,
        priority: defaultPriority,
        projectId: projectId || "",
        dueDate: defaultDueDate,
        estimatedTime: undefined,
        sectionId: defaultSectionId || "",
        isImportant: defaultIsImportant,
      });
    }
  }, [open, defaultStatus, projectId, defaultSectionId, defaultPriority, defaultDueDate, defaultIsImportant, form]);

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      const payload = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        estimatedTime: data.estimatedTime || null,
        sectionId: data.sectionId || null,
        isImportant: data.isImportant || false,
      };
      const res = await apiRequest("POST", "/api/tasks", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      }
      toast({ title: "Task created successfully" });
      form.reset({
        title: "",
        description: "",
        status: defaultStatus,
        priority: defaultPriority,
        projectId: projectId || "",
        dueDate: defaultDueDate,
        estimatedTime: undefined,
        sectionId: defaultSectionId || "",
        isImportant: defaultIsImportant,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: TaskFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter task title..."
                      {...field}
                      data-testid="input-task-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a description..."
                      className="resize-none min-h-[80px]"
                      {...field}
                      data-testid="textarea-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!!projectId}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-project">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: project.color || "#3B82F6" }}
                              />
                              {project.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="review">In Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-due-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Minutes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-estimated-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-task">
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
