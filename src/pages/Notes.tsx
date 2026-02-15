import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StickyNote, Plus, Search, Pencil, Trash2, Tag as TagIcon, FolderOpen } from "lucide-react";
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

const STORAGE_KEY = "green-home-notes";
import { selectedDateKey, SELECTED_DATE_EVENT } from "@/lib/timeState";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  updatedAt: string;
  pinned: boolean;
  tags?: string[];
  folder?: string;
  dateKey?: string;
}

const defaultNotes: Note[] = [
  { id: "1", title: "Book Recommendations", content: "The Compound Effect by Darren Hardy\nAtomic Habits by James Clear\nDeep Work by Cal Newport\nThe 7 Habits of Highly Effective People", color: "bg-beige", updatedAt: "2 hours ago", pinned: true, tags: ["ideas","books"], folder: "Personal" },
  { id: "2", title: "Project Ideas", content: "- Personal dashboard app\n- Habit tracker with analytics\n- AI-powered journal\n- Meditation timer with ambient sounds", color: "bg-primary/10", updatedAt: "Yesterday", pinned: true, tags: ["work","ideas"], folder: "Work" },
  { id: "3", title: "Meeting Notes - Q1 Review", content: "Discussed quarterly goals and timeline.", color: "bg-amber/10", updatedAt: "3 days ago", pinned: false, tags: ["work","meeting"], folder: "Work" },
  { id: "4", title: "Recipe: Green Smoothie", content: "Ingredients:\n- 2 cups spinach\n- 1 banana\n- 1 cup almond milk", color: "bg-leaf/10", updatedAt: "1 week ago", pinned: false, tags: ["health","recipe"], folder: "Personal" },
];

const NOTE_COLORS = [
  { value: "bg-beige", label: "Beige" },
  { value: "bg-primary/10", label: "Primary" },
  { value: "bg-amber/10", label: "Amber" },
  { value: "bg-leaf/10", label: "Leaf" },
  { value: "bg-sage-light/20", label: "Sage" },
  { value: "bg-moss/10", label: "Moss" },
];

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Note[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return defaultNotes;
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

const Notes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formColor, setFormColor] = useState("bg-primary/10");
  const [formPinned, setFormPinned] = useState(false);
  const [formTags, setFormTags] = useState("");
  const [formFolder, setFormFolder] = useState("General");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>(selectedDateKey());

  useEffect(() => {
    saveNotes(notes);
    window.dispatchEvent(new CustomEvent("grower:notesUpdated"));
  }, [notes]);

  useEffect(() => {
    if ((location.state as { openAdd?: boolean })?.openAdd) {
      setFormTitle("");
      setFormContent("");
      setFormColor("bg-primary/10");
      setFormPinned(false);
      setEditId(null);
      setAddDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const handler = () => setSelectedKey(selectedDateKey());
    window.addEventListener(SELECTED_DATE_EVENT, handler);
    return () => window.removeEventListener(SELECTED_DATE_EVENT, handler);
  }, []);

  const openAdd = () => {
    setFormTitle("");
    setFormContent("");
    setFormColor("bg-primary/10");
    setFormPinned(false);
    setFormTags("");
    setFormFolder("General");
    setEditId(null);
    setAddDialogOpen(true);
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !activeTag || (note.tags || []).includes(activeTag);
    const matchesFolder = !activeFolder || note.folder === activeFolder;
    const matchesDate = !note.dateKey || note.dateKey === selectedKey;
    return matchesSearch && matchesTag && matchesFolder && matchesDate;
  });
  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const otherNotes = filteredNotes.filter(n => !n.pinned);
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));
  const allFolders = Array.from(new Set(notes.map(n => n.folder || "General")));

  const openEdit = (note: Note) => {
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormColor(note.color);
    setFormPinned(note.pinned);
    setFormTags((note.tags || []).join(", "));
    setFormFolder(note.folder || "General");
    setEditId(note.id);
    setAddDialogOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const updatedAt = "Just now";
    if (editId) {
      setNotes(notes.map(n =>
        n.id === editId
          ? { ...n, title: formTitle.trim(), content: formContent.trim(), color: formColor, pinned: formPinned, updatedAt, tags: formTags.split(",").map(s => s.trim()).filter(Boolean), folder: formFolder }
          : n
      ));
    } else {
      const newNote: Note = {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        title: formTitle.trim(),
        content: formContent.trim(),
        color: formColor,
        updatedAt,
        pinned: formPinned,
        tags: formTags.split(",").map(s => s.trim()).filter(Boolean),
        folder: formFolder,
        dateKey: selectedKey,
      };
      setNotes([...notes, newNote]);
    }
    setAddDialogOpen(false);
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    setDeleteId(null);
  };

  const noteToDelete = deleteId ? notes.find(n => n.id === deleteId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-primary" />
            Quick Notes
          </h1>
          <p className="text-muted-foreground mt-1">Capture your thoughts</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FolderOpen className="w-4 h-4 text-muted-foreground" />
        <button
          onClick={() => setActiveFolder(null)}
          className={cn("px-3 py-1 rounded-lg text-xs", !activeFolder ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
        >
          All
        </button>
        {allFolders.map(f => (
          <button
            key={f}
            onClick={() => setActiveFolder(f === activeFolder ? null : f)}
            className={cn("px-3 py-1 rounded-lg text-xs", activeFolder === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
          >
            {f}
          </button>
        ))}
        <TagIcon className="w-4 h-4 text-muted-foreground ml-2" />
        <button
          onClick={() => setActiveTag(null)}
          className={cn("px-3 py-1 rounded-lg text-xs", !activeTag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
        >
          All
        </button>
        {allTags.map(t => (
          <button
            key={t}
            onClick={() => setActiveTag(t === activeTag ? null : t)}
            className={cn("px-3 py-1 rounded-lg text-xs", activeTag === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
          >
            #{t}
          </button>
        ))}
      </div>

      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">📌 Pinned</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                query={searchQuery}
                onEdit={() => openEdit(note)}
                onDelete={() => setDeleteId(note.id)}
              />
            ))}
          </div>
        </div>
      )}

      {otherNotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">All Notes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                query={searchQuery}
                onEdit={() => openEdit(note)}
                onDelete={() => setDeleteId(note.id)}
              />
            ))}
          </div>
        </div>
      )}

      {filteredNotes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <StickyNote className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No notes found</p>
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Note" : "New Note"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveNote} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                placeholder="Note title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-content">Content</Label>
              <Textarea
                id="note-content"
                placeholder="Write your note..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={formColor} onValueChange={setFormColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-tags">Tags (comma separated)</Label>
              <Input
                id="note-tags"
                placeholder="e.g. work, ideas"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-folder">Folder</Label>
              <Input
                id="note-folder"
                placeholder="e.g. Work or Personal"
                value={formFolder}
                onChange={(e) => setFormFolder(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="note-pinned"
                checked={formPinned}
                onChange={(e) => setFormPinned(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="note-pinned">Pin this note</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editId ? "Save" : "Add Note"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              {noteToDelete ? `"${noteToDelete.title}" will be removed. This cannot be undone.` : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteNote(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function NoteCard({ note, onEdit, onDelete, query }: { note: Note; onEdit: () => void; onDelete: () => void; query: string }) {
  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <mark className="bg-amber/20">{match}</mark>
        {highlight(after, q)}
      </>
    );
  };
  return (
    <div className={cn(
      "p-4 rounded-2xl border border-border/50 hover:shadow-soft transition-all group",
      note.color
    )}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-foreground">{note.title}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg hover:bg-background/50 text-muted-foreground hover:text-foreground" aria-label="Edit note">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" aria-label="Delete note">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-line">
        {highlight(note.content, query)}
      </div>
      {(note.tags && note.tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1 mt-2">
          {note.tags.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">#{t}</span>
          ))}
        </div>
      )}
      {note.folder && (
        <p className="text-[11px] text-muted-foreground/70 mt-1">Folder: {note.folder}</p>
      )}
      <p className="text-xs text-muted-foreground/70 mt-3">{note.updatedAt}</p>
    </div>
  );
}

export default Notes;
