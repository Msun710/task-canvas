import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, FileText, Trash2, Pencil, MoreHorizontal, Copy, Clock, ListTodo, Globe, Lock, Sparkles, Layers, FolderKanban } from "lucide-react";
import type { TaskTemplate, Project } from "@shared/schema";

const CATEGORIES = [
  { value: "development", label: "Development" },
  { value: "design", label: "Design" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "research", label: "Research" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-green-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "urgent", label: "Urgent", color: "bg-red-500" },
];

const PRESET_COLORS = [
  "#6B7280", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4",
];

interface TemplateFormState {
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  taskTitle: string;
  taskDescription: string;
  priority: string;
  estimatedTime: number | null;
  subtasks: { title: string; description?: string }[];
  isPublic: boolean;
}

const initialFormState: TemplateFormState = {
  name: "",
  description: "",
  category: "other",
  icon: "",
  color: "#3B82F6",
  taskTitle: "",
  taskDescription: "",
  priority: "medium",
  estimatedTime: null,
  subtasks: [],
  isPublic: false,
};

export default function TemplatesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUseOpen, setIsUseOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<TaskTemplate | null>(null);
  const [formState, setFormState] = useState<TemplateFormState>(initialFormState);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const { toast } = useToast();

  const { data: myTemplates = [], isLoading: myLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const { data: publicTemplates = [], isLoading: publicLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/templates/public"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const invalidateTemplateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    queryClient.invalidateQueries({ queryKey: ["/api/templates/public"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<TemplateFormState>) => apiRequest("POST", "/api/templates", data),
    onSuccess: () => {
      invalidateTemplateQueries();
      setIsCreateOpen(false);
      setFormState(initialFormState);
      toast({ title: "Template created", description: "Your template has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TemplateFormState> }) =>
      apiRequest("PATCH", `/api/templates/${id}`, data),
    onSuccess: () => {
      invalidateTemplateQueries();
      setEditingTemplate(null);
      setFormState(initialFormState);
      toast({ title: "Template updated", description: "Changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/templates/${id}`),
    onSuccess: () => {
      invalidateTemplateQueries();
      setDeleteConfirmTemplate(null);
      toast({ title: "Template deleted", description: "The template has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template.", variant: "destructive" });
    },
  });

  const useMutation2 = useMutation({
    mutationFn: ({ templateId, projectId }: { templateId: string; projectId: string }) =>
      apiRequest("POST", `/api/templates/${templateId}/use`, { projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      invalidateTemplateQueries();
      setIsUseOpen(false);
      setSelectedTemplate(null);
      setSelectedProject("");
      toast({ title: "Task created", description: "A new task was created from the template." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task from template.", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!formState.name || !formState.taskTitle) {
      toast({ title: "Error", description: "Template name and task title are required.", variant: "destructive" });
      return;
    }

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formState });
    } else {
      createMutation.mutate(formState);
    }
  };

  const handleEdit = (template: TaskTemplate) => {
    setFormState({
      name: template.name,
      description: template.description || "",
      category: template.category || "other",
      icon: template.icon || "",
      color: template.color || "#3B82F6",
      taskTitle: template.taskTitle,
      taskDescription: template.taskDescription || "",
      priority: template.priority || "medium",
      estimatedTime: template.estimatedTime,
      subtasks: (template.subtasks as any) || [],
      isPublic: template.isPublic || false,
    });
    setEditingTemplate(template);
  };

  const handleUse = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setIsUseOpen(true);
  };

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setFormState({
      ...formState,
      subtasks: [...formState.subtasks, { title: newSubtaskTitle.trim() }],
    });
    setNewSubtaskTitle("");
  };

  const removeSubtask = (index: number) => {
    setFormState({
      ...formState,
      subtasks: formState.subtasks.filter((_, i) => i !== index),
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      development: "bg-blue-500/10 text-blue-600",
      design: "bg-purple-500/10 text-purple-600",
      marketing: "bg-green-500/10 text-green-600",
      operations: "bg-orange-500/10 text-orange-600",
      research: "bg-cyan-500/10 text-cyan-600",
      personal: "bg-pink-500/10 text-pink-600",
      other: "bg-gray-500/10 text-gray-600",
    };
    return colors[category] || colors.other;
  };

  const TemplateCard = ({ template, showActions = true }: { template: TaskTemplate; showActions?: boolean }) => (
    <Card className="hover-elevate" data-testid={`card-template-${template.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: template.color || "#6B7280" }}
              />
              <span className="truncate">{template.name}</span>
            </CardTitle>
            {template.description && (
              <CardDescription className="mt-1 line-clamp-2">{template.description}</CardDescription>
            )}
          </div>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-template-menu-${template.id}`}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleUse(template)} data-testid={`button-use-template-${template.id}`}>
                  <Copy className="w-4 h-4 mr-2" />
                  Use Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(template)} data-testid={`button-edit-template-${template.id}`}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteConfirmTemplate(template)}
                  className="text-red-600"
                  data-testid={`button-delete-template-${template.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {template.category && (
            <Badge variant="secondary" className={getCategoryColor(template.category)}>
              {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
            </Badge>
          )}
          {template.isPublic && (
            <Badge variant="outline" className="gap-1">
              <Globe className="w-3 h-3" />
              Public
            </Badge>
          )}
        </div>

        <div className="text-sm">
          <div className="font-medium text-muted-foreground mb-1">Task:</div>
          <div className="truncate">{template.taskTitle}</div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {template.estimatedTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {template.estimatedTime}m
            </span>
          )}
          {template.subtasks && (template.subtasks as any[]).length > 0 && (
            <span className="flex items-center gap-1">
              <ListTodo className="w-3 h-3" />
              {(template.subtasks as any[]).length} subtasks
            </span>
          )}
          {template.usageCount && template.usageCount > 0 && (
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Used {template.usageCount}x
            </span>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleUse(template)}
          data-testid={`button-use-template-card-${template.id}`}
        >
          <Copy className="w-4 h-4 mr-2" />
          Use Template
        </Button>
      </CardContent>
    </Card>
  );

  const FormDialog = () => (
    <Dialog open={isCreateOpen || !!editingTemplate} onOpenChange={(open) => {
      if (!open) {
        setIsCreateOpen(false);
        setEditingTemplate(null);
        setFormState(initialFormState);
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            Create a reusable task template to quickly add similar tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="e.g., Bug Report"
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formState.category}
                onValueChange={(v) => setFormState({ ...formState, category: v })}
              >
                <SelectTrigger data-testid="select-template-category">
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
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              placeholder="Describe when to use this template..."
              data-testid="input-template-description"
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-md border-2 transition-all ${
                    formState.color === color ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormState({ ...formState, color })}
                  data-testid={`button-color-${color}`}
                />
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Task Details
            </h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Task Title *</Label>
                <Input
                  value={formState.taskTitle}
                  onChange={(e) => setFormState({ ...formState, taskTitle: e.target.value })}
                  placeholder="e.g., Fix [Component] - [Issue]"
                  data-testid="input-task-title"
                />
              </div>

              <div className="space-y-2">
                <Label>Task Description</Label>
                <Textarea
                  value={formState.taskDescription}
                  onChange={(e) => setFormState({ ...formState, taskDescription: e.target.value })}
                  placeholder="Default description for tasks created from this template..."
                  data-testid="input-task-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formState.priority}
                    onValueChange={(v) => setFormState({ ...formState, priority: v })}
                  >
                    <SelectTrigger data-testid="select-task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${p.color}`} />
                            {p.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estimated Time (minutes)</Label>
                  <Input
                    type="number"
                    value={formState.estimatedTime || ""}
                    onChange={(e) => setFormState({ ...formState, estimatedTime: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="e.g., 30"
                    data-testid="input-estimated-time"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Subtasks
            </h4>

            <div className="space-y-3">
              {formState.subtasks.map((subtask, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                  <span className="flex-1 text-sm">{subtask.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSubtask(index)}
                    data-testid={`button-remove-subtask-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a subtask..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                  data-testid="input-new-subtask"
                />
                <Button variant="outline" size="icon" onClick={addSubtask} data-testid="button-add-subtask">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Make Public</Label>
                <p className="text-xs text-muted-foreground">Allow others to discover and use this template</p>
              </div>
              <Switch
                checked={formState.isPublic}
                onCheckedChange={(v) => setFormState({ ...formState, isPublic: v })}
                data-testid="switch-is-public"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsCreateOpen(false);
              setEditingTemplate(null);
              setFormState(initialFormState);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-save-template"
          >
            {editingTemplate ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
            <FolderKanban className="w-6 h-6" />
            Task Templates
          </h1>
          <p className="text-muted-foreground">Create and manage reusable task templates</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-template">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs defaultValue="my-templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-templates" data-testid="tab-my-templates">
            <Lock className="w-4 h-4 mr-2" />
            My Templates
          </TabsTrigger>
          <TabsTrigger value="public" data-testid="tab-public-templates">
            <Globe className="w-4 h-4 mr-2" />
            Public Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-templates" className="space-y-4">
          {myLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : myTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first template to speed up task creation.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-template">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="public" className="space-y-4">
          {publicLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : publicTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No public templates</h3>
              <p className="text-muted-foreground">
                Be the first to share a template with the community!
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} showActions={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <FormDialog />

      <Dialog open={isUseOpen} onOpenChange={setIsUseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Template</DialogTitle>
            <DialogDescription>
              Select a project to create a new task from "{selectedTemplate?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger data-testid="select-project-for-template">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="p-4 bg-muted/50 rounded-md space-y-2">
                <div className="font-medium">{selectedTemplate.taskTitle}</div>
                {selectedTemplate.taskDescription && (
                  <p className="text-sm text-muted-foreground">{selectedTemplate.taskDescription}</p>
                )}
                {selectedTemplate.subtasks && (selectedTemplate.subtasks as any[]).length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    + {(selectedTemplate.subtasks as any[]).length} subtasks
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUseOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTemplate && selectedProject) {
                  useMutation2.mutate({ templateId: selectedTemplate.id, projectId: selectedProject });
                }
              }}
              disabled={!selectedProject || useMutation2.isPending}
              data-testid="button-confirm-use-template"
            >
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmTemplate} onOpenChange={() => setDeleteConfirmTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmTemplate && deleteMutation.mutate(deleteConfirmTemplate.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-template"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
