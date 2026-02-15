import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, navItems } from "./Sidebar";
import { QuickAddButton } from "../quick-add/QuickAddButton";
import natureBg from "@/assets/nature-bg.jpg";
import { cn } from "@/lib/utils";
import { useDensity } from "@/hooks/useDensity";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PanelLeft, Leaf } from "lucide-react";
import { ensureSelectedDateIsToday, setSelectedDate, SELECTED_DATE_EVENT, todayKey, dateKey } from "@/lib/timeState";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { density } = useDensity();
  useEffect(() => {
    const sync = () => {
      ensureSelectedDateIsToday();
    };
    sync();

    // Keep the app's notion of "today" fresh on:
    // - tab focus / visibility
    // - day rollover (interval is a safety net)
    window.addEventListener("focus", sync);
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const interval = setInterval(sync, 60 * 1000);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={cn("min-h-screen relative", density === "compact" && "compact")}>
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${natureBg})` }}
      />
      <div className="fixed inset-0 bg-background/85 backdrop-blur-sm" />
      
      {/* Nature pattern overlay */}
      <div className="fixed inset-0 nature-pattern pointer-events-none" />
      
      {/* Main Layout */}
      <div className="relative flex min-h-screen">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur border-b border-border z-40 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <button className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
                  <PanelLeft className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[18rem]">
                <div className="h-16 flex items-center gap-3 px-4 border-b border-border">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-moss flex items-center justify-center shadow-glow">
                    <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="font-semibold">Grower</h1>
                    <p className="text-xs text-muted-foreground">Navigate</p>
                  </div>
                </div>
                <nav className="p-3 space-y-1">
                  {navItems.map(item => (
                    <a
                      key={item.path}
                      href={item.path}
                      className="flex items-center gap-3 px-3 h-11 rounded-xl text-sm text-foreground hover:bg-muted transition"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </a>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-moss flex items-center justify-center shadow-glow">
                <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <div className="font-semibold">Grower</div>
                <div className="text-xs text-muted-foreground">Your space to grow</div>
              </div>
            </div>
            <div />
          </div>
        </div>
        <main className={cn("flex-1 transition-all duration-300 pt-16 lg:pt-0", sidebarCollapsed ? "lg:ml-20" : "lg:ml-64")}>
          <div className={cn("p-6 max-w-7xl mx-auto", density === "compact" && "p-4")}>
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Quick Add FAB */}
      <QuickAddButton />
    </div>
  );
}
