import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Calendar, Target, Flame, Download, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HabitEntities, TaskEntities, StudyGoalEntities, aggregateRange, completedOnDate, currentMonthAggregates, currentWeekAggregates, dateKey, resetAllProgress, startOfIsoWeek, streakDays, todayKey, selectedDate as getGlobalSelectedDate, setSelectedDate, getDayRecord } from "@/lib/timeState";
import { addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const heatmapColors = ['bg-muted', 'bg-primary/20', 'bg-primary/50', 'bg-primary/75', 'bg-primary'];

type ActivityRow = {
  date: string;
  item_type: "habit" | "task" | "goal" | "focus" | "note";
  item_name: string;
  status: "completed" | "pending" | "skipped";
  value: string;
  duration: string;
  category: string;
  created_at: string;
  completed_at: string;
};

const Growth = () => {
  const [resetOpen, setResetOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [mode, setMode] = useState<"weekly" | "monthly" | "yearly" | "custom">("weekly");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const esc = (v: string) => {
    if (v.includes(",") || v.includes("\"") || v.includes("\n")) return `"${v.replace(/"/g, "\"\"")}"`;
    return v;
  };
  const toIso = (ms?: number) => (ms ? new Date(ms).toISOString() : "");
  const buildRows = (rs: Date, re: Date): ActivityRow[] => {
    const rows: ActivityRow[] = [];
    const start = new Date(rs);
    start.setHours(0, 0, 0, 0);
    const end = new Date(re);
    end.setHours(0, 0, 0, 0);
    const diff = Math.max(0, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
    const habits = HabitEntities.all();
    const tasks = TaskEntities.all();
    const goals = StudyGoalEntities.all();
    for (let i = 0; i <= diff; i++) {
      const d = addDays(start, i);
      const dk = dateKey(d);
      habits.forEach(h => {
        const st = getDayRecord<{ completed: boolean }>("habits", dk)[h.id];
        const hasRecord = !!st;
        const completed = !!st?.completed;
        rows.push({
          date: dk,
          item_type: "habit",
          item_name: h.name,
          status: completed ? "completed" : hasRecord ? "skipped" : "pending",
          value: completed ? "1" : "0",
          duration: "",
          category: h.category || "",
          created_at: "",
          completed_at: completed ? `${dk}T00:00:00` : ""
        });
      });
      tasks.forEach(t => {
        const st = getDayRecord<{ completed: boolean }>("todos", dk)[t.id];
        const hasRecord = !!st;
        const completed = !!st?.completed;
        rows.push({
          date: dk,
          item_type: "task",
          item_name: t.title,
          status: completed ? "completed" : hasRecord ? "skipped" : "pending",
          value: "",
          duration: "",
          category: t.priority || "",
          created_at: "",
          completed_at: completed ? `${dk}T00:00:00` : ""
        });
      });
      goals.forEach(g => {
        const st = getDayRecord<{ completed: boolean }>("studyGoals", dk)[g.id];
        const hasRecord = !!st;
        const completed = !!st?.completed;
        rows.push({
          date: dk,
          item_type: "goal",
          item_name: g.title,
          status: completed ? "completed" : hasRecord ? "skipped" : "pending",
          value: "",
          duration: "",
          category: "study",
          created_at: "",
          completed_at: completed ? `${dk}T00:00:00` : ""
        });
      });
    }
    try {
      const raw = localStorage.getItem("green-home-focus-history");
      if (raw) {
        const sessions = JSON.parse(raw) as Array<{ mode: "work" | "break"; startedAt: number; endedAt: number; durationSec: number; goalTitle?: string; dateKey?: string }>;
        sessions
          .filter(s => s.mode === "work")
          .filter(s => s.startedAt >= start.getTime() && s.startedAt <= (end.getTime() + 24 * 3600 * 1000 - 1))
          .forEach(s => {
            const dk = dateKey(new Date(s.startedAt));
            const mins = Math.round((s.durationSec || 0) / 60);
            rows.push({
              date: dk,
              item_type: "focus",
              item_name: s.goalTitle || "Focus Session",
              status: "completed",
              value: "",
              duration: String(mins),
              category: "study",
              created_at: toIso(s.startedAt),
              completed_at: toIso(s.endedAt)
            });
          });
      }
    } catch { void 0; }
    try {
      const raw = localStorage.getItem("green-home-notes");
      if (raw) {
        const notes = JSON.parse(raw) as Array<{ id: string; title: string; dateKey?: string; folder?: string }>;
        notes.forEach(n => {
          if (!n.dateKey) return;
          const d = new Date(`${n.dateKey}T00:00:00`);
          if (d >= start && d <= end) {
            rows.push({
              date: n.dateKey,
              item_type: "note",
              item_name: n.title,
              status: "completed",
              value: "",
              duration: "",
              category: n.folder || "",
              created_at: "",
              completed_at: ""
            });
          }
        });
      }
    } catch { void 0; }
    rows.sort((a, b) => {
      if (a.date === b.date) return a.created_at.localeCompare(b.created_at);
      return a.date.localeCompare(b.date);
    });
    const seen = new Set<string>();
    const dedup: ActivityRow[] = [];
    rows.forEach(r => {
      const k = [r.date, r.item_type, r.item_name, r.status, r.value, r.duration, r.category, r.created_at, r.completed_at].join("|");
      if (seen.has(k)) return;
      seen.add(k);
      dedup.push(r);
    });
    return dedup;
  };
  const buildCsv = (rows: ActivityRow[]) => {
    const header = ["date","item_type","item_name","status","value","duration","category","created_at","completed_at"].join(",");
    const lines = rows.map(r => [
      esc(r.date),
      esc(r.item_type),
      esc(r.item_name),
      esc(r.status),
      esc(r.value),
      esc(r.duration),
      esc(r.category),
      esc(r.created_at),
      esc(r.completed_at)
    ].join(","));
    return [header, ...lines].join("\n");
  };

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("grower:progressReset", handler);
    return () => window.removeEventListener("grower:progressReset", handler);
  }, []);

  const derived = useMemo(() => {
    const habits = HabitEntities.all();
    const now = getGlobalSelectedDate();

    // Weekly (Mon-Sun) habit completions
    const weekAgg = currentWeekAggregates(now);
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = weekAgg.map((d, idx) => ({
      day: dayLabels[idx] ?? String(idx + 1),
      completed: d.completedHabits,
      total: d.totalHabits,
    }));
    const weeklyYMax = Math.max(1, ...weeklyData.map((d) => d.total ?? 0));

    // Last 4 ISO weeks completion rate (habits only)
    const thisWeekStart = startOfIsoWeek(now);
    const monthlyData = Array.from({ length: 4 }, (_, i) => {
      const start = addDays(thisWeekStart, -7 * (3 - i));
      const end = addDays(start, 6);
      const days = aggregateRange(start, end);
      const totalSlots = days.reduce((sum, d) => sum + d.totalHabits, 0);
      const completedSlots = days.reduce((sum, d) => sum + d.completedHabits, 0);
      const rate = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;
      return { week: `W${i + 1}`, rate };
    });

    // Top stats
    const today = todayKey();
    const todayAgg = weekAgg.find((d) => d.dateKey === today) ?? weekAgg[weekAgg.length - 1];
    const lifeScore = (todayAgg?.totalHabits ?? 0) > 0
      ? Math.round(((todayAgg?.completedHabits ?? 0) / (todayAgg?.totalHabits ?? 1)) * 100)
      : 0;

    // Current streak = consecutive "perfect habit days" (all habits completed)
    const perfectDay = (k: string) => {
      const a = aggregateRange(new Date(`${k}T00:00:00`), new Date(`${k}T00:00:00`))[0];
      return (a?.totalHabits ?? 0) > 0 && (a?.completedHabits ?? 0) === (a?.totalHabits ?? 0);
    };
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const k = dateKey(addDays(now, -i));
      if (perfectDay(k)) currentStreak++;
      else break;
    }

    const monthAgg = currentMonthAggregates(now);
    const monthTotalSlots = monthAgg.reduce((sum, d) => sum + d.totalHabits, 0);
    const monthCompletedSlots = monthAgg.reduce((sum, d) => sum + d.completedHabits, 0);
    const completionRateMonth = monthTotalSlots > 0 ? Math.round((monthCompletedSlots / monthTotalSlots) * 100) : 0;
    const perfectDaysMonth = monthAgg.filter((d) => d.totalHabits > 0 && d.completedHabits === d.totalHabits).length;

    // Build range for heatmap based on mode
    let rangeStart = startOfIsoWeek(now);
    let rangeEnd = addDays(rangeStart, 6);
    if (mode === "monthly") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      rangeStart = s; rangeEnd = e;
    } else if (mode === "yearly") {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = new Date(now.getFullYear(), 11, 31);
      rangeStart = s; rangeEnd = e;
    } else if (mode === "custom") {
      const parse = (s: string) => {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y || now.getFullYear(), (m || 1) - 1, d || 1);
      };
      const cs = customStart ? parse(customStart) : addDays(now, -27);
      const ce = customEnd ? parse(customEnd) : now;
      rangeStart = cs; rangeEnd = ce;
    }
    const heatmapDays = aggregateRange(rangeStart, rangeEnd);
    const heatmapData = heatmapDays.map((d, idx) => {
      const pct = d.totalHabits > 0 ? d.completedHabits / d.totalHabits : 0;
      const value = pct === 0 ? 0 : Math.max(1, Math.min(4, Math.ceil(pct * 4)));
      return { dateKey: d.dateKey, value };
    });

    // Habit performance = last 28 days completion % per habit
    const habitStats = habits.map((h) => {
      let completed = 0;
      const totalDays = heatmapDays.length || 1;
      for (let i = 0; i < totalDays; i++) {
        const k = heatmapDays[i]?.dateKey;
        if (k && completedOnDate("habits", h.id, k)) completed++;
      }
      const completion = Math.round((completed / Math.max(1, heatmapDays.length)) * 100);
      return {
        name: h.name,
        completion,
        streak: streakDays("habits", h.id),
        color: "bg-primary",
      } as const;
    });

    return { weeklyData, weeklyYMax, monthlyData, lifeScore, currentStreak, completionRateMonth, perfectDaysMonth, heatmapData, habitStats, rangeStart, rangeEnd };
  }, [tick, mode, customStart, customEnd]);

  const downloadCSV = () => {
    try {
      const rows = buildRows(derived.rangeStart, derived.rangeEnd);
      const csv = buildCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity_${dateKey(derived.rangeStart)}_${dateKey(derived.rangeEnd)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { void 0; }
  };

  const downloadJSON = () => {
    try {
      const rows = buildRows(derived.rangeStart, derived.rangeEnd);
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity_${dateKey(derived.rangeStart)}_${dateKey(derived.rangeEnd)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { void 0; }
  };

  const printPDF = () => {
    const days = aggregateRange(derived.rangeStart, derived.rangeEnd);
    const html = `
      <html>
        <head>
          <title>Growth Report</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; }
            h1 { font-size: 18px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 6px; font-size: 12px; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Growth Report (${dateKey(derived.rangeStart)} to ${dateKey(derived.rangeEnd)})</h1>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Completed Habits</th>
                <th>Total Habits</th>
                <th>Completed Tasks</th>
                <th>Total Tasks</th>
              </tr>
            </thead>
            <tbody>
              ${days.map(d => `<tr><td>${d.dateKey}</td><td>${d.completedHabits}</td><td>${d.totalHabits}</td><td>${d.completedTodos}</td><td>${d.totalTodos}</td></tr>`).join("")}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const lowestDay = derived.weeklyData.length
    ? derived.weeklyData.reduce((min, d) => (d.completed < min.completed ? d : min), derived.weeklyData[0])
    : null;
  const consistencyMessage = lowestDay ? `Lowest completion day: ${lowestDay.day}` : "";
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Growth Analytics
          </h1>
          <p className="text-muted-foreground mt-1">System diagnosis — use weekly/monthly, not daily</p>
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
              This clears all stored progress and entities across the app.
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

      {/* How to use — system correction, not daily motivation */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-sm text-foreground">
          <strong>Metrics follow behavior, not the other way around - Use this page to detect friction, spot patterns, and decide what to simplify or remove. It is not a scorecard of self-worth.</strong>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Don&apos;t open daily. Don&apos;t compare weeks emotionally. Don&apos;t try to &quot;fix&quot; low numbers directly — if numbers are low, simplify tasks and habits.
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Target className="w-4 h-4" />
            <span className="text-sm">System Health</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="p-0.5 rounded hover:bg-muted" aria-label="Info">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                Blended index of habits + tasks + focus. Look at 7–14 day trend only. If low → simplify tasks, not &quot;work harder&quot;. Don&apos;t optimize it directly.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-3xl font-bold text-foreground">{derived.lifeScore}</p>
          <p className="text-xs text-muted-foreground">today</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Flame className="w-4 h-4" />
            <span className="text-sm">Current Streak</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="p-0.5 rounded hover:bg-muted" aria-label="Info">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                Perfect days (everything done). Streak = 0 is normal. Progress does not require streaks. Don&apos;t use this as a goal.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-3xl font-bold text-amber">{derived.currentStreak}</p>
          <p className="text-xs text-muted-foreground">days</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Completion Rate</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="p-0.5 rounded hover:bg-muted" aria-label="Info">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                Low % is expected when tasks are oversized or habits are strict. Improves when tasks ≤ 2 focus sessions and habits are tiny. Don&apos;t chase the number.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-3xl font-bold text-leaf">{derived.completionRateMonth}%</p>
          <p className="text-xs text-muted-foreground">this month</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Perfect Days</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="p-0.5 rounded hover:bg-muted" aria-label="Info">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                Advanced metric. Ignore until after 30–45 days of stable habits.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-3xl font-bold text-primary">{derived.perfectDaysMonth}</p>
          <p className="text-xs text-muted-foreground">this month</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Completion Chart */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Weekly Habits</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="p-1 rounded hover:bg-muted" aria-label="Info">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                Look for missing days. Ask: Why didn&apos;t this habit fire? Use to remove weekend habits or shrink failing ones.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.weeklyData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis hide domain={[0, derived.weeklyYMax]} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-soft)',
                  }}
                />
                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Monthly Trend</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="p-1 rounded hover:bg-muted" aria-label="Info">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                Slow feedback loop. Check once per month. Look only at direction (up/down), not values.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={derived.monthlyData}>
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis hide domain={[0, 100]} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-soft)',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Habit Performance */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Habit Performance</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="p-1 rounded hover:bg-muted" aria-label="Info">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                Where real optimization happens. 0% = bad habit design, not lack of discipline. Redesign or delete failing habits. Keep only green/yellow ones.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-4">
            {derived.habitStats.map((habit) => (
              <div key={habit.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{habit.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="streak-badge">🔥 {habit.streak}</span>
                    <span className="text-sm font-semibold text-foreground">{habit.completion}%</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${habit.completion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
            <h3 className="text-sm font-medium text-foreground mb-2">Insights</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {consistencyMessage ? <li>• {consistencyMessage}</li> : <li>• No activity yet this week</li>}
              <li>• Low % = habit design issue — redesign or remove</li>
              <li>• Analytics are derived only from completion events</li>
            </ul>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">Activity Heatmap</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="p-1 rounded hover:bg-muted" aria-label="Info">
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  Shows when you work, not how much. Identify your natural productive days and schedule focus blocks on those days.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <Select value={mode} onValueChange={(v: "weekly" | "monthly" | "yearly" | "custom") => setMode(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {mode === "custom" && (
                <div className="flex items-center gap-2">
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="text-xs rounded-md border border-border bg-card px-2 py-1" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="text-xs rounded-md border border-border bg-card px-2 py-1" />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
                {day}
              </div>
            ))}
            {derived.heatmapData.map((item, i) => (
              <div
                key={i}
                className={`aspect-square rounded-md ${heatmapColors[item.value]} cursor-pointer hover:opacity-80 transition-opacity`}
                title={`${item.dateKey}: ${item.value * 25}% completion`}
                onClick={() => setSelectedDate(new Date(`${item.dateKey}T00:00:00`))}
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-1 mt-4">
            <span className="text-xs text-muted-foreground mr-2">Less</span>
            {heatmapColors.slice(1).map((color, i) => (
              <div key={i} className={`w-4 h-4 rounded ${color}`} />
            ))}
            <span className="text-xs text-muted-foreground ml-2">More</span>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button type="button" variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={downloadJSON}>
              <Download className="w-4 h-4 mr-1" />
              JSON
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={printPDF}>
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Growth;
