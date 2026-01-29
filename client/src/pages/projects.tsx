import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/ProjectCard";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { PageHeaderSkeleton, ProjectListSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyState } from "@/components/ui/empty-states";
import { ErrorState } from "@/components/ui/error-state";
import { Plus, FolderKanban } from "lucide-react";
import type { Project } from "@shared/schema";

export default function ProjectsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: projects = [], isLoading, isError, error, refetch } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const activeProjects = projects.filter(p => !p.isArchived);
  const archivedProjects = projects.filter(p => p.isArchived);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeaderSkeleton />
        <ProjectListSkeleton count={6} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState 
          title="Failed to load projects"
          message={error?.message || "An error occurred while loading your projects."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Projects</h1>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-project">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {activeProjects.length === 0 && archivedProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to organize your work and track progress."
          action={{
            label: "Create Project",
            onClick: () => setIsCreateOpen(true),
          }}
        />
      ) : (
        <>
          {activeProjects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-muted-foreground">Active Projects</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {archivedProjects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-muted-foreground">Archived Projects</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archivedProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <CreateProjectModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
