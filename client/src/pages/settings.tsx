import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Settings, Palette, Layout, Type, Calendar, Clock, Eye, 
  List, Columns, Grid, Timer, LayoutGrid, RotateCcw, Save, 
  User, LogOut, Sun, Moon, Monitor
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { UserPreferences, TaskSection } from "@shared/schema";

const userPreferencesSchema = z.object({
  theme: z.string(),
  accentColor: z.string(),
  density: z.string(),
  fontSize: z.string(),
  taskCardStyle: z.string(),
  showDueDate: z.boolean(),
  showPriority: z.boolean(),
  showTags: z.boolean(),
  showProject: z.boolean(),
  showAssignee: z.boolean(),
  showEstimatedTime: z.boolean(),
  defaultListId: z.string().nullable(),
  defaultView: z.string(),
  smartDateParsing: z.boolean(),
  confirmBeforeDelete: z.boolean(),
  autoArchiveDays: z.number().min(0),
  firstDayOfWeek: z.string(),
  dateFormat: z.string(),
  timeFormat: z.string(),
});

type UserPreferencesFormValues = z.infer<typeof userPreferencesSchema>;

const defaultValues: UserPreferencesFormValues = {
  theme: "auto",
  accentColor: "emerald",
  density: "comfortable",
  fontSize: "medium",
  taskCardStyle: "default",
  showDueDate: true,
  showPriority: true,
  showTags: true,
  showProject: true,
  showAssignee: true,
  showEstimatedTime: true,
  defaultListId: null,
  defaultView: "list",
  smartDateParsing: true,
  confirmBeforeDelete: true,
  autoArchiveDays: 0,
  firstDayOfWeek: "sunday",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
};

const accentColors = [
  { value: "emerald", color: "bg-emerald-500", label: "Emerald" },
  { value: "blue", color: "bg-blue-500", label: "Blue" },
  { value: "purple", color: "bg-purple-500", label: "Purple" },
  { value: "rose", color: "bg-rose-500", label: "Rose" },
  { value: "amber", color: "bg-amber-500", label: "Amber" },
  { value: "orange", color: "bg-orange-500", label: "Orange" },
];

const metadataFields = [
  { key: "showDueDate" as const, label: "Show Due Date", description: "Display due date on task cards" },
  { key: "showPriority" as const, label: "Show Priority", description: "Display priority level indicator" },
  { key: "showTags" as const, label: "Show Tags", description: "Display tags on task cards" },
  { key: "showProject" as const, label: "Show Project", description: "Display project name on tasks" },
  { key: "showAssignee" as const, label: "Show Assignee", description: "Display assignee avatar" },
  { key: "showEstimatedTime" as const, label: "Show Estimated Time", description: "Display time estimates" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, isLoading: isUserLoading } = useAuth();

  const { data: preferences, isLoading: isPreferencesLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/user-preferences"],
  });

  const { data: sections = [] } = useQuery<TaskSection[]>({
    queryKey: ["/api/sections"],
  });

  const form = useForm<UserPreferencesFormValues>({
    resolver: zodResolver(userPreferencesSchema),
    defaultValues,
  });

  useEffect(() => {
    if (preferences) {
      form.reset({
        theme: preferences.theme || "auto",
        accentColor: preferences.accentColor || "emerald",
        density: preferences.density || "comfortable",
        fontSize: preferences.fontSize || "medium",
        taskCardStyle: preferences.taskCardStyle || "default",
        showDueDate: preferences.showDueDate ?? true,
        showPriority: preferences.showPriority ?? true,
        showTags: preferences.showTags ?? true,
        showProject: preferences.showProject ?? true,
        showAssignee: preferences.showAssignee ?? true,
        showEstimatedTime: preferences.showEstimatedTime ?? true,
        defaultListId: preferences.defaultListId || null,
        defaultView: preferences.defaultView || "list",
        smartDateParsing: preferences.smartDateParsing ?? true,
        confirmBeforeDelete: preferences.confirmBeforeDelete ?? true,
        autoArchiveDays: preferences.autoArchiveDays ?? 0,
        firstDayOfWeek: preferences.firstDayOfWeek || "sunday",
        dateFormat: preferences.dateFormat || "MM/DD/YYYY",
        timeFormat: preferences.timeFormat || "12h",
      });
    }
  }, [preferences, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: UserPreferencesFormValues) => {
      await apiRequest("PATCH", "/api/user-preferences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-preferences"] });
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
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

  const onSubmit = (data: UserPreferencesFormValues) => {
    updateMutation.mutate(data);
  };

  const handleReset = () => {
    form.reset(defaultValues);
    toast({
      title: "Settings reset",
      description: "All preferences have been reset to defaults.",
    });
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  if (isUserLoading || isPreferencesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-6 max-w-3xl">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Settings</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>Profile</CardTitle>
              </div>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={user?.profileImageUrl || undefined}
                    alt={user?.firstName || "User"}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-lg">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-lg font-medium" data-testid="text-user-name">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-muted-foreground" data-testid="text-user-email">
                    {user?.email}
                  </p>
                </div>
                <Button variant="destructive" asChild data-testid="button-logout">
                  <a href="/api/logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                <CardTitle>Appearance</CardTitle>
              </div>
              <CardDescription>Customize how TaskFlow looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Theme
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-4"
                        data-testid="radio-group-theme"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="light" id="theme-light" data-testid="radio-theme-light" />
                          <Label htmlFor="theme-light" className="flex items-center gap-1.5 cursor-pointer">
                            <Sun className="h-4 w-4" />
                            Light
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dark" id="theme-dark" data-testid="radio-theme-dark" />
                          <Label htmlFor="theme-dark" className="flex items-center gap-1.5 cursor-pointer">
                            <Moon className="h-4 w-4" />
                            Dark
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="auto" id="theme-auto" data-testid="radio-theme-auto" />
                          <Label htmlFor="theme-auto" className="flex items-center gap-1.5 cursor-pointer">
                            <Monitor className="h-4 w-4" />
                            Auto / System
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="accentColor"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Accent Color</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-3" data-testid="color-picker-accent">
                        {accentColors.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => field.onChange(color.value)}
                            className={cn(
                              "h-8 w-8 rounded-full transition-all",
                              color.color,
                              field.value === color.value
                                ? "ring-2 ring-offset-2 ring-foreground"
                                : "hover:scale-110"
                            )}
                            title={color.label}
                            data-testid={`color-${color.value}`}
                          />
                        ))}
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="density"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="flex items-center gap-2">
                      <Layout className="h-4 w-4" />
                      Density
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-4"
                        data-testid="radio-group-density"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="compact" id="density-compact" data-testid="radio-density-compact" />
                          <Label htmlFor="density-compact" className="cursor-pointer">Compact</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="comfortable" id="density-comfortable" data-testid="radio-density-comfortable" />
                          <Label htmlFor="density-comfortable" className="cursor-pointer">Comfortable</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="spacious" id="density-spacious" data-testid="radio-density-spacious" />
                          <Label htmlFor="density-spacious" className="cursor-pointer">Spacious</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="fontSize"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Font Size
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-wrap gap-4"
                        data-testid="radio-group-font-size"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="small" id="fontSize-small" data-testid="radio-font-small" />
                          <Label htmlFor="fontSize-small" className="cursor-pointer text-sm">Small</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="fontSize-medium" data-testid="radio-font-medium" />
                          <Label htmlFor="fontSize-medium" className="cursor-pointer">Medium</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="large" id="fontSize-large" data-testid="radio-font-large" />
                          <Label htmlFor="fontSize-large" className="cursor-pointer text-lg">Large</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="taskCardStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      Task Card Style
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-task-card-style">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="default" data-testid="option-style-default">Default</SelectItem>
                        <SelectItem value="minimal" data-testid="option-style-minimal">Minimal</SelectItem>
                        <SelectItem value="detailed" data-testid="option-style-detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <Label className="text-sm font-medium">Metadata Visibility</Label>
                </div>
                <p className="text-sm text-muted-foreground">Choose which metadata to show on task cards</p>
                <div className="space-y-4">
                  {metadataFields.map((field) => (
                    <FormField
                      key={field.key}
                      control={form.control}
                      name={field.key}
                      render={({ field: formField }) => (
                        <FormItem className="flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-normal">{field.label}</FormLabel>
                            <FormDescription className="text-xs">{field.description}</FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={formField.value}
                              onCheckedChange={formField.onChange}
                              data-testid={`switch-${field.key}`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle>Behavior</CardTitle>
              </div>
              <CardDescription>Configure how TaskFlow behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="defaultListId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      Default List for New Tasks
                    </FormLabel>
                    <Select 
                      value={field.value || "inbox"} 
                      onValueChange={(value) => field.onChange(value === "inbox" ? null : value)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-default-list">
                          <SelectValue placeholder="Select default list" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="inbox" data-testid="option-list-inbox">Inbox</SelectItem>
                        {sections.map((section) => (
                          <SelectItem key={section.id} value={section.id} data-testid={`option-list-${section.id}`}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Where new tasks are created by default</FormDescription>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="defaultView"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Columns className="h-4 w-4" />
                      Default View
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default-view">
                          <SelectValue placeholder="Select default view" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="list" data-testid="option-view-list">
                          <span className="flex items-center gap-2">
                            <List className="h-4 w-4" />
                            List
                          </span>
                        </SelectItem>
                        <SelectItem value="kanban" data-testid="option-view-kanban">
                          <span className="flex items-center gap-2">
                            <Columns className="h-4 w-4" />
                            Kanban
                          </span>
                        </SelectItem>
                        <SelectItem value="calendar" data-testid="option-view-calendar">
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Calendar
                          </span>
                        </SelectItem>
                        <SelectItem value="timeline" data-testid="option-view-timeline">
                          <span className="flex items-center gap-2">
                            <Timer className="h-4 w-4" />
                            Timeline
                          </span>
                        </SelectItem>
                        <SelectItem value="matrix" data-testid="option-view-matrix">
                          <span className="flex items-center gap-2">
                            <Grid className="h-4 w-4" />
                            Matrix
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="smartDateParsing"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Smart Date Parsing
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Parse natural language dates like "tomorrow" or "next week"
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-smart-date-parsing"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="confirmBeforeDelete"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel>Confirm Before Deleting</FormLabel>
                      <FormDescription className="text-xs">
                        Show a confirmation dialog before deleting tasks
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-confirm-delete"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="autoArchiveDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auto-archive Completed Tasks</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          className="w-24"
                          data-testid="input-auto-archive-days"
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">days (0 to disable)</span>
                    </div>
                    <FormDescription className="text-xs">
                      Automatically archive tasks after they've been completed for this many days
                    </FormDescription>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="firstDayOfWeek"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      First Day of Week
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex gap-4"
                        data-testid="radio-group-first-day"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sunday" id="week-sunday" data-testid="radio-week-sunday" />
                          <Label htmlFor="week-sunday" className="cursor-pointer">Sunday</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="monday" id="week-monday" data-testid="radio-week-monday" />
                          <Label htmlFor="week-monday" className="cursor-pointer">Monday</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="dateFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date Format
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-date-format">
                          <SelectValue placeholder="Select date format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY" data-testid="option-date-mmddyyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY" data-testid="option-date-ddmmyyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD" data-testid="option-date-yyyymmdd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="timeFormat"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time Format
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex gap-4"
                        data-testid="radio-group-time-format"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="12h" id="time-12h" data-testid="radio-time-12h" />
                          <Label htmlFor="time-12h" className="cursor-pointer">12-hour (1:30 PM)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="24h" id="time-24h" data-testid="radio-time-24h" />
                          <Label htmlFor="time-24h" className="cursor-pointer">24-hour (13:30)</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              data-testid="button-reset-settings"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
