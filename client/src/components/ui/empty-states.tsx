import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" data-testid="empty-state">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1" data-testid="text-empty-title">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-4" data-testid="text-empty-description">{description}</p>
      {action && (
        <Button onClick={action.onClick} data-testid="button-empty-action">
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface EmptySearchResultsProps {
  searchTerm?: string;
  onClear?: () => void;
}

export function EmptySearchResults({ searchTerm, onClear }: EmptySearchResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" data-testid="empty-search-results">
      <div className="rounded-full bg-muted p-4 mb-4">
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium mb-1">No results found</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-4">
        {searchTerm
          ? `No results found for "${searchTerm}". Try a different search term.`
          : "Try a different search term."}
      </p>
      {onClear && (
        <Button variant="outline" onClick={onClear} data-testid="button-clear-search">
          Clear search
        </Button>
      )}
    </div>
  );
}

interface InboxZeroProps {
  title?: string;
  description?: string;
}

export function InboxZero({ 
  title = "Inbox Zero", 
  description = "All tasks have been processed and assigned to projects. Great job staying organized!"
}: InboxZeroProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="inbox-zero">
      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
        <svg
          className="h-8 w-8 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold mb-2" data-testid="text-inbox-zero">{title}</h2>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

interface NoEventsProps {
  onAddEvent?: () => void;
}

export function NoEvents({ onAddEvent }: NoEventsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" data-testid="empty-calendar">
      <div className="rounded-full bg-muted p-4 mb-4">
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium mb-1">No events scheduled</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-4">
        No events or tasks scheduled for this period.
      </p>
      {onAddEvent && (
        <Button onClick={onAddEvent} data-testid="button-add-event">
          Add Event
        </Button>
      )}
    </div>
  );
}
