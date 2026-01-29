import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import type { User, Task } from "@shared/schema";

export default function TeamPage() {
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  const getTasksForUser = (userId: string) => {
    return tasks.filter(t => t.assigneeId === userId);
  };

  if (usersLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-semibold" data-testid="text-page-title">Team</h1>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No team members yet</h2>
          <p className="text-muted-foreground max-w-md">
            Team members will appear here once they sign in.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map(user => {
            const userTasks = getTasksForUser(user.id);
            const completedTasks = userTasks.filter(t => t.status === "done").length;
            const inProgressTasks = userTasks.filter(t => t.status === "in_progress").length;

            return (
              <Card key={user.id} data-testid={`card-user-${user.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={user.profileImageUrl || undefined}
                        alt={user.firstName || "User"}
                        className="object-cover"
                      />
                      <AvatarFallback>
                        {getInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {user.firstName} {user.lastName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" size="sm">
                      {userTasks.length} tasks
                    </Badge>
                    {inProgressTasks > 0 && (
                      <Badge variant="default" size="sm">
                        {inProgressTasks} in progress
                      </Badge>
                    )}
                    {completedTasks > 0 && (
                      <Badge variant="outline" size="sm">
                        {completedTasks} done
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
