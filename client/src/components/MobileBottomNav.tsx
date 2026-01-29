import { useState } from "react";
import { useLocation, Link } from "wouter";
import { 
  Home, 
  Calendar, 
  Plus, 
  CheckSquare, 
  MoreHorizontal,
  Target,
  Sparkles,
  Clock,
  BarChart3,
  Settings,
  Users,
  Bell,
  FolderOpen,
  Inbox,
  ListChecks,
  Timer,
  Layout,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface MobileBottomNavProps {
  onAddClick: () => void;
}

const mainNavItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Layout, label: "Schedule", path: "/unified-scheduler" },
  { icon: null, label: "Add", path: null },
  { icon: Target, label: "Habits", path: "/habits" },
  { icon: MoreHorizontal, label: "More", path: "more" },
];

const moreMenuItems = [
  { icon: CheckSquare, label: "Tasks", path: "/tasks", description: "Manage your tasks" },
  { icon: Inbox, label: "Inbox", path: "/inbox", description: "Quick capture items" },
  { icon: FolderOpen, label: "Projects", path: "/projects", description: "Organize work by project" },
  { icon: Sparkles, label: "Inspiration", path: "/inspiration", description: "Quotes & motivation" },
  { icon: Calendar, label: "Calendar", path: "/schedule", description: "Calendar view" },
  { icon: Timer, label: "Focus", path: "/focus", description: "Pomodoro timer" },
  { icon: Clock, label: "Time", path: "/time", description: "Time tracking" },
  { icon: BarChart3, label: "Analytics", path: "/analytics", description: "View your stats" },
  { icon: Users, label: "Groups", path: "/groups", description: "Team collaboration" },
  { icon: Bell, label: "Notifications", path: "/notification-settings", description: "Alert preferences" },
  { icon: Settings, label: "Settings", path: "/settings", description: "App preferences" },
];

export function MobileBottomNav({ onAddClick }: MobileBottomNavProps) {
  const [location, setLocation] = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleNavClick = (path: string | null) => {
    if (path === null) {
      onAddClick();
    } else if (path === "more") {
      setIsMoreOpen(true);
    }
  };

  const handleMoreItemClick = (path: string) => {
    setLocation(path);
    setIsMoreOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        data-testid="mobile-bottom-nav"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => {
            if (item.path === null) {
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(null)}
                  className="relative flex items-center justify-center -mt-6"
                  data-testid="button-mobile-add"
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg"
                  >
                    <Plus className="h-6 w-6" />
                  </motion.div>
                </button>
              );
            }

            if (item.path === "more") {
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavClick("more")}
                  className="flex flex-col items-center justify-center min-w-[60px] py-2"
                  data-testid="button-mobile-more"
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "flex flex-col items-center justify-center transition-colors",
                      isMoreOpen ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                  </motion.div>
                </button>
              );
            }

            const isActive = location === item.path || 
              (item.path === "/" && location === "/") ||
              (item.path !== "/" && location.startsWith(item.path));
            const Icon = item.icon!;

            return (
              <Link key={item.label} href={item.path}>
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[60px] py-2 transition-colors relative",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="mobileActiveTab"
                      className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.nav>

      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-xl md:hidden">
          <SheetHeader className="pb-4 flex flex-row items-center justify-between">
            <SheetTitle className="text-left">More Options</SheetTitle>
            <SheetClose asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                data-testid="button-close-more"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 overflow-y-auto pb-8">
            {moreMenuItems.map((item) => {
              const isActive = location === item.path;
              return (
                <motion.button
                  key={item.path}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMoreItemClick(item.path)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "bg-muted/50 text-foreground hover-elevate"
                  )}
                  data-testid={`nav-more-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="h-6 w-6 mb-2" />
                  <span className="text-xs font-medium text-center">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
