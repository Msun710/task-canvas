import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Calendar, Star, Hash, Folder, Clock, Flag, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { addDays, nextMonday, startOfWeek, addWeeks, format, setHours, setMinutes } from "date-fns";
import type { Project } from "@shared/schema";

interface ParsedTask {
  title: string;
  dueDate: Date | null;
  dueTime: string | null;
  priority: string;
  tags: string[];
  projectName: string | null;
  projectId: string | null;
  isImportant: boolean;
}

interface QuickAddTaskProps {
  onOpenFullForm?: (initialData?: Partial<ParsedTask>) => void;
  defaultProjectId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuickAddTask({ onOpenFullForm, defaultProjectId, open: controlledOpen, onOpenChange }: QuickAddTaskProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = useCallback((value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  }, [onOpenChange]);
  const [inputValue, setInputValue] = useState("");
  const [parsedTask, setParsedTask] = useState<ParsedTask>({
    title: "",
    dueDate: null,
    dueTime: null,
    priority: "medium",
    tags: [],
    projectName: null,
    projectId: defaultProjectId || null,
    isImportant: false,
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const effectiveProjectId = useMemo(() => 
    defaultProjectId || (projects.length > 0 ? projects[0].id : null),
    [defaultProjectId, projects]
  );
  
  const effectiveProjectName = useMemo(() => 
    defaultProjectId 
      ? projects.find(p => p.id === defaultProjectId)?.name || null
      : (projects.length > 0 ? projects[0].name : null),
    [defaultProjectId, projects]
  );

  const parseInput = useCallback((text: string) => {
    let remaining = text;
    const parsed: ParsedTask = {
      title: "",
      dueDate: null,
      dueTime: null,
      priority: "medium",
      tags: [],
      projectName: effectiveProjectName,
      projectId: effectiveProjectId,
      isImportant: false,
    };

    const datePatterns: { pattern: RegExp; getDate: (match?: RegExpMatchArray) => Date }[] = [
      { pattern: /\btoday\b/i, getDate: () => new Date() },
      { pattern: /\btomorrow\b/i, getDate: () => addDays(new Date(), 1) },
      { pattern: /\bnext week\b/i, getDate: () => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1) },
      { pattern: /\bnext monday\b/i, getDate: () => nextMonday(new Date()) },
      { pattern: /\bnext tuesday\b/i, getDate: () => addDays(nextMonday(new Date()), 1) },
      { pattern: /\bnext wednesday\b/i, getDate: () => addDays(nextMonday(new Date()), 2) },
      { pattern: /\bnext thursday\b/i, getDate: () => addDays(nextMonday(new Date()), 3) },
      { pattern: /\bnext friday\b/i, getDate: () => addDays(nextMonday(new Date()), 4) },
      { pattern: /\bnext saturday\b/i, getDate: () => addDays(nextMonday(new Date()), 5) },
      { pattern: /\bnext sunday\b/i, getDate: () => addDays(nextMonday(new Date()), 6) },
      { pattern: /\bin (\d+) days?\b/i, getDate: (match) => addDays(new Date(), parseInt(match?.[1] || "1")) },
    ];

    for (const { pattern, getDate } of datePatterns) {
      const match = remaining.match(pattern);
      if (match) {
        parsed.dueDate = getDate(match);
        remaining = remaining.replace(pattern, "");
        break;
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
      { pattern: /\s*!!!\s*/g, priority: "urgent" },
      { pattern: /\s*!!\s*/g, priority: "high" },
      { pattern: /\s*!high\b/gi, priority: "high" },
      { pattern: /\s*!medium\b/gi, priority: "medium" },
      { pattern: /\s*!low\b/gi, priority: "low" },
      { pattern: /\s*!\s*/g, priority: "high" },
    ];

    for (const { pattern, priority } of priorityPatterns) {
      if (pattern.test(remaining)) {
        parsed.priority = priority;
        remaining = remaining.replace(pattern, " ");
        break;
      }
    }

    if (/\*/.test(remaining)) {
      parsed.isImportant = true;
      remaining = remaining.replace(/\s*\*\s*/g, " ");
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
      }
      remaining = remaining.replace(projectPattern, "");
    }

    parsed.title = remaining.replace(/\s+/g, " ").trim();

    return parsed;
  }, [projects, effectiveProjectId, effectiveProjectName]);

  // Use refs to avoid dependency on parseInput in effect
  const parseInputRef = useRef(parseInput);
  parseInputRef.current = parseInput;
  
  useEffect(() => {
    const parsed = parseInputRef.current(inputValue);
    setParsedTask(parsed);
  }, [inputValue]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setInputValue("");
    } else if (e.key === "Enter" && parsedTask.title.trim()) {
      handleCreateTask();
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: ParsedTask) => {
      if (!data.projectId) {
        throw new Error("Please select a project using @projectname");
      }

      let dueDateTime: string | null = null;
      if (data.dueDate) {
        let date = data.dueDate;
        if (data.dueTime) {
          const [hours, minutes] = data.dueTime.split(":").map(Number);
          date = setMinutes(setHours(date, hours), minutes);
        }
        dueDateTime = date.toISOString();
      }

      const payload = {
        title: data.title,
        projectId: data.projectId,
        priority: data.priority,
        status: "todo",
        dueDate: dueDateTime,
        dueTime: data.dueTime,
        isImportant: data.isImportant,
      };

      const res = await apiRequest("POST", "/api/tasks", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task created successfully" });
      setInputValue("");
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = () => {
    if (parsedTask.title.trim()) {
      createMutation.mutate(parsedTask);
    }
  };

  const handleOpenFullForm = () => {
    onOpenFullForm?.(parsedTask);
    setIsOpen(false);
    setInputValue("");
  };

  const removeBadge = (type: "date" | "time" | "priority" | "tag" | "project" | "important", value?: string) => {
    let newInput = inputValue;
    
    switch (type) {
      case "date":
        const datePatterns = [/\btoday\b/gi, /\btomorrow\b/gi, /\bnext week\b/gi, /\bnext \w+day\b/gi, /\bin \d+ days?\b/gi];
        datePatterns.forEach((p) => (newInput = newInput.replace(p, "")));
        break;
      case "time":
        newInput = newInput.replace(/\bat \d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, "");
        break;
      case "priority":
        newInput = newInput.replace(/!!!|!!|!(?:high|medium|low)?\b/gi, "");
        break;
      case "tag":
        if (value) newInput = newInput.replace(new RegExp(`#${value}\\b`, "gi"), "");
        break;
      case "project":
        newInput = newInput.replace(/@\w+/g, "");
        break;
      case "important":
        newInput = newInput.replace(/\*/g, "");
        break;
    }
    
    setInputValue(newInput.replace(/\s+/g, " ").trim());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "low":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      default:
        return "";
    }
  };

  const hasParsedAttributes = 
    parsedTask.dueDate || 
    parsedTask.dueTime || 
    parsedTask.priority !== "medium" || 
    parsedTask.tags.length > 0 || 
    parsedTask.projectName || 
    parsedTask.isImportant;

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50" data-testid="quick-add-task-container">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-16 right-0 w-96 bg-card border rounded-lg shadow-lg overflow-visible"
            data-testid="quick-add-task-panel"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add task... (e.g., 'Review docs tomorrow at 3pm !high #work @project')"
                  className="flex-1"
                  data-testid="input-quick-add-task"
                />
              </div>

              <AnimatePresence>
                {hasParsedAttributes && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-wrap gap-2"
                  >
                    {parsedTask.dueDate && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Badge
                          variant="secondary"
                          className="cursor-pointer gap-1"
                          onClick={() => removeBadge("date")}
                          data-testid="badge-due-date"
                        >
                          <Calendar className="h-3 w-3" />
                          {format(parsedTask.dueDate, "MMM d")}
                          <X className="h-3 w-3" />
                        </Badge>
                      </motion.div>
                    )}

                    {parsedTask.dueTime && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Badge
                          variant="secondary"
                          className="cursor-pointer gap-1"
                          onClick={() => removeBadge("time")}
                          data-testid="badge-due-time"
                        >
                          <Clock className="h-3 w-3" />
                          {parsedTask.dueTime}
                          <X className="h-3 w-3" />
                        </Badge>
                      </motion.div>
                    )}

                    {parsedTask.priority !== "medium" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Badge
                          variant="outline"
                          className={`cursor-pointer gap-1 ${getPriorityColor(parsedTask.priority)}`}
                          onClick={() => removeBadge("priority")}
                          data-testid="badge-priority"
                        >
                          <Flag className="h-3 w-3" />
                          {parsedTask.priority}
                          <X className="h-3 w-3" />
                        </Badge>
                      </motion.div>
                    )}

                    {parsedTask.isImportant && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Badge
                          variant="outline"
                          className="cursor-pointer gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          onClick={() => removeBadge("important")}
                          data-testid="badge-important"
                        >
                          <Star className="h-3 w-3 fill-current" />
                          Important
                          <X className="h-3 w-3" />
                        </Badge>
                      </motion.div>
                    )}

                    {parsedTask.projectName && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Badge
                          variant="secondary"
                          className="cursor-pointer gap-1"
                          onClick={() => removeBadge("project")}
                          data-testid="badge-project"
                        >
                          <Folder className="h-3 w-3" />
                          {parsedTask.projectName}
                          <X className="h-3 w-3" />
                        </Badge>
                      </motion.div>
                    )}

                    {parsedTask.tags.map((tag) => (
                      <motion.div
                        key={tag}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Badge
                          variant="secondary"
                          className="cursor-pointer gap-1"
                          onClick={() => removeBadge("tag", tag)}
                          data-testid={`badge-tag-${tag}`}
                        >
                          <Hash className="h-3 w-3" />
                          {tag}
                          <X className="h-3 w-3" />
                        </Badge>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {!parsedTask.projectId && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive text-xs rounded-md" data-testid="alert-no-project">
                  <Folder className="h-4 w-4 flex-shrink-0" />
                  <span>No project selected. Create a project first or use @projectname to specify one.</span>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Quick syntax: <code className="bg-muted px-1 rounded">tomorrow</code> <code className="bg-muted px-1 rounded">!high</code> <code className="bg-muted px-1 rounded">#tag</code> <code className="bg-muted px-1 rounded">@project</code> <code className="bg-muted px-1 rounded">*</code> <code className="bg-muted px-1 rounded">at 3pm</code></p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenFullForm}
                  className="gap-1"
                  data-testid="button-open-full-form"
                >
                  <Maximize2 className="h-4 w-4" />
                  Open Full Form
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      setInputValue("");
                    }}
                    data-testid="button-cancel-quick-add"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateTask}
                    disabled={!parsedTask.title.trim() || !parsedTask.projectId || createMutation.isPending}
                    data-testid="button-create-quick-task"
                  >
                    {createMutation.isPending ? "Creating..." : "Add Task"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full shadow-lg"
          data-testid="button-quick-add-fab"
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="h-6 w-6" />
          </motion.div>
        </Button>
      </motion.div>
    </div>
  );
}
