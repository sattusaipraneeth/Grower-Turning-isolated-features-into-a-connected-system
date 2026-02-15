import { useState, useEffect } from "react";
import { Check, Sparkles, Droplets, BookOpen, Dumbbell, Moon, Apple } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { HabitEntities, completedOnDate, selectedDateKey, SELECTED_DATE_EVENT, getEntityState, setEntityState, DailyBooleanState, streakDays } from "@/lib/timeState";

interface Habit {
  id: string;
  name: string;
  icon: typeof Sparkles;
  color: string;
}

const iconMap: Record<string, typeof Sparkles> = {
  "Morning Meditation": Sparkles,
  "Drink 8 Glasses": Droplets,
  "Read 30 Minutes": BookOpen,
  "Exercise": Dumbbell,
  "Sleep by 11pm": Moon,
  "Eat Healthy": Apple,
};

export function HabitsWidget() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [key, setKey] = useState<string>(selectedDateKey());
  useEffect(() => {
    const saved = HabitEntities.all();
    setHabits(saved.map(h => ({ id: h.id, name: h.name, color: h.color, icon: iconMap[h.name] || Sparkles })));
  }, []);
  useEffect(() => {
    const onDate = () => setKey(selectedDateKey());
    const onReset = () => {
      setKey(selectedDateKey());
      const saved = HabitEntities.all();
      setHabits(saved.map(h => ({ id: h.id, name: h.name, color: h.color, icon: iconMap[h.name] || Sparkles })));
    };
    window.addEventListener(SELECTED_DATE_EVENT, onDate);
    window.addEventListener("grower:progressReset", onReset);
    return () => {
      window.removeEventListener(SELECTED_DATE_EVENT, onDate);
      window.removeEventListener("grower:progressReset", onReset);
    };
  }, []);

  const toggleHabit = (id: string) => {
    const current = getEntityState<DailyBooleanState>("habits", id, key);
    const next: DailyBooleanState = { completed: !(current?.completed ?? false) };
    setEntityState<DailyBooleanState>("habits", id, key, next);
  };

  const completedCount = habits.filter(h => completedOnDate("habits", h.id, key)).length;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Today's Habits</h2>
          <p className="text-sm text-muted-foreground">{completedCount} of {habits.length} completed</p>
        </div>
        <Link 
          to="/habits"
          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          View All →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {habits.map((habit) => (
          <button
            key={habit.id}
            onClick={() => toggleHabit(habit.id)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 group text-left",
              completedOnDate("habits", habit.id, key)
                ? "bg-primary/10 border-primary/30" 
                : "bg-card/50 border-border/50 hover:border-primary/30"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
              completedOnDate("habits", habit.id, key)
                ? `bg-gradient-to-br ${habit.color}` 
                : "bg-muted group-hover:bg-muted/80"
            )}>
              {completedOnDate("habits", habit.id, key) ? (
                <Check className="w-5 h-5 text-primary-foreground" />
              ) : (
                <habit.icon className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-sm truncate transition-colors",
                completedOnDate("habits", habit.id, key) ? "text-foreground" : "text-muted-foreground"
              )}>
                {habit.name}
              </p>
              <div className="streak-badge mt-1">
                🔥 {streakDays("habits", habit.id)} days
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
