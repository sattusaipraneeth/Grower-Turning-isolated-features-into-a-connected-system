import { useState, useEffect } from "react";
import { Check, Circle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { TaskEntities, completedOnDate, selectedDateKey, SELECTED_DATE_EVENT, getEntityState, setEntityState, DailyBooleanState } from "@/lib/timeState";

interface Task {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  dueTime?: string;
}

const priorityStyles = {
  high: "border-destructive/30 bg-destructive/5",
  medium: "border-amber/30 bg-amber/5",
  low: "border-border/50 bg-card/50",
};

const priorityIcons = {
  high: AlertCircle,
  medium: Clock,
  low: Circle,
};

export function TasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [key, setKey] = useState<string>(selectedDateKey());
  useEffect(() => {
    const saved = TaskEntities.all();
    setTasks(saved);
  }, []);
  useEffect(() => {
    const onDate = () => setKey(selectedDateKey());
    const onReset = () => {
      setKey(selectedDateKey());
      setTasks(TaskEntities.all());
    };
    window.addEventListener(SELECTED_DATE_EVENT, onDate);
    window.addEventListener("grower:progressReset", onReset);
    return () => {
      window.removeEventListener(SELECTED_DATE_EVENT, onDate);
      window.removeEventListener("grower:progressReset", onReset);
    };
  }, []);

  const toggleTask = (id: string) => {
    const current = getEntityState<DailyBooleanState>("todos", id, key);
    const next: DailyBooleanState = { completed: !(current?.completed ?? false) };
    setEntityState<DailyBooleanState>("todos", id, key, next);
  };

  const pendingTasks = tasks.filter(t => !completedOnDate("todos", t.id, key));
  const completedTasks = tasks.filter(t => completedOnDate("todos", t.id, key));

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Today's Tasks</h2>
          <p className="text-sm text-muted-foreground">{completedTasks.length} of {tasks.length} done</p>
        </div>
        <Link 
          to="/todos"
          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          View All →
        </Link>
      </div>

      <div className="space-y-2">
        {pendingTasks.slice(0, 4).map((task) => {
          const PriorityIcon = priorityIcons[task.priority];
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 hover:shadow-sm",
                priorityStyles[task.priority]
              )}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors"
              >
                {completedOnDate("todos", task.id, key) && <Check className="w-3 h-3 text-primary" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{task.title}</p>
                {task.dueTime && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {task.dueTime}
                  </p>
                )}
              </div>
              <PriorityIcon className={cn(
                "w-4 h-4",
                task.priority === "high" && "text-destructive",
                task.priority === "medium" && "text-amber",
                task.priority === "low" && "text-muted-foreground"
              )} />
            </div>
          );
        })}

        {completedTasks.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Completed</p>
            {completedTasks.slice(0, 2).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 opacity-60"
              >
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <p className="font-medium text-sm text-foreground line-through truncate">{task.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
