import { createContext, useContext, useEffect, ReactNode, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, parse } from "date-fns";
import type { UserPreferences } from "@shared/schema";

interface PreferencesContextType {
  preferences: UserPreferences;
  isLoading: boolean;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
}

const defaultPreferences: UserPreferences = {
  id: "",
  userId: "",
  theme: "auto",
  accentColor: "emerald",
  density: "comfortable",
  fontSize: "medium",
  taskCardStyle: "default",
  showDueDate: true,
  showPriority: true,
  showTags: true,
  showProject: true,
  showAssignee: true,
  showEstimatedTime: true,
  defaultListId: null,
  defaultView: "list",
  smartDateParsing: true,
  confirmBeforeDelete: true,
  autoArchiveDays: 0,
  firstDayOfWeek: "sunday",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

interface PreferencesProviderProps {
  children: ReactNode;
}

export function PreferencesProvider({ children }: PreferencesProviderProps) {
  const { data: preferences, isLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/user-preferences"],
  });

  const updateMutation = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) => {
      const response = await apiRequest("PATCH", "/api/user-preferences", prefs);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-preferences"] });
    },
  });

  const updatePreferences = useCallback(async (prefs: Partial<UserPreferences>) => {
    await updateMutation.mutateAsync(prefs);
  }, [updateMutation]);

  const currentPrefs = preferences || defaultPreferences;

  // Apply theme to document
  useEffect(() => {
    const theme = currentPrefs.theme || "auto";
    const root = document.documentElement;
    
    if (theme === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.remove("light", "dark");
      root.classList.add(prefersDark ? "dark" : "light");
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        root.classList.remove("light", "dark");
        root.classList.add(e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    }
  }, [currentPrefs.theme]);

  // Apply density
  useEffect(() => {
    const density = currentPrefs.density || "comfortable";
    document.documentElement.dataset.density = density;
  }, [currentPrefs.density]);

  // Apply font size
  useEffect(() => {
    const fontSize = currentPrefs.fontSize || "medium";
    document.documentElement.dataset.fontSize = fontSize;
  }, [currentPrefs.fontSize]);

  // Apply accent color
  useEffect(() => {
    const accentColor = currentPrefs.accentColor || "emerald";
    document.documentElement.dataset.accent = accentColor;
  }, [currentPrefs.accentColor]);

  // Format date based on user preferences
  const formatDate = useCallback((date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "";
    
    const formatMap: Record<string, string> = {
      "MM/DD/YYYY": "MM/dd/yyyy",
      "DD/MM/YYYY": "dd/MM/yyyy",
      "YYYY-MM-DD": "yyyy-MM-dd",
      "MMM DD, YYYY": "MMM dd, yyyy",
      "DD MMM YYYY": "dd MMM yyyy",
    };
    
    const dateFormat = formatMap[currentPrefs.dateFormat] || "MM/dd/yyyy";
    return format(dateObj, dateFormat);
  }, [currentPrefs.dateFormat]);

  // Format time based on user preferences
  const formatTime = useCallback((date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "";
    
    const timeFormat = currentPrefs.timeFormat === "24h" ? "HH:mm" : "h:mm a";
    return format(dateObj, timeFormat);
  }, [currentPrefs.timeFormat]);

  return (
    <PreferencesContext.Provider 
      value={{ 
        preferences: currentPrefs, 
        isLoading, 
        updatePreferences,
        formatDate, 
        formatTime 
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
