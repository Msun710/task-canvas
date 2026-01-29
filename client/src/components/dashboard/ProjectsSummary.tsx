import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FolderKanban, ArrowRight } from "lucide-react";

interface ProjectSummary {
  id: string;
  name: string;
  color: string;
  completed: number;
  total: number;
  percentage: number;
}

interface ProjectsSummaryProps {
  projects: ProjectSummary[];
  onProjectClick?: (projectId: string) => void;
}

export function ProjectsSummary({ projects, onProjectClick }: ProjectsSummaryProps) {
  const displayProjects = projects.slice(0, 5);

  return (
    <Card data-testid="card-projects-summary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <FolderKanban className="h-4 w-4" />
            Active Projects
          </CardTitle>
          {projects.length > 5 && (
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-projects">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayProjects.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No active projects</p>
            <p className="text-xs mt-1">Create a project to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayProjects.map((project) => (
              <div
                key={project.id}
                className="space-y-1.5 hover-elevate rounded-md p-2 -mx-2 cursor-pointer"
                onClick={() => onProjectClick?.(project.id)}
                data-testid={`project-summary-${project.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color || "#3B82F6" }}
                    />
                    <span className="font-medium text-sm truncate">{project.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {project.completed}/{project.total}
                  </span>
                </div>
                <Progress value={project.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
        {projects.length > 0 && projects.length <= 5 && (
          <Link href="/projects">
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-muted-foreground gap-1"
              data-testid="link-view-all-projects-bottom"
            >
              View all projects
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
