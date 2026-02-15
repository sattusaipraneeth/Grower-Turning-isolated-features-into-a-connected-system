import { StickyNote, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "green-home-notes";

type Note = {
  id: string;
  title: string;
  content: string;
  color: string;
  updatedAt: string;
  pinned: boolean;
};

const loadNotes = (): Note[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function NotesWidget() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);

  useEffect(() => {
    const handle = () => setNotes(loadNotes());
    window.addEventListener("grower:notesUpdated", handle);
    window.addEventListener("storage", handle);
    return () => {
      window.removeEventListener("grower:notesUpdated", handle);
      window.removeEventListener("storage", handle);
    };
  }, []);

  const recentNotes = useMemo(() => {
    const pinned = notes.filter(n => n.pinned);
    const others = notes.filter(n => !n.pinned);
    return [...pinned, ...others].slice(0, 3);
  }, [notes]);

  const previewOf = (content: string) => {
    const trimmed = content.replace(/\s+/g, " ").trim();
    if (!trimmed) return "No content";
    return trimmed.length > 70 ? `${trimmed.slice(0, 70)}…` : trimmed;
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-primary" />
          Quick Notes
        </h2>
        <Link 
          to="/notes"
          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          All →
        </Link>
      </div>

      <div className="space-y-2">
        {recentNotes.map((note) => (
          <div
            key={note.id}
            className={`p-3 rounded-xl ${note.color || "bg-muted"} cursor-pointer hover:opacity-80 transition-opacity`}
          >
            <p className="font-medium text-sm text-foreground">{note.title}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{previewOf(note.content)}</p>
          </div>
        ))}

        <Link to="/notes" state={{ openAdd: true }} className="w-full p-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Note</span>
        </Link>
      </div>
    </div>
  );
}
