import { Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "grower:entities:calendar";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  color: string;
};

const typeColors = {
  meeting: "bg-amber/20 text-amber",
  habit: "bg-primary/20 text-primary",
  task: "bg-leaf/20 text-leaf",
};

const loadEvents = (): CalendarEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CalendarEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);
  const today = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = today.getDay();

  useEffect(() => {
    const handle = () => setEvents(loadEvents());
    window.addEventListener("grower:calendarUpdated", handle);
    window.addEventListener("storage", handle);
    return () => {
      window.removeEventListener("grower:calendarUpdated", handle);
      window.removeEventListener("storage", handle);
    };
  }, []);

  const upcomingEvents = useMemo(() => {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const withDates = events.map(ev => {
      const d = new Date(ev.date);
      if (ev.time) {
        const [h, m] = ev.time.split(":").map(Number);
        if (!Number.isNaN(h)) d.setHours(h, m || 0, 0, 0);
      }
      return { ...ev, sortDate: d };
    });
    return withDates
      .filter(ev => ev.sortDate.getTime() >= start.getTime())
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .slice(0, 3);
  }, [events, today]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Today
        </h2>
        <Link 
          to="/calendar"
          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Calendar →
        </Link>
      </div>

      {/* Mini Week View */}
      <div className="flex justify-between mb-4 p-2 bg-muted/50 rounded-xl">
        {days.map((day, index) => {
          const isToday = index === currentDay;
          const date = new Date(today);
          date.setDate(today.getDate() - currentDay + index);
          
          return (
            <div 
              key={day}
              className={`flex flex-col items-center p-1.5 rounded-lg transition-colors ${
                isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              <span className="text-[10px] font-medium">{day}</span>
              <span className={`text-sm font-semibold ${isToday ? '' : 'text-foreground'}`}>
                {date.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Upcoming Events */}
      <div className="space-y-2">
        {upcomingEvents.length === 0 ? (
          <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">No upcoming events</div>
        ) : (
          upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className={`w-2 h-8 rounded-full ${event.color || typeColors[event.type as keyof typeof typeColors]?.split(" ")[0] || "bg-primary/20"}`} />
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground">{event.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {event.time || "All day"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
