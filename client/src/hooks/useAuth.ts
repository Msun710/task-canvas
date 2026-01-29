import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

async function fetchUser(): Promise<User | null> {
  try {
    const res = await fetch("/api/user", { credentials: "include" });
    if (!res.ok) {
      if (res.status === 401) return null;
      throw new Error("Failed to fetch user");
    }
    return res.json();
  } catch {
    return null;
  }
}

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await apiRequest("POST", "/api/login", data);
      return res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", data);
      return res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
    loginMutation,
    registerMutation,
    logoutMutation,
  };
}
