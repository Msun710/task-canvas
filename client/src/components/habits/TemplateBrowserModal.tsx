import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Heart,
  Dumbbell,
  Brain,
  Sparkles,
  BookOpen,
  Target,
  Clock,
  Users,
  CheckCircle2,
  ListChecks,
} from "lucide-react";

interface HabitTemplate {
  id: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  icon: string | null;
  color: string | null;
  subHabits: { name: string; estimatedDuration?: number; displayOrder: number }[];
  recurrence: string;
  startTime: string | null;
  endTime: string | null;
  usageCount: number;
}

interface TemplateBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
}

const CATEGORY_ICONS: Record<string, typeof Heart> = {
  health: Heart,
  fitness: Dumbbell,
  mindfulness: Brain,
  productivity: Target,
  learning: BookOpen,
  other: Sparkles,
};

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "health", label: "Health" },
  { value: "fitness", label: "Fitness" },
  { value: "productivity", label: "Productivity" },
  { value: "mindfulness", label: "Mindfulness" },
  { value: "learning", label: "Learning" },
  { value: "other", label: "Other" },
];

export function TemplateBrowserModal({ isOpen, onClose, onApply }: TemplateBrowserModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<HabitTemplate | null>(null);
  const [customName, setCustomName] = useState("");
  const [customRecurrence, setCustomRecurrence] = useState("daily");
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [timeWindowEnabled, setTimeWindowEnabled] = useState(false);
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery<HabitTemplate[]>({
    queryKey: ["/api/habit-templates"],
    enabled: isOpen,
  });

  const applyMutation = useMutation({
    mutationFn: (templateId: string) =>
      apiRequest("POST", `/api/habit-templates/${templateId}/apply`, {
        name: customName || selectedTemplate?.name,
        recurrence: customRecurrence,
        startTime: timeWindowEnabled ? customStartTime : null,
        endTime: timeWindowEnabled ? customEndTime : null,
        timeWindowEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/habits/parent/all"] });
      toast({ title: "Template applied!", description: "Your new habit routine has been created." });
      resetCustomization();
      onApply();
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply template", variant: "destructive" });
    },
  });

  const resetCustomization = () => {
    setSelectedTemplate(null);
    setCustomName("");
    setCustomRecurrence("daily");
    setCustomStartTime("");
    setCustomEndTime("");
    setTimeWindowEnabled(false);
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      template.categoryName?.toLowerCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTemplates(newExpanded);
  };

  const handleSelectTemplate = (template: HabitTemplate) => {
    setSelectedTemplate(template);
    setCustomName(template.name);
    setCustomRecurrence(template.recurrence);
    if (template.startTime && template.endTime) {
      setCustomStartTime(template.startTime);
      setCustomEndTime(template.endTime);
      setTimeWindowEnabled(true);
    }
  };

  if (selectedTemplate) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg" data-testid="modal-template-customize">
          <DialogHeader>
            <DialogTitle>Customize Template</DialogTitle>
            <DialogDescription>
              Adjust the settings before adding this routine
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="habit-name">Routine Name</Label>
              <Input
                id="habit-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter routine name"
                data-testid="input-template-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select value={customRecurrence} onValueChange={setCustomRecurrence}>
                <SelectTrigger data-testid="select-template-recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="time-window">Time Window</Label>
              <Switch
                id="time-window"
                checked={timeWindowEnabled}
                onCheckedChange={setTimeWindowEnabled}
                data-testid="switch-time-window"
              />
            </div>

            {timeWindowEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    data-testid="input-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    data-testid="input-end-time"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Sub-habits included</Label>
              <Card className="p-3">
                <ul className="space-y-1">
                  {selectedTemplate.subHabits.map((sub, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{sub.name}</span>
                      {sub.estimatedDuration && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {sub.estimatedDuration}m
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end pt-4">
            <Button variant="outline" onClick={resetCustomization} data-testid="button-back">
              Back
            </Button>
            <Button
              onClick={() => applyMutation.mutate(selectedTemplate.id)}
              disabled={applyMutation.isPending}
              data-testid="button-apply-template"
            >
              {applyMutation.isPending ? "Applying..." : "Apply Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="modal-template-browser">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Browse Templates
          </DialogTitle>
          <DialogDescription>
            Choose a pre-built routine to get started quickly
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-templates"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-full mb-3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </Card>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const IconComponent = CATEGORY_ICONS[template.categoryName?.toLowerCase() || "other"] || Sparkles;
                const isExpanded = expandedTemplates.has(template.id);

                return (
                  <Card
                    key={template.id}
                    className="overflow-visible"
                    data-testid={`card-template-${template.id}`}
                  >
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(template.id)}>
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="p-2 rounded-md"
                            style={{ backgroundColor: (template.color || "#3B82F6") + "20" }}
                          >
                            <IconComponent
                              className="h-5 w-5"
                              style={{ color: template.color || "#3B82F6" }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{template.name}</h4>
                            {template.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <Badge variant="secondary">
                            {template.subHabits.length} sub-habits
                          </Badge>
                          {template.usageCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {template.usageCount} uses
                            </span>
                          )}
                        </div>

                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between"
                            data-testid={`button-preview-${template.id}`}
                          >
                            Preview
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="space-y-2">
                          <div className="border-t pt-2">
                            <ul className="space-y-1">
                              {template.subHabits.map((sub, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm">
                                  <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                                  <span>{sub.name}</span>
                                  {sub.estimatedDuration && (
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {sub.estimatedDuration}m
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CollapsibleContent>

                        <Button
                          className="w-full"
                          onClick={() => handleSelectTemplate(template)}
                          data-testid={`button-use-${template.id}`}
                        >
                          Use Template
                        </Button>
                      </div>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
