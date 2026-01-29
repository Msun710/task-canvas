import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AchievementStats {
  totalCompletions: number;
  currentStreak: number;
  longestStreak: number;
  perfectDays: number;
  mondayStreak: number;
}

interface Achievement {
  id: string;
  achievementType: string;
  habitId: string | null;
  unlockedAt: string;
  metadata: any;
}

interface AchievementCheckResult {
  newlyUnlocked: string[];
  message: string | null;
}

const ACHIEVEMENT_THRESHOLDS = {
  first_week: { stat: "currentStreak", threshold: 7, name: "First Week" },
  monthly_warrior: { stat: "currentStreak", threshold: 30, name: "Monthly Warrior" },
  century_club: { stat: "currentStreak", threshold: 100, name: "Century Club" },
  perfect_week: { stat: "perfectDays", threshold: 7, name: "Perfect Week" },
  never_missed_monday: { stat: "mondayStreak", threshold: 4, name: "Never Missed a Monday" },
  completions_100: { stat: "totalCompletions", threshold: 100, name: "Centurion" },
  completions_500: { stat: "totalCompletions", threshold: 500, name: "Half Millennium" },
  completions_1000: { stat: "totalCompletions", threshold: 1000, name: "Legendary" },
} as const;

export function useAchievementCheck() {
  const { toast } = useToast();

  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ["/api/habit-achievements"],
  });

  const { data: stats } = useQuery<AchievementStats>({
    queryKey: ["/api/habits/analytics/metrics"],
  });

  const unlockMutation = useMutation({
    mutationFn: (achievementType: string) =>
      apiRequest("POST", "/api/habit-achievements", {
        achievementType,
        unlockedAt: new Date().toISOString(),
      }),
    onSuccess: (_, achievementType) => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-achievements"] });
      const achievementName = ACHIEVEMENT_THRESHOLDS[achievementType as keyof typeof ACHIEVEMENT_THRESHOLDS]?.name || achievementType;
      toast({
        title: "Achievement Unlocked!",
        description: `You've earned the "${achievementName}" achievement!`,
      });
    },
  });

  const checkAchievements = (): AchievementCheckResult => {
    if (!stats) return { newlyUnlocked: [], message: null };

    const unlockedTypes = new Set(achievements.map((a) => a.achievementType));
    const newlyUnlocked: string[] = [];

    for (const [type, config] of Object.entries(ACHIEVEMENT_THRESHOLDS)) {
      if (unlockedTypes.has(type)) continue;

      const currentValue = stats[config.stat as keyof AchievementStats];
      if (currentValue >= config.threshold) {
        newlyUnlocked.push(type);
        unlockMutation.mutate(type);
      }
    }

    if (newlyUnlocked.length > 0) {
      return {
        newlyUnlocked,
        message: `Congratulations! You unlocked ${newlyUnlocked.length} new achievement${newlyUnlocked.length > 1 ? "s" : ""}!`,
      };
    }

    return { newlyUnlocked: [], message: null };
  };

  const getNextAchievements = () => {
    if (!stats) return [];

    const unlockedTypes = new Set(achievements.map((a) => a.achievementType));
    const upcoming: { type: string; name: string; progress: number; remaining: number }[] = [];

    for (const [type, config] of Object.entries(ACHIEVEMENT_THRESHOLDS)) {
      if (unlockedTypes.has(type)) continue;

      const currentValue = stats[config.stat as keyof AchievementStats];
      const progress = Math.min((currentValue / config.threshold) * 100, 100);
      const remaining = Math.max(config.threshold - currentValue, 0);

      if (progress > 0 && progress < 100) {
        upcoming.push({
          type,
          name: config.name,
          progress,
          remaining,
        });
      }
    }

    return upcoming.sort((a, b) => b.progress - a.progress).slice(0, 3);
  };

  const hasNewAchievement = (): boolean => {
    if (!stats || !achievements) return false;

    const unlockedTypes = new Set(achievements.map((a) => a.achievementType));

    for (const [type, config] of Object.entries(ACHIEVEMENT_THRESHOLDS)) {
      if (unlockedTypes.has(type)) continue;

      const currentValue = stats[config.stat as keyof AchievementStats];
      if (currentValue >= config.threshold) {
        return true;
      }
    }

    return false;
  };

  return {
    achievements,
    stats,
    checkAchievements,
    getNextAchievements,
    hasNewAchievement: hasNewAchievement(),
    unlockedCount: achievements.length,
    totalCount: Object.keys(ACHIEVEMENT_THRESHOLDS).length,
  };
}
