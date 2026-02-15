import { useState, useEffect, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, Coffee, BookOpen } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import { useDensity } from "@/hooks/useDensity";
import { StudyGoalEntities, toggleTodayCompleted, completedOnDate, todayKey, dateKey } from "@/lib/timeState";

interface StudyGoalEntity {
  id: string;
  title: string;
}
type FocusSession = { mode: "work" | "break"; startedAt: number; endedAt: number; durationSec: number; dateKey: string; goalTitle?: string; notes?: string };
const FOCUS_STORAGE_KEY = "green-home-focus-history";
const STUDY_GOALS_KEY = "green-home-study-today-goals";

const defaultStudyGoals: StudyGoalEntity[] = [
  { id: "1", title: "Review React patterns" },
  { id: "2", title: "Practice TypeScript" },
  { id: "3", title: "Read documentation" },
  { id: "4", title: "Build mini project" },
];

type SessionMicroGoal = { id: string; text: string; completed: boolean };

const Focus = () => {
  const navigate = useNavigate();
  const { density } = useDensity();
  const [mode, setMode] = useState<"work" | "break">("work");
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [studyTasks, setStudyTasks] = useState<StudyGoalEntity[]>([]);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [editStudyGoalId, setEditStudyGoalId] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [sessionHistory, setSessionHistory] = useState<FocusSession[]>([]);
  const [lastStartAt, setLastStartAt] = useState<number | null>(null);
  const [focusGoalId, setFocusGoalId] = useState<string | null>(null);
  const [focusGoalTitle, setFocusGoalTitle] = useState<string>("");
  const [chooseGoalOpen, setChooseGoalOpen] = useState(false);
  const [chooseGoalSelection, setChooseGoalSelection] = useState<string>("");
  const [chooseGoalCustom, setChooseGoalCustom] = useState<string>("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryNotes, setSummaryNotes] = useState<string>("");
  const [summaryDurationSec, setSummaryDurationSec] = useState<number>(0);
  const [pausesToday, setPausesToday] = useState<number>(0);
  const [trueFocusMode, setTrueFocusMode] = useState(false);
  const [distractionDialogOpen, setDistractionDialogOpen] = useState(false);
  const [distractionText, setDistractionText] = useState("");
  const [distractions, setDistractions] = useState<{ text: string; ts: number }[]>([]);
  const [sessionPlan, setSessionPlan] = useState("");

  const workDuration = workMinutes * 60;
  const breakDuration = breakMinutes * 60;

  const toggleStudyGoal = (id: string) => {
    toggleTodayCompleted("studyGoals", id);
  };

  const openEditStudyGoal = (task: StudyGoalEntity) => {
    setEditStudyGoalId(task.id);
    setNewGoalTitle(task.title);
    setAddGoalOpen(true);
  };

  const handleAddStudyGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    if (editStudyGoalId) {
      setStudyTasks((prev) =>
        prev.map((t) => (t.id === editStudyGoalId ? { ...t, title: newGoalTitle.trim() } : t))
      );
    } else {
      setStudyTasks((prev) => {
        const next = [
          ...prev,
          { id: crypto.randomUUID?.() ?? String(Date.now()), title: newGoalTitle.trim() },
        ];
        StudyGoalEntities.saveAll(next);
        return next;
      });
    }
    setEditStudyGoalId(null);
    setNewGoalTitle("");
    setAddGoalOpen(false);
  };

  const [deleteStudyGoalId, setDeleteStudyGoalId] = useState<string | null>(null);
  const studyGoalToDelete = deleteStudyGoalId ? studyTasks.find((t) => t.id === deleteStudyGoalId) : null;
  const deleteStudyGoal = (id: string) => {
    setStudyTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      StudyGoalEntities.saveAll(next);
      return next;
    });
    setDeleteStudyGoalId(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = mode === "work"
    ? (workDuration > 0 ? ((workDuration - timeLeft) / workDuration) * 100 : 0)
    : (breakDuration > 0 ? ((breakDuration - timeLeft) / breakDuration) * 100 : 0);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? workDuration : breakDuration);
    setLastStartAt(null);
  }, [mode, workDuration, breakDuration]);

  const switchMode = useCallback(() => {
    const endedAt = Date.now();
    const durationSec = mode === "work" ? workDuration : breakDuration;
    const startedAt = lastStartAt ?? endedAt - durationSec * 1000;
    const dKey = dateKey(new Date(startedAt));
    setSessionHistory(prev => [
      { mode, startedAt, endedAt, durationSec, dateKey: dKey, ...(mode === "work" ? { goalTitle: focusGoalTitle } : {}) },
      ...prev.slice(0, 49),
    ]);
    if (mode === "work") {
      setSessionsCompleted(prev => prev + 1);
      setSummaryDurationSec(durationSec);
      setSummaryNotes(sessionPlan);
      setSummaryOpen(true);
      setMode("break");
      setTimeLeft(breakDuration);
      setIsRunning(false);
      setLastStartAt(null);
      return;
    }
    setMode("work");
    setTimeLeft(workDuration);
    setIsRunning(false);
    setLastStartAt(null);
  }, [mode, workDuration, breakDuration, lastStartAt, focusGoalTitle, sessionPlan]);

  const applyCustomDurations = () => {
    const w = Math.max(0, Math.min(240, workMinutes));
    const b = Math.max(0, Math.min(240, breakMinutes));
    setWorkMinutes(w);
    setBreakMinutes(b);
    setIsRunning(false);
    setTimeLeft((mode === "work" ? w : b) * 60);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Play notification sound when timer ends
      const playNotificationSound = async () => {
        try {
          type WindowWithWebkitAudioContext = typeof window & {
            webkitAudioContext?: typeof AudioContext;
          };
          const w = window as WindowWithWebkitAudioContext;
          const AudioContextClass = w.AudioContext ?? w.webkitAudioContext;
          if (!AudioContextClass) {
            return;
          }
          
          const audioContext = new AudioContextClass();
          
          // Resume audio context if suspended (required for some browsers)
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Play a pleasant notification tone
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
          
          // Clean up after sound finishes
          oscillator.onended = () => {
            audioContext.close().catch(() => {
              // Ignore if close fails
            });
          };
        } catch (error) {
          // Silently fail if audio cannot be played
          console.warn('Could not play notification sound:', error);
        }
      };
      
      playNotificationSound();
      switchMode();
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, timeLeft, switchMode]);

  const handlePlayPause = () => {
    if (isRunning) {
      if (mode === "work") {
        setPausesToday((p) => p + 1);
      }
      setIsRunning(false);
      return;
    }
    if (mode === "work" && !focusGoalTitle) {
      setChooseGoalSelection("");
      setChooseGoalCustom("");
      setChooseGoalOpen(true);
      return;
    }
    setIsRunning(true);
    setLastStartAt(Date.now());
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FOCUS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FocusSession[];
        if (Array.isArray(parsed)) setSessionHistory(parsed);
      }
    } catch (e) {
      console.warn("Failed to load focus history");
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(sessionHistory));
    } catch (e) {
      console.warn("Failed to save focus history");
    }
  }, [sessionHistory]);

  useEffect(() => {
    const saved = StudyGoalEntities.all();
    if (saved.length > 0) setStudyTasks(saved);
    else {
      StudyGoalEntities.saveAll(defaultStudyGoals);
      setStudyTasks(defaultStudyGoals);
    }
  }, []);

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = startOfDay(new Date());
  const workToday = sessionHistory.filter(s => s.mode === "work" && s.startedAt >= todayStart);
  const totalWorkSecToday = workToday.reduce((sum, s) => sum + s.durationSec, 0);
  const sessionsCountToday = workToday.length;
  const focusScoreToday = Math.max(0, sessionsCountToday - pausesToday);
  const goalTotalsMap = workToday.reduce<Record<string, number>>((acc, s) => {
    const key = s.goalTitle || "Untitled";
    acc[key] = (acc[key] || 0) + s.durationSec;
    return acc;
  }, {});
  const goalTotals = Object.entries(goalTotalsMap)
    .map(([goal, sec]) => ({ goal, minutes: Math.round(sec / 60) }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const start = startOfDay(d);
    const end = start + 24 * 3600 * 1000;
    const dayTotal = sessionHistory
      .filter(s => s.mode === "work" && s.startedAt >= start && s.startedAt < end)
      .reduce((sum, s) => sum + s.durationSec, 0);
    const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    return { day: labels[d.getDay()], minutes: Math.round(dayTotal / 60) };
  });
  const computeStreak = () => {
    let streak = 0;
    for (let offset = 0; offset < 365; offset++) {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const start = startOfDay(d);
      const end = start + 24 * 3600 * 1000;
      const hasWork = sessionHistory.some(s => s.mode === "work" && s.startedAt >= start && s.startedAt < end);
      if (hasWork) streak++;
      else break;
    }
    return streak;
  };
  const streakDays = computeStreak();

  

  return (
    <div className={cn("animate-fade-in", density === "compact" ? "space-y-4" : "space-y-6")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Timer className="w-6 h-6 text-blue" />
            Focus Mode
          </h1>
          <p className="text-muted-foreground mt-1">Deep work, no distractions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">True Focus</span>
            <Switch checked={trueFocusMode} onCheckedChange={setTrueFocusMode} />
          </div>
          <span className="text-sm text-muted-foreground">{sessionsCompleted} sessions today</span>
        </div>
      </div>

      <div className={cn("grid grid-cols-1 lg:grid-cols-3 items-stretch", density === "compact" ? "gap-4" : "gap-6")}>
        {/* Pomodoro Timer */}
        <div className="lg:col-span-2 overflow-visible">
          <div className={cn("glass-card text-center overflow-visible", density === "compact" ? "p-6" : "p-8")}>
            {!trueFocusMode && (
              <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border/50 flex flex-wrap items-end gap-4 justify-center">
                <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
                  <button
                    onClick={() => { setMode("work"); setTimeLeft(workDuration); setIsRunning(false); }}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                      mode === "work"
                        ? "bg-blue text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <BookOpen className="w-4 h-4" />
                    Work
                  </button>
                  <button
                    onClick={() => { setMode("break"); setTimeLeft(breakDuration); setIsRunning(false); }}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                      mode === "break"
                        ? "bg-amber text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Coffee className="w-4 h-4" />
                    Break
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="work-mins" className="text-sm">Work (min)</Label>
                  <input
                    id="work-mins"
                    type="number"
                    min={0}
                    max={240}
                    step={5}
                    value={workMinutes}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isNaN(next)) return;
                      setWorkMinutes(next);
                    }}
                    className="w-20 h-9 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="break-mins" className="text-sm">Break (min)</Label>
                  <input
                    id="break-mins"
                    type="number"
                    min={0}
                    max={240}
                    step={5}
                    value={breakMinutes}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isNaN(next)) return;
                      setBreakMinutes(next);
                    }}
                    className="w-20 h-9 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>
                <Button type="button" size="sm" onClick={applyCustomDurations}>Apply</Button>
              </div>
            )}

            {/* Timer Display — no overflow-hidden; radius = half size minus stroke so stroke is not clipped */}
            {(() => {
              const size = 256;
              const strokeWidth = 8;
              const r = size / 2 - strokeWidth / 2;
              const circumference = 2 * Math.PI * r;
              return (
                <div className="overflow-visible p-2 mb-6 md:mb-8 flex justify-center">
                  <div
                    className={cn(
                      "relative overflow-visible flex items-center justify-center",
                      density === "compact" ? "w-60 min-w-[240px]" : "w-64 min-w-[256px]"
                    )}
                    style={{ aspectRatio: "1" }}
                  >
                    <svg
                      className="w-full h-full max-w-full max-h-full transform -rotate-90 overflow-visible"
                      viewBox={`0 0 ${size} ${size}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth={strokeWidth}
                      />
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke={mode === "work" ? "hsl(var(--blue))" : "hsl(var(--amber))"}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - progress / 100)}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    {/* Time Display — centered over the ring */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-5xl font-bold text-foreground tracking-tight">
                        {formatTime(timeLeft)}
                      </span>
                      <span className="text-muted-foreground mt-2">{mode === "work" ? "Focus Time" : "Break Time"}</span>
                      {mode === "work" && focusGoalTitle && (
                        <span className="text-xs text-muted-foreground mt-1">Working on: {focusGoalTitle}</span>
                      )}
                      <span className="text-xs mt-1">
                        {isRunning ? "Running" : "Paused"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className={cn("mx-auto max-w-xl text-left", density === "compact" ? "space-y-3" : "space-y-4")}>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">When the timer ends, I should have</h3>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{focusGoalTitle || "Not selected"}</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => { setChooseGoalSelection(""); setChooseGoalCustom(""); setChooseGoalOpen(true); }}
                  >
                    {focusGoalTitle ? "Change task" : "Choose task"}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Session Notes</div>
                <Textarea
                  placeholder="What do I want to achieve this session?"
                  value={sessionPlan}
                  onChange={(e) => setSessionPlan(e.target.value)}
                />
              </div>
              <div>
                <Progress value={progress} />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={reset}
                className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={handlePlayPause}
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-glow",
                  mode === "work" ? "bg-blue hover:bg-blue/90" : "bg-amber hover:bg-amber/90"
                )}
              >
                {isRunning ? (
                  <Pause className="w-7 h-7 text-primary-foreground" />
                ) : (
                  <Play className="w-7 h-7 text-primary-foreground ml-1" />
                )}
              </button>
              <button
                onClick={switchMode}
                className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
              >
                <Coffee className="w-5 h-5" />
              </button>
            </div>
            {trueFocusMode && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setTrueFocusMode(false)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Exit True Focus
                </button>
                {mode === "work" && (
                  <button
                    type="button"
                    onClick={() => { setDistractionText(""); setDistractionDialogOpen(true); }}
                    className="ml-3 text-xs text-primary hover:text-primary/80 underline"
                  >
                    Distracted?
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        {!trueFocusMode && (
          <div className="flex flex-col h-full">
            <div className={cn("glass-card flex flex-col h-full", density === "compact" ? "p-4" : "p-5")}>
              <h3 className="font-semibold text-foreground mb-3">Stats</h3>
              <div className={cn("grid grid-cols-2", density === "compact" ? "gap-3" : "gap-4")}>
                <div className="p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground">Focus time</div>
                  <div className="text-xl font-bold text-foreground">{Math.round(totalWorkSecToday / 60)}m</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground">Sessions</div>
                  <div className="text-xl font-bold text-foreground">{sessionsCountToday}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground">Streak</div>
                  <div className="text-xl font-bold text-amber">{streakDays}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground">Focus score</div>
                  <div className="text-xl font-bold text-leaf">{focusScoreToday}</div>
                </div>
              </div>
              <div className={cn(density === "compact" ? "mt-3 h-24" : "mt-4 h-28")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-soft)',
                      }}
                    />
                    <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <h3 className="font-semibold text-foreground mt-4">Today's Study Goals</h3>
              <form onSubmit={handleAddStudyGoal} className="flex items-center gap-2 mt-2">
                <Input
                  placeholder={editStudyGoalId ? "Edit goal title" : "Add study goal"}
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                />
                <Button type="submit" size="sm">{editStudyGoalId ? "Save" : "Add"}</Button>
                {editStudyGoalId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditStudyGoalId(null); setNewGoalTitle(""); }}
                  >
                    Cancel
                  </Button>
                )}
              </form>
              <div className={cn("mt-2 flex-1 overflow-auto", density === "compact" ? "space-y-1" : "space-y-2")}>
                {studyTasks.length === 0 && (
                  <div className="text-xs text-muted-foreground">No study goals yet</div>
                )}
                {studyTasks.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox checked={completedOnDate("studyGoals", g.id, todayKey())} onCheckedChange={() => toggleStudyGoal(g.id)} />
                      <span className={cn("text-sm truncate", completedOnDate("studyGoals", g.id, todayKey()) ? "text-foreground line-through" : "text-muted-foreground")}>
                        {g.title}
                      </span>
                      {focusGoalId === g.id && (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                        onClick={() => { setEditStudyGoalId(g.id); setNewGoalTitle(g.title); }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive underline"
                        onClick={() => setDeleteStudyGoalId(g.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <AlertDialog open={!!deleteStudyGoalId} onOpenChange={(open) => { if (!open) setDeleteStudyGoalId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete study goal?</AlertDialogTitle>
            <AlertDialogDescription>
              {studyGoalToDelete ? `"${studyGoalToDelete.title}" will be removed. This cannot be undone.` : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteStudyGoalId && deleteStudyGoal(deleteStudyGoalId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className={cn("glass-card", density === "compact" ? "p-4" : "p-5")}>
        <h3 className="font-semibold text-foreground mb-2">Sound Garden</h3>
        <div className="rounded-xl border border-border overflow-hidden bg-card/60">
          <iframe
            style={{ border: "none", width: "100%", height: density === "compact" ? "168px" : "200px" }}
            src="https://open.spotify.com/embed/playlist/5VcTLxmv1YkYiY9Gou6k4B?utm_source=generator&theme=0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          ></iframe>
        </div>
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open("https://open.spotify.com/playlist/5VcTLxmv1YkYiY9Gou6k4B", "_blank", "noopener,noreferrer")}
          >
            Open in Spotify
          </Button>
        </div>
      </div>
      <Dialog open={distractionDialogOpen} onOpenChange={setDistractionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>I got distracted by…</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="distraction-text">What pulled your attention?</Label>
            <Input
              id="distraction-text"
              placeholder="e.g. Phone, notifications, random thought"
              value={distractionText}
              onChange={(e) => setDistractionText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDistractionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const text = distractionText.trim();
                if (!text) return;
                setDistractions(prev => [{ text, ts: Date.now() }, ...prev.slice(0, 99)]);
                setDistractionDialogOpen(false);
                setDistractionText("");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={chooseGoalOpen} onOpenChange={setChooseGoalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What are you working on?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={chooseGoalSelection} onValueChange={setChooseGoalSelection}>
                  {studyTasks.length > 0 && (
                    <div className="text-xs text-muted-foreground px-2">Today's Study Goals</div>
                  )}
                  {studyTasks.map((t) => (
                    <label key={t.id} className="flex items-center gap-3 p-2 rounded-lg border border-transparent hover:border-border cursor-pointer">
                      <RadioGroupItem value={t.id} />
                      <span className="text-sm">{t.title}</span>
                    </label>
                  ))}
              <label className="flex items-center gap-3 p-2 rounded-lg border border-transparent hover:border-border cursor-pointer">
                <RadioGroupItem value="custom" />
                <span className="text-sm">Other task</span>
              </label>
            </RadioGroup>
            {chooseGoalSelection === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom-goal">Task</Label>
                <Input
                  id="custom-goal"
                  placeholder="e.g. Write summary for chapter 5"
                  value={chooseGoalCustom}
                  onChange={(e) => setChooseGoalCustom(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setChooseGoalOpen(false)}>Cancel</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setChooseGoalOpen(false);
                navigate("/goals", { state: { openAdd: true } });
              }}
            >
              Manage goals
            </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setChooseGoalOpen(false);
                    navigate("/todos", { state: { openAdd: true } });
                  }}
                >
                  Manage tasks
                </Button>
            <Button
              type="button"
              onClick={() => {
                if (!chooseGoalSelection) return;
                if (chooseGoalSelection === "custom") {
                  if (!chooseGoalCustom.trim()) return;
                  setFocusGoalId(null);
                  setFocusGoalTitle(chooseGoalCustom.trim());
                } else {
                  const g = studyTasks.find(s => s.id === chooseGoalSelection);
                  if (!g) return;
                  setFocusGoalId(g.id);
                  setFocusGoalTitle(g.title);
                }
                setChooseGoalOpen(false);
                setIsRunning(true);
                setLastStartAt(Date.now());
              }}
            >
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={summaryOpen} onOpenChange={(open) => { setSummaryOpen(open); if (!open) setSummaryNotes(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Goal</div>
              <div className="text-sm font-medium">{focusGoalTitle || "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Time spent</div>
              <div className="text-sm font-medium">{Math.round(summaryDurationSec / 60)}m</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-notes">Notes</Label>
              <Textarea
                id="session-notes"
                placeholder="What did you accomplish?"
                value={summaryNotes}
                onChange={(e) => setSummaryNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setSessionHistory(prev => {
                  if (prev.length === 0) return prev;
                  const [latest, ...rest] = prev;
                  const updated = { ...latest, notes: summaryNotes };
                  return [updated, ...rest];
                });
                setSummaryOpen(false);
                setSummaryNotes("");
                setFocusGoalId(null);
                setFocusGoalTitle("");
                setSessionPlan("");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Focus;
