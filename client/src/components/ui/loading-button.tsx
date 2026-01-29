import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ isLoading = false, loadingText, children, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {isLoading && loadingText ? loadingText : children}
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
