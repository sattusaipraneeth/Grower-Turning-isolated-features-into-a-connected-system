import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ListTodo, Plus, Check, Clock, AlertCircle, Calendar as CalendarIcon, Paperclip, Trash2, Pencil } from "lucide-react";
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
import { dateKey, selectedDate, TaskEntities, completedOnDate, getEntityState, setEntityState, DailyBooleanState, SELECTED_DATE_EVENT } from "@/lib/timeState";
import { addDays } from "date-fns";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  dueDate?: string;
  hasNotes: boolean;
  hasFiles: boolean;
}

const priorityConfig = {
  high: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", icon: AlertCircle },
  medium: { color: "text-amber", bg: "bg-amber/10", border: "border-amber/30", icon: Clock },
  low: { color: "text-muted-foreground", bg: "bg-muted", border: "border-border", icon: ListTodo },
};

const Todos = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [viewDate, setViewDate] = useState<Date>(selectedDate());
  const viewDateKey = dateKey(viewDate);

  useEffect(() => {
    const saved = TaskEntities.all();
    setTasks(saved);
  }, []);
  useEffect(() => {
    TaskEntities.saveAll(tasks);
  }, [tasks]);

  useEffect(() => {
    if ((location.state as { openAdd?: boolean })?.openAdd) {
      setEditTaskId(null);
      setAddDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  useEffect(() => {
    setViewDate(selectedDate());
    const onDate = () => setViewDate(selectedDate());
    const onReset = () => {
      setTasks(TaskEntities.all());
      setFilter("all");
      setViewDate(new Date(viewDate));
    };
    window.addEventListener(SELECTED_DATE_EVENT, onDate);
    window.addEventListener("grower:progressReset", onReset);
    return () => {
      window.removeEventListener(SELECTED_DATE_EVENT, onDate);
      window.removeEventListener("grower:progressReset", onReset);
    };
  }, [location.pathname, viewDate]);

  const openEditTask = (task: Task) => {
    setEditTaskId(task.id);
    setNewTitle(task.title);
    setNewDescription(task.description || "");
    setNewPriority(task.priority);
    setNewDueDate(task.dueDate || "");
    setAddDialogOpen(true);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (editTaskId) {
      setTasks(tasks.map(t =>
        t.id === editTaskId
          ? { ...t, title: newTitle.trim(), description: newDescription.trim() || undefined, priority: newPriority, dueDate: newDueDate.trim() || undefined }
          : t
      ));
    } else {
      const newTask: Task = {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        priority: newPriority,
        dueDate: newDueDate.trim() || undefined,
        hasNotes: false,
        hasFiles: false,
      };
      setTasks([...tasks, newTask]);
    }
    setEditTaskId(null);
    setNewTitle("");
    setNewDescription("");
    setNewPriority("medium");
    setNewDueDate("");
    setAddDialogOpen(false);
  };

  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const taskToDelete = deleteTaskId ? tasks.find((t) => t.id === deleteTaskId) : null;

  const toggleTask = (id: string) => {
    const current = getEntityState<DailyBooleanState>("todos", id, viewDateKey);
    const next: DailyBooleanState = { completed: !(current?.completed ?? false) };
    setEntityState<DailyBooleanState>("todos", id, viewDateKey, next);
    setTasks([...tasks]);
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
    setDeleteTaskId(null);
  };

  const filteredTasks = tasks.filter(t => {
    const completed = completedOnDate("todos", t.id, viewDateKey);
    if (filter === "active") return !completed;
    if (filter === "completed") return completed;
    return true;
  });

  const activeTasks = tasks.filter(t => !completedOnDate("todos", t.id, viewDateKey));
  const completedTasks = tasks.filter(t => completedOnDate("todos", t.id, viewDateKey));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-primary" />
            To-Do List
          </h1>
          <p className="text-muted-foreground mt-1">{activeTasks.length} tasks remaining</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/calendar")}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
          >
            <ListTodo className="w-4 h-4 text-muted-foreground" />
            {viewDate.toLocaleDateString()}
          </button>
          <button
            onClick={() => { setEditTaskId(null); setAddDialogOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Add / Edit Task Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) setEditTaskId(null); setAddDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTaskId ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                placeholder="e.g. Review project proposal"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description (optional)</Label>
              <Textarea
                id="task-desc"
                placeholder="Add details..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as "high" | "medium" | "low")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Due date (optional)</Label>
              <Input
                id="task-due"
                placeholder="e.g. Today, Tomorrow, 2:00 PM"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editTaskId ? "Save" : "Add Task"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl w-fit">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filter === f
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => {
          const config = priorityConfig[task.priority];
          const Icon = config.icon;

          return (
            <div
              key={task.id}
              className={cn(
                "glass-card-hover p-4 flex items-start gap-4 cursor-pointer",
                completedOnDate("todos", task.id, viewDateKey) && "opacity-60"
              )}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleTask(task.id)}
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                  completedOnDate("todos", task.id, viewDateKey)
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30 hover:border-primary"
                )}
              >
                {completedOnDate("todos", task.id, viewDateKey) && <Check className="w-4 h-4 text-primary-foreground" />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={cn(
                    "font-medium text-foreground",
                    completedOnDate("todos", task.id, viewDateKey) && "line-through"
                  )}>
                    {task.title}
                  </h3>
                  {task.hasNotes && (
                    <span className="w-5 h-5 rounded bg-beige/50 flex items-center justify-center">
                      <span className="text-xs">📝</span>
                    </span>
                  )}
                  {task.hasFiles && (
                    <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                      <Paperclip className="w-3 h-3 text-primary" />
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}
                {task.dueDate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                    <CalendarIcon className="w-3 h-3" />
                    {task.dueDate}
                  </p>
                )}
              </div>

              {/* Priority Badge */}
              <div className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1",
                config.bg, config.color
              )}>
                <Icon className="w-3 h-3" />
                {task.priority}
              </div>

              {/* Edit & Delete */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openEditTask(task); }}
                className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                aria-label="Edit task"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDeleteTaskId(task.id); }}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                aria-label="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              {taskToDelete ? `"${taskToDelete.title}" will be removed. This cannot be undone.` : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTaskId && deleteTask(deleteTaskId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No tasks found</p>
        </div>
      )}
    </div>
  );
};

export default Todos;
