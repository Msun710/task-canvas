import { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isDragging = useRef(false);
  
  const pullDistance = useMotionValue(0);
  const indicatorOpacity = useTransform(pullDistance, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const indicatorScale = useTransform(pullDistance, [0, threshold], [0.5, 1]);
  const indicatorRotation = useTransform(pullDistance, [0, threshold], [0, 180]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      pullDistance.set(0);
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const diff = Math.max(0, currentY - startY.current);
    const dampedDiff = Math.min(diff * 0.5, threshold * 1.5);
    
    pullDistance.set(dampedDiff);
    
    if (dampedDiff > 0) {
      e.preventDefault();
    }
  }, [disabled, isRefreshing, pullDistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current || disabled) return;
    isDragging.current = false;
    
    const currentPull = pullDistance.get();
    
    if (currentPull >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      animate(pullDistance, threshold, { type: "spring", stiffness: 300, damping: 30 });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(pullDistance, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    } else {
      animate(pullDistance, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  }, [disabled, isRefreshing, onRefresh, pullDistance, threshold]);

  const containerY = useTransform(pullDistance, [0, threshold * 1.5], [0, threshold]);

  return (
    <div 
      className="relative h-full overflow-hidden touch-pan-y"
      data-testid="pull-to-refresh-container"
    >
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-10"
        style={{ 
          top: 8,
          opacity: indicatorOpacity,
          scale: indicatorScale,
        }}
        data-testid="pull-to-refresh-indicator"
      >
        <motion.div
          className="flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-sm"
          style={{ rotate: isRefreshing ? undefined : indicatorRotation }}
        >
          <Loader2 
            className={`h-5 w-5 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`}
          />
        </motion.div>
      </motion.div>
      
      <motion.div
        ref={containerRef}
        className="h-full overflow-auto"
        style={{ y: containerY }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="pull-to-refresh-content"
      >
        {children}
      </motion.div>
    </div>
  );
}
