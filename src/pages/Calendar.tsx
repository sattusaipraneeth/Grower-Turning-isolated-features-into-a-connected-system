import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Trash2, Pencil } from "lucide-react";
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
import { setSelectedDate as setGlobalSelectedDate, selectedDate as getGlobalSelectedDate, SELECTED_DATE_EVENT, dateKey as toDateKey } from "@/lib/timeState";

interface Event {
  id: string;
  title: string;
  date: Date;
  time: string;
  type: "event" | "deadline" | "habit" | "milestone" | "work/study";
  color: string;
  seriesId?: string;
  recurrence?: {
    freq: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
    interval?: number;
    byWeekday?: number[]; // 0-6
    until?: string; // ISO date string (yyyy-MM-dd)
  };
  exceptions?: Array<{ dateKey: string; cancelled?: boolean; override?: Partial<Pick<Event, "title" | "time" | "type" | "color">> }>;
}

const eventsData: Event[] = [];

const typeLabels = {
  event: "Event",
  deadline: "Deadline",
  habit: "Habit",
  milestone: "Milestone",
  "work/study": "Work/Study",
};

const EVENT_TYPES = (["event", "deadline", "habit", "milestone", "work/study"] as const).map((t) => ({
  value: t,
  label: typeLabels[t],
}));

const EVENT_COLORS = [
  { value: "bg-amber", label: "Amber" },
  { value: "bg-destructive", label: "Red" },
  { value: "bg-primary", label: "Primary" },
  { value: "bg-leaf", label: "Leaf" },
  { value: "bg-sage-light", label: "Sage" },
];

const formatDateForInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const STORAGE_KEY = "grower:entities:calendar";

const CalendarPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(getGlobalSelectedDate());
  const [selectedDate, setSelectedDate] = useState<Date | null>(getGlobalSelectedDate());
  const [events, setEvents] = useState<Event[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDateStr, setNewDateStr] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newType, setNewType] = useState<Event["type"]>("event");
  const [newColor, setNewColor] = useState("bg-primary");
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [recurrenceFreq, setRecurrenceFreq] = useState<"NONE" | "DAILY" | "WEEKLY" | "MONTHLY">("NONE");
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceUntilStr, setRecurrenceUntilStr] = useState<string>("");
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([]);
  const [editScope, setEditScope] = useState<"occurrence" | "future" | "series">("series");

  // Load events from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<Omit<Event, 'date'> & { date: string | Date }>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Parse date strings back to Date objects (handle both string and Date)
          const eventsWithDates = parsed.map(e => ({
            ...e,
            date: e.date instanceof Date ? e.date : new Date(e.date)
          })) as Event[];
          setEvents(eventsWithDates);
        } else {
          setEvents(eventsData);
        }
      } else {
        setEvents(eventsData);
      }
    } catch {
      setEvents(eventsData);
    }
  }, []);

  // Persist events to localStorage whenever they change
  useEffect(() => {
    try {
      // Convert Date objects to ISO strings for storage
      const serializable = events.map(e => ({
        ...e,
        date: e.date.toISOString()
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
      window.dispatchEvent(new CustomEvent("grower:calendarUpdated"));
    } catch {
      // ignore storage errors
    }
  }, [events]);

  useEffect(() => {
    const onSelectedDateChange = (e: Event) => {
      const d = getGlobalSelectedDate();
      setSelectedDate(d);
      setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
    };
    window.addEventListener(SELECTED_DATE_EVENT, onSelectedDateChange as unknown as EventListener);
    return () => {
      window.removeEventListener(SELECTED_DATE_EVENT, onSelectedDateChange as unknown as EventListener);
    };
  }, []);

  useEffect(() => {
    if ((location.state as { openAdd?: boolean })?.openAdd) {
      openAddDialog();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);

  const visibleStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const visibleEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const isCancelledByException = (e: Event, dk: string) => {
    return (e.exceptions || []).some(x => x.dateKey === dk && x.cancelled);
  };
  const applyOverride = (ev: Event, dk: string): Event => {
    const ex = (ev.exceptions || []).find(x => x.dateKey === dk && x.override);
    if (!ex || !ex.override) return ev;
    const patch = ex.override;
    return { ...ev, title: patch.title ?? ev.title, time: patch.time ?? ev.time, type: patch.type ?? ev.type, color: patch.color ?? ev.color };
  };
  const expandOccurrences = (ev: Event, start: Date, end: Date): Array<Event & { occurrenceDate: Date; sourceId: string }> => {
    const out: Array<Event & { occurrenceDate: Date; sourceId: string }> = [];
    const freq = ev.recurrence?.freq ?? "NONE";
    const interval = Math.max(1, ev.recurrence?.interval ?? 1);
    const until = ev.recurrence?.until ? new Date(ev.recurrence.until) : undefined;
    const seriesStart = new Date(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate());
    const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const pushIfInRange = (d: Date) => {
      const dk = toDateKey(d);
      if (until && d.getTime() > until.getTime()) return;
      if (d.getTime() < rangeStart.getTime() || d.getTime() > rangeEnd.getTime()) return;
      if (isCancelledByException(ev, dk)) return;
      const ov = applyOverride(ev, dk);
      out.push({ ...ov, occurrenceDate: d, sourceId: ev.id });
    };

    if (freq === "NONE") {
      pushIfInRange(seriesStart);
      return out;
    }
    if (freq === "DAILY") {
      // Find first occurrence on/after rangeStart
      const diffDaysFromStart = Math.floor((rangeStart.getTime() - seriesStart.getTime()) / (24 * 3600 * 1000));
      const k = diffDaysFromStart > 0 ? Math.ceil(diffDaysFromStart / interval) * interval : 0;
      let cur = new Date(seriesStart);
      cur.setDate(seriesStart.getDate() + k);
      while (cur.getTime() <= rangeEnd.getTime()) {
        pushIfInRange(cur);
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + interval);
      }
      return out;
    }
    if (freq === "WEEKLY") {
      const by = (ev.recurrence?.byWeekday && ev.recurrence.byWeekday.length > 0) ? ev.recurrence.byWeekday : [seriesStart.getDay()];
      // step weeks by interval
      // start from the Monday of the first week in range (or seriesStart week)
      const startOfWeek = (d: Date) => {
        const s = new Date(d);
        const wd = s.getDay();
        s.setDate(s.getDate() - wd); // Sunday as 0 baseline
        s.setHours(0, 0, 0, 0);
        return s;
      };
      let cursorWeek = startOfWeek(rangeStart);
      // Align to first week >= seriesStart
      if (cursorWeek.getTime() < startOfWeek(seriesStart).getTime()) {
        cursorWeek = startOfWeek(seriesStart);
      }
      // Skip weeks to align with interval relative to seriesStart's week
      const weeksBetween = Math.floor((cursorWeek.getTime() - startOfWeek(seriesStart).getTime()) / (7 * 24 * 3600 * 1000));
      const offsetWeeks = weeksBetween > 0 ? weeksBetween % interval : 0;
      if (offsetWeeks !== 0) {
        cursorWeek = new Date(cursorWeek.getFullYear(), cursorWeek.getMonth(), cursorWeek.getDate() + (interval - offsetWeeks) * 7);
      }
      while (cursorWeek.getTime() <= rangeEnd.getTime()) {
        by.forEach((wday) => {
          const d = new Date(cursorWeek.getFullYear(), cursorWeek.getMonth(), cursorWeek.getDate() + wday);
          pushIfInRange(d);
        });
        cursorWeek = new Date(cursorWeek.getFullYear(), cursorWeek.getMonth(), cursorWeek.getDate() + interval * 7);
      }
      return out;
    }
    if (freq === "MONTHLY") {
      const dayOfMonth = seriesStart.getDate();
      // start at the first month in range
      let curMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      if (curMonth < new Date(seriesStart.getFullYear(), seriesStart.getMonth(), 1)) {
        curMonth = new Date(seriesStart.getFullYear(), seriesStart.getMonth(), 1);
      }
      // align to interval relative to series start month index
      const monthsBetween = (curMonth.getFullYear() - seriesStart.getFullYear()) * 12 + (curMonth.getMonth() - seriesStart.getMonth());
      const offsetMonths = monthsBetween > 0 ? monthsBetween % interval : 0;
      if (offsetMonths !== 0) {
        curMonth = new Date(curMonth.getFullYear(), curMonth.getMonth() + (interval - offsetMonths), 1);
      }
      while (curMonth.getTime() <= rangeEnd.getTime()) {
        const daysInCurMonth = new Date(curMonth.getFullYear(), curMonth.getMonth() + 1, 0).getDate();
        const dom = Math.min(dayOfMonth, daysInCurMonth);
        const d = new Date(curMonth.getFullYear(), curMonth.getMonth(), dom);
        pushIfInRange(d);
        curMonth = new Date(curMonth.getFullYear(), curMonth.getMonth() + interval, 1);
      }
      return out;
    }
    return out;
  };

  const expandedMonthOccurrences = useMemo(() => {
    const acc: Array<Event & { occurrenceDate: Date; sourceId: string }> = [];
    events.forEach(ev => {
      const occ = expandOccurrences(ev, visibleStart, visibleEnd);
      acc.push(...occ);
    });
    return acc;
  }, [events, visibleStart.getTime(), visibleEnd.getTime()]);

  const getEventsForDate = (day: number) => {
    return expandedMonthOccurrences.filter(o => 
      o.occurrenceDate.getDate() === day &&
      o.occurrenceDate.getMonth() === currentDate.getMonth() &&
      o.occurrenceDate.getFullYear() === currentDate.getFullYear()
    ).map(o => ({ ...o, date: o.occurrenceDate } as Event));
  };

  const selectedEvents = selectedDate 
    ? expandedMonthOccurrences.filter(o => 
        o.occurrenceDate.getDate() === selectedDate.getDate() &&
        o.occurrenceDate.getMonth() === selectedDate.getMonth() &&
        o.occurrenceDate.getFullYear() === selectedDate.getFullYear()
      ).map(o => ({ ...o, date: o.occurrenceDate } as Event))
    : [];

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const openAddDialog = () => {
    setEditEventId(null);
    const base = selectedDate ?? currentDate;
    setNewDateStr(formatDateForInput(base));
    setNewTitle("");
    setNewTime("");
    setNewType("event");
    setNewColor("bg-primary");
    setRecurrenceFreq("NONE");
    setRecurrenceInterval(1);
    setRecurrenceUntilStr("");
    setRecurrenceWeekdays([]);
    setEditScope("series");
    setAddDialogOpen(true);
  };

  const openEditEvent = (event: Event) => {
    setEditEventId(event.id);
    setNewDateStr(formatDateForInput(event.date));
    setNewTitle(event.title);
    setNewTime(event.time || "");
    setNewType(event.type);
    setNewColor(event.color);
    setRecurrenceFreq(event.recurrence?.freq ?? "NONE");
    setRecurrenceInterval(event.recurrence?.interval ?? 1);
    setRecurrenceUntilStr(event.recurrence?.until ?? "");
    setRecurrenceWeekdays(event.recurrence?.byWeekday ?? []);
    setEditScope("series");
    setAddDialogOpen(true);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const [y, m, d] = newDateStr.split("-").map(Number);
    const date = new Date(y, (m ?? 1) - 1, d ?? 1);
    if (editEventId) {
      setEvents(events.map((ev) => {
        if (ev.id !== editEventId) return ev;
        const nextRecurrence = recurrenceFreq === "NONE" ? undefined : {
          freq: recurrenceFreq,
          interval: recurrenceInterval,
          byWeekday: recurrenceFreq === "WEEKLY" ? recurrenceWeekdays : undefined,
          until: recurrenceUntilStr || undefined,
        } as Event['recurrence'];
        if (ev.recurrence && selectedDate && editScope !== "series") {
          const dk = toDateKey(selectedDate);
          if (editScope === "occurrence") {
            const ex = ev.exceptions || [];
            const idx = ex.findIndex(x => x.dateKey === dk);
            const override = { title: newTitle.trim(), time: newTime.trim(), type: newType, color: newColor };
            if (idx >= 0) ex[idx] = { ...ex[idx], override };
            else ex.push({ dateKey: dk, override });
            return { ...ev, exceptions: ex };
          } else {
            // all future occurrences: set until to day before selected, create/update recurrence starting at selected
            const untilDate = new Date(selectedDate);
            untilDate.setDate(untilDate.getDate() - 1);
            const updatedSeries = { ...ev, recurrence: { ...(ev.recurrence || {}), until: toDateKey(untilDate) } as Event['recurrence'] };
            const newSeries: Event = {
              id: crypto.randomUUID?.() ?? String(Date.now()),
              title: newTitle.trim(),
              date,
              time: newTime.trim(),
              type: newType,
              color: newColor,
              seriesId: ev.seriesId || ev.id,
              recurrence: nextRecurrence ?? ev.recurrence,
              exceptions: [] as Event['exceptions'],
            };
            setEvents([...events.filter(x => x.id !== ev.id), updatedSeries, newSeries]);
            return updatedSeries; // placeholder; actual setEvents includes new series
          }
        }
        return { ...ev, title: newTitle.trim(), date, time: newTime.trim(), type: newType, color: newColor, recurrence: nextRecurrence, seriesId: ev.seriesId };
      }));
    } else {

      const newEvent: Event = {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        title: newTitle.trim(),
        date,
        time: newTime.trim(),
        type: newType,
        color: newColor,
        seriesId: undefined,
        recurrence: recurrenceFreq === "NONE" ? undefined : {
          freq: recurrenceFreq,
          interval: recurrenceInterval,
          byWeekday: recurrenceFreq === "WEEKLY" ? recurrenceWeekdays : undefined,
          until: recurrenceUntilStr || undefined,
        },
        exceptions: [],
      };
      setEvents([...events, newEvent]);
    }
    setEditEventId(null);
    setAddDialogOpen(false);
  };

  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const eventToDelete = deleteEventId ? events.find((e) => e.id === deleteEventId) : null;
  const [deleteScope, setDeleteScope] = useState<"occurrence" | "future" | "series">("series");
  const deleteEvent = (id: string) => {
    const ev = events.find(e => e.id === id);
    if (!ev) {
      setEvents(events.filter((e) => e.id !== id));
      setDeleteEventId(null);
      return;
    }
    if (!ev.recurrence || deleteScope === "series" || !selectedDate) {
      setEvents(events.filter((e) => e.id !== id));
      setDeleteEventId(null);
      return;
    }
    const dk = toDateKey(selectedDate);
    if (deleteScope === "occurrence") {
      const ex = ev.exceptions || [];
      if (!ex.some(x => x.dateKey === dk)) ex.push({ dateKey: dk, cancelled: true });
      setEvents(events.map(e => e.id === id ? { ...e, exceptions: ex } : e));
      setDeleteEventId(null);
      return;
    }
    if (deleteScope === "future") {
      const untilDate = new Date(selectedDate);
      untilDate.setDate(untilDate.getDate() - 1);
      setEvents(events.map(e => e.id === id ? { ...e, recurrence: e.recurrence ? { ...e.recurrence, until: toDateKey(untilDate) } : { freq: "NONE", until: toDateKey(untilDate) } } : e));
      setDeleteEventId(null);
      return;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Calendar
          </h1>
          <p className="text-muted-foreground mt-1">Plan your days ahead</p>
        </div>
        <button
          onClick={openAddDialog}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {/* Add/Edit Event Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) setEditEventId(null); setAddDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editEventId ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddEvent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                placeholder="e.g. Team Meeting"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={newDateStr}
                  onChange={(e) => setNewDateStr(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-time">Time (optional)</Label>
                <Input
                  id="event-time"
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as Event["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                  {EVENT_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Select value={recurrenceFreq} onValueChange={(v) => setRecurrenceFreq(v as typeof recurrenceFreq)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Interval</Label>
                  <Input type="number" value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))} />
                </div>
                {recurrenceFreq === "WEEKLY" && (
                  <div className="col-span-2">
                    <div className="flex flex-wrap gap-2">
                      {dayNames.map((d, idx) => {
                        const active = recurrenceWeekdays.includes(idx);
                        return (
                          <button
                            type="button"
                            key={d}
                            className={cn("px-2 py-1 rounded-md text-xs", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                            onClick={() => {
                              setRecurrenceWeekdays(prev => active ? prev.filter(x => x !== idx) : [...prev, idx]);
                            }}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="col-span-2">
                  <Label className="text-xs">Until (optional)</Label>
                  <Input type="date" value={recurrenceUntilStr} onChange={(e) => setRecurrenceUntilStr(e.target.value)} />
                </div>
              </div>
            </div>
            {editEventId && (recurrenceFreq !== "NONE") && selectedDate && (
              <div className="space-y-2">
                <Label>Edit Scope</Label>
                <Select value={editScope} onValueChange={(v) => setEditScope(v as typeof editScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="occurrence">This occurrence only</SelectItem>
                    <SelectItem value="future">All future occurrences</SelectItem>
                    <SelectItem value="series">Entire series</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editEventId ? "Save" : "Add Event"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 glass-card p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before first day of month */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDate(day);
              const isSelected = selectedDate?.getDate() === day && 
                                selectedDate?.getMonth() === currentDate.getMonth();
              const isToday = new Date().getDate() === day && 
                             new Date().getMonth() === currentDate.getMonth() &&
                             new Date().getFullYear() === currentDate.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => {
                    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    setSelectedDate(d);
                    setGlobalSelectedDate(d);
                    setGlobalSelectedDate(d);
                  }}
                  className={cn(
                    "aspect-square p-1 rounded-xl flex flex-col items-center transition-all",
                    isSelected && "bg-primary text-primary-foreground",
                    isToday && !isSelected && "ring-2 ring-primary",
                    !isSelected && "hover:bg-muted"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium",
                    !isSelected && "text-foreground"
                  )}>
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={cn("w-1.5 h-1.5 rounded-full", event.color)}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Events */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-4">
            {selectedDate 
              ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : 'Select a date'
            }
          </h3>
          
          {selectedEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                >
                  <div className={cn("w-2 h-10 rounded-full flex-shrink-0", event.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{event.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {event.time && (
                        <span className="text-xs text-muted-foreground">{event.time}</span>
                      )}
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {typeLabels[event.type]}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditEvent(event)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                    aria-label="Edit event"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteEventId(event.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                    aria-label="Delete event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No events for this day</p>
            </div>
          )}

          <button
            onClick={openAddDialog}
            className="w-full mt-4 p-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Event</span>
          </button>
        </div>
      </div>

      {/* Delete event confirmation */}
      <AlertDialog open={!!deleteEventId} onOpenChange={(open) => !open && setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              {eventToDelete ? `"${eventToDelete.title}" will be removed. This cannot be undone.` : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {eventToDelete?.recurrence && selectedDate && (
              <div className="flex flex-col gap-2 mr-auto">
                <Label className="text-xs">Scope</Label>
                <Select value={deleteScope} onValueChange={(v) => setDeleteScope(v as typeof deleteScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="occurrence">This occurrence only</SelectItem>
                    <SelectItem value="future">All future occurrences</SelectItem>
                    <SelectItem value="series">Entire series</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <AlertDialogAction onClick={() => deleteEventId && deleteEvent(deleteEventId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CalendarPage;
