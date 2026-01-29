import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Dumbbell, Brain, Heart, Briefcase, Music, Book, Coffee, Tag } from "lucide-react";
import type { HabitCategory, HabitWithSubHabits, HabitOccurrence } from "@shared/schema";
import { HabitCard } from "./HabitCard";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  health: Dumbbell,
  fitness: Dumbbell,
  wellness: Heart,
  productivity: Briefcase,
  mindfulness: Brain,
  learning: Book,
  creativity: Music,
  work: Briefcase,
  personal: Coffee,
  default: Tag,
};

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  health: "Health & Fitness",
  fitness: "Health & Fitness",
  wellness: "Wellness",
  productivity: "Productivity",
  mindfulness: "Mindfulness",
  learning: "Learning",
  creativity: "Creativity",
  work: "Work",
  personal: "Personal",
};

interface HabitCategoryGroupProps {
  habits: HabitWithSubHabits[];
  todayOccurrences: HabitOccurrence[];
  onEdit: (habit: HabitWithSubHabits) => void;
  onDelete: (habit: HabitWithSubHabits) => void;
}

export function HabitCategoryGroup({
  habits,
  todayOccurrences,
  onEdit,
  onDelete,
}: HabitCategoryGroupProps) {
  const { data: categories } = useQuery<HabitCategory[]>({
    queryKey: ["/api/habit-categories"],
  });

  const groupedHabits = groupHabitsByCategory(habits, categories);

  return (
    <div className="space-y-4">
      {Object.entries(groupedHabits).map(([categoryKey, categoryHabits]) => (
        <CategorySection
          key={categoryKey}
          categoryKey={categoryKey}
          habits={categoryHabits}
          todayOccurrences={todayOccurrences}
          onEdit={onEdit}
          onDelete={onDelete}
          categories={categories}
        />
      ))}
    </div>
  );
}

interface CategorySectionProps {
  categoryKey: string;
  habits: HabitWithSubHabits[];
  todayOccurrences: HabitOccurrence[];
  onEdit: (habit: HabitWithSubHabits) => void;
  onDelete: (habit: HabitWithSubHabits) => void;
  categories?: HabitCategory[];
}

function CategorySection({
  categoryKey,
  habits,
  todayOccurrences,
  onEdit,
  onDelete,
  categories,
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const category = categories?.find((c) => c.id === categoryKey || c.name.toLowerCase() === categoryKey);
  const displayName = category?.name || CATEGORY_DISPLAY_NAMES[categoryKey] || formatCategoryName(categoryKey);
  
  const iconKey = category?.icon?.toLowerCase() || categoryKey.toLowerCase();
  const IconComponent = CATEGORY_ICONS[iconKey] || CATEGORY_ICONS.default;

  const completedCount = habits.reduce((count, habit) => {
    if (habit.subHabits && habit.subHabits.length > 0) {
      const allCompleted = habit.subHabits.every((sub) => {
        const occ = todayOccurrences.find((o) => o.habitId === sub.id);
        return occ?.status === "completed";
      });
      return count + (allCompleted ? 1 : 0);
    }
    const occ = todayOccurrences.find((o) => o.habitId === habit.id);
    return count + (occ?.status === "completed" ? 1 : 0);
  }, 0);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 py-2 px-3 mb-2"
          data-testid={`button-category-toggle-${categoryKey}`}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <IconComponent className="h-5 w-5 shrink-0" />
          <span className="font-semibold flex-1 text-left">{displayName}</span>
          <Badge variant="secondary" className="ml-2">
            {completedCount}/{habits.length}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pl-4">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            todayOccurrences={todayOccurrences}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function groupHabitsByCategory(
  habits: HabitWithSubHabits[],
  categories?: HabitCategory[]
): Record<string, HabitWithSubHabits[]> {
  const grouped: Record<string, HabitWithSubHabits[]> = {};

  habits.forEach((habit) => {
    const categoryKey = habit.categoryId || habit.category || "uncategorized";
    if (!grouped[categoryKey]) {
      grouped[categoryKey] = [];
    }
    grouped[categoryKey].push(habit);
  });

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "uncategorized") return 1;
    if (b === "uncategorized") return -1;
    return a.localeCompare(b);
  });

  const result: Record<string, HabitWithSubHabits[]> = {};
  sortedKeys.forEach((key) => {
    result[key] = grouped[key];
  });

  return result;
}

function formatCategoryName(key: string): string {
  if (key === "uncategorized") return "Uncategorized";
  return key
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
