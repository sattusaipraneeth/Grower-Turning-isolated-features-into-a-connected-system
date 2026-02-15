import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Target,
  ListTodo,
  StickyNote,
  Timer,
  Calendar,
  FolderOpen,
  TrendingUp,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDensity } from "@/hooks/useDensity";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/useTheme";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Sparkles, label: "Habits", path: "/habits" },
  { icon: Target, label: "Goals", path: "/goals" },
  { icon: TrendingUp, label: "Growth", path: "/growth" },
  { icon: CalendarDays, label: "Weekly Review", path: "/weekly" },
  { icon: ListTodo, label: "To-Do", path: "/todos" },
  { icon: StickyNote, label: "Quick Notes", path: "/notes" },
  { icon: Timer, label: "Focus", path: "/focus" },
  { icon: Calendar, label: "Calendar", path: "/calendar" },
  { icon: FolderOpen, label: "Files", path: "/files" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { density, toggleDensity } = useDensity();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50 hidden lg:block",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-moss flex items-center justify-center shadow-glow">
            <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-semibold text-sidebar-foreground">Grower</h1>
              <p className="text-xs text-sidebar-foreground/60">Your space to grow,where consistency becomes progress.</p>
            </div>
          )}
        </div>
        <div />
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "drop-shadow-lg")} />
              {!collapsed && (
                <span className="font-medium text-sm animate-fade-in">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>
      
      {!collapsed && (
        <div className="mt-2 px-3">
          <div className="text-xs font-semibold text-sidebar-foreground/70 mb-2">Preferences</div>
          <TooltipProvider>
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-sidebar-accent">
              <div className="flex items-center gap-2">
                <span className="text-xs text-sidebar-foreground/70">Compact</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Switch checked={density === "compact"} onCheckedChange={toggleDensity} />
                  </TooltipTrigger>
                  <TooltipContent>Toggle compact layout density</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-sidebar-foreground/70">Dark</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                  </TooltipTrigger>
                  <TooltipContent>Toggle dark theme</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-primary transition-all duration-200"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
