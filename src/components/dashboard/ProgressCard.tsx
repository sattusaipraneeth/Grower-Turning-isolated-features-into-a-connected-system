import { TrendingUp, Flame, CheckCircle2, Timer, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDensity } from "@/hooks/useDensity";

interface ProgressCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: "chart" | "flame" | "check" | "timer" | "calendar";
}

const iconMap = {
  chart: TrendingUp,
  flame: Flame,
  check: CheckCircle2,
  timer: Timer,
  calendar: Calendar,
};

const colorMap = {
  chart: "from-primary to-sage-light",
  flame: "from-amber to-amber-glow",
  check: "from-leaf to-moss",
  timer: "from-sage-light to-primary",
  calendar: "from-primary to-sage-light",
};

export function ProgressCard({ title, value, subtitle, icon }: ProgressCardProps) {
  const Icon = iconMap[icon];
  const gradientClass = colorMap[icon];
  const { density } = useDensity();

  return (
    <div className={cn("glass-card-hover", density === "compact" ? "p-3" : "p-4")}>
      <div className={cn("flex items-start justify-between", density === "compact" ? "mb-2" : "mb-3")}>
        <div className={cn("rounded-xl bg-gradient-to-br flex items-center justify-center", gradientClass, density === "compact" ? "w-8 h-8" : "w-10 h-10")}>
          <Icon className={cn(density === "compact" ? "w-4 h-4" : "w-5 h-5", "text-primary-foreground")} />
        </div>
        <span className={cn("font-bold text-foreground", density === "compact" ? "text-xl" : "text-2xl")}>{value}%</span>
      </div>
      
      {/* Progress Bar */}
      <div className={cn("bg-muted rounded-full overflow-hidden", density === "compact" ? "h-1.5 mb-2" : "h-2 mb-3")}>
        <div 
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", gradientClass)}
          style={{ width: `${value}%` }}
        />
      </div>
      
      <h3 className={cn("font-medium text-foreground", density === "compact" ? "text-sm" : "text-sm")}>{title}</h3>
      <p className={cn("text-muted-foreground", density === "compact" ? "text-[11px]" : "text-xs")}>{subtitle}</p>
    </div>
  );
}
