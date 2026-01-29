import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { User } from "@shared/schema";

interface DashboardHeaderProps {
  user?: User | null;
  dateRange: 'today' | 'week' | 'month';
  onDateRangeChange: (range: 'today' | 'week' | 'month') => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDateDisplay(range: 'today' | 'week' | 'month'): string {
  const now = new Date();
  switch (range) {
    case 'today':
      return format(now, "EEEE, MMMM d, yyyy");
    case 'week':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${format(startOfWeek, "MMM d")} - ${format(endOfWeek, "MMM d, yyyy")}`;
    case 'month':
      return format(now, "MMMM yyyy");
    default:
      return format(now, "EEEE, MMMM d, yyyy");
  }
}

export function DashboardHeader({ 
  user, 
  dateRange, 
  onDateRangeChange, 
  onRefresh,
  isRefreshing = false 
}: DashboardHeaderProps) {
  const greeting = getGreeting();
  const displayName = user?.firstName || user?.username || "";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold sm:text-3xl" data-testid="text-dashboard-greeting">
          {greeting}{displayName ? `, ${displayName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-dashboard-date">
          {getDateDisplay(dateRange)}
        </p>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as 'today' | 'week' | 'month')}>
          <SelectTrigger className="w-[140px]" data-testid="select-date-range">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          data-testid="button-refresh-dashboard"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
        
        <Link href="/analytics">
          <Button variant="outline" data-testid="button-analytics-link">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </Link>
      </div>
    </div>
  );
}
