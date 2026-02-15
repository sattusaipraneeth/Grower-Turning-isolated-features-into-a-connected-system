import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Target, Plus, ChevronRight, Check, Trash2, Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  deadline: string;
  milestones: Milestone[];
  color: string;
}

const STORAGE_KEY = "green-home-goals";

const goalsData: Goal[] = [
  {
    id: "1",
    title: "Run a Marathon",
    description: "Complete a full 42km marathon by end of year",
    progress: 45,
    deadline: "Dec 2025",
    milestones: [
      { id: "1a", title: "Run 5K", completed: true },
      { id: "1b", title: "Run 10K", completed: true },
      { id: "1c", title: "Run Half Marathon", completed: false },
      { id: "1d", title: "Run Full Marathon", completed: false },
    ],
    color: "from-primary to-moss"
  },
  {
    id: "2",
    title: "Read 24 Books",
    description: "Read 2 books per month this year",
    progress: 67,
    deadline: "Dec 2025",
    milestones: [
      { id: "2a", title: "Books 1-6", completed: true },
      { id: "2b", title: "Books 7-12", completed: true },
      { id: "2c", title: "Books 13-18", completed: true },
      { id: "2d", title: "Books 19-24", completed: false },
    ],
    color: "from-amber to-amber-glow"
  },
  {
    id: "3",
    title: "Learn Japanese",
    description: "Reach N3 proficiency level",
    progress: 30,
    deadline: "Jun 2026",
    milestones: [
      { id: "3a", title: "Complete Hiragana", completed: true },
      { id: "3b", title: "Complete Katakana", completed: true },
      { id: "3c", title: "Learn 500 Kanji", completed: false },
      { id: "3d", title: "Pass N3 Exam", completed: false },
    ],
    color: "from-leaf to-sage-light"
  },
];

const GOAL_COLORS = [
  { value: "from-primary to-moss", label: "Primary / Moss" },
  { value: "from-amber to-amber-glow", label: "Amber" },
  { value: "from-leaf to-sage-light", label: "Leaf / Sage" },
  { value: "from-sage-light to-leaf", label: "Sage / Leaf" },
  { value: "from-moss to-sage-dark", label: "Moss / Sage" },
];

const Goals = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [goals, setGoals] = useState(goalsData);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newColor, setNewColor] = useState("from-primary to-moss");
  const [newMilestonesText, setNewMilestonesText] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Goal[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGoals(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch {
      // ignore
    }
  }, [goals]);

  useEffect(() => {
    if ((location.state as { openAdd?: boolean })?.openAdd) {
      setEditGoalId(null);
      setAddDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const openEditGoal = (goal: Goal) => {
    setEditGoalId(goal.id);
    setNewTitle(goal.title);
    setNewDescription(goal.description);
    setNewDeadline(goal.deadline);
    setNewColor(goal.color);
    setNewMilestonesText(goal.milestones.map((m) => m.title).join("\n"));
    setAddDialogOpen(true);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const milestoneLines = newMilestonesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const milestones: Milestone[] = milestoneLines.map((title, i) => ({
      id: `${Date.now()}-m${i}`,
      title,
      completed: false,
    }));
    if (editGoalId) {
      const existing = goals.find((g) => g.id === editGoalId);
      if (existing) {
        const completedByTitle = new Map(existing.milestones.map((m) => [m.title, m.completed]));
        const merged: Milestone[] = milestoneLines.map((title, i) => ({
          id: `${Date.now()}-m${i}`,
          title,
          completed: completedByTitle.get(title) ?? false,
        }));
        const completedCount = merged.filter((m) => m.completed).length;
        const progress = merged.length ? Math.round((completedCount / merged.length) * 100) : 0;
        setGoals(goals.map((g) =>
          g.id === editGoalId
            ? { ...g, title: newTitle.trim(), description: newDescription.trim() || "No description", deadline: newDeadline.trim() || "No deadline", color: newColor, milestones: merged.length ? merged : g.milestones, progress }
            : g
        ));
      }
    } else {
      const progress = 0;
      const newGoal: Goal = {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        title: newTitle.trim(),
        description: newDescription.trim() || "No description",
        progress,
        deadline: newDeadline.trim() || "No deadline",
        milestones: milestones.length ? milestones : [{ id: `${Date.now()}-m0`, title: "Get started", completed: false }],
        color: newColor,
      };
      setGoals([...goals, newGoal]);
    }
    setEditGoalId(null);
    setNewTitle("");
    setNewDescription("");
    setNewDeadline("");
    setNewColor("from-primary to-moss");
    setNewMilestonesText("");
    setAddDialogOpen(false);
  };

  const toggleMilestone = (goalId: string, milestoneId: string) => {
    setGoals(goals.map((g) => {
      if (g.id !== goalId) return g;
      const milestones = g.milestones.map((m) =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      );
      const completedCount = milestones.filter((m) => m.completed).length;
      const progress = milestones.length ? Math.round((completedCount / milestones.length) * 100) : 0;
      return { ...g, milestones, progress };
    }));
  };

  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const goalToDelete = deleteGoalId ? goals.find((g) => g.id === deleteGoalId) : null;
  const deleteGoal = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id));
    setDeleteGoalId(null);
    setExpandedGoal((prev) => (prev === id ? null : prev));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Goals & Milestones
          </h1>
          <p className="text-muted-foreground mt-1">Dream big, track progress</p>
        </div>
        <button
          onClick={() => setAddDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* New Goal Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) setEditGoalId(null); setAddDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editGoalId ? "Edit Goal" : "New Goal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddGoal} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Title</Label>
              <Input
                id="goal-title"
                placeholder="e.g. Run a Marathon"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-desc">Description (optional)</Label>
              <Input
                id="goal-desc"
                placeholder="e.g. Complete a full 42km by end of year"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline">Deadline (optional)</Label>
              <Input
                id="goal-deadline"
                placeholder="e.g. Dec 2025"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={newColor} onValueChange={setNewColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-milestones">Milestones (optional, one per line)</Label>
              <Textarea
                id="goal-milestones"
                placeholder="Run 5K&#10;Run 10K&#10;Run Half Marathon"
                value={newMilestonesText}
                onChange={(e) => setNewMilestonesText(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editGoalId ? "Save" : "Add Goal"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Goals Grid */}
      <div className="grid gap-4">
        {goals.map((goal) => {
          const completedMilestones = goal.milestones.filter(m => m.completed).length;
          const isExpanded = expandedGoal === goal.id;

          return (
            <div key={goal.id} className="glass-card overflow-hidden">
              {/* Goal Header */}
              <button
                onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                className="w-full p-5 text-left flex items-center gap-4"
              >
                <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center", goal.color)}>
                  <Target className="w-7 h-7 text-primary-foreground" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground">{goal.title}</h3>
                  <p className="text-sm text-muted-foreground">{goal.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {completedMilestones}/{goal.milestones.length} milestones
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Due: {goal.deadline}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">{goal.progress}%</span>
                  <div className="w-24 h-2 bg-muted rounded-full mt-2">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r", goal.color)}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openEditGoal(goal); }}
                  className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                  aria-label="Edit goal"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDeleteGoalId(goal.id); }}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  aria-label="Delete goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform flex-shrink-0",
                  isExpanded && "rotate-90"
                )} />
              </button>

              {/* Milestones */}
              {isExpanded && (
                <div className="border-t border-border px-5 py-4 bg-muted/30 animate-fade-in">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Milestones</h4>
                  <div className="space-y-2">
                    {goal.milestones.map((milestone) => (
                      <button
                        key={milestone.id}
                        type="button"
                        onClick={() => toggleMilestone(goal.id, milestone.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors",
                          milestone.completed ? "bg-primary/10" : "bg-card/50 hover:bg-card/80"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                          milestone.completed
                            ? "bg-primary text-primary-foreground"
                            : "border-2 border-muted-foreground/30"
                        )}>
                          {milestone.completed && <Check className="w-4 h-4" />}
                        </div>
                        <span className={cn(
                          "font-medium text-sm",
                          milestone.completed ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {milestone.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={(open) => !open && setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>
              {goalToDelete ? `"${goalToDelete.title}" and all its milestones will be removed. This cannot be undone.` : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteGoalId && deleteGoal(deleteGoalId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Goals;
