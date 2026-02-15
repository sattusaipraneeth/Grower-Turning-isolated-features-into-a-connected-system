import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Sparkles, TrendingUp, Check, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import { dateKey, selectedDate, HabitEntities, completedOnDate, weekProgress, streakDays, getEntityState, setEntityState, DailyBooleanState, SELECTED_DATE_EVENT } from "@/lib/timeState";
import { addDays } from "date-fns";

interface HabitEntity {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
}

const HABIT_CATEGORIES = ["Mind", "Health", "Wellness", "Fitness", "Work/Study","Other"];
const HABIT_COLORS = [
  { value: "from-primary to-moss", label: "Primary / Moss" },
  { value: "from-sage-light to-leaf", label: "Sage / Leaf" },
  { value: "from-amber to-amber-glow", label: "Amber" },
  { value: "from-moss to-sage-dark", label: "Moss / Sage" },
  { value: "from-sage to-forest", label: "Sage / Forest" },
  { value: "from-leaf to-primary", label: "Leaf / Primary" },
];

const Habits = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [habits, setHabits] = useState<HabitEntity[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("Mind");
  const [newColor, setNewColor] = useState("from-primary to-moss");
  const [viewDate, setViewDate] = useState<Date>(selectedDate());
  const viewDateKey = dateKey(viewDate);

  useEffect(() => {
    setHabits(HabitEntities.all());
    if ((location.state as { openAdd?: boolean })?.openAdd) {
      setEditId(null);
      setAddDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  useEffect(() => {
    setViewDate(selectedDate());
    const onDate = () => setViewDate(selectedDate());
    const onReset = () => {
      setHabits(HabitEntities.all());
      setViewDate(new Date(viewDate));
    };
    window.addEventListener(SELECTED_DATE_EVENT, onDate);
    window.addEventListener("grower:progressReset", onReset);
    return () => {
      window.removeEventListener(SELECTED_DATE_EVENT, onDate);
      window.removeEventListener("grower:progressReset", onReset);
    };
  }, [location.pathname, viewDate]);

  const categories = [...new Set(habits.map(h => h.category))];

  const openEdit = (habit: HabitEntity) => {
    setEditId(habit.id);
    setNewName(habit.name);
    setNewDescription(habit.description);
    setNewCategory(habit.category);
    setNewColor(habit.color);
    setAddDialogOpen(true);
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (editId) {
      const updated = habits.map(h =>
        h.id === editId
          ? { ...h, name: newName.trim(), description: newDescription.trim() || "No description", category: newCategory, color: newColor }
          : h
      );
      setHabits(updated);
      HabitEntities.saveAll(updated);
    } else {
      const newHabit: HabitEntity = {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        name: newName.trim(),
        description: newDescription.trim() || "No description",
        category: newCategory,
        color: newColor,
      };
      const next = [...habits, newHabit];
      setHabits(next);
      HabitEntities.saveAll(next);
    }
    setEditId(null);
    setNewName("");
    setNewDescription("");
    setNewCategory("Mind");
    setNewColor("from-primary to-moss");
    setAddDialogOpen(false);
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const habitToDelete = deleteId ? habits.find((h) => h.id === deleteId) : null;

  const toggleHabit = (id: string) => {
    const current = getEntityState<DailyBooleanState>("habits", id, viewDateKey);
    const next: DailyBooleanState = { completed: !(current?.completed ?? false) };
    setEntityState<DailyBooleanState>("habits", id, viewDateKey, next);
    setHabits([...habits]);
  };

  const deleteHabit = (id: string) => {
    const next = habits.filter((h) => h.id !== id);
    setHabits(next);
    HabitEntities.saveAll(next);
    setDeleteId(null);
  };

  const completedCount = habits.filter(h => completedOnDate("habits", h.id, viewDateKey)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Habits
          </h1>
          <p className="text-muted-foreground mt-1">Build consistency, grow daily</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/calendar")}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            {viewDate.toLocaleDateString()}
          </button>
          <button
            onClick={() => { setEditId(null); setAddDialogOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Habit
          </button>
        </div>
      </div>

      {/* New / Edit Habit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) setEditId(null); setAddDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Habit" : "New Habit"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddHabit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="habit-name">Name</Label>
              <Input
                id="habit-name"
                placeholder="e.g. Morning Meditation"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="habit-desc">Description (optional)</Label>
              <Input
                id="habit-desc"
                placeholder="e.g. 10 minutes mindfulness"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HABIT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={newColor} onValueChange={setNewColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HABIT_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editId ? "Save" : "Add Habit"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-primary">{completedCount}/{habits.length}</p>
          <p className="text-sm text-muted-foreground">{viewDateKey === dateKey(new Date()) ? "Today" : viewDateKey}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-amber">
            {habits.length ? Math.max(...habits.map(h => streakDays("habits", h.id))) : 0}
          </p>
          <p className="text-sm text-muted-foreground">Best Streak</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-leaf">
            {(() => {
              const last7Totals = Array.from({ length: 7 }, (_, i) => {
                const d = addDays(new Date(), -(6 - i));
                const key = dateKey(d);
                const completed = habits.filter(h => completedOnDate("habits", h.id, key)).length;
                return habits.length ? Math.round((completed / habits.length) * 100) : 0;
              });
              return last7Totals[6] ?? 0;
            })()}%
          </p>
          <p className="text-sm text-muted-foreground">This Week</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-moss">
            {(() => {
              const storeDays = new Set<string>();
              for (let i = 0; i < 365; i++) {
                const dk = dateKey(addDays(new Date(), -i));
                if (habits.some(h => completedOnDate("habits", h.id, dk))) storeDays.add(dk);
              }
              return storeDays.size;
            })()}
          </p>
          <p className="text-sm text-muted-foreground">Total Days</p>
        </div>
      </div>

      {/* Habits by Category */}
      {categories.map(category => (
        <div key={category} className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {category}
          </h2>
          <div className="grid gap-3">
            {habits.filter(h => h.category === category).map((habit) => (
              <div
                key={habit.id}
                className="glass-card-hover p-4 flex items-center gap-4"
              >
                {/* Toggle Button */}
                <button
                  onClick={() => toggleHabit(habit.id)}
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                    completedOnDate("habits", habit.id, viewDateKey)
                      ? `bg-gradient-to-br ${habit.color} shadow-glow`
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {completedOnDate("habits", habit.id, viewDateKey) ? (
                    <Check className="w-6 h-6 text-primary-foreground" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/40" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{habit.name}</h3>
                  <p className="text-sm text-muted-foreground">{habit.description}</p>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    <span>
                      Longest streak: {streakDays("habits", habit.id)} • {(() => {
                        const last7 = weekProgress("habits", habit.id);
                        return last7[5] === false || last7[6] === false ? "Failures mostly on weekends" : "Steady during weekends";
                      })()}
                    </span>
                  </div>
                </div>

                {/* Week Progress */}
                <div className="hidden md:flex items-center gap-1">
                  {weekProgress("habits", habit.id).map((completed, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium",
                        completed
                          ? `bg-gradient-to-br ${habit.color} text-primary-foreground`
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                    </div>
                  ))}
                </div>

                {/* Streak */}
                <div className="streak-badge">
                  🔥 {streakDays("habits", habit.id)}
                </div>

                {/* Edit & Delete */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openEdit(habit as HabitEntity); }}
                  className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label="Edit habit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDeleteId(habit.id); }}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete habit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete habit?</AlertDialogTitle>
            <AlertDialogDescription>
              {habitToDelete ? `"${habitToDelete.name}" will be removed. This cannot be undone.` : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteHabit(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Habits;
