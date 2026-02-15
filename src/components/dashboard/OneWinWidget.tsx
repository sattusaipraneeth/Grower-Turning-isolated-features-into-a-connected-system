import { Target, Check, Sparkles, ListTodo, Plus, ChevronDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  HabitEntities,
  TaskEntities,
  completedOnDate,
  selectedDateKey,
  getEntityState,
  setEntityState,
  DailyBooleanState,
  getDailyPlan,
  setDailyPlan,
  DailyPlanItem,
  SELECTED_DATE_EVENT,
} from "@/lib/timeState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PlanItem = DailyPlanItem & { label: string };

function resolveLabel(item: DailyPlanItem): string {
  if (item.type === "habit") {
    const h = HabitEntities.all().find((x) => x.id === item.id);
    return h?.name ?? "Unknown habit";
  }
  const t = TaskEntities.all().find((x) => x.id === item.id);
  return t?.title ?? "Unknown task";
}

function toggleCompleted(item: DailyPlanItem, key: string) {
  const feature = item.type === "habit" ? "habits" : "todos";
  const current = getEntityState<DailyBooleanState>(feature, item.id, key);
  const next: DailyBooleanState = { completed: !(current?.completed ?? false) };
  setEntityState<DailyBooleanState>(feature, item.id, key, next);
}

function isCompleted(item: DailyPlanItem, key: string): boolean {
  const feature = item.type === "habit" ? "habits" : "todos";
  return completedOnDate(feature, item.id, key);
}

export function OneWinWidget() {
  const [key, setKey] = useState<string>(selectedDateKey());
  const [tick, setTick] = useState(0);
  const [pickDialogOpen, setPickDialogOpen] = useState(false);
  const [pickMode, setPickMode] = useState<"mustDo" | "optional">("mustDo");

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

  const plan = useMemo(() => getDailyPlan(key), [key, tick]);
  const habits = useMemo(() => HabitEntities.all(), [tick]);
  const tasks = useMemo(() => TaskEntities.all(), [tick]);

  const mustDoItem: PlanItem | null = plan.mustDo
    ? { ...plan.mustDo, label: resolveLabel(plan.mustDo) }
    : null;
  const optionalItems: PlanItem[] = plan.optional.map((o) => ({ ...o, label: resolveLabel(o) }));

  const mustDoDone = mustDoItem ? isCompleted(mustDoItem, key) : false;
  const daySuccessful = mustDoDone;

  const refresh = () => setTick((t) => t + 1);

  const setMustDo = (item: DailyPlanItem | null) => {
    setDailyPlan(key, { mustDo: item });
    refresh();
  };

  const setOptional = (items: DailyPlanItem[]) => {
    setDailyPlan(key, { optional: items.slice(0, 2) });
    refresh();
  };

  const addOptional = (item: DailyPlanItem) => {
    if (optionalItems.some((o) => o.type === item.type && o.id === item.id)) return;
    if (optionalItems.length >= 2) return;
    setOptional([...optionalItems, item]);
    setPickDialogOpen(false);
  };

  const removeOptional = (index: number) => {
    setOptional(optionalItems.filter((_, i) => i !== index));
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Today&apos;s One Win</h2>
        </div>
        {daySuccessful && (
          <span className="text-sm font-medium text-leaf flex items-center gap-1">
            <Check className="w-4 h-4" />
            Day successful
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Complete your Must-Do and the day counts as successful. Optionals are bonus.
      </p>

      {/* Must-Do */}
      <div className="mb-6">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Must-Do (non-negotiable)
        </label>
        {mustDoItem ? (
          <div
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
              mustDoDone
                ? "border-leaf/50 bg-leaf/10"
                : "border-primary/40 bg-primary/5 hover:border-primary/60"
            )}
          >
            <button
              onClick={() => {
                toggleCompleted(mustDoItem, key);
                refresh();
              }}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                mustDoDone
                  ? "bg-leaf text-primary-foreground"
                  : "bg-muted hover:bg-primary/20"
              )}
            >
              {mustDoDone ? <Check className="w-5 h-5" /> : null}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                {mustDoItem.type === "habit" ? (
                  <Sparkles className="w-3.5 h-3.5" />
                ) : (
                  <ListTodo className="w-3.5 h-3.5" />
                )}
                {mustDoItem.type === "habit" ? "Habit" : "Task"}
              </div>
              <p className={cn("font-semibold text-foreground", mustDoDone && "line-through")}>
                {mustDoItem.label}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setPickMode("mustDo"); setPickDialogOpen(true); }}>
                  Change Must-Do
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMustDo(null)} className="text-destructive">
                  Clear Must-Do
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <button
            onClick={() => { setPickMode("mustDo"); setPickDialogOpen(true); }}
            className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Set your Must-Do for today</span>
          </button>
        )}
      </div>

      {/* Optional (up to 2) */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Optional (bonus)
        </label>
        <div className="space-y-2">
          {optionalItems.map((item, idx) => (
            <div
              key={`${item.type}-${item.id}`}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                isCompleted(item, key)
                  ? "border-leaf/30 bg-leaf/5 opacity-75"
                  : "border-border/50 bg-card/50"
              )}
            >
              <button
                onClick={() => {
                  toggleCompleted(item, key);
                  refresh();
                }}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  isCompleted(item, key) ? "bg-leaf text-primary-foreground" : "bg-muted hover:bg-muted/80"
                )}
              >
                {isCompleted(item, key) && <Check className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium text-foreground",
                    isCompleted(item, key) && "line-through"
                  )}
                >
                  {item.label}
                </p>
              </div>
              <button
                onClick={() => removeOptional(idx)}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
          {optionalItems.length < 2 && (
            <button
              onClick={() => { setPickMode("optional"); setPickDialogOpen(true); }}
              className="w-full p-3 rounded-xl border border-dashed border-border hover:border-primary/50 flex items-center justify-center gap-2 text-muted-foreground hover:text-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              Add optional
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2 text-xs">
        <Link to="/todos" className="text-primary hover:underline">
          To-Do List →
        </Link>
        <Link to="/habits" className="text-primary hover:underline">
          Habits →
        </Link>
        <Link to="/focus" className="text-primary hover:underline">
          Focus Mode →
        </Link>
      </div>

      <PickMustDoDialog
        open={pickDialogOpen}
        onOpenChange={setPickDialogOpen}
        habits={habits}
        tasks={tasks}
        initialMode={pickMode}
        onPickMustDo={(item) => {
          setMustDo(item);
          setPickDialogOpen(false);
        }}
        onPickOptional={addOptional}
        currentMustDo={plan.mustDo}
        currentOptional={plan.optional}
      />
    </div>
  );
}

type PickMode = "mustDo" | "optional";

function PickMustDoDialog({
  open,
  onOpenChange,
  habits,
  tasks,
  initialMode = "mustDo",
  onPickMustDo,
  onPickOptional,
  currentMustDo,
  currentOptional,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  habits: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
  initialMode?: PickMode;
  onPickMustDo: (item: DailyPlanItem) => void;
  onPickOptional: (item: DailyPlanItem) => void;
  currentMustDo: DailyPlanItem | null;
  currentOptional: DailyPlanItem[];
}) {
  const [mode, setMode] = useState<PickMode>(initialMode);

  // Reset mode when dialog opens
  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  const isSelected = (type: "habit" | "task", id: string) => {
    if (mode === "mustDo" && currentMustDo) return currentMustDo.type === type && currentMustDo.id === id;
    return currentOptional.some((o) => o.type === type && o.id === id);
  };

  const canAddOptional = currentOptional.length < 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Must-Do or Optional</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "mustDo" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("mustDo")}
          >
            Must-Do
          </Button>
          <Button
            variant={mode === "optional" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("optional")}
            disabled={!canAddOptional}
          >
            Optional
          </Button>
        </div>

        <div className="space-y-4 max-h-64 overflow-y-auto">
          {habits.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Habits</h3>
              <div className="space-y-1">
                {habits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() =>
                      mode === "mustDo" ? onPickMustDo({ type: "habit", id: h.id }) : onPickOptional({ type: "habit", id: h.id })
                    }
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      isSelected("habit", h.id) ? "bg-primary/20 text-primary" : "hover:bg-muted"
                    )}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tasks.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Tasks</h3>
              <div className="space-y-1">
                {tasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() =>
                      mode === "mustDo" ? onPickMustDo({ type: "task", id: t.id }) : onPickOptional({ type: "task", id: t.id })
                    }
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      isSelected("task", t.id) ? "bg-primary/20 text-primary" : "hover:bg-muted"
                    )}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          {habits.length === 0 && tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">Add habits or tasks first.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
