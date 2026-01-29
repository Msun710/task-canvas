import { motion, AnimatePresence } from "framer-motion";
import { useMobile } from "@/hooks/use-mobile";

interface MobileLayoutProps {
  children: React.ReactNode;
  hasBottomNav?: boolean;
  fullWidth?: boolean;
  noPadding?: boolean;
  className?: string;
}

const pageVariants = {
  initial: { 
    opacity: 0, 
    y: 10,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.2,
    }
  },
  exit: { 
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.15,
    }
  },
};

export function MobileLayout({
  children,
  hasBottomNav = true,
  fullWidth = false,
  noPadding = false,
  className = "",
}: MobileLayoutProps) {
  const { isMobile } = useMobile();

  const paddingClass = noPadding 
    ? "" 
    : isMobile 
      ? "px-3 py-4" 
      : "p-6";

  const widthClass = fullWidth || isMobile 
    ? "w-full" 
    : "max-w-7xl mx-auto";

  const bottomPaddingClass = hasBottomNav && isMobile 
    ? "pb-20" 
    : "";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`
          min-h-full
          ${paddingClass}
          ${widthClass}
          ${bottomPaddingClass}
          ${className}
        `}
        style={{
          paddingTop: isMobile ? "env(safe-area-inset-top)" : undefined,
          paddingLeft: isMobile ? "max(env(safe-area-inset-left), 0.75rem)" : undefined,
          paddingRight: isMobile ? "max(env(safe-area-inset-right), 0.75rem)" : undefined,
        }}
        data-testid="mobile-layout"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}

export function MobileHeader({ 
  title, 
  subtitle, 
  actions,
  compact = false,
}: MobileHeaderProps) {
  const { isMobile } = useMobile();

  return (
    <div 
      className={`
        flex items-center justify-between gap-3 flex-wrap
        ${compact || isMobile ? "mb-3" : "mb-6"}
      `}
      data-testid="mobile-header"
    >
      <div className="min-w-0 flex-1">
        <h1 
          className={`
            font-semibold truncate
            ${isMobile ? "text-xl" : "text-3xl"}
          `}
          data-testid="mobile-header-title"
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

interface MobileCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  compact?: boolean;
}

export function MobileCardGrid({ 
  children, 
  columns = 2,
  compact = false,
}: MobileCardGridProps) {
  const { isMobile, isTablet } = useMobile();

  const getGridCols = () => {
    if (isMobile) return "grid-cols-1";
    if (isTablet) return columns > 2 ? "grid-cols-2" : `grid-cols-${columns}`;
    return `md:grid-cols-2 lg:grid-cols-${columns}`;
  };

  return (
    <div 
      className={`
        grid ${getGridCols()}
        ${compact || isMobile ? "gap-3" : "gap-4 md:gap-6"}
      `}
      data-testid="mobile-card-grid"
    >
      {children}
    </div>
  );
}

interface MobileToolbarProps {
  children: React.ReactNode;
  sticky?: boolean;
}

export function MobileToolbar({ children, sticky = false }: MobileToolbarProps) {
  const { isMobile } = useMobile();

  return (
    <div 
      className={`
        flex items-center gap-2 flex-wrap
        ${isMobile ? "overflow-x-auto -mx-3 px-3 pb-2" : ""}
        ${sticky ? "sticky top-0 z-20 bg-background py-2" : ""}
      `}
      style={{
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      data-testid="mobile-toolbar"
    >
      {children}
    </div>
  );
}

interface MobileSectionProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  hiddenOnMobile?: boolean;
}

export function MobileSection({ 
  children, 
  title, 
  className = "",
  hiddenOnMobile = false,
}: MobileSectionProps) {
  const { isMobile } = useMobile();

  if (hiddenOnMobile && isMobile) {
    return null;
  }

  return (
    <section className={`${isMobile ? "mb-4" : "mb-6"} ${className}`}>
      {title && (
        <h2 className={`font-semibold ${isMobile ? "text-base mb-2" : "text-lg mb-3"}`}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
