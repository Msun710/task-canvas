import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Clock, AlertTriangle, UserPlus, MessageSquare, 
  Repeat, CheckCircle, Calendar, Bell, Volume2, Eye, Moon, Save 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { NotificationSettings } from "@shared/schema";

const notificationSettingsSchema = z.object({
  taskDueSoon: z.boolean(),
  taskOverdue: z.boolean(),
  taskAssigned: z.boolean(),
  commentAdded: z.boolean(),
  recurringCreated: z.boolean(),
  taskCompleted: z.boolean(),
  projectDeadline: z.boolean(),
  soundEnabled: z.boolean(),
  quietHoursStart: z.string().nullable(),
  quietHoursEnd: z.string().nullable(),
  showPreview: z.boolean(),
});

type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;

const notificationTypes = [
  { key: "taskDueSoon" as const, label: "Task Due Soon", description: "When a task is due within 24 hours", icon: Clock, colorClass: "text-amber-500" },
  { key: "taskOverdue" as const, label: "Task Overdue", description: "When a task passes its due date", icon: AlertTriangle, colorClass: "text-red-500" },
  { key: "taskAssigned" as const, label: "Task Assigned", description: "When a task is assigned to you", icon: UserPlus, colorClass: "text-blue-500" },
  { key: "commentAdded" as const, label: "Comment Added", description: "When someone comments on your task", icon: MessageSquare, colorClass: "text-purple-500" },
  { key: "recurringCreated" as const, label: "Recurring Created", description: "When a recurring task instance is created", icon: Repeat, colorClass: "text-green-500" },
  { key: "taskCompleted" as const, label: "Task Completed", description: "When a task you're involved in is completed", icon: CheckCircle, colorClass: "text-emerald-500" },
  { key: "projectDeadline" as const, label: "Project Deadline", description: "When a project deadline is approaching", icon: Calendar, colorClass: "text-orange-500" },
];

export default function NotificationSettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<NotificationSettings>({
    queryKey: ["/api/notification-settings"],
  });

  const form = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      taskDueSoon: true,
      taskOverdue: true,
      taskAssigned: true,
      commentAdded: true,
      recurringCreated: false,
      taskCompleted: true,
      projectDeadline: true,
      soundEnabled: true,
      quietHoursStart: null,
      quietHoursEnd: null,
      showPreview: true,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        taskDueSoon: settings.taskDueSoon,
        taskOverdue: settings.taskOverdue,
        taskAssigned: settings.taskAssigned,
        commentAdded: settings.commentAdded,
        recurringCreated: settings.recurringCreated,
        taskCompleted: settings.taskCompleted,
        projectDeadline: settings.projectDeadline,
        soundEnabled: settings.soundEnabled,
        quietHoursStart: settings.quietHoursStart || null,
        quietHoursEnd: settings.quietHoursEnd || null,
        showPreview: settings.showPreview,
      });
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: NotificationSettingsFormValues) => {
      await apiRequest("PATCH", "/api/notification-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NotificationSettingsFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-6 max-w-2xl">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="h-6 w-6" />
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Notification Settings</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>Choose which notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <FormField
                    key={type.key}
                    control={form.control}
                    name={type.key}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${type.colorClass}`} />
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">{type.label}</FormLabel>
                            <FormDescription className="text-xs">{type.description}</FormDescription>
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid={`switch-${type.key}`}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sound & Display</CardTitle>
              <CardDescription>Configure notification behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="soundEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">Sound Enabled</FormLabel>
                        <FormDescription className="text-xs">Play a sound when notifications arrive</FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-soundEnabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showPreview"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">Show Preview</FormLabel>
                        <FormDescription className="text-xs">Show notification content in popups</FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-showPreview"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                <CardTitle>Quiet Hours</CardTitle>
              </div>
              <CardDescription>Set times when notifications are muted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <FormField
                  control={form.control}
                  name="quietHoursStart"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-xs">Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          data-testid="input-quiet-hours-start"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <span className="text-muted-foreground mt-6">to</span>
                <FormField
                  control={form.control}
                  name="quietHoursEnd"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-xs">End Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          data-testid="input-quiet-hours-end"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={updateMutation.isPending}
            data-testid="button-save-settings"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
