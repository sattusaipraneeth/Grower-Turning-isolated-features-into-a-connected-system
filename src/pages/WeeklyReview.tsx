import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Flame, Target, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { currentWeekAggregates, dateKey, resetAllProgress, startOfIsoWeek, selectedDate as getGlobalSelectedDate, SELECTED_DATE_EVENT, bestHabitByStreak, lowestConsistencyDay, bestConsistencyDay } from "@/lib/timeState";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { addDays, format } from "date-fns";

type ReviewEntry = {
  wins: string;
  challenges: string;
  nextFocus: string;
  savedAt: number;
};

const STORAGE_KEY = "weekly-reviews";

const WeeklyReview = () => {
  const [wins, setWins] = useState("");
  const [challenges, setChallenges] = useState("");
  const [nextFocus, setNextFocus] = useState("");
  const [entries, setEntries] = useState<Record<string, ReviewEntry>>({});
  const [resetOpen, setResetOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [viewDateStr, setViewDateStr] = useState<string>(format(getGlobalSelectedDate(), "yyyy-MM-dd"));

  const weekKey = useMemo(() => {
    const now = getGlobalSelectedDate();
    const year = format(now, "yyyy");
    const isoWeek = format(now, "II");
    return `${year}-W${isoWeek}`;
  }, [tick]);

  const insights = useMemo(() => ({
    bestHabit: bestHabitByStreak(),
    lowestDay: lowestConsistencyDay(),
    bestDay: bestConsistencyDay(),
  }), [tick]);

  const derived = useMemo(() => {
    const base = (() => {
      const [y, m, d] = viewDateStr.split("-").map(Number);
      return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
    })();
    const weekAgg = currentWeekAggregates(base);
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = weekAgg.map((d, idx) => ({ day: labels[idx] ?? String(idx + 1), score: d.completedHabits, total: d.totalHabits }));

    const totalSlots = weekAgg.reduce((sum, d) => sum + d.totalHabits, 0);
    const completedSlots = weekAgg.reduce((sum, d) => sum + d.completedHabits, 0);
    const focusScore = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

    const perfectDaysCount = weekAgg.filter((d) => d.totalHabits > 0 && d.completedHabits === d.totalHabits).length;
    const habitsCompletedCount = completedSlots;

    const weekStart = startOfIsoWeek(base);
    let streakDaysCount = 0;
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(base, -i);
      if (dayDate.getTime() < weekStart.getTime()) break;
      const k = dateKey(dayDate);
      const day = weekAgg.find((x) => x.dateKey === k);
      if ((day?.completedHabits ?? 0) > 0) streakDaysCount++;
      else break;
    }

    const yMax = Math.max(1, ...weeklyData.map((d) => d.total ?? 0));
    return { weeklyData, focusScore, streakDaysCount, habitsCompletedCount, perfectDaysCount, yMax };
  }, [tick, viewDateStr]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, ReviewEntry>;
        setEntries(parsed);
        const curr = parsed[weekKey];
        if (curr) {
          setWins(curr.wins);
          setChallenges(curr.challenges);
          setNextFocus(curr.nextFocus);
        }
      }
    } catch {
      console.log("Failed to load weekly reviews");
    }
  }, [weekKey]);

  useEffect(() => {
    const handler = () => {
      setEntries({});
      setWins("");
      setChallenges("");
      setNextFocus("");
      setTick((t) => t + 1);
    };
    window.addEventListener("grower:progressReset", handler);
    return () => window.removeEventListener("grower:progressReset", handler);
  }, []);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(SELECTED_DATE_EVENT, bump);
    return () => window.removeEventListener(SELECTED_DATE_EVENT, bump);
  }, []);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("focus", bump);
    const onVisibility = () => {
      if (document.visibilityState === "visible") bump();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(bump, 60 * 1000);
    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, []);

  const saveReview = () => {
    const updated: Record<string, ReviewEntry> = {
      ...entries,
      [weekKey]: { wins, challenges, nextFocus, savedAt: Date.now() },
    };
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const recentWeeks = Object.keys(entries)
    .sort((a, b) => (entries[b]?.savedAt ?? 0) - (entries[a]?.savedAt ?? 0))
    .slice(0, 4);

  

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Weekly Review
          </h1>
          <p className="text-muted-foreground mt-1">{weekKey}</p>
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setResetOpen(true)}
          >
            Reset
          </Button>
        </div>
      </div>
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears all stored progress, entities, and weekly reviews across the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetAllProgress();
                setResetOpen(false);
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center gap-3">
        <input type="date" value={viewDateStr} onChange={(e) => setViewDateStr(e.target.value)} className="px-3 py-2 rounded-md border border-border bg-card text-sm" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Target className="w-4 h-4" />
            <span className="text-sm">Focus Score</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{derived.focusScore}</p>
          <p className="text-xs text-muted-foreground">this week</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Flame className="w-4 h-4" />
            <span className="text-sm">Streak</span>
          </div>
          <p className="text-3xl font-bold text-amber">{derived.streakDaysCount}</p>
          <p className="text-xs text-muted-foreground">days</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Habits</span>
          </div>
          <p className="text-3xl font-bold text-leaf">{derived.habitsCompletedCount}</p>
          <p className="text-xs text-muted-foreground">completed</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CalendarDays className="w-4 h-4" />
            <span className="text-sm">Perfect Days</span>
          </div>
          <p className="text-3xl font-bold text-primary">{derived.perfectDaysCount}</p>
          <p className="text-xs text-muted-foreground">this week</p>
        </div>
      </div>

      {/* Pattern Insights — analytics for weekly reflection only */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-foreground mb-4">Pattern Insights</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Use these to adjust: where do I improve? What needs fixing?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.bestHabit && (
            <div className="p-4 rounded-xl bg-leaf/10 border border-leaf/20">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4 text-leaf" />
                <span className="text-xs font-medium">Best performing habit</span>
              </div>
              <p className="font-semibold text-foreground">{insights.bestHabit.name}</p>
              <p className="text-xs text-muted-foreground">{insights.bestHabit.streak} day streak</p>
            </div>
          )}
          {insights.lowestDay && (
            <div className="p-4 rounded-xl bg-amber/10 border border-amber/20">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingDown className="w-4 h-4 text-amber" />
                <span className="text-xs font-medium">Lowest consistency</span>
              </div>
              <p className="font-semibold text-foreground">{insights.lowestDay.day}</p>
              <p className="text-xs text-muted-foreground">{insights.lowestDay.pct}% — consider adjusting</p>
            </div>
          )}
          {insights.bestDay && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">Best day</span>
              </div>
              <p className="font-semibold text-foreground">{insights.bestDay.day}</p>
              <p className="text-xs text-muted-foreground">{insights.bestDay.pct}% — build on this</p>
            </div>
          )}
          {!insights.bestHabit && !insights.lowestDay && !insights.bestDay && (
            <p className="text-sm text-muted-foreground col-span-3">Complete habits over time to see pattern insights.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="font-semibold text-foreground mb-4">Weekly Trend</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.weeklyData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis hide domain={[0, derived.yMax]} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "var(--shadow-soft)" }} />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-semibold text-foreground mb-4">Reflection</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Wins</label>
              <textarea
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                className="w-full h-24 rounded-xl bg-card border border-border px-3 py-2 text-sm"
                placeholder="What went well?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Challenges</label>
              <textarea
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                className="w-full h-24 rounded-xl bg-card border border-border px-3 py-2 text-sm"
                placeholder="What was hard?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Next Week Focus</label>
              <textarea
                value={nextFocus}
                onChange={(e) => setNextFocus(e.target.value)}
                className="w-full h-24 rounded-xl bg-card border border-border px-3 py-2 text-sm"
                placeholder="Top priorities and commitments"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveReview}>Save Review</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-semibold text-foreground mb-4">Recent Reviews</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recentWeeks.length === 0 && <p className="text-sm text-muted-foreground">No saved reviews</p>}
          {recentWeeks.map((wk) => {
            const data = entries[wk];
            return (
              <div key={wk} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{wk}</span>
                  <span className="text-xs text-muted-foreground">{format(data.savedAt, "MMM d, HH:mm")}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div className="mb-1"><span className="font-medium text-foreground">Wins:</span> {data.wins || "-"}</div>
                  <div className="mb-1"><span className="font-medium text-foreground">Challenges:</span> {data.challenges || "-"}</div>
                  <div><span className="font-medium text-foreground">Next:</span> {data.nextFocus || "-"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeeklyReview;
