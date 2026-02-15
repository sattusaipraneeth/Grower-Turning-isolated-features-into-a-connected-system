import { format, parseISO, addDays, startOfWeek, startOfMonth, endOfMonth } from "date-fns";

export type DateKey = string;

export type DailyBooleanState = {
  completed: boolean;
};

type FeatureKey = "habits" | "todos" | "studyGoals";

type RecordsStore<T> = {
  [date: DateKey]: {
    [entityId: string]: T;
  };
};

const STORAGE_PREFIX = "grower:records:";
const ENTITIES_PREFIX = "grower:entities:";
const VIEWDATE_KEY = "grower:viewDate:selected";

export const todayKey = () => format(new Date(), "yyyy-MM-dd");
export const dateKey = (d: Date) => format(d, "yyyy-MM-dd");
export const parseDateKey = (key: DateKey) => parseISO(key);
export const startOfIsoWeek = (d = new Date()) => startOfWeek(d, { weekStartsOn: 1 });
export const selectedDateKey = (): DateKey => {
  try {
    const k = localStorage.getItem(VIEWDATE_KEY);
    return k || todayKey();
  } catch {
    return todayKey();
  }
};
export const selectedDate = (): Date => parseDateKey(selectedDateKey());
export const SELECTED_DATE_EVENT = "grower:selectedDateChanged";
export const setSelectedDate = (d: Date) => {
  try {
    localStorage.setItem(VIEWDATE_KEY, dateKey(d));
    window.dispatchEvent(new CustomEvent(SELECTED_DATE_EVENT, { detail: { key: dateKey(d) } }));
  } catch {
    void 0;
  }
};

export const ensureSelectedDateIsToday = () => {
  const today = todayKey();
  const current = selectedDateKey();
  if (current !== today) {
    setSelectedDate(new Date());
    return true;
  }
  return false;
};

export const resetAllProgress = () => {
  try {
    // Global reset clears ONLY progress-related data:
    // - completion records (streaks, task/habit completions)
    // - analytics (weekly reviews, focus history)
    // - selected date (reset to today)
    //
    // PRESERVES all entities (habits, tasks, goals, calendar events)
    // This allows users to start fresh with zero progress while keeping their structure
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      
      // Clear completion records (progress data)
      if (k.startsWith(STORAGE_PREFIX)) keysToRemove.push(k);
      
      // Reset selected date to today
      if (k === VIEWDATE_KEY) keysToRemove.push(k);

      // Clear analytics/auxiliary progress (but NOT entity definitions)
      if (k === "green-home-focus-history") keysToRemove.push(k);
      if (k === "weekly-reviews") keysToRemove.push(k);
      
      // DO NOT clear (preserve all entities):
      // - ENTITIES_PREFIX (habits/tasks/studyGoals/calendar entities)
      // - "green-home-goals" (goals with milestones - these are entities, not progress)
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    setSelectedDate(new Date());
    window.dispatchEvent(new CustomEvent("grower:progressReset"));
  } catch {
    void 0;
  }
};

function readStore<T>(feature: FeatureKey): RecordsStore<T> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + feature);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RecordsStore<T>;
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

function writeStore<T>(feature: FeatureKey, store: RecordsStore<T>) {
  try {
    localStorage.setItem(STORAGE_PREFIX + feature, JSON.stringify(store));
  } catch {
    // ignore write errors
  }
}

export function getDayRecord<T>(feature: FeatureKey, date: DateKey): Record<string, T> {
  const store = readStore<T>(feature);
  return store[date] ?? {};
}

export function getEntityState<T>(feature: FeatureKey, entityId: string, date: DateKey): T | undefined {
  const store = readStore<T>(feature);
  return store[date]?.[entityId];
}

export function setEntityState<T>(feature: FeatureKey, entityId: string, date: DateKey, state: T) {
  const store = readStore<T>(feature);
  const day = store[date] ?? {};
  day[entityId] = state;
  store[date] = day;
  writeStore(feature, store);
}

export function toggleTodayCompleted(feature: FeatureKey, entityId: string) {
  const key = todayKey();
  const current = getEntityState<DailyBooleanState>(feature, entityId, key);
  const next: DailyBooleanState = { completed: !(current?.completed ?? false) };
  setEntityState<DailyBooleanState>(feature, entityId, key, next);
  return next.completed;
}

export function completedOnDate(feature: FeatureKey, entityId: string, date: DateKey) {
  const state = getEntityState<DailyBooleanState>(feature, entityId, date);
  return !!state?.completed;
}

export function weekProgress(feature: FeatureKey, entityId: string): boolean[] {
  const arr: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    arr.push(completedOnDate(feature, entityId, dateKey(d)));
  }
  return arr;
}

export function streakDays(feature: FeatureKey, entityId: string, maxLookback = 365): number {
  let streak = 0;
  for (let i = 0; i < maxLookback; i++) {
    const d = addDays(new Date(), -i);
    if (completedOnDate(feature, entityId, dateKey(d))) streak++;
    else break;
  }
  return streak;
}

// Entities (persistent definitions)
type HabitEntity = {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
};
type TaskEntity = {
  id: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  dueDate?: string;
  hasNotes: boolean;
  hasFiles: boolean;
};
type StudyGoalEntity = {
  id: string;
  title: string;
};

function readEntities<T>(key: FeatureKey): T[] {
  try {
    const raw = localStorage.getItem(ENTITIES_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function writeEntities<T>(key: FeatureKey, items: T[]) {
  try {
    localStorage.setItem(ENTITIES_PREFIX + key, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export const HabitEntities = {
  all: (): HabitEntity[] => readEntities<HabitEntity>("habits"),
  saveAll: (items: HabitEntity[]) => writeEntities<HabitEntity>("habits", items),
};

export const TaskEntities = {
  all: (): TaskEntity[] => readEntities<TaskEntity>("todos"),
  saveAll: (items: TaskEntity[]) => writeEntities<TaskEntity>("todos", items),
};

export const StudyGoalEntities = {
  all: (): StudyGoalEntity[] => readEntities<StudyGoalEntity>("studyGoals"),
  saveAll: (items: StudyGoalEntity[]) => writeEntities<StudyGoalEntity>("studyGoals", items),
};

export type DailyAggregate = {
  dateKey: DateKey;
  totalHabits: number;
  completedHabits: number;
  totalTodos: number;
  completedTodos: number;
};

export function aggregateDay(date: DateKey): DailyAggregate {
  const habits = HabitEntities.all();
  const todos = TaskEntities.all();
  const completedHabits = habits.filter((h) => completedOnDate("habits", h.id, date)).length;
  const completedTodos = todos.filter((t) => completedOnDate("todos", t.id, date)).length;
  return {
    dateKey: date,
    totalHabits: habits.length,
    completedHabits,
    totalTodos: todos.length,
    completedTodos,
  };
}

export function aggregateRange(from: Date, to: Date): DailyAggregate[] {
  const days: DailyAggregate[] = [];
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  for (let i = 0; i <= diffDays; i++) {
    const d = addDays(start, i);
    days.push(aggregateDay(dateKey(d)));
  }
  return days;
}

export function currentWeekAggregates(now = new Date()): DailyAggregate[] {
  const start = startOfIsoWeek(now);
  const end = addDays(start, 6);
  return aggregateRange(start, end);
}

export function currentMonthAggregates(now = new Date()): DailyAggregate[] {
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return aggregateRange(start, end);
}

// ─── Daily Plan (Must-Do + Optional) ────────────────────────────────────────
// Execution-focused: 1 Must-Do, up to 2 Optional per day.
// Used for "One Win" dashboard model.

export type DailyPlanItem = { type: "habit" | "task"; id: string };

export type DailyPlan = {
  mustDo: DailyPlanItem | null;
  optional: DailyPlanItem[];
};

const DAILY_PLAN_KEY = "grower:daily-plan";

function readDailyPlans(): Record<string, DailyPlan> {
  try {
    const raw = localStorage.getItem(DAILY_PLAN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DailyPlan>;
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

function writeDailyPlans(plans: Record<string, DailyPlan>) {
  try {
    localStorage.setItem(DAILY_PLAN_KEY, JSON.stringify(plans));
  } catch {
    void 0;
  }
}

export function getDailyPlan(dateKey: DateKey): DailyPlan {
  const plans = readDailyPlans();
  const p = plans[dateKey];
  if (!p) return { mustDo: null, optional: [] };
  return {
    mustDo: p.mustDo ?? null,
    optional: Array.isArray(p.optional) ? p.optional.slice(0, 2) : [],
  };
}

export function setDailyPlan(dateKey: DateKey, plan: Partial<DailyPlan>) {
  const plans = readDailyPlans();
  const current = plans[dateKey] ?? { mustDo: null, optional: [] };
  const next: DailyPlan = {
    mustDo: plan.mustDo !== undefined ? plan.mustDo : current.mustDo,
    optional: plan.optional !== undefined ? plan.optional.slice(0, 2) : current.optional,
  };
  plans[dateKey] = next;
  writeDailyPlans(plans);
}

// ─── Analytics (for Weekly Review only) ──────────────────────────────────────

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun=0 … Sat=6

export function habitConsistencyByDayOfWeek(): { day: string; pct: number; label: string }[] {
  const habits = HabitEntities.all();
  if (habits.length === 0) return [];
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totals: number[] = Array(7).fill(0);
  const completed: number[] = Array(7).fill(0);
  const lookback = 56; // ~8 weeks
  for (let i = 0; i < lookback; i++) {
    const d = addDays(new Date(), -i);
    const dow = d.getDay() as DayOfWeek;
    const key = dateKey(d);
    habits.forEach((h) => {
      totals[dow]++;
      if (completedOnDate("habits", h.id, key)) completed[dow]++;
    });
  }
  return labels.map((label, dow) => {
    const t = totals[dow] || 1;
    const pct = Math.round((completed[dow] / t) * 100);
    return { day: label, pct, label };
  });
}

export function bestHabitByStreak(): { id: string; name: string; streak: number } | null {
  const habits = HabitEntities.all();
  if (habits.length === 0) return null;
  let best: { id: string; name: string; streak: number } | null = null;
  habits.forEach((h) => {
    const s = streakDays("habits", h.id);
    if (!best || s > best.streak) best = { id: h.id, name: h.name, streak: s };
  });
  return best;
}

export function lowestConsistencyDay(): { day: string; pct: number } | null {
  const byDay = habitConsistencyByDayOfWeek();
  if (byDay.length === 0) return null;
  const lowest = byDay.reduce((acc, d) => (d.pct < acc.pct ? d : acc), byDay[0]);
  return { day: lowest.day, pct: lowest.pct };
}

export function bestConsistencyDay(): { day: string; pct: number } | null {
  const byDay = habitConsistencyByDayOfWeek();
  if (byDay.length === 0) return null;
  const best = byDay.reduce((acc, d) => (d.pct > acc.pct ? d : acc), byDay[0]);
  return { day: best.day, pct: best.pct };
}
