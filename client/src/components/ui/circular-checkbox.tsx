import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface CircularCheckboxProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onClick?: (e: React.MouseEvent) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function CircularCheckbox({
  checked,
  onCheckedChange,
  onClick,
  size = "md",
  className,
  disabled = false,
  "data-testid": testId,
}: CircularCheckboxProps) {
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    onClick?.(e);
    onCheckedChange?.(!checked);
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={handleClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        "flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-200",
        sizeClasses[size],
        checked
          ? "bg-primary border-primary text-primary-foreground"
          : "border-muted-foreground/40 hover:border-primary/60 hover:bg-primary/5",
        disabled && "opacity-50 cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {checked && (
        <Check className={cn(iconSizeClasses[size], "stroke-[3]")} />
      )}
    </button>
  );
}
