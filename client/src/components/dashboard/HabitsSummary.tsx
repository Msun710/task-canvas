import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Repeat, Flame, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HabitSummary {
  id: string;
  name: string;
  completed: boolean;
  streak: number;
}

interface HabitsSummaryProps {
  habits: HabitSummary[];
  onComplete: (habitId: string) => void;
}

export function HabitsSummary({ habits, onComplete }: HabitsSummaryProps) {
  const displayHabits = habits.slice(0, 5);
  const completedCount = habits.filter((h) => h.completed).length;
  const completionPercentage = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <Card data-testid="card-habits-summary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Repeat className="h-4 w-4" />
            Today's Habits
          </CardTitle>
          {habits.length > 0 && (
            <Badge variant="secondary" size="sm">
              {completedCount}/{habits.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayHabits.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Repeat className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No habits for today</p>
            <p className="text-xs mt-1">Create a habit to track daily progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {habits.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2" data-testid="progress-habits" />
              </div>
            )}

            <div className="space-y-1">
              {displayHabits.map((habit) => (
                <div
                  key={habit.id}
                  className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50 hover-elevate"
                  data-testid={`habit-summary-${habit.id}`}
                >
                  <Checkbox
                    checked={habit.completed}
                    onCheckedChange={() => onComplete(habit.id)}
                    data-testid={`checkbox-habit-${habit.id}`}
                  />
                  <span
                    className={cn(
                      "flex-1 text-sm font-medium truncate",
                      habit.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {habit.name}
                  </span>
                  {habit.streak > 0 && (
                    <div
                      className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
                      title={`${habit.streak} day streak`}
                    >
                      <Flame className="h-3.5 w-3.5 fill-current" />
                      <span>{habit.streak}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Link href="/habits">
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-muted-foreground gap-1"
            data-testid="link-view-all-habits"
          >
            View all habits
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
