import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Archive, Pencil, Trash2, Users } from "lucide-react";
import type { ProjectWithRelations, User } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: ProjectWithRelations;
  tasksCompleted?: number;
  totalTasks?: number;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

export function ProjectCard({
  project,
  tasksCompleted = 0,
  totalTasks = 0,
  onClick,
  onEdit,
  onArchive,
  onDelete,
}: ProjectCardProps) {
  const progress = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "planning": return "secondary";
      case "on_hold": return "outline";
      case "completed": return "secondary";
      default: return "secondary";
    }
  };

  const getInitials = (user?: User | null) => {
    if (!user) return "?";
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || user.email?.charAt(0).toUpperCase() || "?";
  };

  const members = project.members?.map((m) => m.user).filter(Boolean) || [];

  return (
    <Card
      className={cn(
        "hover-elevate active-elevate-2 cursor-pointer transition-all",
        project.isArchived && "opacity-60"
      )}
      onClick={onClick}
      data-testid={`project-card-${project.id}`}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: project.color || "#3B82F6" }}
          />
          <CardTitle className="text-base font-semibold truncate">
            {project.name}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={getStatusVariant(project.status)}>{project.status}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" data-testid={`button-project-menu-${project.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive?.();
                }}
              >
                <Archive className="h-4 w-4 mr-2" />
                {project.isArchived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {tasksCompleted} of {totalTasks} tasks completed
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{members.length + 1}</span>
          </div>
          <div className="flex -space-x-2">
            {project.owner && (
              <Avatar className="h-7 w-7 border-2 border-background">
                <AvatarImage
                  src={project.owner.profileImageUrl || undefined}
                  className="object-cover"
                />
                <AvatarFallback className="text-xs">
                  {getInitials(project.owner)}
                </AvatarFallback>
              </Avatar>
            )}
            {members.slice(0, 3).map((member) => (
              <Avatar key={member?.id} className="h-7 w-7 border-2 border-background">
                <AvatarImage
                  src={member?.profileImageUrl || undefined}
                  className="object-cover"
                />
                <AvatarFallback className="text-xs">
                  {getInitials(member)}
                </AvatarFallback>
              </Avatar>
            ))}
            {members.length > 3 && (
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                +{members.length - 3}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
