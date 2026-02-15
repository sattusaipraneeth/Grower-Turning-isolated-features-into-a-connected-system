import { AlarmClock, Sparkles, Target, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDensity } from "@/hooks/useDensity";
import { HabitEntities, TaskEntities, completedOnDate, selectedDateKey, SELECTED_DATE_EVENT } from "@/lib/timeState";

const STORAGE_KEY_GOALS = "green-home-goals";

interface Goal {
  id: string;
  title: string;
  milestones: Array<{ id: string; title: string; completed: boolean }>;
}

export function PriorityWidget() {
  const { density } = useDensity();
  const [key, setKey] = useState<string>(selectedDateKey());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = () => {
      setKey(selectedDateKey());
      setTick((t) => t + 1);
    };
    window.addEventListener(SELECTED_DATE_EVENT, handler);
    window.addEventListener("grower:progressReset", handler);
    return () => {
      window.removeEventListener(SELECTED_DATE_EVENT, handler);
      window.removeEventListener("grower:progressReset", handler);
    };
  }, []);

  // Derive habits from actual HabitEntities
  const habits = useMemo(() => {
    const allHabits = HabitEntities.all();
    return allHabits.map(h => ({
      id: h.id,
      name: h.name,
      completed: completedOnDate("habits", h.id, key)
    }));
  }, [key, tick]);

  // Derive tasks from actual TaskEntities
  const tasks = useMemo(() => {
    const allTasks = TaskEntities.all();
    return allTasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority as "high" | "medium" | "low",
      dueTime: t.dueDate?.includes(":") ? t.dueDate : undefined,
      completed: completedOnDate("todos", t.id, key)
    }));
  }, [key, tick]);

  // Derive milestones from actual Goals
  const milestones = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GOALS);
      if (!raw) return [];
      const goals = JSON.parse(raw) as Goal[];
      const allMilestones: Array<{ goalId: string; id: string; title: string }> = [];
      goals.forEach(goal => {
        goal.milestones.forEach(m => {
          if (!m.completed) {
            allMilestones.push({ goalId: goal.id, id: m.id, title: m.title });
          }
        });
      });
      return allMilestones;
    } catch {
      return [];
    }
  }, [tick]);

  const topHabits = habits.filter(h => !h.completed).slice(0, 3);
  const topTasks = tasks.filter(t => !t.completed).slice(0, 3);
  const milestone = milestones[0];

  return (
    <div className={cn("glass-card p-6", density === "compact" && "p-4")}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlarmClock className="w-5 h-5 text-amber" />
          <h2 className="text-lg font-semibold text-foreground">Today's Priority</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/habits" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Habits</Link>
          <Link to="/todos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Tasks</Link>
          <Link to="/goals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Goals</Link>
        </div>
      </div>
      <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", density === "compact" && "gap-3")}>
        <div className="p-3 rounded-xl border border-border/50 bg-card/60">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Habits</span>
          </div>
          <div className="space-y-2">
            {topHabits.map(h => (
              <div key={h.id} className="flex items-center justify-between">
                <span className="text-sm text-foreground truncate">{h.name}</span>
                <span className="text-xs text-muted-foreground">today</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-border/50 bg-card/60">
          <div className="flex items-center gap-2 mb-2">
            <ListTodo className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-foreground">Tasks</span>
          </div>
          <div className="space-y-2">
            {topTasks.map(t => (
              <div key={t.id} className="flex items-center justify-between">
                <span className="text-sm text-foreground truncate">{t.title}</span>
                <span className="text-xs text-muted-foreground">{t.dueTime || "today"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-border/50 bg-card/60">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-amber" />
            <span className="text-sm font-medium text-foreground">Milestone</span>
          </div>
          {milestone ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground truncate">{milestone.title}</span>
              <Link to="/goals" className="text-xs text-primary">Go</Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">No active milestone</span>
              <Link to="/goals" className="text-xs text-primary">Add</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
