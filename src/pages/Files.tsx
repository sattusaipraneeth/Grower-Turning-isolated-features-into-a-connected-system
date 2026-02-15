import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Search, FileText, Image, Link2, Film, Filter, Grid, List as ListIcon, Plus, Trash2, ArrowUpDown, Upload, Download } from "lucide-react";
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { dateKey as toDateKey, selectedDate as getGlobalSelectedDate } from "@/lib/timeState";

const STORAGE_KEY = "green-home-files";
const DB_NAME = "gh-files";
const STORE_NAME = "files";

interface FileItem {
  id: string;
  name: string;
  type: "document" | "image" | "link" | "video";
  source: string;
  size?: string;
  addedAt: string;
  preview?: string;
  mime?: string;
  sizeBytes?: number;
  dateKey?: string;
  linkTarget?: { kind: "goal" | "note"; id: string; title: string } | null;
}

const defaultFiles: FileItem[] = [
  { id: "1", name: "Project Proposal.pdf", type: "document", source: "Goals", size: "2.4 MB", addedAt: "2 days ago" },
  { id: "2", name: "Team Photo.jpg", type: "image", source: "Notes", size: "1.2 MB", addedAt: "1 week ago", preview: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200" },
  { id: "3", name: "React Documentation", type: "link", source: "Study", addedAt: "3 days ago" },
  { id: "4", name: "Meeting Recording.mp4", type: "video", source: "Tasks", size: "45 MB", addedAt: "5 days ago" },
  { id: "5", name: "Budget Spreadsheet.xlsx", type: "document", source: "Goals", size: "856 KB", addedAt: "1 week ago" },
  { id: "6", name: "Design Inspiration", type: "link", source: "Notes", addedAt: "2 weeks ago" },
  { id: "7", name: "Habit Tracker Template.pdf", type: "document", source: "Habits", size: "1.1 MB", addedAt: "3 weeks ago" },
  { id: "8", name: "Nature Wallpaper.png", type: "image", source: "Files", size: "3.2 MB", addedAt: "1 month ago", preview: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200" },
];

function loadFiles(): FileItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FileItem[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return defaultFiles;
}

function saveFiles(files: FileItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveBlob(id: string, file: File) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, name: file.name, mime: file.type, blob: file });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteBlob(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
const typeIcons = {
  document: FileText,
  image: Image,
  link: Link2,
  video: Film,
};

const typeColors = {
  document: "bg-amber/10 text-amber",
  image: "bg-leaf/10 text-leaf",
  link: "bg-primary/10 text-primary",
  video: "bg-destructive/10 text-destructive",
};

const SOURCES = ["Goals", "Notes", "Study", "Tasks", "Habits", "Files", "Other"];

const Files = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>(loadFiles);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"name" | "size" | "addedAt" | "type">("addedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FileItem["type"]>("document");
  const [newSource, setNewSource] = useState("Notes");
  const [newSize, setNewSize] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newDateStr, setNewDateStr] = useState<string>(toDateKey(getGlobalSelectedDate()));
  const [linkKind, setLinkKind] = useState<"none" | "goal" | "note">("none");
  const [linkId, setLinkId] = useState<string>("");
  const [goalOptions, setGoalOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [noteOptions, setNoteOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<FileItem | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    saveFiles(files);
  }, [files]);
  useEffect(() => {
    try {
      const rawGoals = localStorage.getItem("green-home-goals");
      if (rawGoals) {
        const arr = JSON.parse(rawGoals) as Array<{ id: string; title: string }>;
        setGoalOptions(arr.map(g => ({ id: g.id, title: g.title })));
      }
    } catch { void 0; }
    try {
      const rawNotes = localStorage.getItem("green-home-notes");
      if (rawNotes) {
        const arr = JSON.parse(rawNotes) as Array<{ id: string; title: string }>;
        setNoteOptions(arr.map(n => ({ id: n.id, title: n.title })));
      }
    } catch { void 0; }
  }, []);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterType || file.type === filterType;
    return matchesSearch && matchesFilter;
  });
  const parseSize = (s?: string) => {
    if (!s) return 0;
    const m = s.match(/([\d.]+)\s*(KB|MB|GB)/i);
    if (!m) return 0;
    const val = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    const scale = unit === "GB" ? 1e9 : unit === "MB" ? 1e6 : 1e3;
    return val * scale;
  };
  const parseAddedAt = (s: string) => {
    if (s === "Just now") return Date.now();
    const m = s.match(/(\d+)\s*(hour|day|week|month)s?\s+ago/i);
    if (!m) return 0;
    const val = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const scale = unit === "hour" ? 3600e3 : unit === "day" ? 24*3600e3 : unit === "week" ? 7*24*3600e3 : 30*24*3600e3;
    return Date.now() - val * scale;
  };
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let av = 0, bv = 0;
    if (sortKey === "name") { av = a.name.localeCompare(b.name); bv = 0; }
    else if (sortKey === "type") { av = a.type.localeCompare(b.type); bv = 0; }
    else if (sortKey === "size") { av = parseSize(a.size); bv = parseSize(b.size); }
    else if (sortKey === "addedAt") { av = parseAddedAt(a.addedAt); bv = parseAddedAt(b.addedAt); }
    const res = (sortKey === "name" || sortKey === "type") ? av : av - bv;
    return sortDir === "asc" ? res : -res;
  });

  const fileTypes = [...new Set(files.map(f => f.type))];

  const openAdd = () => {
    setNewName("");
    setNewType("document");
    setNewSource("Notes");
    setNewSize("");
    setNewLinkUrl("");
    setAddDialogOpen(true);
  };

  const handleUploadInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files;
    if (!fl || fl.length === 0) return;
    const items: FileItem[] = [];
    for (let i = 0; i < fl.length; i++) {
      const f = fl[i];
      const id = crypto.randomUUID?.() ?? String(Date.now() + i);
      const mime = f.type;
      const type: FileItem["type"] =
        mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : "document";
      let preview: string | undefined = undefined;
      if (type === "image") {
        preview = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(f);
        });
      }
      await saveBlob(id, f);
      const sizeStr = f.size >= 1e9 ? `${(f.size / 1e9).toFixed(1)} GB` : f.size >= 1e6 ? `${(f.size / 1e6).toFixed(1)} MB` : `${Math.round(f.size / 1e3)} KB`;
      items.push({
        id,
        name: f.name,
        type,
        source: "Files",
        size: sizeStr,
        sizeBytes: f.size,
        mime,
        addedAt: "Just now",
        preview,
      });
    }
    setFiles([...files, ...items]);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const fl = e.dataTransfer.files;
    if (!fl || fl.length === 0) return;
    const input = { files: fl } as unknown as HTMLInputElement;
    await handleUploadInput({ target: input } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleDownload = async (id: string, name: string) => {
    const blob = await getBlob(id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const dk = newDateStr && /^\d{4}-\d{2}-\d{2}$/.test(newDateStr) ? newDateStr : toDateKey(getGlobalSelectedDate());
    const link =
      linkKind === "goal" && linkId
        ? { kind: "goal" as const, id: linkId, title: goalOptions.find(g => g.id === linkId)?.title || "" }
        : linkKind === "note" && linkId
        ? { kind: "note" as const, id: linkId, title: noteOptions.find(n => n.id === linkId)?.title || "" }
        : null;
    const newItem: FileItem = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      name: newName.trim(),
      type: newType,
      source: newSource,
      size: newSize.trim() || undefined,
      addedAt: "Just now",
      preview: newType === "link" && newLinkUrl.trim() ? newLinkUrl.trim() : undefined,
      dateKey: dk,
      linkTarget: link,
    };
    setFiles([...files, newItem]);
    setAddDialogOpen(false);
  };

  const deleteFile = (id: string) => {
    const nextFiles = files.filter((f) => f.id !== id);
    setFiles(nextFiles);
    setDeleteId(null);
    saveFiles(nextFiles);
    deleteBlob(id).catch(() => {});
  };
  const fileToDelete = deleteId ? files.find((f) => f.id === deleteId) : null;

  const openViewer = async (file: FileItem) => {
    if (file.type === "link" && file.preview) {
      window.open(file.preview, "_blank", "noopener,noreferrer");
      return;
    }
    let url: string | null = null;
    const blob = await getBlob(file.id).catch(() => null);
    if (blob) {
      url = URL.createObjectURL(blob);
    } else if (file.preview && file.type === "image") {
      url = file.preview;
    }
    setViewerFile(file);
    setViewerUrl(url);
    setViewerOpen(true);
  };
  const closeViewer = () => {
    if (viewerUrl && viewerUrl.startsWith("blob:")) {
      URL.revokeObjectURL(viewerUrl);
    }
    setViewerOpen(false);
    setViewerFile(null);
    setViewerUrl(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Knowledge Vault
          </h1>
          <p className="text-muted-foreground mt-1">All your files, notes, and links — saved in this browser</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "p-4 rounded-xl border border-dashed transition-all",
          isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"
        )}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Drag files here or choose files</span>
          </div>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground cursor-pointer flex-shrink-0">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">Upload</span>
            <input type="file" multiple className="hidden" onChange={handleUploadInput} />
          </label>
        </div>
      </div>

      {/* Add File Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add file or link</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddFile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-name">Name</Label>
              <Input
                id="file-name"
                placeholder="e.g. Project Proposal.pdf"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as FileItem["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-date">Date</Label>
              <Input
                id="file-date"
                type="date"
                value={newDateStr}
                onChange={(e) => setNewDateStr(e.target.value)}
              />
            </div>
            {newType === "link" && (
              <div className="space-y-2">
                <Label htmlFor="file-url">URL</Label>
                <Input
                  id="file-url"
                  type="url"
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={newSource} onValueChange={setNewSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Link to</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={linkKind} onValueChange={(v) => setLinkKind(v as typeof linkKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="goal">Goal</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
                {linkKind !== "none" && (
                  <Select value={linkId} onValueChange={setLinkId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(linkKind === "goal" ? goalOptions : noteOptions).map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-size">Size (optional)</Label>
              <Input
                id="file-size"
                placeholder="e.g. 2.4 MB"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add</Button>
            </DialogFooter>
          </form>
      
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              {fileToDelete ? `"${fileToDelete.name}" will be removed. This cannot be undone.` : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteFile(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search files, notes, links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <button
              onClick={() => setFilterType(null)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0",
                !filterType ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Filter className="w-4 h-4" />
              All
            </button>
            {fileTypes.map((type) => {
              const Icon = typeIcons[type];
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(filterType === type ? null : type)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 capitalize whitespace-nowrap flex-shrink-0",
                    filterType === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {type}s
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <button
              onClick={() => setSortKey("addedAt")}
              className={cn("px-3 py-2 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap flex-shrink-0", sortKey === "addedAt" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">Date</span>
            </button>
            <button
              onClick={() => setSortKey("size")}
              className={cn("px-3 py-2 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap flex-shrink-0", sortKey === "size" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">Size</span>
            </button>
            <button
              onClick={() => setSortKey("type")}
              className={cn("px-3 py-2 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap flex-shrink-0", sortKey === "type" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">Type</span>
            </button>
            <button
              onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
              className="px-3 py-2 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap flex-shrink-0"
            >
              {sortDir === "asc" ? "Asc" : "Desc"}
            </button>
          </div>
        </div>
      </div>

      {/* Files Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedFiles.map((file) => {
            const Icon = typeIcons[file.type];
            return (
              <HoverCard key={file.id}>
                <HoverCardTrigger asChild>
                  <div className="glass-card-hover p-4 cursor-pointer group relative" onClick={() => openViewer(file)}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(file.id); }}
                      className="absolute top-2 right-2 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      aria-label="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.name); }}
                      className="absolute top-2 right-12 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      aria-label="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {/* Preview / Link */}
                    <div className={cn(
                      "aspect-video rounded-xl mb-3 flex items-center justify-center overflow-hidden",
                      typeColors[file.type]
                    )}>
                      {file.type === "link" && file.preview ? (
                        <a href={file.preview} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <Link2 className="w-8 h-8" />
                        </a>
                      ) : file.preview && file.type !== "link" ? (
                        <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon className="w-8 h-8" />
                      )}
                    </div>
                    <h3 className="font-medium text-sm text-foreground truncate">{file.name}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{file.source}</span>
                      <span className="text-xs text-muted-foreground">{file.size || file.addedAt}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-muted-foreground">{file.dateKey || ""}</span>
                      {file.linkTarget && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(file.linkTarget?.kind === "goal" ? "/goals" : "/notes");
                          }}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:text-foreground"
                        >
                          {file.linkTarget.kind === "goal" ? "Goal" : "Note"}: {file.linkTarget.title}
                        </button>
                      )}
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="rounded-lg overflow-hidden">
                    {file.preview && file.type !== "link" ? (
                      <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-40">
                        {file.type === "link" && file.preview ? <Link2 className="w-10 h-10" /> : <Icon className="w-10 h-10" />}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{file.name}</p>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Source</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Size</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Added</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sortedFiles.map((file) => {
                const Icon = typeIcons[file.type];
                return (
                  <tr key={file.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => openViewer(file)}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", typeColors[file.type])}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{file.name}</span>
                          {file.linkTarget && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigate(file.linkTarget?.kind === "goal" ? "/goals" : "/notes"); }}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:text-foreground"
                            >
                              {file.linkTarget.kind === "goal" ? "Goal" : "Note"}: {file.linkTarget.title}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground capitalize">{file.type}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{file.source}</span>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">{file.size || "-"}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">{file.dateKey || file.addedAt}</span>
                    </td>
                    <td className="p-4 w-10">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteId(file.id); }} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.name); }} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/10 ml-1" aria-label="Download">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredFiles.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No files found</p>
        </div>
      )}
      <Dialog open={viewerOpen} onOpenChange={(open) => { if (!open) closeViewer(); else setViewerOpen(true); }}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewerFile?.name || "Preview"}</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl overflow-hidden border border-border">
            {!viewerFile ? (
              <div className="p-6 text-sm text-muted-foreground">No file selected</div>
            ) : viewerFile.type === "image" && viewerUrl ? (
              <img src={viewerUrl} alt={viewerFile.name} className="w-full h-auto" />
            ) : viewerFile.type === "video" && viewerUrl ? (
              <video src={viewerUrl} controls className="w-full h-auto" />
            ) : viewerFile.type === "document" && viewerUrl && (viewerFile.mime?.includes("pdf") || viewerFile.name.toLowerCase().endsWith(".pdf")) ? (
              <iframe title="PDF preview" src={viewerUrl} className="w-full h-[70vh]" />
            ) : viewerFile?.type === "link" && viewerFile.preview ? (
              (() => {
                const linkUrl = viewerFile.preview!;
                const isOffice = /\.(docx?|xlsx?|pptx?)$/i.test(linkUrl);
                if (isOffice) {
                  const officeSrc = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(linkUrl)}`;
                  return <iframe title="Document preview" src={officeSrc} className="w-full h-[70vh]" />;
                }
                return (
                  <div className="p-6 text-sm">
                    <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Open link</a>
                  </div>
                );
              })()
            ) : viewerUrl ? (
              <div className="p-6 text-sm text-muted-foreground">Preview not supported. Use download or open in new tab.</div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">No local content available for preview. Try uploading or downloading.</div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { if (viewerFile) handleDownload(viewerFile.id, viewerFile.name); }}
            >
              Download
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (viewerFile?.type === "link" && viewerFile.preview) {
                  window.open(viewerFile.preview, "_blank", "noopener,noreferrer");
                } else if (viewerUrl) {
                  window.open(viewerUrl, "_blank");
                }
              }}
            >
              Open in new tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Files;
