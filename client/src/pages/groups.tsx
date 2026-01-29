import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Folder, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Link } from "wouter";
import type { Group } from "@shared/schema";

const groupFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").default("#6B7280"),
  parentId: z.string().nullable().optional(),
});

type GroupFormData = z.infer<typeof groupFormSchema>;

const colorOptions = [
  { value: "#6B7280", label: "Gray" },
  { value: "#EF4444", label: "Red" },
  { value: "#F97316", label: "Orange" },
  { value: "#EAB308", label: "Yellow" },
  { value: "#22C55E", label: "Green" },
  { value: "#06B6D4", label: "Cyan" },
  { value: "#3B82F6", label: "Blue" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
];

export default function GroupsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const { toast } = useToast();

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#6B7280",
      parentId: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      return apiRequest("POST", "/api/groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Group created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create group", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GroupFormData }) => {
      return apiRequest("PATCH", `/api/groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setEditingGroup(null);
      form.reset();
      toast({ title: "Group updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update group", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({ title: "Group deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete group", variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    form.reset({
      name: "",
      description: "",
      color: "#6B7280",
      parentId: null,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (group: Group) => {
    form.reset({
      name: group.name,
      description: group.description || "",
      color: group.color || "#6B7280",
      parentId: group.parentId || null,
    });
    setEditingGroup(group);
  };

  const handleSubmit = (data: GroupFormData) => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const rootGroups = groups.filter(g => !g.parentId);
  const getChildGroups = (parentId: string) => groups.filter(g => g.parentId === parentId);

  const renderGroupCard = (group: Group, depth = 0) => {
    const children = getChildGroups(group.id);
    
    return (
      <div key={group.id} style={{ marginLeft: depth * 24 }}>
        <Card className="mb-3">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div className="flex items-center gap-3 min-w-0">
              <Folder className="h-5 w-5 shrink-0" style={{ color: group.color || "#6B7280" }} />
              <div className="min-w-0">
                <CardTitle className="text-base truncate">
                  <Link 
                    href={`/groups/${group.id}`}
                    className="hover:underline"
                    data-testid={`link-group-${group.id}`}
                  >
                    {group.name}
                  </Link>
                </CardTitle>
                {group.description && (
                  <CardDescription className="truncate">{group.description}</CardDescription>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-group-menu-${group.id}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenEdit(group)} data-testid={`button-edit-group-${group.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/groups/${group.id}/members`} data-testid={`link-group-members-${group.id}`}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Members
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => deleteMutation.mutate(group.id)}
                  className="text-destructive"
                  data-testid={`button-delete-group-${group.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
        </Card>
        {children.map(child => renderGroupCard(child, depth + 1))}
      </div>
    );
  };

  const isDialogOpen = isCreateOpen || editingGroup !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-groups-title">Groups</h1>
          <p className="text-muted-foreground">Organize your projects into groups</p>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-create-group">
          <Plus className="h-4 w-4 mr-2" />
          New Group
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="h-5 w-5 rounded bg-muted" />
                <div className="h-5 w-32 rounded bg-muted" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No groups yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create a group to organize your projects
            </p>
            <Button onClick={handleOpenCreate} data-testid="button-create-first-group">
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>{rootGroups.map(group => renderGroupCard(group))}</div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingGroup(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create Group"}</DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? "Update the group details below" 
                : "Create a new group to organize your projects"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Group name" {...field} data-testid="input-group-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Optional description" 
                        {...field} 
                        data-testid="input-group-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-group-color">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colorOptions.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-4 w-4 rounded-full" 
                                style={{ backgroundColor: color.value }} 
                              />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Group (Optional)</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "none" ? null : val)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-parent-group">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {groups
                          .filter(g => g.id !== editingGroup?.id)
                          .map(group => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
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
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingGroup(null);
                  }}
                  data-testid="button-cancel-group"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-submit-group">
                  {isPending ? "Saving..." : editingGroup ? "Save Changes" : "Create Group"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
