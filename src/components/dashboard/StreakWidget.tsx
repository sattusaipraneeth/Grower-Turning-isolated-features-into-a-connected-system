import { Flame, Trophy, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { HabitEntities, streakDays, completedOnDate, selectedDateKey, SELECTED_DATE_EVENT } from "@/lib/timeState";

export function StreakWidget() {
  const [habitIds, setHabitIds] = useState<string[]>([]);
  const [key, setKey] = useState<string>(selectedDateKey());
  useEffect(() => {
    const habits = HabitEntities.all();
    setHabitIds(habits.map(h => h.id));
  }, []);
  useEffect(() => {
    const onDate = () => setKey(selectedDateKey());
    const onReset = () => {
      setHabitIds(HabitEntities.all().map(h => h.id));
      setKey(selectedDateKey());
    };
    window.addEventListener(SELECTED_DATE_EVENT, onDate);
    window.addEventListener("grower:progressReset", onReset);
    return () => {
      window.removeEventListener(SELECTED_DATE_EVENT, onDate);
      window.removeEventListener("grower:progressReset", onReset);
    };
  }, []);
  const currentStreak = habitIds.length ? Math.max(...habitIds.map(id => streakDays("habits", id))) : 0;
  const longestStreak = currentStreak;
  
  return (
    <div className="glass-card p-4 bg-gradient-to-br from-amber/10 via-transparent to-primary/10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber to-amber-glow flex items-center justify-center shadow-glow animate-pulse-soft">
          <Flame className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Current Streak</p>
          <p className="text-2xl font-bold text-foreground">{currentStreak} days</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 p-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Trophy className="w-4 h-4" />
            <span className="text-xs">Best Streak</span>
          </div>
          <p className="font-semibold text-foreground">{longestStreak} days</p>
        </div>
        <div className="flex-1 p-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Star className="w-4 h-4" />
            <span className="text-xs">This Week</span>
          </div>
          <p className="font-semibold text-foreground">{(() => {
            const total = habitIds.length;
            const completed = habitIds.filter(id => completedOnDate("habits", id, key)).length;
            return total ? Math.round((completed / total) * 100) : 0;
          })()}%</p>
        </div>
      </div>
    </div>
  );
}
