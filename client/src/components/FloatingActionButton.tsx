import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  hasInboxItems?: boolean;
}

export function FloatingActionButton({ onClick, hasInboxItems = false }: FloatingActionButtonProps) {
  const { isMobile } = useMobile();

  if (isMobile) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-6 right-6 z-40"
        data-testid="floating-action-button"
      >
        <Button
          onClick={onClick}
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            hasInboxItems && "animate-pulse"
          )}
          data-testid="button-fab-add"
        >
          <Plus className="h-6 w-6" />
        </Button>
        {hasInboxItems && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive border-2 border-background"
            data-testid="fab-inbox-indicator"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
