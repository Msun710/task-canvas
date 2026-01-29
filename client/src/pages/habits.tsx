import { useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompletionSound } from "@/hooks/use-sound";
import { useToast } from "@/hooks/use-toast";
import { useAchievementCheck } from "@/hooks/use-achievement-check";
import { Plus, Flame, Calendar, BarChart3, ChevronDown, ChevronRight, X, CheckCheck, Sparkles, Clock, MoreHorizontal, Trash2, Pencil, Hourglass, CheckCircle2, AlertTriangle, Target, Sunrise, ListChecks, Archive, Trophy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitCategoryGroup } from "@/components/habits/HabitCategoryGroup";
import { HabitDetailModal } from "@/components/habits/HabitDetailModal";
import { TemplateBrowserModal } from "@/components/habits/TemplateBrowserModal";
import { AchievementModal } from "@/components/habits/AchievementModal";
import { JournalInput } from "@/components/habits/JournalInput";
import type { HabitWithRelations, HabitOccurrence, Habit, HabitWithSubHabits } from "@shared/schema";

const CATEGORIES = [
  { value: "health", label: "Health" },
  { value: "fitness", label: "Fitness" },
  { value: "productivity", label: "Productivity" },
  { value: "mindfulness", label: "Mindfulness" },
  { value: "learning", label: "Learning" },
  { value: "other", label: "Other" },
];

const RECURRENCES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const COMPLETION_TYPES = [
  { value: "all_required", label: "All Required", description: "Parent completes when all sub-habits are done" },
  { value: "partial_allowed", label: "Partial Allowed", description: "Manual completion with any progress" },
  { value: "percentage_based", label: "Percentage Based", description: "Auto-complete at specified percentage" },
];

const TEMPLATES = [
  {
    name: "Morning Routine",
    description: "Start your day right",
    category: "productivity",
    subHabits: ["Wake up on time", "Brush teeth", "Shower", "Make bed", "Meditate 5 min"],
  },
  {
    name: "Workout Session",
    description: "Complete exercise routine",
    category: "fitness",
    subHabits: ["Warm-up stretches", "Cardio 20 min", "Strength training", "Cool-down"],
  },
  {
    name: "Healthy Evening",
    description: "Wind down properly",
    category: "health",
    subHabits: ["No screens after 9 PM", "Read 20 pages", "Prepare tomorrow's outfit", "Light stretching"],
  },
  {
    name: "Study Session",
    description: "Focused learning time",
    category: "learning",
    subHabits: ["Review notes", "Practice problems", "Read new material", "Summarize key points"],
  },
];

export default function HabitsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedHabits, setExpandedHabits] = useState<Set<string>>(new Set());
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "due" | "completed" | "missed" | "archived">("all");
  const [viewMode, setViewMode] = useState<"list" | "category">("list");
  const [newHabit, setNewHabit] = useState({
    name: "",
    description: "",
    category: "productivity",
    priority: "medium",
    recurrence: "daily",
    color: "#3B82F6",
    completionType: "all_required",
    requiredPercentage: 75,
    startTime: "",
    endTime: "",
    timeWindowEnabled: false,
    allowsEarlyCompletion: true,
    gracePeriodMinutes: 0,
    subHabits: [] as { name: string; estimatedDuration?: number; requiredDays?: number[] }[],
  });
  const [newSubHabitName, setNewSubHabitName] = useState("");
  const [newSubHabitDuration, setNewSubHabitDuration] = useState<number | undefined>();
  const [newSubHabitDays, setNewSubHabitDays] = useState<number[]>([]);
  const [editingHabit, setEditingHabit] = useState<HabitWithRelations | null>(null);
  const [editSubHabits, setEditSubHabits] = useState<{ name: string; estimatedDuration?: number; requiredDays?: number[] }[]>([]);
  const [editSubHabitName, setEditSubHabitName] = useState("");
  const [editSubHabitDuration, setEditSubHabitDuration] = useState<number | undefined>();
  const [editSubHabitDays, setEditSubHabitDays] = useState<number[]>([]);
  const [deleteConfirmHabit, setDeleteConfirmHabit] = useState<HabitWithRelations | null>(null);
  const [detailHabit, setDetailHabit] = useState<HabitWithSubHabits | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = useState(false);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [journalOccurrenceId, setJournalOccurrenceId] = useState<string | null>(null);
  const [journalHabitName, setJournalHabitName] = useState<string>("");
  const { playChime } = useCompletionSound();
  const { toast } = useToast();
  const { hasNewAchievement, checkAchievements, unlockedCount, totalCount } = useAchievementCheck();

  const { data: habits = [], isLoading } = useQuery<HabitWithRelations[]>({
    queryKey: ["/api/habits"],
  });

  const { data: parentHabits = [] } = useQuery<HabitWithSubHabits[]>({
    queryKey: ["/api/habits/parent/all"],
  });

  const { data: todayOccurrences = [] } = useQuery<HabitOccurrence[]>({
    queryKey: ["/api/habits/occurrences/today"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newHabit) => {
      if (data.subHabits.length > 0) {
        return apiRequest("POST", "/api/habits/with-sub-habits", data);
      }
      return apiRequest("POST", "/api/habits", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/occurrences/today"] });
      setIsCreateOpen(false);
      setNewHabit({
        name: "", description: "", category: "productivity", priority: "medium",
        recurrence: "daily", color: "#3B82F6", completionType: "all_required",
        requiredPercentage: 75, startTime: "", endTime: "", timeWindowEnabled: false,
        allowsEarlyCompletion: true, gracePeriodMinutes: 0, subHabits: [],
      });
      setShowTemplates(false);
      toast({ title: "Habit created", description: "Your new habit has been added." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create habit", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ occurrenceId, habitName }: { occurrenceId: string; habitName: string }) => 
      apiRequest("POST", `/api/habits/occurrences/${occurrenceId}/complete`, {}),
    onSuccess: (data: any, variables) => {
      playChime();
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/occurrences/today"] });
      
      // Show journal input for the completed habit
      setJournalOccurrenceId(variables.occurrenceId);
      setJournalHabitName(variables.habitName);
      
      // Check for new achievements after completion
      checkAchievements();
      
      // Show different feedback based on completion status
      if (data.completionStatus === 'on_time') {
        toast({ 
          title: "Perfect timing!", 
          description: "Completed within your scheduled time window." 
        });
      } else if (data.completionStatus === 'late') {
        toast({ 
          title: "Better late than never!", 
          description: "Completed after the time window closed." 
        });
      } else {
        toast({ title: "Great job!", description: "Habit marked as complete." });
      }
    },
  });

  const toggleSubHabitMutation = useMutation({
    mutationFn: (subHabitId: string) => apiRequest("POST", `/api/habits/${subHabitId}/toggle-complete`, { date: new Date().toISOString() }),
    onSuccess: (data: any) => {
      if (data.occurrence?.status === 'completed') {
        playChime();
      }
      if (data.parentAutoCompleted) {
        const parentStatus = data.parentOccurrence?.completionStatus;
        if (parentStatus === 'on_time') {
          toast({ title: "Routine completed on time!", description: "All sub-habits finished within the time window." });
        } else if (parentStatus === 'late') {
          toast({ title: "Routine completed!", description: "Finished after the scheduled time window." });
        } else {
          toast({ title: "Routine completed!", description: "All requirements met." });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/occurrences/today"] });
    },
  });

  const completeAllSubHabitsMutation = useMutation({
    mutationFn: (parentId: string) => apiRequest("POST", `/api/habits/${parentId}/complete-all-sub-habits`, { date: new Date().toISOString() }),
    onSuccess: () => {
      playChime();
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/occurrences/today"] });
      toast({ title: "All done!", description: "All sub-habits marked as complete." });
    },
  });

  const reorderSubHabitsMutation = useMutation({
    mutationFn: ({ parentId, subHabitIds }: { parentId: string; subHabitIds: string[] }) => 
      apiRequest("PUT", `/api/habits/${parentId}/reorder-sub-habits`, { subHabitIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
    },
  });

  const handleDragEnd = (parentId: string, subHabits: Habit[]) => (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(subHabits);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const subHabitIds = items.map(item => item.id);
    reorderSubHabitsMutation.mutate({ parentId, subHabitIds });
  };

  const uncheckAllSubHabitsMutation = useMutation({
    mutationFn: (parentId: string) => apiRequest("POST", `/api/habits/${parentId}/uncheck-all-sub-habits`, { date: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/occurrences/today"] });
      toast({ title: "Reset", description: "All sub-habits unchecked." });
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: (habitId: string) => apiRequest("DELETE", `/api/habits/${habitId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/occurrences/today"] });
      setDeleteConfirmHabit(null);
      toast({ title: "Habit deleted", description: "The habit has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete habit", variant: "destructive" });
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof newHabit> }) => 
      apiRequest("PATCH", `/api/habits/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      setEditingHabit(null);
      toast({ title: "Habit updated", description: "Changes saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update habit", variant: "destructive" });
    },
  });

  const getTodayOccurrence = (habitId: string) => {
    return todayOccurrences.find(o => o.habitId === habitId);
  };

  const handleComplete = (habitId: string, habitName: string) => {
    const occurrence = getTodayOccurrence(habitId);
    if (occurrence && occurrence.status === "pending") {
      completeMutation.mutate({ occurrenceId: occurrence.id, habitName });
    }
  };

  const handleHabitClick = (habit: HabitWithRelations) => {
    const parentHabit = parentHabits.find(p => p.id === habit.id);
    setDetailHabit(parentHabit || habit as HabitWithSubHabits);
    setIsDetailModalOpen(true);
  };

  const toggleExpanded = (habitId: string) => {
    const newExpanded = new Set(expandedHabits);
    if (newExpanded.has(habitId)) {
      newExpanded.delete(habitId);
    } else {
      newExpanded.add(habitId);
    }
    setExpandedHabits(newExpanded);
  };

  const addSubHabit = () => {
    if (newSubHabitName.trim()) {
      setNewHabit({
        ...newHabit,
        subHabits: [...newHabit.subHabits, { 
          name: newSubHabitName.trim(),
          estimatedDuration: newSubHabitDuration,
          requiredDays: newSubHabitDays.length > 0 ? newSubHabitDays : undefined,
        }],
      });
      setNewSubHabitName("");
      setNewSubHabitDuration(undefined);
      setNewSubHabitDays([]);
    }
  };

  const DAYS_OF_WEEK = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
  ];

  const toggleDay = (day: number) => {
    setNewSubHabitDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const getTotalEstimatedDuration = (habit: HabitWithSubHabits) => {
    if (!habit.subHabits) return 0;
    return habit.subHabits.reduce((sum, sub) => sum + (sub.estimatedDuration || 0), 0);
  };

  const removeSubHabit = (index: number) => {
    setNewHabit({
      ...newHabit,
      subHabits: newHabit.subHabits.filter((_, i) => i !== index),
    });
  };

  const addEditSubHabit = () => {
    if (editSubHabitName.trim()) {
      setEditSubHabits([
        ...editSubHabits,
        { 
          name: editSubHabitName.trim(),
          estimatedDuration: editSubHabitDuration,
          requiredDays: editSubHabitDays.length > 0 ? editSubHabitDays : undefined,
        },
      ]);
      setEditSubHabitName("");
      setEditSubHabitDuration(undefined);
      setEditSubHabitDays([]);
    }
  };

  const removeEditSubHabit = (index: number) => {
    setEditSubHabits(editSubHabits.filter((_, i) => i !== index));
  };

  const toggleEditDay = (day: number) => {
    setEditSubHabitDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const initializeEditSubHabits = (habit: HabitWithRelations) => {
    // For parent habits, extract sub-habits from the related data
    const parentHabit = parentHabits.find(p => p.id === habit.id);
    if (parentHabit?.subHabits) {
      setEditSubHabits(parentHabit.subHabits.map(sub => ({
        name: sub.name,
        estimatedDuration: sub.estimatedDuration || undefined,
        requiredDays: sub.requiredDays || undefined,
      })));
    } else {
      setEditSubHabits([]);
    }
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setNewHabit({
      ...newHabit,
      name: template.name,
      description: template.description,
      category: template.category,
      subHabits: template.subHabits.map(name => ({ name })),
    });
    setShowTemplates(false);
  };

  const getRecurrenceLabel = (recurrence: string) => {
    switch (recurrence) {
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      default: return recurrence;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 76) return "bg-green-500";
    if (percentage >= 51) return "bg-lime-500";
    if (percentage >= 26) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTimeWindowStatus = (habit: HabitWithRelations) => {
    if (!habit.timeWindowEnabled || !habit.startTime || !habit.endTime) {
      return { status: 'none', minutesRemaining: null, color: '' };
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = habit.startTime.split(':').map(Number);
    const [endH, endM] = habit.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const gracePeriod = habit.gracePeriodMinutes || 0;

    if (currentMinutes < startMinutes) {
      return { 
        status: 'upcoming', 
        minutesRemaining: startMinutes - currentMinutes, 
        color: 'border-blue-500/50' 
      };
    } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return { 
        status: 'active', 
        minutesRemaining: endMinutes - currentMinutes, 
        color: 'border-green-500/50' 
      };
    } else if (currentMinutes <= endMinutes + gracePeriod) {
      return { 
        status: 'grace', 
        minutesRemaining: endMinutes + gracePeriod - currentMinutes, 
        color: 'border-yellow-500/50' 
      };
    } else {
      return { 
        status: 'expired', 
        minutesRemaining: 0, 
        color: 'border-orange-500/50' 
      };
    }
  };

  const formatTimeRemaining = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const calculateSubHabitProgress = (habit: HabitWithSubHabits) => {
    if (!habit.subHabits || habit.subHabits.length === 0) return { total: 0, completed: 0, percentage: 100 };
    const total = habit.subHabits.length;
    const completed = habit.subHabits.filter(sub => {
      const occ = getTodayOccurrence(sub.id);
      return occ?.status === 'completed';
    }).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  };

  const standaloneHabits = habits.filter(h => !h.parentHabitId);
  const parentHabitIds = new Set(parentHabits.map(h => h.id));
  const simpleHabits = standaloneHabits.filter(h => !parentHabitIds.has(h.id));

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Habits</h1>
          <p className="text-muted-foreground">Track your daily routines and build positive habits.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsAchievementModalOpen(true)}
            data-testid="button-achievements"
            className="relative"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Achievements
            {hasNewAchievement && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
            <Badge variant="secondary" className="ml-2">
              {unlockedCount}/{totalCount}
            </Badge>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsTemplateBrowserOpen(true)}
            data-testid="button-browse-templates"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button variant="outline" asChild>
            <Link href="/habits/metrics" data-testid="link-habit-metrics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Metrics
            </Link>
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-habit">
                <Plus className="h-4 w-4 mr-2" />
                New Habit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Habit</DialogTitle>
                <DialogDescription className="sr-only">Create a new habit or routine to track</DialogDescription>
              </DialogHeader>

              {!showTemplates ? (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate(newHabit);
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowTemplates(true)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={newHabit.name}
                      onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                      placeholder="e.g., Morning Routine"
                      required
                      data-testid="input-habit-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newHabit.description}
                      onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                      placeholder="What does this habit involve?"
                      data-testid="input-habit-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={newHabit.category}
                      onValueChange={(v) => setNewHabit({ ...newHabit, category: v })}
                    >
                      <SelectTrigger data-testid="select-habit-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Recurrence</label>
                      <Select
                        value={newHabit.recurrence}
                        onValueChange={(v) => setNewHabit({ ...newHabit, recurrence: v })}
                      >
                        <SelectTrigger data-testid="select-habit-recurrence">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECURRENCES.map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3 border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Time Window</label>
                          <p className="text-xs text-muted-foreground">Track on-time vs late completion</p>
                        </div>
                        <Switch
                          checked={newHabit.timeWindowEnabled}
                          onCheckedChange={(checked) => setNewHabit({ ...newHabit, timeWindowEnabled: checked })}
                          data-testid="switch-time-window"
                        />
                      </div>
                      
                      {newHabit.timeWindowEnabled && (
                        <div className="space-y-3 pt-2 border-t">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Start Time</label>
                              <Input
                                type="time"
                                value={newHabit.startTime}
                                onChange={(e) => setNewHabit({ ...newHabit, startTime: e.target.value })}
                                data-testid="input-habit-start-time"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">End Time</label>
                              <Input
                                type="time"
                                value={newHabit.endTime}
                                onChange={(e) => setNewHabit({ ...newHabit, endTime: e.target.value })}
                                data-testid="input-habit-end-time"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium">Allow Early Completion</label>
                              <p className="text-xs text-muted-foreground">Complete before start time counts as on-time</p>
                            </div>
                            <Switch
                              checked={newHabit.allowsEarlyCompletion}
                              onCheckedChange={(checked) => setNewHabit({ ...newHabit, allowsEarlyCompletion: checked })}
                              data-testid="switch-early-completion"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Grace Period (minutes)</label>
                            <Input
                              type="number"
                              min={0}
                              max={60}
                              value={newHabit.gracePeriodMinutes}
                              onChange={(e) => setNewHabit({ ...newHabit, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
                              data-testid="input-grace-period"
                            />
                            <p className="text-xs text-muted-foreground">Extra time after window ends to still count as on-time</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Color</label>
                      <Input
                        type="color"
                        value={newHabit.color}
                        onChange={(e) => setNewHabit({ ...newHabit, color: e.target.value })}
                        className="h-9 p-1"
                        data-testid="input-habit-color"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <label className="text-sm font-medium">Sub-habits (optional)</label>
                    <p className="text-xs text-muted-foreground">Break down this habit into smaller steps</p>

                    {newHabit.subHabits.length > 0 && (
                      <div className="space-y-2">
                        {newHabit.subHabits.map((sub, index) => (
                          <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">{sub.name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {sub.estimatedDuration && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(sub.estimatedDuration)}
                                  </span>
                                )}
                                {sub.requiredDays && sub.requiredDays.length > 0 && (
                                  <span>
                                    {sub.requiredDays.map(d => DAYS_OF_WEEK[d].label).join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeSubHabit(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 bg-muted/30 rounded-md p-3">
                      <div className="flex gap-2">
                        <Input
                          value={newSubHabitName}
                          onChange={(e) => setNewSubHabitName(e.target.value)}
                          placeholder="Sub-habit name..."
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSubHabit();
                            }
                          }}
                          data-testid="input-sub-habit-name"
                        />
                        <Input
                          type="number"
                          value={newSubHabitDuration || ""}
                          onChange={(e) => setNewSubHabitDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="Min"
                          className="w-20"
                          min={1}
                          data-testid="input-sub-habit-duration"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex gap-1">
                          {DAYS_OF_WEEK.map(day => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={newSubHabitDays.includes(day.value) ? "default" : "outline"}
                              size="sm"
                              className="h-7 w-9 text-xs"
                              onClick={() => toggleDay(day.value)}
                              data-testid={`button-day-${day.value}`}
                            >
                              {day.label[0]}
                            </Button>
                          ))}
                        </div>
                        <Button type="button" variant="outline" onClick={addSubHabit} disabled={!newSubHabitName.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {newSubHabitDays.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Only required on: {newSubHabitDays.map(d => DAYS_OF_WEEK[d].label).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {newHabit.subHabits.length > 0 && (
                    <div className="space-y-3 border-t pt-4">
                      <label className="text-sm font-medium">Completion Type</label>
                      <Select
                        value={newHabit.completionType}
                        onValueChange={(v) => setNewHabit({ ...newHabit, completionType: v })}
                      >
                        <SelectTrigger data-testid="select-completion-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLETION_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              <div>
                                <div className="font-medium">{t.label}</div>
                                <div className="text-xs text-muted-foreground">{t.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {newHabit.completionType === "percentage_based" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm">Required Percentage</label>
                            <span className="text-sm font-medium">{newHabit.requiredPercentage}%</span>
                          </div>
                          <Slider
                            value={[newHabit.requiredPercentage]}
                            onValueChange={([v]) => setNewHabit({ ...newHabit, requiredPercentage: v })}
                            min={25}
                            max={100}
                            step={5}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-habit">
                      {createMutation.isPending ? "Creating..." : "Create Habit"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <Button variant="ghost" onClick={() => setShowTemplates(false)} className="mb-2">
                    Back to form
                  </Button>
                  <div className="space-y-3">
                    {TEMPLATES.map((template, index) => (
                      <Card
                        key={index}
                        className="p-4 hover-elevate cursor-pointer"
                        onClick={() => applyTemplate(template)}
                        data-testid={`template-${index}`}
                      >
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {template.subHabits.map((sub, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{sub}</Badge>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {habits.length === 0 ? (
        <Card className="p-12 text-center" data-testid="card-empty-state">
          <div className="flex justify-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center">
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center">
              <Target className="h-8 w-8 text-blue-500" />
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
              <Sunrise className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-title">Build Lasting Habits with Daily Routines</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create structured routines with sub-habits to track your progress and build consistency. Start simple and grow from there.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-habit">
              <Plus className="h-4 w-4 mr-2" />
              Create First Routine
            </Button>
            <Button variant="outline" onClick={() => { setIsCreateOpen(true); setShowTemplates(true); }} data-testid="button-browse-templates">
              <Sparkles className="h-4 w-4 mr-2" />
              Browse Templates
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            Tip: Start with 2-3 simple habits and add more as you build consistency.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)} className="w-full">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <TabsList data-testid="tabs-filter">
                <TabsTrigger value="all" data-testid="tab-all">
                  <ListChecks className="h-4 w-4 mr-1.5" />
                  All
                </TabsTrigger>
                <TabsTrigger value="due" data-testid="tab-due">
                  <Clock className="h-4 w-4 mr-1.5" />
                  Due Today
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">
                  <CheckCheck className="h-4 w-4 mr-1.5" />
                  Completed
                </TabsTrigger>
                <TabsTrigger value="missed" data-testid="tab-missed">
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  Missed
                </TabsTrigger>
                <TabsTrigger value="archived" data-testid="tab-archived">
                  <Archive className="h-4 w-4 mr-1.5" />
                  Archived
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  List
                </Button>
                <Button
                  variant={viewMode === "category" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("category")}
                  data-testid="button-view-category"
                >
                  By Category
                </Button>
              </div>
            </div>

            <TabsContent value="all" className="mt-0">
              {viewMode === "category" ? (
                <HabitCategoryGroup
                  habits={parentHabits}
                  todayOccurrences={todayOccurrences}
                  onEdit={(h) => { setEditingHabit(h as any); initializeEditSubHabits(h as any); }}
                  onDelete={(h) => setDeleteConfirmHabit(h as any)}
                />
              ) : (
                <HabitListView
                  parentHabits={parentHabits}
                  simpleHabits={simpleHabits}
                  todayOccurrences={todayOccurrences}
                  onEdit={(h) => { setEditingHabit(h as any); initializeEditSubHabits(h as any); }}
                  onDelete={(h) => setDeleteConfirmHabit(h as any)}
                />
              )}
            </TabsContent>
            
            <TabsContent value="due" className="mt-0">
              <HabitListView
                parentHabits={parentHabits.filter(h => {
                  const occ = getTodayOccurrence(h.id);
                  return occ?.status === 'pending';
                })}
                simpleHabits={simpleHabits.filter(h => {
                  const occ = getTodayOccurrence(h.id);
                  return occ?.status === 'pending';
                })}
                todayOccurrences={todayOccurrences}
                onEdit={(h) => { setEditingHabit(h as any); initializeEditSubHabits(h as any); }}
                onDelete={(h) => setDeleteConfirmHabit(h as any)}
              />
            </TabsContent>
            
            <TabsContent value="completed" className="mt-0">
              <HabitListView
                parentHabits={parentHabits.filter(h => {
                  const occ = getTodayOccurrence(h.id);
                  return occ?.status === 'completed';
                })}
                simpleHabits={simpleHabits.filter(h => {
                  const occ = getTodayOccurrence(h.id);
                  return occ?.status === 'completed';
                })}
                todayOccurrences={todayOccurrences}
                onEdit={(h) => { setEditingHabit(h as any); initializeEditSubHabits(h as any); }}
                onDelete={(h) => setDeleteConfirmHabit(h as any)}
              />
            </TabsContent>
            
            <TabsContent value="missed" className="mt-0">
              <HabitListView
                parentHabits={parentHabits.filter(h => {
                  const occ = getTodayOccurrence(h.id);
                  const timeStatus = getTimeWindowStatus(h);
                  return occ?.status === 'pending' && timeStatus.status === 'expired';
                })}
                simpleHabits={simpleHabits.filter(h => {
                  const occ = getTodayOccurrence(h.id);
                  const timeStatus = getTimeWindowStatus(h as any);
                  return occ?.status === 'pending' && timeStatus.status === 'expired';
                })}
                todayOccurrences={todayOccurrences}
                onEdit={(h) => { setEditingHabit(h as any); initializeEditSubHabits(h as any); }}
                onDelete={(h) => setDeleteConfirmHabit(h as any)}
              />
            </TabsContent>
            
            <TabsContent value="archived" className="mt-0">
              <div className="text-center py-12 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No archived habits</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Keep the original rendering for fallback and edit dialogs */}
      {false && habits.length > 0 && (
        <div className="space-y-4 hidden">
          {parentHabits.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Routines</h2>
              {parentHabits.map((habit) => {
                const progress = calculateSubHabitProgress(habit);
                const isExpanded = expandedHabits.has(habit.id);
                const parentOccurrence = getTodayOccurrence(habit.id);
                const isParentCompleted = parentOccurrence?.status === 'completed';
                const timeStatus = getTimeWindowStatus(habit);

                return (
                  <Card key={habit.id} className={`overflow-visible ${timeStatus.color ? `border-2 ${timeStatus.color}` : ''}`} data-testid={`card-parent-habit-${habit.id}`}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(habit.id)}>
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>

                          <CircularCheckbox
                            checked={isParentCompleted}
                            onCheckedChange={() => {
                              if (!isParentCompleted && habit.completionType === 'partial_allowed') {
                                handleComplete(habit.id);
                              }
                            }}
                            disabled={habit.completionType !== 'partial_allowed' && !isParentCompleted}
                            size="lg"
                            data-testid={`checkbox-parent-${habit.id}`}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`font-semibold ${isParentCompleted ? "line-through text-muted-foreground" : ""}`}>
                                {habit.name}
                              </h3>
                              {(habit.streakCount || 0) > 0 && (
                                <div className="flex items-center gap-1 text-orange-500 text-sm">
                                  <Flame className="h-3 w-3" />
                                  <span>{habit.streakCount}</span>
                                </div>
                              )}
                              {timeStatus.status !== 'none' && !isParentCompleted && (
                                <div className={`flex items-center gap-1 text-sm ${
                                  timeStatus.status === 'active' ? 'text-green-600' :
                                  timeStatus.status === 'grace' ? 'text-yellow-600' :
                                  timeStatus.status === 'upcoming' ? 'text-blue-600' :
                                  'text-orange-600'
                                }`}>
                                  {timeStatus.status === 'active' && <Hourglass className="h-3 w-3" />}
                                  {timeStatus.status === 'grace' && <AlertTriangle className="h-3 w-3" />}
                                  {timeStatus.status === 'upcoming' && <Clock className="h-3 w-3" />}
                                  {timeStatus.status === 'expired' && <AlertTriangle className="h-3 w-3" />}
                                  <span>
                                    {timeStatus.status === 'active' && timeStatus.minutesRemaining !== null && `${formatTimeRemaining(timeStatus.minutesRemaining)} left`}
                                    {timeStatus.status === 'grace' && timeStatus.minutesRemaining !== null && `Grace: ${formatTimeRemaining(timeStatus.minutesRemaining)}`}
                                    {timeStatus.status === 'upcoming' && timeStatus.minutesRemaining !== null && `Starts in ${formatTimeRemaining(timeStatus.minutesRemaining)}`}
                                    {timeStatus.status === 'expired' && 'Window closed'}
                                  </span>
                                </div>
                              )}
                              {isParentCompleted && parentOccurrence?.completionStatus && parentOccurrence.completionStatus !== 'pending' && (
                                <Badge variant={parentOccurrence.completionStatus === 'on_time' ? 'default' : 'secondary'} className={parentOccurrence.completionStatus === 'on_time' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'}>
                                  {parentOccurrence.completionStatus === 'on_time' ? 'On time' : 'Late'}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex-1 max-w-xs">
                                <Progress
                                  value={progress.percentage}
                                  className="h-2"
                                />
                              </div>
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {progress.completed}/{progress.total} ({progress.percentage}%)
                              </span>
                              {getTotalEstimatedDuration(habit) > 0 && (
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(getTotalEstimatedDuration(habit))}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{getRecurrenceLabel(habit.recurrence)}</Badge>
                            {habit.timeWindowEnabled && habit.startTime && habit.endTime && (
                              <Badge variant="outline" className="text-xs hidden sm:flex">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(new Date(`2000-01-01T${habit.startTime}`), 'h:mm a')} - {format(new Date(`2000-01-01T${habit.endTime}`), 'h:mm a')}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                completeAllSubHabitsMutation.mutate(habit.id);
                              }}
                              disabled={progress.percentage === 100}
                              title="Complete All"
                              data-testid={`button-complete-all-${habit.id}`}
                            >
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                            {progress.completed > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  uncheckAllSubHabitsMutation.mutate(habit.id);
                                }}
                                title="Reset All"
                                data-testid={`button-uncheck-all-${habit.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} data-testid={`button-menu-${habit.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditingHabit(habit); initializeEditSubHabits(habit); }} data-testid={`button-edit-${habit.id}`}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setDeleteConfirmHabit(habit)} 
                                  className="text-destructive"
                                  data-testid={`button-delete-${habit.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <DragDropContext onDragEnd={handleDragEnd(habit.id, habit.subHabits || [])}>
                          <Droppable droppableId={`subhabits-${habit.id}`}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="border-t px-4 py-3 space-y-2 bg-muted/30"
                              >
                                {habit.subHabits?.map((subHabit, index) => {
                                  const subOcc = getTodayOccurrence(subHabit.id);
                                  const isSubCompleted = subOcc?.status === 'completed';

                                  return (
                                    <Draggable key={subHabit.id} draggableId={subHabit.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={`flex items-center gap-3 py-1.5 ${snapshot.isDragging ? "bg-muted rounded-md shadow-sm" : ""}`}
                                          data-testid={`sub-habit-${subHabit.id}`}
                                        >
                                          <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
                                            <GripVertical className="h-4 w-4" />
                                          </div>
                                          <CircularCheckbox
                                            checked={isSubCompleted}
                                            onCheckedChange={() => toggleSubHabitMutation.mutate(subHabit.id)}
                                            size="sm"
                                            data-testid={`checkbox-sub-${subHabit.id}`}
                                          />
                                          <span className={`text-sm flex-1 ${isSubCompleted ? "line-through text-muted-foreground" : ""}`}>
                                            {subHabit.name}
                                          </span>
                                          <div className="flex items-center gap-2 ml-auto">
                                            {subHabit.requiredDays && subHabit.requiredDays.length > 0 && (
                                              <span className="text-xs text-muted-foreground">
                                                {subHabit.requiredDays.map(d => DAYS_OF_WEEK[d].label).join(", ")}
                                              </span>
                                            )}
                                            {subHabit.estimatedDuration && (
                                              <Badge variant="outline" className="text-xs">
                                                {formatDuration(subHabit.estimatedDuration)}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}

          {simpleHabits.length > 0 && (
            <div className="space-y-3">
              {parentHabits.length > 0 && <h2 className="text-lg font-semibold mt-6">Simple Habits</h2>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {simpleHabits.map((habit) => {
                  const occurrence = getTodayOccurrence(habit.id);
                  const isCompleted = occurrence?.status === "completed";
                  const timeStatus = getTimeWindowStatus(habit);

                  return (
                    <Card
                      key={habit.id}
                      className={`p-4 hover-elevate active-elevate-2 transition-all ${timeStatus.color ? `border-2 ${timeStatus.color}` : ''}`}
                      data-testid={`card-habit-${habit.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <CircularCheckbox
                          checked={isCompleted}
                          onCheckedChange={() => !isCompleted && handleComplete(habit.id)}
                          size="lg"
                          data-testid={`checkbox-habit-${habit.id}`}
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={`font-semibold text-base ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                              {habit.name}
                            </h3>
                            <div className="flex items-center gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-menu-simple-${habit.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingHabit(habit); initializeEditSubHabits(habit); }} data-testid={`button-edit-simple-${habit.id}`}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => setDeleteConfirmHabit(habit)} 
                                    className="text-destructive"
                                    data-testid={`button-delete-simple-${habit.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {habit.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{habit.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              <span>{getRecurrenceLabel(habit.recurrence)}</span>
                            </div>
                            {(habit.streakCount || 0) > 0 && (
                              <div className="flex items-center gap-1.5 text-orange-500">
                                <Flame className="h-4 w-4" />
                                <span>{habit.streakCount} day streak</span>
                              </div>
                            )}
                            {timeStatus.status !== 'none' && !isCompleted && (
                              <div className={`flex items-center gap-1 ${
                                timeStatus.status === 'active' ? 'text-green-600' :
                                timeStatus.status === 'grace' ? 'text-yellow-600' :
                                timeStatus.status === 'upcoming' ? 'text-blue-600' :
                                'text-orange-600'
                              }`}>
                                {timeStatus.status === 'active' && <Hourglass className="h-3 w-3" />}
                                {timeStatus.status === 'grace' && <AlertTriangle className="h-3 w-3" />}
                                {timeStatus.status === 'upcoming' && <Clock className="h-3 w-3" />}
                                {timeStatus.status === 'expired' && <AlertTriangle className="h-3 w-3" />}
                                <span>
                                  {timeStatus.status === 'active' && timeStatus.minutesRemaining !== null && `${formatTimeRemaining(timeStatus.minutesRemaining)} left`}
                                  {timeStatus.status === 'grace' && timeStatus.minutesRemaining !== null && `Grace: ${formatTimeRemaining(timeStatus.minutesRemaining)}`}
                                  {timeStatus.status === 'upcoming' && timeStatus.minutesRemaining !== null && `Starts in ${formatTimeRemaining(timeStatus.minutesRemaining)}`}
                                  {timeStatus.status === 'expired' && 'Window closed'}
                                </span>
                              </div>
                            )}
                            {isCompleted && occurrence?.completionStatus && occurrence.completionStatus !== 'pending' && (
                              <Badge variant="secondary" className={occurrence.completionStatus === 'on_time' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'}>
                                {occurrence.completionStatus === 'on_time' ? 'On time' : 'Late'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{habit.category}</Badge>
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: habit.color || "#3B82F6" }}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!editingHabit} onOpenChange={(open) => !open && setEditingHabit(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
            <DialogDescription className="sr-only">Edit your habit settings</DialogDescription>
          </DialogHeader>
          {editingHabit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingHabit.name}
                  onChange={(e) => setEditingHabit({ ...editingHabit, name: e.target.value })}
                  data-testid="input-edit-name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editingHabit.description || ""}
                  onChange={(e) => setEditingHabit({ ...editingHabit, description: e.target.value })}
                  data-testid="input-edit-description"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={editingHabit.category || "productivity"}
                  onValueChange={(value) => setEditingHabit({ ...editingHabit, category: value })}
                >
                  <SelectTrigger data-testid="select-edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recurrence</label>
                  <Select
                    value={editingHabit.recurrence || "daily"}
                    onValueChange={(value) => setEditingHabit({ ...editingHabit, recurrence: value })}
                  >
                    <SelectTrigger data-testid="select-edit-recurrence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Color</label>
                  <Input
                    type="color"
                    value={editingHabit.color || "#3B82F6"}
                    onChange={(e) => setEditingHabit({ ...editingHabit, color: e.target.value })}
                    className="h-9 p-1"
                    data-testid="input-edit-color"
                  />
                </div>
              </div>

              <div className="space-y-3 border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Time Window</label>
                    <p className="text-xs text-muted-foreground">Track on-time vs late completion</p>
                  </div>
                  <Switch
                    checked={editingHabit.timeWindowEnabled || false}
                    onCheckedChange={(checked) => setEditingHabit({ ...editingHabit, timeWindowEnabled: checked })}
                    data-testid="switch-edit-time-window"
                  />
                </div>
                
                {editingHabit.timeWindowEnabled && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Start Time</label>
                        <Input
                          type="time"
                          value={editingHabit.startTime || ""}
                          onChange={(e) => setEditingHabit({ ...editingHabit, startTime: e.target.value })}
                          data-testid="input-edit-start-time"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">End Time</label>
                        <Input
                          type="time"
                          value={editingHabit.endTime || ""}
                          onChange={(e) => setEditingHabit({ ...editingHabit, endTime: e.target.value })}
                          data-testid="input-edit-end-time"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Allow Early Completion</label>
                        <p className="text-xs text-muted-foreground">Complete before start counts as on-time</p>
                      </div>
                      <Switch
                        checked={editingHabit.allowsEarlyCompletion ?? true}
                        onCheckedChange={(checked) => setEditingHabit({ ...editingHabit, allowsEarlyCompletion: checked })}
                        data-testid="switch-edit-early-completion"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Grace Period (minutes)</label>
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={editingHabit.gracePeriodMinutes || 0}
                        onChange={(e) => setEditingHabit({ ...editingHabit, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
                        data-testid="input-edit-grace-period"
                      />
                      <p className="text-xs text-muted-foreground">Extra time after window ends to still count as on-time</p>
                    </div>
                  </div>
                )}
              </div>

              {editingHabit.parentHabitId === null && (
                <div className="space-y-3 border-t pt-4">
                  <label className="text-sm font-medium">Sub-habits</label>
                  <p className="text-xs text-muted-foreground">Break down this habit into smaller steps</p>

                  {editSubHabits.length > 0 && (
                    <div className="space-y-2">
                      {editSubHabits.map((sub, index) => (
                        <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{sub.name}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {sub.estimatedDuration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(sub.estimatedDuration)}
                                </span>
                              )}
                              {sub.requiredDays && sub.requiredDays.length > 0 && (
                                <span>
                                  {sub.requiredDays.map(d => DAYS_OF_WEEK[d].label).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEditSubHabit(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 bg-muted/30 rounded-md p-3">
                    <div className="flex gap-2">
                      <Input
                        value={editSubHabitName}
                        onChange={(e) => setEditSubHabitName(e.target.value)}
                        placeholder="Sub-habit name..."
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addEditSubHabit();
                          }
                        }}
                        data-testid="input-edit-sub-habit-name"
                      />
                      <Input
                        type="number"
                        value={editSubHabitDuration || ""}
                        onChange={(e) => setEditSubHabitDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Min"
                        className="w-20"
                        min={1}
                        data-testid="input-edit-sub-habit-duration"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        {DAYS_OF_WEEK.map(day => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={editSubHabitDays.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            className="h-7 w-9 text-xs"
                            onClick={() => toggleEditDay(day.value)}
                            data-testid={`button-edit-day-${day.value}`}
                          >
                            {day.label[0]}
                          </Button>
                        ))}
                      </div>
                      <Button type="button" variant="outline" onClick={addEditSubHabit} disabled={!editSubHabitName.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {editSubHabitDays.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Only required on: {editSubHabitDays.map(d => DAYS_OF_WEEK[d].label).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {editingHabit.parentHabitId === null && editSubHabits.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <label className="text-sm font-medium">Completion Type</label>
                  <Select
                    value={editingHabit.completionType || "all_required"}
                    onValueChange={(v) => setEditingHabit({ ...editingHabit, completionType: v })}
                  >
                    <SelectTrigger data-testid="select-edit-completion-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLETION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <div>
                            <div className="font-medium">{t.label}</div>
                            <div className="text-xs text-muted-foreground">{t.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {editingHabit.completionType === "percentage_based" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Required Percentage</label>
                        <span className="text-sm font-medium">{editingHabit.requiredPercentage || 75}%</span>
                      </div>
                      <Slider
                        value={[editingHabit.requiredPercentage || 75]}
                        onValueChange={([v]) => setEditingHabit({ ...editingHabit, requiredPercentage: v })}
                        min={25}
                        max={100}
                        step={5}
                        data-testid="slider-edit-percentage"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingHabit(null)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateHabitMutation.mutate({
                      id: editingHabit.id,
                      data: {
                        name: editingHabit.name,
                        description: editingHabit.description || undefined,
                        category: editingHabit.category || undefined,
                        priority: editingHabit.priority,
                        recurrence: editingHabit.recurrence || "daily",
                        color: editingHabit.color || undefined,
                        startTime: editingHabit.startTime || undefined,
                        endTime: editingHabit.endTime || undefined,
                        timeWindowEnabled: editingHabit.timeWindowEnabled ?? false,
                        allowsEarlyCompletion: editingHabit.allowsEarlyCompletion ?? true,
                        gracePeriodMinutes: editingHabit.gracePeriodMinutes ?? 0,
                        completionType: editingHabit.completionType || "all_required",
                        requiredPercentage: editingHabit.requiredPercentage || 75,
                        subHabits: editSubHabits,
                      },
                    });
                  }}
                  disabled={updateHabitMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateHabitMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmHabit} onOpenChange={(open) => !open && setDeleteConfirmHabit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmHabit?.name}"? This action cannot be undone.
              {deleteConfirmHabit?.parentHabitId === null && (
                <span className="block mt-2 text-destructive font-medium">
                  This will also delete all sub-habits.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmHabit && deleteHabitMutation.mutate(deleteConfirmHabit.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteHabitMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HabitDetailModal
        habit={detailHabit}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailHabit(null);
        }}
        onEdit={(habit) => {
          setIsDetailModalOpen(false);
          setEditingHabit(habit as HabitWithRelations);
          initializeEditSubHabits(habit as HabitWithRelations);
        }}
        onDelete={(habit) => {
          setIsDetailModalOpen(false);
          setDeleteConfirmHabit(habit as HabitWithRelations);
        }}
      />

      <TemplateBrowserModal
        isOpen={isTemplateBrowserOpen}
        onClose={() => setIsTemplateBrowserOpen(false)}
        onApply={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
          queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
        }}
      />

      <AchievementModal
        isOpen={isAchievementModalOpen}
        onClose={() => setIsAchievementModalOpen(false)}
        hasNewAchievement={hasNewAchievement}
      />

      {journalOccurrenceId && (
        <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] z-50">
          <JournalInput
            habitOccurrenceId={journalOccurrenceId}
            habitName={journalHabitName}
            onClose={() => {
              setJournalOccurrenceId(null);
              setJournalHabitName("");
            }}
            onSubmit={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/habit-journal"] });
            }}
          />
        </div>
      )}
    </div>
  );
}

interface HabitListViewProps {
  parentHabits: HabitWithSubHabits[];
  simpleHabits: HabitWithRelations[];
  todayOccurrences: HabitOccurrence[];
  onEdit: (habit: HabitWithSubHabits | HabitWithRelations) => void;
  onDelete: (habit: HabitWithSubHabits | HabitWithRelations) => void;
}

function HabitListView({ parentHabits, simpleHabits, todayOccurrences, onEdit, onDelete }: HabitListViewProps) {
  if (parentHabits.length === 0 && simpleHabits.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No habits match this filter</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {parentHabits.length > 0 && (
        <div className="space-y-3">
          {simpleHabits.length > 0 && <h2 className="text-lg font-semibold">Routines</h2>}
          {parentHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              todayOccurrences={todayOccurrences}
              onEdit={(h) => onEdit(h)}
              onDelete={(h) => onDelete(h)}
            />
          ))}
        </div>
      )}

      {simpleHabits.length > 0 && (
        <div className="space-y-3">
          {parentHabits.length > 0 && <h2 className="text-lg font-semibold mt-6">Simple Habits</h2>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {simpleHabits.map((habit) => (
              <SimpleHabitCard
                key={habit.id}
                habit={habit}
                todayOccurrences={todayOccurrences}
                onEdit={() => onEdit(habit)}
                onDelete={() => onDelete(habit)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SimpleHabitCardProps {
  habit: HabitWithRelations;
  todayOccurrences: HabitOccurrence[];
  onEdit: () => void;
  onDelete: () => void;
}

function SimpleHabitCard({ habit, todayOccurrences, onEdit, onDelete }: SimpleHabitCardProps) {
  const { playChime } = useCompletionSound();
  
  const occurrence = todayOccurrences.find((o) => o.habitId === habit.id);
  const isCompleted = occurrence?.status === "completed";

  const getTimeWindowStatus = (h: HabitWithRelations) => {
    if (!h.timeWindowEnabled || !h.startTime || !h.endTime) {
      return { status: "none", minutesRemaining: null, color: "" };
    }
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = h.startTime.split(":").map(Number);
    const [endH, endM] = h.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const gracePeriod = h.gracePeriodMinutes || 0;

    if (currentMinutes < startMinutes) {
      return { status: "upcoming", minutesRemaining: startMinutes - currentMinutes, color: "border-blue-500/50" };
    } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return { status: "active", minutesRemaining: endMinutes - currentMinutes, color: "border-green-500/50" };
    } else if (currentMinutes <= endMinutes + gracePeriod) {
      return { status: "grace", minutesRemaining: endMinutes + gracePeriod - currentMinutes, color: "border-yellow-500/50" };
    } else {
      return { status: "expired", minutesRemaining: 0, color: "border-orange-500/50" };
    }
  };

  const formatTimeRemaining = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const getRecurrenceLabel = (recurrence: string) => {
    switch (recurrence) {
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      default: return recurrence;
    }
  };

  const timeStatus = getTimeWindowStatus(habit);

  const completeMutation = useMutation({
    mutationFn: (occurrenceId: string) => apiRequest("POST", `/api/habits/occurrences/${occurrenceId}/complete`, {}),
    onSuccess: () => {
      playChime();
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/occurrences/today"] });
    },
  });

  const handleComplete = () => {
    if (occurrence && occurrence.status === "pending") {
      completeMutation.mutate(occurrence.id);
    }
  };

  return (
    <Card
      className={`p-4 hover-elevate active-elevate-2 transition-all ${timeStatus.color ? `border-2 ${timeStatus.color}` : ""}`}
      data-testid={`card-habit-${habit.id}`}
    >
      <div className="flex items-start gap-4">
        <CircularCheckbox
          checked={isCompleted}
          onCheckedChange={() => !isCompleted && handleComplete()}
          size="lg"
          data-testid={`checkbox-habit-${habit.id}`}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold text-base ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
              {habit.name}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-menu-simple-${habit.id}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit} data-testid={`button-edit-simple-${habit.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive" data-testid={`button-delete-simple-${habit.id}`}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {habit.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{habit.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{getRecurrenceLabel(habit.recurrence)}</span>
            </div>
            {(habit.streakCount || 0) > 0 && (
              <div className="flex items-center gap-1.5 text-orange-500">
                <Flame className="h-4 w-4" />
                <span>{habit.streakCount} day streak</span>
              </div>
            )}
            {timeStatus.status !== "none" && !isCompleted && (
              <div className={`flex items-center gap-1 ${
                timeStatus.status === "active" ? "text-green-600" :
                timeStatus.status === "grace" ? "text-yellow-600" :
                timeStatus.status === "upcoming" ? "text-blue-600" :
                "text-orange-600"
              }`}>
                {timeStatus.status === "active" && <Hourglass className="h-3 w-3" />}
                {timeStatus.status === "grace" && <AlertTriangle className="h-3 w-3" />}
                {timeStatus.status === "upcoming" && <Clock className="h-3 w-3" />}
                {timeStatus.status === "expired" && <AlertTriangle className="h-3 w-3" />}
                <span>
                  {timeStatus.status === "active" && timeStatus.minutesRemaining !== null && `${formatTimeRemaining(timeStatus.minutesRemaining)} left`}
                  {timeStatus.status === "grace" && timeStatus.minutesRemaining !== null && `Grace: ${formatTimeRemaining(timeStatus.minutesRemaining)}`}
                  {timeStatus.status === "upcoming" && timeStatus.minutesRemaining !== null && `Starts in ${formatTimeRemaining(timeStatus.minutesRemaining)}`}
                  {timeStatus.status === "expired" && "Window closed"}
                </span>
              </div>
            )}
            {isCompleted && occurrence?.completionStatus && occurrence.completionStatus !== "pending" && (
              <Badge variant="secondary" className={occurrence.completionStatus === "on_time" ? "bg-green-500/20 text-green-700 border-green-500/30" : "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"}>
                {occurrence.completionStatus === "on_time" ? "On time" : "Late"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{habit.category}</Badge>
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: habit.color || "#3B82F6" }} />
          </div>
        </div>
      </div>
    </Card>
  );
}
