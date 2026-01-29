import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Folder, Plus, Trash2, UserPlus } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GroupWithRelations, User } from "@shared/schema";

const addMemberSchema = z.object({
  userId: z.string().min(1, "Please select a user"),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

type AddMemberData = z.infer<typeof addMemberSchema>;

export default function GroupMembersPage() {
  const { id } = useParams<{ id: string }>();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const { data: group, isLoading } = useQuery<GroupWithRelations>({
    queryKey: ["/api/groups", id],
    enabled: !!id,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<AddMemberData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      userId: "",
      role: "member",
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: AddMemberData) => {
      return apiRequest("POST", `/api/groups/${id}/members`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id] });
      setIsAddOpen(false);
      form.reset();
      toast({ title: "Member added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add member", variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/groups/${id}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id] });
      toast({ title: "Member removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove member", variant: "destructive" });
    },
  });

  const handleSubmit = (data: AddMemberData) => {
    addMemberMutation.mutate(data);
  };

  const existingMemberIds = group?.members?.map(m => m.userId) || [];
  const availableUsers = users.filter(u => !existingMemberIds.includes(u.id));

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
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
        <Link href={`/groups/${id}`}>
          <Button variant="ghost" size="icon" data-testid="button-back-group">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Folder className="h-6 w-6 shrink-0" style={{ color: group.color || "#6B7280" }} />
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate" data-testid="text-group-members-title">
              {group.name} - Members
            </h1>
          </div>
        </div>
        <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-member">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Manage who has access to this group and its projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!group.members || group.members.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No members yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add team members to collaborate on this group
              </p>
              <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-first-member">
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {group.members.map(member => (
                <div 
                  key={member.id}
                  className="flex items-center gap-4 p-3 rounded-md bg-muted/50"
                  data-testid={`member-row-${member.userId}`}
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {member.user?.firstName?.charAt(0) || member.user?.email?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {member.user?.firstName} {member.user?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.user?.email}
                    </p>
                  </div>
                  <Badge variant="secondary">{member.role}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      const confirmed = await confirm({
                        title: "Remove Member",
                        description: `Are you sure you want to remove ${member.user?.firstName || member.user?.email || "this member"} from the group?`,
                        confirmLabel: "Remove",
                        variant: "destructive",
                      });
                      if (confirmed) {
                        removeMemberMutation.mutate(member.userId);
                      }
                    }}
                    disabled={removeMemberMutation.isPending}
                    data-testid={`button-remove-member-${member.userId}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Add a team member to this group
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user">
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableUsers.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No available users
                          </SelectItem>
                        ) : (
                          availableUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName || user.email}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddOpen(false)}
                  data-testid="button-cancel-add-member"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addMemberMutation.isPending}
                  data-testid="button-submit-member"
                >
                  {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}
