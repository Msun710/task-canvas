import { useRef, useState, useCallback, memo } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Check, Trash2, Edit, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableTaskCardProps {
  children: React.ReactNode;
  onComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onPostpone?: () => void;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 100;
const COMPLETE_THRESHOLD = 150;

const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
};

export const SwipeableTaskCard = memo(function SwipeableTaskCard({
  children,
  onComplete,
  onDelete,
  onEdit,
  onPostpone,
  disabled = false,
}: SwipeableTaskCardProps) {
  const [isActionsRevealed, setIsActionsRevealed] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);

  const completeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const completeScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.5, 1]);
  const completeIconScale = useTransform(x, [SWIPE_THRESHOLD, COMPLETE_THRESHOLD], [1, 1.3]);
  
  const actionsOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const actionsScale = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.8]);

  const backgroundGreen = useTransform(
    x,
    [0, COMPLETE_THRESHOLD],
    ["hsl(142, 76%, 36%)", "hsl(142, 76%, 46%)"]
  );

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > COMPLETE_THRESHOLD || (offset > SWIPE_THRESHOLD && velocity > 500)) {
      triggerHapticFeedback();
      onComplete();
    } else if (offset < -SWIPE_THRESHOLD || velocity < -300) {
      setIsActionsRevealed(true);
      setSwipeDirection("left");
    }
  }, [onComplete]);

  const handleActionClick = useCallback((action: "delete" | "edit" | "postpone") => {
    triggerHapticFeedback();
    setIsActionsRevealed(false);
    setSwipeDirection(null);
    
    switch (action) {
      case "delete":
        onDelete();
        break;
      case "edit":
        onEdit();
        break;
      case "postpone":
        onPostpone?.();
        break;
    }
  }, [onDelete, onEdit, onPostpone]);

  const closeActions = useCallback(() => {
    setIsActionsRevealed(false);
    setSwipeDirection(null);
  }, []);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div 
      ref={constraintsRef}
      className="relative overflow-hidden rounded-md touch-pan-y"
      data-testid="swipeable-task-card"
    >
      <motion.div
        className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 rounded-l-md"
        style={{ 
          backgroundColor: backgroundGreen,
          opacity: completeOpacity,
        }}
      >
        <motion.div
          style={{ 
            scale: completeScale,
          }}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20"
        >
          <motion.div style={{ scale: completeIconScale }}>
            <Check className="w-6 h-6 text-white" />
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-1 pr-2 bg-muted rounded-r-md"
        style={{ 
          opacity: actionsOpacity,
          scale: actionsScale,
        }}
      >
        {onPostpone && (
          <button
            type="button"
            onClick={() => handleActionClick("postpone")}
            className="flex items-center justify-center w-11 h-11 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 touch-target"
            data-testid="swipe-action-postpone"
          >
            <CalendarClock className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => handleActionClick("edit")}
          className="flex items-center justify-center w-11 h-11 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 touch-target"
          data-testid="swipe-action-edit"
        >
          <Edit className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => handleActionClick("delete")}
          className="flex items-center justify-center w-11 h-11 rounded-md bg-destructive/10 text-destructive touch-target"
          data-testid="swipe-action-delete"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </motion.div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -150, right: 0 }}
        dragElastic={{ left: 0.1, right: 0.3 }}
        onDragEnd={handleDragEnd}
        animate={isActionsRevealed ? { x: -130 } : { x: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{ x }}
        className={cn(
          "relative bg-background will-change-transform",
          swipeDirection === "left" && isActionsRevealed && "rounded-l-md"
        )}
        onTap={isActionsRevealed ? closeActions : undefined}
      >
        {children}
      </motion.div>
    </div>
  );
});
