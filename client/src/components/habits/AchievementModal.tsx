import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy,
  Flame,
  Calendar,
  Target,
  Star,
  Crown,
  Medal,
  Zap,
  Award,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { format } from "date-fns";

interface Achievement {
  id: string;
  achievementType: string;
  habitId: string | null;
  unlockedAt: string;
  metadata: any;
}

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasNewAchievement?: boolean;
}

interface AchievementDefinition {
  type: string;
  name: string;
  description: string;
  icon: typeof Trophy;
  color: string;
  requirement: number;
  unit: string;
}

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: "first_week",
    name: "First Week",
    description: "Complete a habit for 7 consecutive days",
    icon: Calendar,
    color: "#22C55E",
    requirement: 7,
    unit: "days",
  },
  {
    type: "monthly_warrior",
    name: "Monthly Warrior",
    description: "Complete a habit for 30 consecutive days",
    icon: Flame,
    color: "#F97316",
    requirement: 30,
    unit: "days",
  },
  {
    type: "century_club",
    name: "Century Club",
    description: "Complete a habit for 100 consecutive days",
    icon: Crown,
    color: "#EAB308",
    requirement: 100,
    unit: "days",
  },
  {
    type: "perfect_week",
    name: "Perfect Week",
    description: "Complete all habits every day for a week",
    icon: Star,
    color: "#8B5CF6",
    requirement: 7,
    unit: "perfect days",
  },
  {
    type: "never_missed_monday",
    name: "Never Missed a Monday",
    description: "Complete all habits on 4 consecutive Mondays",
    icon: Target,
    color: "#3B82F6",
    requirement: 4,
    unit: "Mondays",
  },
  {
    type: "completions_100",
    name: "Centurion",
    description: "Complete 100 total habit completions",
    icon: Medal,
    color: "#14B8A6",
    requirement: 100,
    unit: "completions",
  },
  {
    type: "completions_500",
    name: "Half Millennium",
    description: "Complete 500 total habit completions",
    icon: Award,
    color: "#EC4899",
    requirement: 500,
    unit: "completions",
  },
  {
    type: "completions_1000",
    name: "Legendary",
    description: "Complete 1000 total habit completions",
    icon: Zap,
    color: "#F59E0B",
    requirement: 1000,
    unit: "completions",
  },
];

export function AchievementModal({ isOpen, onClose, hasNewAchievement }: AchievementModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ["/api/habit-achievements"],
    enabled: isOpen,
  });

  const { data: stats } = useQuery<{
    totalCompletions: number;
    currentStreak: number;
    perfectDays: number;
    mondayStreak: number;
  }>({
    queryKey: ["/api/habits/analytics/metrics"],
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen && hasNewAchievement) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hasNewAchievement]);

  const getProgress = (def: AchievementDefinition): number => {
    if (!stats) return 0;

    switch (def.type) {
      case "first_week":
      case "monthly_warrior":
      case "century_club":
        return Math.min((stats.currentStreak / def.requirement) * 100, 100);
      case "perfect_week":
        return Math.min((stats.perfectDays / def.requirement) * 100, 100);
      case "never_missed_monday":
        return Math.min((stats.mondayStreak / def.requirement) * 100, 100);
      case "completions_100":
      case "completions_500":
      case "completions_1000":
        return Math.min((stats.totalCompletions / def.requirement) * 100, 100);
      default:
        return 0;
    }
  };

  const getCurrentValue = (def: AchievementDefinition): number => {
    if (!stats) return 0;

    switch (def.type) {
      case "first_week":
      case "monthly_warrior":
      case "century_club":
        return stats.currentStreak;
      case "perfect_week":
        return stats.perfectDays;
      case "never_missed_monday":
        return stats.mondayStreak;
      case "completions_100":
      case "completions_500":
      case "completions_1000":
        return stats.totalCompletions;
      default:
        return 0;
    }
  };

  const unlockedTypes = new Set(achievements.map((a) => a.achievementType));
  const unlockedCount = unlockedTypes.size;
  const totalCount = ACHIEVEMENT_DEFINITIONS.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="modal-achievements">
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-confetti"
                style={{
                  backgroundColor: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181"][i % 5],
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1 + Math.random()}s`,
                }}
              />
            ))}
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>
              {unlockedCount} of {totalCount} unlocked
            </span>
            <Progress value={(unlockedCount / totalCount) * 100} className="w-32 h-2" />
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ACHIEVEMENT_DEFINITIONS.map((def) => {
              const unlocked = unlockedTypes.has(def.type);
              const achievement = achievements.find((a) => a.achievementType === def.type);
              const progress = getProgress(def);
              const currentValue = getCurrentValue(def);
              const IconComponent = def.icon;

              return (
                <Card
                  key={def.type}
                  className={`p-4 transition-all ${
                    unlocked ? "" : "opacity-60"
                  }`}
                  data-testid={`achievement-${def.type}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-full ${
                        unlocked ? "" : "grayscale"
                      }`}
                      style={{
                        backgroundColor: unlocked ? def.color + "20" : undefined,
                      }}
                    >
                      {unlocked ? (
                        <IconComponent
                          className="h-6 w-6"
                          style={{ color: def.color }}
                        />
                      ) : (
                        <Lock className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium">{def.name}</h4>
                        {unlocked && (
                          <Badge
                            variant="secondary"
                            className="shrink-0"
                            style={{
                              backgroundColor: def.color + "20",
                              color: def.color,
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Unlocked
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {def.description}
                      </p>

                      {unlocked && achievement ? (
                        <p className="text-xs text-muted-foreground">
                          Unlocked on {format(new Date(achievement.unlockedAt), "MMM d, yyyy")}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span>
                              {currentValue} / {def.requirement} {def.unit}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 2s ease-out forwards;
        }
      `}</style>
    </Dialog>
  );
}
