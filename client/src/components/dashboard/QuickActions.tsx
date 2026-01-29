import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, FileText, Timer, ChevronDown, Sparkles } from "lucide-react";

interface Template {
  id: string;
  name: string;
  icon?: string;
}

interface QuickActionsProps {
  templates?: Template[];
  onNewTask?: () => void;
  onUseTemplate?: (templateId: string) => void;
  onStartPomodoro?: () => void;
}

export function QuickActions({
  templates = [],
  onNewTask,
  onUseTemplate,
  onStartPomodoro,
}: QuickActionsProps) {
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="quick-actions-container">
      <Button onClick={onNewTask} className="gap-2" data-testid="button-quick-new-task">
        <Plus className="h-4 w-4" />
        New Task
      </Button>

      {templates.length > 0 ? (
        <DropdownMenu open={isTemplateDropdownOpen} onOpenChange={setIsTemplateDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="button-use-template">
              <FileText className="h-4 w-4" />
              Use Template
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {templates.slice(0, 10).map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => {
                  onUseTemplate?.(template.id);
                  setIsTemplateDropdownOpen(false);
                }}
                data-testid={`template-option-${template.id}`}
              >
                <Sparkles className="h-4 w-4 mr-2 text-muted-foreground" />
                {template.name}
              </DropdownMenuItem>
            ))}
            {templates.length > 10 && (
              <Link href="/templates">
                <DropdownMenuItem data-testid="link-view-all-templates">
                  View all templates...
                </DropdownMenuItem>
              </Link>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link href="/templates">
          <Button variant="outline" className="gap-2" data-testid="button-browse-templates">
            <FileText className="h-4 w-4" />
            Templates
          </Button>
        </Link>
      )}

      <Link href="/focus">
        <Button variant="outline" className="gap-2" onClick={onStartPomodoro} data-testid="button-start-pomodoro">
          <Timer className="h-4 w-4" />
          Start Focus
        </Button>
      </Link>
    </div>
  );
}
