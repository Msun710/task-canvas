import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Folder, Users, Settings, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { GroupWithRelations, Project } from "@shared/schema";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: group, isLoading } = useQuery<GroupWithRelations>({
    queryKey: ["/api/groups", id],
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/groups", id, "projects"],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Group not found</h1>
        <Link href="/groups">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/groups">
          <Button variant="ghost" size="icon" data-testid="button-back-groups">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Folder className="h-8 w-8 shrink-0" style={{ color: group.color || "#6B7280" }} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate" data-testid="text-group-name">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-muted-foreground truncate">{group.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/groups/${id}/members`}>
            <Button variant="outline" data-testid="button-manage-members">
              <Users className="h-4 w-4 mr-2" />
              Members
            </Button>
          </Link>
          <Link href="/groups">
            <Button variant="ghost" size="icon" data-testid="button-group-settings">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects</CardTitle>
            <CardDescription>
              {projects.length} project{projects.length !== 1 ? "s" : ""} in this group
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects in this group yet</p>
            ) : (
              <div className="space-y-2">
                {projects.map(project => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                      data-testid={`link-project-${project.id}`}
                    >
                      <div 
                        className="h-3 w-3 rounded-full shrink-0" 
                        style={{ backgroundColor: project.color || "#3B82F6" }} 
                      />
                      <span className="truncate">{project.name}</span>
                      <Badge variant="secondary" className="ml-auto shrink-0">
                        {project.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members</CardTitle>
            <CardDescription>
              {group.members?.length || 0} member{(group.members?.length || 0) !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!group.members || group.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet</p>
            ) : (
              <div className="space-y-2">
                {group.members.slice(0, 5).map(member => (
                  <div 
                    key={member.id}
                    className="flex items-center gap-3"
                    data-testid={`member-${member.userId}`}
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {member.user?.firstName?.charAt(0) || member.user?.email?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.user?.firstName || member.user?.email || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                ))}
                {group.members.length > 5 && (
                  <p className="text-sm text-muted-foreground">
                    +{group.members.length - 5} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {group.children && group.children.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sub-groups</CardTitle>
              <CardDescription>
                {group.children.length} sub-group{group.children.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.children.map(child => (
                  <Link key={child.id} href={`/groups/${child.id}`}>
                    <div 
                      className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                      data-testid={`link-subgroup-${child.id}`}
                    >
                      <Folder className="h-4 w-4 shrink-0" style={{ color: child.color || "#6B7280" }} />
                      <span className="truncate">{child.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
