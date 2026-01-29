import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Repeat } from "lucide-react";
import { format, addDays, addWeeks, addMonths, addYears, getDay, getDate, setDate } from "date-fns";
import { cn } from "@/lib/utils";

export interface RecurrenceValue {
  pattern: string;
  endType: "never" | "after" | "on";
  endAfter?: number;
  endDate?: Date;
}

interface RecurrenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
  { value: 7, label: "Sun", fullLabel: "Sunday" },
];

const ORDINALS = [
  { value: 1, label: "1st" },
  { value: 2, label: "2nd" },
  { value: 3, label: "3rd" },
  { value: 4, label: "4th" },
  { value: 5, label: "Last" },
];

type PatternType = "daily" | "weekly" | "monthly" | "yearly";
type MonthlyType = "date" | "weekday";

interface InternalState {
  patternType: PatternType;
  dailyInterval: number;
  weekdaysOnly: boolean;
  weeklyInterval: number;
  selectedDays: number[];
  monthlyType: MonthlyType;
  monthlyDate: number;
  monthlyOrdinal: number;
  monthlyWeekday: number;
  yearlyMonth: number;
  yearlyDate: number;
}

function parsePattern(pattern: string): InternalState {
  const defaultState: InternalState = {
    patternType: "daily",
    dailyInterval: 1,
    weekdaysOnly: false,
    weeklyInterval: 1,
    selectedDays: [1],
    monthlyType: "date",
    monthlyDate: 1,
    monthlyOrdinal: 1,
    monthlyWeekday: 1,
    yearlyMonth: 1,
    yearlyDate: 1,
  };

  if (!pattern) return defaultState;

  const parts = pattern.split(":");
  const type = parts[0].toUpperCase();

  if (type === "DAILY") {
    return {
      ...defaultState,
      patternType: "daily",
      dailyInterval: parseInt(parts[1]) || 1,
      weekdaysOnly: false,
    };
  }

  if (type === "WEEKDAYS") {
    return {
      ...defaultState,
      patternType: "daily",
      dailyInterval: 1,
      weekdaysOnly: true,
    };
  }

  if (type === "WEEKLY") {
    const interval = parseInt(parts[1]) || 1;
    const days = parts[2] ? parts[2].split(",").map(Number) : [1];
    return {
      ...defaultState,
      patternType: "weekly",
      weeklyInterval: interval,
      selectedDays: days,
    };
  }

  if (type === "MONTHLY") {
    if (parts.length === 2) {
      return {
        ...defaultState,
        patternType: "monthly",
        monthlyType: "date",
        monthlyDate: parseInt(parts[1]) || 1,
      };
    } else if (parts.length === 3) {
      return {
        ...defaultState,
        patternType: "monthly",
        monthlyType: "weekday",
        monthlyOrdinal: parseInt(parts[1]) || 1,
        monthlyWeekday: parseInt(parts[2]) || 1,
      };
    }
  }

  if (type === "YEARLY") {
    const dateParts = parts[1]?.split("-") || ["1", "1"];
    return {
      ...defaultState,
      patternType: "yearly",
      yearlyMonth: parseInt(dateParts[0]) || 1,
      yearlyDate: parseInt(dateParts[1]) || 1,
    };
  }

  return defaultState;
}

function generatePattern(state: InternalState): string {
  switch (state.patternType) {
    case "daily":
      if (state.weekdaysOnly) return "WEEKDAYS";
      return state.dailyInterval > 1 ? `DAILY:${state.dailyInterval}` : "DAILY";
    case "weekly":
      return `WEEKLY:${state.weeklyInterval}:${state.selectedDays.sort((a, b) => a - b).join(",")}`;
    case "monthly":
      if (state.monthlyType === "date") {
        return `MONTHLY:${state.monthlyDate}`;
      }
      return `MONTHLY:${state.monthlyOrdinal}:${state.monthlyWeekday}`;
    case "yearly":
      return `YEARLY:${state.yearlyMonth}-${state.yearlyDate}`;
    default:
      return "DAILY";
  }
}

function generateSummary(state: InternalState): string {
  switch (state.patternType) {
    case "daily":
      if (state.weekdaysOnly) return "Every weekday (Mon-Fri)";
      if (state.dailyInterval === 1) return "Every day";
      return `Every ${state.dailyInterval} days`;
    case "weekly":
      const dayNames = state.selectedDays
        .sort((a, b) => a - b)
        .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.fullLabel)
        .filter(Boolean);
      const intervalText = state.weeklyInterval === 1 ? "Every" : `Every ${state.weeklyInterval} weeks on`;
      if (dayNames.length === 0) return "No days selected";
      if (dayNames.length === 1) return `${intervalText} ${dayNames[0]}`;
      if (dayNames.length === 2) return `${intervalText} ${dayNames[0]} and ${dayNames[1]}`;
      return `${intervalText} ${dayNames.slice(0, -1).join(", ")}, and ${dayNames[dayNames.length - 1]}`;
    case "monthly":
      if (state.monthlyType === "date") {
        const suffix = getOrdinalSuffix(state.monthlyDate);
        return `Every month on the ${state.monthlyDate}${suffix}`;
      }
      const ordinal = ORDINALS.find((o) => o.value === state.monthlyOrdinal)?.label || "1st";
      const weekday = DAYS_OF_WEEK.find((d) => d.value === state.monthlyWeekday)?.fullLabel || "Monday";
      return `Every month on the ${ordinal} ${weekday}`;
    case "yearly":
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      return `Every year on ${monthNames[state.yearlyMonth - 1]} ${state.yearlyDate}`;
    default:
      return "Custom recurrence";
  }
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function getNextOccurrences(state: InternalState, count: number = 5): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  let iterations = 0;
  const maxIterations = 365;

  while (occurrences.length < count && iterations < maxIterations) {
    iterations++;
    currentDate = addDays(currentDate, 1);

    switch (state.patternType) {
      case "daily":
        if (state.weekdaysOnly) {
          const dayOfWeek = getDay(currentDate);
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            occurrences.push(new Date(currentDate));
          }
        } else {
          if (state.dailyInterval === 1) {
            occurrences.push(new Date(currentDate));
          } else {
            const daysDiff = Math.floor((currentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff % state.dailyInterval === 0) {
              occurrences.push(new Date(currentDate));
            }
          }
        }
        break;

      case "weekly":
        let dayNum = getDay(currentDate);
        if (dayNum === 0) dayNum = 7;
        if (state.selectedDays.includes(dayNum)) {
          occurrences.push(new Date(currentDate));
        }
        break;

      case "monthly":
        if (state.monthlyType === "date") {
          if (getDate(currentDate) === state.monthlyDate) {
            occurrences.push(new Date(currentDate));
          }
        } else {
          const dateNum = getDate(currentDate);
          let dayOfWeek = getDay(currentDate);
          if (dayOfWeek === 0) dayOfWeek = 7;
          if (dayOfWeek === state.monthlyWeekday) {
            const weekOfMonth = Math.ceil(dateNum / 7);
            if (weekOfMonth === state.monthlyOrdinal || (state.monthlyOrdinal === 5 && dateNum > 21)) {
              occurrences.push(new Date(currentDate));
            }
          }
        }
        break;

      case "yearly":
        const month = currentDate.getMonth() + 1;
        const date = getDate(currentDate);
        if (month === state.yearlyMonth && date === state.yearlyDate) {
          occurrences.push(new Date(currentDate));
        }
        break;
    }
  }

  return occurrences;
}

export function RecurrenceModal({
  open,
  onOpenChange,
  value,
  onChange,
}: RecurrenceModalProps) {
  const [state, setState] = useState<InternalState>(() => parsePattern(value.pattern));
  const [endType, setEndType] = useState<"never" | "after" | "on">(value.endType || "never");
  const [endAfter, setEndAfter] = useState<number>(value.endAfter || 10);
  const [endDate, setEndDate] = useState<Date | undefined>(value.endDate);

  useEffect(() => {
    setState(parsePattern(value.pattern));
    setEndType(value.endType || "never");
    setEndAfter(value.endAfter || 10);
    setEndDate(value.endDate);
  }, [value]);

  const summary = useMemo(() => generateSummary(state), [state]);
  const nextOccurrences = useMemo(() => getNextOccurrences(state, 5), [state]);

  const handlePreset = (preset: string) => {
    switch (preset) {
      case "daily":
        setState((s) => ({ ...s, patternType: "daily", dailyInterval: 1, weekdaysOnly: false }));
        break;
      case "weekdays":
        setState((s) => ({ ...s, patternType: "daily", weekdaysOnly: true }));
        break;
      case "weekly":
        const today = getDay(new Date());
        setState((s) => ({ ...s, patternType: "weekly", weeklyInterval: 1, selectedDays: [today === 0 ? 7 : today] }));
        break;
      case "monthly":
        setState((s) => ({ ...s, patternType: "monthly", monthlyType: "date", monthlyDate: getDate(new Date()) }));
        break;
    }
  };

  const handleSave = () => {
    onChange({
      pattern: generatePattern(state),
      endType,
      endAfter: endType === "after" ? endAfter : undefined,
      endDate: endType === "on" ? endDate : undefined,
    });
    onOpenChange(false);
  };

  const handleDayToggle = (day: number) => {
    setState((s) => {
      const newDays = s.selectedDays.includes(day)
        ? s.selectedDays.filter((d) => d !== day)
        : [...s.selectedDays, day];
      return { ...s, selectedDays: newDays.length > 0 ? newDays : [day] };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Set Recurrence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quick Presets
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreset("daily")}
                className={cn(state.patternType === "daily" && !state.weekdaysOnly && "border-primary")}
                data-testid="button-preset-daily"
              >
                Daily
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreset("weekdays")}
                className={cn(state.weekdaysOnly && "border-primary")}
                data-testid="button-preset-weekdays"
              >
                Weekdays
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreset("weekly")}
                className={cn(state.patternType === "weekly" && "border-primary")}
                data-testid="button-preset-weekly"
              >
                Weekly
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreset("monthly")}
                className={cn(state.patternType === "monthly" && "border-primary")}
                data-testid="button-preset-monthly"
              >
                Monthly
              </Button>
            </div>
          </div>

          <Separator />

          <Tabs
            value={state.patternType}
            onValueChange={(v) => setState((s) => ({ ...s, patternType: v as PatternType }))}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="daily" data-testid="tab-daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly" data-testid="tab-yearly">Yearly</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4 pt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="daily-interval">Every</Label>
                  <Input
                    id="daily-interval"
                    type="number"
                    min="1"
                    max="365"
                    value={state.dailyInterval}
                    onChange={(e) => setState((s) => ({ ...s, dailyInterval: parseInt(e.target.value) || 1, weekdaysOnly: false }))}
                    className="w-20"
                    disabled={state.weekdaysOnly}
                    data-testid="input-daily-interval"
                  />
                  <span className="text-sm text-muted-foreground">day(s)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="weekdays-only"
                  checked={state.weekdaysOnly}
                  onCheckedChange={(checked) => setState((s) => ({ ...s, weekdaysOnly: !!checked }))}
                  data-testid="checkbox-weekdays-only"
                />
                <Label htmlFor="weekdays-only" className="text-sm">
                  Weekdays only (Mon-Fri)
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="weekly-interval">Every</Label>
                <Input
                  id="weekly-interval"
                  type="number"
                  min="1"
                  max="52"
                  value={state.weeklyInterval}
                  onChange={(e) => setState((s) => ({ ...s, weeklyInterval: parseInt(e.target.value) || 1 }))}
                  className="w-20"
                  data-testid="input-weekly-interval"
                />
                <span className="text-sm text-muted-foreground">week(s) on</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center gap-1">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={state.selectedDays.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value)}
                      data-testid={`checkbox-day-${day.value}`}
                    />
                    <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4 pt-4">
              <RadioGroup
                value={state.monthlyType}
                onValueChange={(v) => setState((s) => ({ ...s, monthlyType: v as MonthlyType }))}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="date" id="monthly-date" data-testid="radio-monthly-date" />
                  <Label htmlFor="monthly-date" className="flex items-center gap-2 cursor-pointer">
                    On day
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={state.monthlyDate}
                      onChange={(e) => setState((s) => ({ ...s, monthlyDate: parseInt(e.target.value) || 1 }))}
                      className="w-16"
                      onClick={() => setState((s) => ({ ...s, monthlyType: "date" }))}
                      data-testid="input-monthly-date"
                    />
                    of each month
                  </Label>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <RadioGroupItem value="weekday" id="monthly-weekday" data-testid="radio-monthly-weekday" />
                  <Label htmlFor="monthly-weekday" className="flex items-center gap-2 cursor-pointer flex-wrap">
                    On the
                    <Select
                      value={state.monthlyOrdinal.toString()}
                      onValueChange={(v) => setState((s) => ({ ...s, monthlyOrdinal: parseInt(v), monthlyType: "weekday" }))}
                    >
                      <SelectTrigger className="w-20" data-testid="select-monthly-ordinal">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDINALS.map((o) => (
                          <SelectItem key={o.value} value={o.value.toString()}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={state.monthlyWeekday.toString()}
                      onValueChange={(v) => setState((s) => ({ ...s, monthlyWeekday: parseInt(v), monthlyType: "weekday" }))}
                    >
                      <SelectTrigger className="w-28" data-testid="select-monthly-weekday">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((d) => (
                          <SelectItem key={d.value} value={d.value.toString()}>
                            {d.fullLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Label>
                </div>
              </RadioGroup>
            </TabsContent>

            <TabsContent value="yearly" className="space-y-4 pt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Label>Every year on</Label>
                <Select
                  value={state.yearlyMonth.toString()}
                  onValueChange={(v) => setState((s) => ({ ...s, yearlyMonth: parseInt(v) }))}
                >
                  <SelectTrigger className="w-32" data-testid="select-yearly-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December",
                    ].map((month, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={state.yearlyDate}
                  onChange={(e) => setState((s) => ({ ...s, yearlyDate: parseInt(e.target.value) || 1 }))}
                  className="w-16"
                  data-testid="input-yearly-date"
                />
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              End Condition
            </Label>
            <RadioGroup value={endType} onValueChange={(v) => setEndType(v as typeof endType)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="never" id="end-never" data-testid="radio-end-never" />
                <Label htmlFor="end-never" className="cursor-pointer">Never</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="after" id="end-after" data-testid="radio-end-after" />
                <Label htmlFor="end-after" className="flex items-center gap-2 cursor-pointer">
                  After
                  <Input
                    type="number"
                    min="1"
                    max="999"
                    value={endAfter}
                    onChange={(e) => {
                      setEndAfter(parseInt(e.target.value) || 1);
                      setEndType("after");
                    }}
                    className="w-20"
                    data-testid="input-end-after"
                  />
                  occurrences
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="on" id="end-on" data-testid="radio-end-on" />
                <Label htmlFor="end-on" className="flex items-center gap-2 cursor-pointer">
                  On
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                        onClick={() => setEndType("on")}
                        data-testid="button-end-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          setEndType("on");
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-3 p-4 bg-muted/50 rounded-md">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium" data-testid="text-summary">{summary}</span>
            </div>
            {nextOccurrences.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Next occurrences:</span>
                <div className="flex flex-wrap gap-2">
                  {nextOccurrences.map((date, i) => (
                    <span
                      key={i}
                      className="text-xs bg-background px-2 py-1 rounded border"
                      data-testid={`text-occurrence-${i}`}
                    >
                      {format(date, "EEE, MMM d")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
