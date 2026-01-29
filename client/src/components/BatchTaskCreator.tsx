import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Clipboard, Trash2, AlertTriangle, Pencil, Calendar, Clock, Flag, Hash, Folder, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { addDays, nextMonday, startOfWeek, addWeeks, format, setHours, setMinutes, isValid, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from "date-fns";
import type { Project, Tag, Task } from "@shared/schema";

export interface ParsedTaskLine {
  id: string;
  title: string;
  dueDate: Date | null;
  dueTime: string | null;
  priority: string;
  tags: string[];
  projectName: string | null;
  projectId: string | null;
  originalLine: string;
  hasWarning: boolean;
  warningMessage: string | null;
}

interface BatchTaskCreatorProps {
  onClose: () => void;
  onSuccess?: () => void;
  defaultProjectId?: string;
  projects?: Project[];
  tags?: Tag[];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function parseTaskLine(line: string, projects: Project[]): ParsedTaskLine {
  let remaining = line.trim();
  const parsed: ParsedTaskLine = {
    id: generateId(),
    title: "",
    dueDate: null,
    dueTime: null,
    priority: "medium",
    tags: [],
    projectName: null,
    projectId: null,
    originalLine: line,
    hasWarning: false,
    warningMessage: null,
  };

  if (!remaining) {
    parsed.hasWarning = true;
    parsed.warningMessage = "Empty line";
    return parsed;
  }

  const datePatterns: { pattern: RegExp; getDate: (match?: RegExpMatchArray) => Date }[] = [
    { pattern: /\btoday\b/i, getDate: () => new Date() },
    { pattern: /\btomorrow\b/i, getDate: () => addDays(new Date(), 1) },
    { pattern: /\bnext week\b/i, getDate: () => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1) },
    { pattern: /\bnext monday\b/i, getDate: () => nextMonday(new Date()) },
    { pattern: /\bnext tuesday\b/i, getDate: () => nextTuesday(new Date()) },
    { pattern: /\bnext wednesday\b/i, getDate: () => nextWednesday(new Date()) },
    { pattern: /\bnext thursday\b/i, getDate: () => nextThursday(new Date()) },
    { pattern: /\bnext friday\b/i, getDate: () => nextFriday(new Date()) },
    { pattern: /\bnext saturday\b/i, getDate: () => nextSaturday(new Date()) },
    { pattern: /\bnext sunday\b/i, getDate: () => nextSunday(new Date()) },
    { pattern: /\bmonday\b/i, getDate: () => nextMonday(new Date()) },
    { pattern: /\btuesday\b/i, getDate: () => nextTuesday(new Date()) },
    { pattern: /\bwednesday\b/i, getDate: () => nextWednesday(new Date()) },
    { pattern: /\bthursday\b/i, getDate: () => nextThursday(new Date()) },
    { pattern: /\bfriday\b/i, getDate: () => nextFriday(new Date()) },
    { pattern: /\bsaturday\b/i, getDate: () => nextSaturday(new Date()) },
    { pattern: /\bsunday\b/i, getDate: () => nextSunday(new Date()) },
    { pattern: /\bin (\d+) days?\b/i, getDate: (match) => addDays(new Date(), parseInt(match?.[1] || "1")) },
    { pattern: /\bin (\d+) weeks?\b/i, getDate: (match) => addWeeks(new Date(), parseInt(match?.[1] || "1")) },
  ];

  const specificDatePattern = /\b(?:by|on|due)?\s*(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/i;
  const specificDateMatch = remaining.match(specificDatePattern);
  if (specificDateMatch) {
    const month = parseInt(specificDateMatch[1]);
    const day = parseInt(specificDateMatch[2]);
    const year = specificDateMatch[3] ? parseInt(specificDateMatch[3]) : new Date().getFullYear();
    const fullYear = year < 100 ? 2000 + year : year;
    const date = new Date(fullYear, month - 1, day);
    if (isValid(date)) {
      parsed.dueDate = date;
      remaining = remaining.replace(specificDateMatch[0], "");
    }
  }

  if (!parsed.dueDate) {
    for (const { pattern, getDate } of datePatterns) {
      const match = remaining.match(pattern);
      if (match) {
        parsed.dueDate = getDate(match);
        remaining = remaining.replace(pattern, "");
        break;
      }
    }
  }

  const timePattern12 = /\bat (\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
  const timePattern24 = /\bat (\d{1,2}):(\d{2})\b/i;
  
  const time12Match = remaining.match(timePattern12);
  if (time12Match) {
    let hours = parseInt(time12Match[1]);
    const minutes = time12Match[2] ? parseInt(time12Match[2]) : 0;
    const isPM = time12Match[3].toLowerCase() === "pm";
    
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    
    parsed.dueTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    remaining = remaining.replace(timePattern12, "");
  } else {
    const time24Match = remaining.match(timePattern24);
    if (time24Match) {
      const hours = parseInt(time24Match[1]);
      const minutes = parseInt(time24Match[2]);
      parsed.dueTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      remaining = remaining.replace(timePattern24, "");
    }
  }

  const priorityPatterns: { pattern: RegExp; priority: string }[] = [
    { pattern: /\s*!urgent\b/gi, priority: "urgent" },
    { pattern: /\s*!high\b/gi, priority: "high" },
    { pattern: /\s*!medium\b/gi, priority: "medium" },
    { pattern: /\s*!low\b/gi, priority: "low" },
    { pattern: /\s*\bp1\b/gi, priority: "urgent" },
    { pattern: /\s*\bp2\b/gi, priority: "high" },
    { pattern: /\s*\bp3\b/gi, priority: "medium" },
    { pattern: /\s*\bp4\b/gi, priority: "low" },
  ];

  for (const { pattern, priority } of priorityPatterns) {
    if (pattern.test(remaining)) {
      parsed.priority = priority;
      remaining = remaining.replace(pattern, " ");
      break;
    }
  }

  const tagPattern = /#(\w+)/g;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(remaining)) !== null) {
    parsed.tags.push(tagMatch[1]);
  }
  remaining = remaining.replace(tagPattern, "");

  const projectPattern = /@(\w+)/g;
  const projectMatch = remaining.match(projectPattern);
  if (projectMatch && projectMatch.length > 0) {
    const projectName = projectMatch[0].substring(1).toLowerCase();
    const matchedProject = projects.find(
      (p) => p.name.toLowerCase().includes(projectName) || projectName.includes(p.name.toLowerCase())
    );
    if (matchedProject) {
      parsed.projectName = matchedProject.name;
      parsed.projectId = matchedProject.id;
    } else {
      parsed.projectName = projectMatch[0].substring(1);
      parsed.hasWarning = true;
      parsed.warningMessage = `Project "@${projectMatch[0].substring(1)}" not found`;
    }
    remaining = remaining.replace(projectPattern, "");
  }

  parsed.title = remaining.replace(/\s+/g, " ").trim();

  if (!parsed.title) {
    parsed.hasWarning = true;
    parsed.warningMessage = "No task title found";
  }

  return parsed;
}

export function BatchTaskCreator({ 
  onClose, 
  onSuccess, 
  defaultProjectId, 
  projects: propProjects, 
  tags: propTags 
}: BatchTaskCreatorProps) {
  const [inputValue, setInputValue] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ParsedTaskLine[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ParsedTaskLine>>({});
  const [creationProgress, setCreationProgress] = useState<{ current: number; total: number } | null>(null);
  const { toast } = useToast();

  const { data: fetchedProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: !propProjects,
  });

  const projects = propProjects || fetchedProjects;

  const parseInput = useCallback(() => {
    const lines = inputValue.split("\n").filter(line => line.trim());
    const parsed = lines.map(line => {
      const task = parseTaskLine(line, projects);
      if (!task.projectId && defaultProjectId) {
        const defaultProject = projects.find(p => p.id === defaultProjectId);
        task.projectId = defaultProjectId;
        task.projectName = defaultProject?.name || null;
      }
      return task;
    });
    setParsedTasks(parsed);
  }, [inputValue, projects, defaultProjectId]);

  const validTasks = useMemo(() => 
    parsedTasks.filter(t => t.title && t.projectId),
    [parsedTasks]
  );

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputValue(prev => prev ? `${prev}\n${text}` : text);
      toast({ title: "Pasted from clipboard" });
    } catch {
      toast({ title: "Could not access clipboard", variant: "destructive" });
    }
  }, [toast]);

  const handleClear = useCallback(() => {
    setInputValue("");
    setParsedTasks([]);
    setEditingId(null);
  }, []);

  const handleDeleteTask = useCallback((id: string) => {
    setParsedTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleStartEdit = useCallback((task: ParsedTaskLine) => {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      projectId: task.projectId,
      tags: [...task.tags],
    });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    
    setParsedTasks(prev => prev.map(task => {
      if (task.id !== editingId) return task;
      
      const project = projects.find(p => p.id === editForm.projectId);
      return {
        ...task,
        title: editForm.title || task.title,
        dueDate: editForm.dueDate ?? task.dueDate,
        priority: editForm.priority || task.priority,
        projectId: editForm.projectId || task.projectId,
        projectName: project?.name || task.projectName,
        tags: editForm.tags || task.tags,
        hasWarning: !editForm.title || !editForm.projectId,
        warningMessage: !editForm.title ? "No task title" : !editForm.projectId ? "No project selected" : null,
      };
    }));
    
    setEditingId(null);
    setEditForm({});
  }, [editingId, editForm, projects]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({});
  }, []);

  const batchCreateMutation = useMutation({
    mutationFn: async (tasks: ParsedTaskLine[]) => {
      const taskPayloads = tasks.map(task => {
        let dueDateTime: string | null = null;
        if (task.dueDate) {
          let date = task.dueDate;
          if (task.dueTime) {
            const [hours, minutes] = task.dueTime.split(":").map(Number);
            date = setMinutes(setHours(date, hours), minutes);
          }
          dueDateTime = date.toISOString();
        }

        return {
          title: task.title,
          projectId: task.projectId,
          priority: task.priority,
          status: "todo",
          dueDate: dueDateTime,
          dueTime: task.dueTime,
        };
      });

      setCreationProgress({ current: 0, total: taskPayloads.length });

      const res = await apiRequest("POST", "/api/tasks/batch", { tasks: taskPayloads });
      const result = await res.json();
      
      setCreationProgress({ current: result.success?.length || 0, total: taskPayloads.length });
      
      return result;
    },
    onSuccess: (result) => {
      const successCount = result.success?.length || 0;
      const failedCount = result.failed?.length || 0;
      
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      if (failedCount > 0) {
        toast({
          title: `Created ${successCount} tasks`,
          description: `${failedCount} tasks failed to create`,
          variant: successCount > 0 ? "default" : "destructive",
        });
      } else {
        toast({ title: `Created ${successCount} tasks successfully` });
      }
      
      setCreationProgress(null);
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      setCreationProgress(null);
      toast({
        title: "Failed to create tasks",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateAll = () => {
    if (validTasks.length === 0) {
      toast({ title: "No valid tasks to create", variant: "destructive" });
      return;
    }
    batchCreateMutation.mutate(validTasks);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "high":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "low":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      default:
        return "";
    }
  };

  const placeholderText = `Enter one task per line...
Example:
Buy groceries tomorrow #shopping !high
Call mom at 3pm
Finish report by Friday !urgent
Review docs next week @work #review p2`;

  const isCreating = batchCreateMutation.isPending;

  return (
    <Card className="w-full max-w-2xl" data-testid="batch-task-creator">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
        <CardTitle className="text-xl">Batch Create Tasks</CardTitle>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onClose}
          disabled={isCreating}
          data-testid="button-close-batch-creator"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholderText}
            rows={8}
            className="font-mono text-sm resize-none"
            disabled={isCreating}
            data-testid="textarea-batch-input"
          />
          <div className="flex gap-2 flex-wrap">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handlePasteFromClipboard}
              disabled={isCreating}
              data-testid="button-paste-clipboard"
            >
              <Clipboard className="h-4 w-4 mr-2" />
              Paste
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleClear}
              disabled={isCreating}
              data-testid="button-clear"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button 
              size="sm" 
              onClick={parseInput}
              disabled={isCreating || !inputValue.trim()}
              data-testid="button-parse-tasks"
            >
              Parse Tasks
            </Button>
          </div>
        </div>

        {creationProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Creating tasks...</span>
              <span className="font-medium">{creationProgress.current} / {creationProgress.total}</span>
            </div>
            <Progress value={(creationProgress.current / creationProgress.total) * 100} />
          </div>
        )}

        {parsedTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Preview ({validTasks.length} valid of {parsedTasks.length} tasks)
              </h3>
            </div>
            <ScrollArea className="h-64 rounded-md border">
              <div className="p-2 space-y-2">
                {parsedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-md ${
                      task.hasWarning || !task.projectId ? "bg-yellow-500/5" : "bg-muted/30"
                    }`}
                    data-testid={`preview-task-${task.id}`}
                  >
                    {editingId === task.id ? (
                      <div className="flex-1 space-y-3">
                        <Input
                          value={editForm.title || ""}
                          onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Task title"
                          className="text-sm"
                          autoFocus
                          data-testid={`input-edit-title-${task.id}`}
                        />
                        
                        <div className="flex flex-wrap gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2">
                                <Calendar className="h-3 w-3" />
                                {editForm.dueDate ? format(editForm.dueDate, "MMM d") : "No date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={editForm.dueDate || undefined}
                                onSelect={(date) => setEditForm(prev => ({ ...prev, dueDate: date || null }))}
                              />
                            </PopoverContent>
                          </Popover>

                          <Select
                            value={editForm.priority || "medium"}
                            onValueChange={(value) => setEditForm(prev => ({ ...prev, priority: value }))}
                          >
                            <SelectTrigger className="w-28" data-testid={`select-priority-${task.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="urgent">Urgent</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={editForm.projectId || ""}
                            onValueChange={(value) => setEditForm(prev => ({ ...prev, projectId: value }))}
                          >
                            <SelectTrigger className="w-40" data-testid={`select-project-${task.id}`}>
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="h-2 w-2 rounded-full" 
                                      style={{ backgroundColor: project.color || "#3B82F6" }}
                                    />
                                    {project.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={handleSaveEdit}
                            data-testid={`button-save-edit-${task.id}`}
                          >
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleCancelEdit}
                            data-testid={`button-cancel-edit-${task.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {task.hasWarning || !task.projectId ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        )}
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium truncate">
                              {task.title || <span className="text-muted-foreground italic">No title</span>}
                            </span>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleStartEdit(task)}
                                disabled={isCreating}
                                data-testid={`button-edit-task-${task.id}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-destructive"
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={isCreating}
                                data-testid={`button-delete-task-${task.id}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {(task.hasWarning && task.warningMessage) || !task.projectId ? (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400">
                              {task.warningMessage || "No project selected"}
                            </p>
                          ) : null}
                          
                          <div className="flex flex-wrap items-center gap-1.5">
                            {task.dueDate && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(task.dueDate, "MMM d")}
                              </Badge>
                            )}
                            
                            {task.dueTime && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Clock className="h-3 w-3" />
                                {task.dueTime}
                              </Badge>
                            )}
                            
                            {task.priority !== "medium" && (
                              <Badge className={`text-xs gap-1 ${getPriorityColor(task.priority)}`}>
                                <Flag className="h-3 w-3" />
                                {task.priority}
                              </Badge>
                            )}
                            
                            {task.tags.map((tag, tagIndex) => (
                              <Badge 
                                key={tagIndex} 
                                variant="outline" 
                                className="text-xs gap-1"
                              >
                                <Hash className="h-3 w-3" />
                                {tag}
                              </Badge>
                            ))}
                            
                            {task.projectName && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs gap-1 ${!task.projectId ? "border-yellow-500/50" : ""}`}
                              >
                                <Folder className="h-3 w-3" />
                                {task.projectName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end gap-2 pt-4">
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={isCreating}
          data-testid="button-cancel-batch"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateAll}
          disabled={validTasks.length === 0 || isCreating}
          data-testid="button-create-all"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            `Create All (${validTasks.length})`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
