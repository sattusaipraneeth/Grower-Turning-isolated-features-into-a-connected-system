import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotesWidget } from "@/components/dashboard/NotesWidget";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { OneWinWidget } from "@/components/dashboard/OneWinWidget";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { HabitsWidget } from "@/components/dashboard/HabitsWidget";
import { TasksWidget } from "@/components/dashboard/TasksWidget";
import { StreakWidget } from "@/components/dashboard/StreakWidget";
import { PriorityWidget } from "@/components/dashboard/PriorityWidget";
import { useDensity } from "@/hooks/useDensity";
import {
  HabitEntities,
  TaskEntities,
  completedOnDate,
  selectedDateKey,
  weekProgress,
  parseDateKey,
  SELECTED_DATE_EVENT,
} from "@/lib/timeState";

const INSIGHTS_VISIBLE_KEY = "grower:dashboard:insightsVisible";

const Dashboard = () => {
  const { density } = useDensity();
  const [insightsVisible, setInsightsVisible] = useState(() => {
    try {
      const v = localStorage.getItem(INSIGHTS_VISIBLE_KEY);
      return v !== "false";
    } catch {
      return true;
    }
  });
  const [key, setKey] = useState(selectedDateKey());
  const [entitiesTick, setEntitiesTick] = useState(0);

  useEffect(() => {
    const handler = () => {
      setKey(selectedDateKey());
      setEntitiesTick((t) => t + 1);
    };
    window.addEventListener(SELECTED_DATE_EVENT, handler);
    window.addEventListener("grower:progressReset", handler);
    window.addEventListener("grower:calendarUpdated", handler);
    window.addEventListener("grower:notesUpdated", handler);
    return () => {
      window.removeEventListener(SELECTED_DATE_EVENT, handler);
      window.removeEventListener("grower:progressReset", handler);
      window.removeEventListener("grower:calendarUpdated", handler);
      window.removeEventListener("grower:notesUpdated", handler);
    };
  }, []);

  const toggleInsights = () => {
    const next = !insightsVisible;
    setInsightsVisible(next);
    try {
      localStorage.setItem(INSIGHTS_VISIBLE_KEY, String(next));
    } catch {
      void 0;
    }
  };

  const habits = useMemo(() => HabitEntities.all(), [entitiesTick]);
  const tasks = useMemo(() => TaskEntities.all(), [entitiesTick]);

  const habitsCompleted = habits.filter((h) => completedOnDate("habits", h.id, key)).length;
  const habitsTotal = habits.length || 1;
  const habitsPct = Math.round((habitsCompleted / habitsTotal) * 100);

  const tasksCompleted = tasks.filter((t) => completedOnDate("todos", t.id, key)).length;
  const tasksTotal = tasks.length || 1;
  const tasksPct = Math.round((tasksCompleted / tasksTotal) * 100);

  const weeklyMomentumPct =
    habits.length === 0
      ? 0
      : Math.round(
          (habits.reduce((sum, h) => sum + weekProgress("habits", h.id).filter(Boolean).length, 0) /
            (habits.length * 7)) *
            100
        );

  const focusMinutesSelectedDay = (() => {
    try {
      const raw = localStorage.getItem("green-home-focus-history");
      if (!raw) return 0;
      const sessions = JSON.parse(raw) as Array<{
        mode: "work" | "break";
        startedAt: number;
        durationSec: number;
      }>;
      const d = parseDateKey(key);
      const sod = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const eod = sod + 24 * 60 * 60 * 1000;
      return Math.round(
        sessions
          .filter((s) => s.mode === "work" && s.startedAt >= sod && s.startedAt < eod)
          .reduce((sum, s) => sum + (s.durationSec || 0), 0) / 60
      );
    } catch {
      return 0;
    }
  })();
  const focusTargetMinutes = 120;
  const focusPct = Math.max(0, Math.min(100, Math.round((focusMinutesSelectedDay / focusTargetMinutes) * 100)));

  const eventsCountForSelectedDay = (() => {
    try {
      const raw = localStorage.getItem("grower:entities:calendar");
      if (!raw) return 0;
      const arr = JSON.parse(raw) as Array<{
        date: string;
        id: string;
        title: string;
        time: string;
        type: string;
        color: string;
      }>;
      const d = parseDateKey(key);
      return arr.filter((ev) => {
        const ed = new Date(ev.date);
        return (
          ed.getFullYear() === d.getFullYear() &&
          ed.getMonth() === d.getMonth() &&
          ed.getDate() === d.getDate()
        );
      }).length;
    } catch {
      return 0;
    }
  })();

  return (
    <div className={density === "compact" ? "space-y-4 animate-fade-in" : "space-y-6 animate-fade-in"}>
      <GreetingHeader />

      <OneWinWidget />

      <div
        className={
          density === "compact"
            ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
            : "grid grid-cols-1 lg:grid-cols-2 gap-6"
        }
      >
        <CalendarWidget />
        <NotesWidget />
      </div>

      {/* Collapsible insights & widgets — below Calendar and Notes */}
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleInsights}
          className="flex items-center gap-2"
        >
          {insightsVisible ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide insights & widgets
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show insights & widgets
            </>
          )}
        </Button>

        {insightsVisible && (
          <div className={density === "compact" ? "space-y-4" : "space-y-6"}>
            {/* Life Score + Top Stats */}
            <div
              className={
                density === "compact"
                  ? "grid grid-cols-1 md:grid-cols-6 gap-3"
                  : "grid grid-cols-1 md:grid-cols-6 gap-4"
              }
            >
              <div
                className={
                  density === "compact"
                    ? "glass-card p-3 flex items-center gap-3"
                    : "glass-card p-4 flex items-center gap-3"
                }
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-moss flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">System Health</p>
                  <p className="font-semibold text-foreground">{habitsPct}/100</p>
                </div>
              </div>
              <ProgressCard
                title="Today's Progress"
                value={habitsPct}
                subtitle={`${habitsCompleted} of ${habitsTotal} habits done`}
                icon="chart"
              />
              <ProgressCard
                title="Weekly Streak"
                value={weeklyMomentumPct}
                subtitle="Momentum this week"
                icon="flame"
              />
              <ProgressCard
                title="Tasks Complete"
                value={tasksPct}
                subtitle={`${tasksCompleted} of ${tasksTotal} tasks`}
                icon="check"
              />
              <ProgressCard
                title="Focus Time"
                value={focusPct}
                subtitle={`${focusMinutesSelectedDay}m on selected date`}
                icon="timer"
              />
              <ProgressCard
                title="Events"
                value={Math.min(100, eventsCountForSelectedDay)}
                subtitle={`${eventsCountForSelectedDay} on selected date`}
                icon="calendar"
              />
            </div>

            <PriorityWidget />

            <div
              className={
                density === "compact"
                  ? "grid grid-cols-1 lg:grid-cols-3 gap-4"
                  : "grid grid-cols-1 lg:grid-cols-3 gap-6"
              }
            >
              <div className={density === "compact" ? "lg:col-span-2 space-y-4" : "lg:col-span-2 space-y-6"}>
                <HabitsWidget />
                <TasksWidget />
              </div>
              <div className={density === "compact" ? "space-y-4" : "space-y-6"}>
                <StreakWidget />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
