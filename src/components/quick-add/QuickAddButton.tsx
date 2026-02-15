import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Sparkles, ListTodo, StickyNote, Calendar, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const quickAddOptions = [
  { icon: Sparkles, label: "Habit", color: "from-primary to-moss", path: "/habits" },
  { icon: ListTodo, label: "Task", color: "from-amber to-amber-glow", path: "/todos" },
  { icon: StickyNote, label: "Note", color: "from-beige-warm to-secondary", path: "/notes" },
  { icon: Calendar, label: "Event", color: "from-sage-light to-leaf", path: "/calendar" },
  { icon: Target, label: "Goal", color: "from-accent to-amber", path: "/goals" },
];

export function QuickAddButton() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleQuickAdd = (path: string) => {
    setIsOpen(false);
    navigate(path, { state: { openAdd: true } });
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Options */}
      <div
        className={cn(
          "absolute bottom-16 right-0 flex flex-col gap-2 transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {quickAddOptions.map((option, index) => (
          <button
            key={option.label}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-soft hover:shadow-lg transition-all duration-200 group",
              "animate-scale-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleQuickAdd(option.path)}
          >
            <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", option.color)}>
              <option.icon className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-medium text-sm text-foreground">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-sage-dark shadow-glow flex items-center justify-center transition-all duration-300 hover:scale-105",
          isOpen && "rotate-45"
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-primary-foreground" />
        ) : (
          <Plus className="w-6 h-6 text-primary-foreground" />
        )}
      </button>
    </div>
  );
}
