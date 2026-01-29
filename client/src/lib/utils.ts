import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export function getDurationStatus(
  actual: number | null | undefined,
  estimated: number | null | undefined
): { status: "under" | "approaching" | "over" | "none"; percentage: number } {
  if (!estimated || estimated <= 0) {
    return { status: "none", percentage: 0 };
  }
  
  const actualTime = actual || 0;
  const percentage = Math.round((actualTime / estimated) * 100);
  
  if (percentage >= 100) {
    return { status: "over", percentage };
  }
  if (percentage >= 80) {
    return { status: "approaching", percentage };
  }
  return { status: "under", percentage };
}
