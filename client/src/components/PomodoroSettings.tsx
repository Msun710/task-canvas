import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PomodoroSettings } from "@shared/schema";

const settingsSchema = z.object({
  workDuration: z.coerce.number().min(1).max(120),
  shortBreakDuration: z.coerce.number().min(1).max(60),
  longBreakDuration: z.coerce.number().min(1).max(120),
  sessionsUntilLongBreak: z.coerce.number().min(1).max(10),
  autoStartBreaks: z.boolean(),
  autoStartWork: z.boolean(),
  soundEnabled: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface PomodoroSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PomodoroSettingsDialog({ open, onOpenChange }: PomodoroSettingsDialogProps) {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<PomodoroSettings>({
    queryKey: ["/api/pomodoro/settings"],
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsUntilLongBreak: 4,
      autoStartBreaks: false,
      autoStartWork: false,
      soundEnabled: true,
    },
    values: settings
      ? {
          workDuration: settings.workDuration,
          shortBreakDuration: settings.shortBreakDuration,
          longBreakDuration: settings.longBreakDuration,
          sessionsUntilLongBreak: settings.sessionsUntilLongBreak,
          autoStartBreaks: settings.autoStartBreaks ?? false,
          autoStartWork: settings.autoStartWork ?? false,
          soundEnabled: settings.soundEnabled ?? true,
        }
      : undefined,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      return apiRequest("PUT", "/api/pomodoro/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pomodoro/settings"] });
      toast({
        title: "Settings saved",
        description: "Your timer settings have been updated.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-pomodoro-settings">
        <DialogHeader>
          <DialogTitle>Timer Settings</DialogTitle>
          <DialogDescription>
            Customize your Pomodoro timer intervals and preferences.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Focus Duration</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          {...field}
                          data-testid="input-work-duration"
                        />
                        <span className="text-sm text-muted-foreground">min</span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shortBreakDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Break</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          {...field}
                          data-testid="input-short-break-duration"
                        />
                        <span className="text-sm text-muted-foreground">min</span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longBreakDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Long Break</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          {...field}
                          data-testid="input-long-break-duration"
                        />
                        <span className="text-sm text-muted-foreground">min</span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sessionsUntilLongBreak"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sessions for Long Break</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        data-testid="input-sessions-until-long-break"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 pt-2">
              <FormField
                control={form.control}
                name="autoStartBreaks"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel>Auto-start Breaks</FormLabel>
                      <FormDescription>
                        Automatically start break timer after focus session
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-auto-start-breaks"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="autoStartWork"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel>Auto-start Focus</FormLabel>
                      <FormDescription>
                        Automatically start focus timer after break
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-auto-start-work"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="soundEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel>Sound Notifications</FormLabel>
                      <FormDescription>
                        Play sound when timer completes
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-sound-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-settings"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
