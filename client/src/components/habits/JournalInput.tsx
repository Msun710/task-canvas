import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  Smile,
  Meh,
  Frown,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  Battery,
  BatteryLow,
  Send,
  Sparkles,
  Laugh,
  Angry,
} from "lucide-react";

interface JournalInputProps {
  habitOccurrenceId: string;
  habitName: string;
  onClose?: () => void;
  onSubmit?: () => void;
  defaultOpen?: boolean;
}

const MOODS = [
  { value: "terrible", icon: Angry, label: "Struggling", color: "text-red-500" },
  { value: "bad", icon: Frown, label: "Low", color: "text-orange-500" },
  { value: "okay", icon: Meh, label: "Neutral", color: "text-yellow-500" },
  { value: "good", icon: Smile, label: "Good", color: "text-lime-500" },
  { value: "great", icon: Laugh, label: "Wonderful", color: "text-green-500" },
];

const ENERGY_LEVELS = [
  { value: "low", icon: BatteryLow, label: "Low", color: "text-red-500" },
  { value: "medium", icon: Battery, label: "Medium", color: "text-yellow-500" },
  { value: "high", icon: Zap, label: "High", color: "text-green-500" },
];

export function JournalInput({
  habitOccurrenceId,
  habitName,
  onClose,
  onSubmit,
  defaultOpen = true,
}: JournalInputProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/habit-journal", {
        habitOccurrenceId,
        note: note.trim() || null,
        mood,
        energyLevel,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habit-journal"] });
      toast({ title: "Journal saved", description: "Your reflection has been recorded." });
      setNote("");
      setMood(null);
      setEnergyLevel(null);
      onSubmit?.();
      onClose?.();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save journal entry", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!note.trim() && !mood && !energyLevel) {
      onClose?.();
      return;
    }
    submitMutation.mutate();
  };

  const handleDismiss = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <Card className="overflow-visible" data-testid="journal-input">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="p-3 flex items-center justify-between cursor-pointer hover-elevate">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Quick reflection for {habitName}</span>
            </div>
            <div className="flex items-center gap-1">
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                  }}
                  data-testid="button-dismiss-journal"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-4 border-t pt-3">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">How are you feeling?</label>
              <div className="flex items-center gap-2 justify-between">
                {MOODS.map((m) => {
                  const IconComponent = m.icon;
                  const isSelected = mood === m.value;
                  return (
                    <Button
                      key={m.value}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`flex-1 flex-col gap-1 h-auto py-2 ${
                        isSelected ? "" : "text-muted-foreground"
                      }`}
                      onClick={() => setMood(isSelected ? null : m.value)}
                      data-testid={`button-mood-${m.value}`}
                    >
                      <IconComponent className={`h-5 w-5 ${isSelected ? "" : m.color}`} />
                      <span className="text-xs">{m.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Energy level</label>
              <div className="flex items-center gap-2">
                {ENERGY_LEVELS.map((e) => {
                  const IconComponent = e.icon;
                  const isSelected = energyLevel === e.value;
                  return (
                    <Button
                      key={e.value}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`flex-1 gap-2 ${isSelected ? "" : "text-muted-foreground"}`}
                      onClick={() => setEnergyLevel(isSelected ? null : e.value)}
                      data-testid={`button-energy-${e.value}`}
                    >
                      <IconComponent className={`h-4 w-4 ${isSelected ? "" : e.color}`} />
                      <span>{e.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Quick note (optional)</label>
              <Textarea
                placeholder="Any thoughts or reflections..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="resize-none"
                data-testid="textarea-journal-note"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                data-testid="button-skip-journal"
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                data-testid="button-submit-journal"
              >
                <Send className="h-4 w-4 mr-1" />
                {submitMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
