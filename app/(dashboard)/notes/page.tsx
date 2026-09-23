"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  SlidersHorizontal, 
  MoreHorizontal, 
  FileText, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Calendar as CalendarIcon, 
  Building2, 
  X, 
  ChevronDown, 
  Pin, 
  Download 
} from "lucide-react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { CRMNote, Lead, Client } from "@/types";
import { toast } from "@/components/ui/toast";

const PRESET_TAGS = ["Meeting", "Call", "Follow-up", "Discovery", "Pricing", "Requirement", "Internal"];

type NoteView = "all" | "my" | "leads" | "clients" | "pinned";

export default function NotesPage() {
  const { crmUser } = useAuth();

  const [notes, setNotes] = useState<CRMNote[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Filter states
  const [currentView, setCurrentView] = useState<NoteView>("all");
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [limitCount, setLimitCount] = useState<number>(50);

  // Popovers
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showLimitMenu, setShowLimitMenu] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Column visibility
  const [columns, setColumns] = useState({
    activityDate: true,
    note: true,
    relatedTo: true,
    author: true,
    tags: true,
    actions: true,
  });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<CRMNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    content: "",
    relatedType: "lead" as "lead" | "client" | "project" | "general",
    relatedId: "",
    relatedName: "",
    activityDate: new Date().toISOString().slice(0, 16),
    tags: [] as string[],
    pinned: false,
  });

  // Load Notes from Firestore
  useEffect(() => {
    if (!crmUser) return;
    const q = query(collection(db, "notes"), orderBy("activityDate", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as CRMNote[];
        setNotes(fetched);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching notes:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [crmUser]);

  // Load Leads & Clients
  useEffect(() => {
    if (!crmUser) return;
    const unsubLeads = onSnapshot(collection(db, "leads"), (snap) => {
      setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Lead[]);
    });
    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Client[]);
    });

    return () => {
      unsubLeads();
      unsubClients();
    };
  }, [crmUser]);

  // Save Note
  async function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim()) {
      toast("Note content cannot be empty", "error");
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      let matchedName = form.relatedName;

      if (form.relatedType === "lead" && form.relatedId) {
        const found = leads.find((l) => l.id === form.relatedId);
        if (found) matchedName = found.company ? `${found.company} (${found.name})` : found.name;
      } else if (form.relatedType === "client" && form.relatedId) {
        const found = clients.find((c) => c.id === form.relatedId);
        if (found) matchedName = found.company || found.name;
      }

      if (editingNote) {
        await updateDoc(doc(db, "notes", editingNote.id), {
          content: form.content.trim(),
          relatedType: form.relatedType,
          relatedId: form.relatedId || null,
          relatedName: matchedName || null,
          activityDate: form.activityDate || now,
          tags: form.tags,
          pinned: form.pinned,
          updatedAt: now,
        });
        toast("Note updated successfully", "success");
      } else {
        await addDoc(collection(db, "notes"), {
          content: form.content.trim(),
          relatedType: form.relatedType,
          relatedId: form.relatedId || null,
          relatedName: matchedName || null,
          authorId: crmUser?.uid || "unknown",
          authorName: crmUser?.name || crmUser?.email?.split("@")[0] || "Team Member",
          authorEmail: crmUser?.email || "",
          activityDate: form.activityDate || now,
          tags: form.tags,
          pinned: form.pinned,
          createdAt: now,
          updatedAt: now,
        });
        toast("Note created successfully", "success");
      }

      closeModal();
    } catch (err) {
      console.error(err);
      toast("Failed to save note", "error");
    } finally {
      setSaving(false);
    }
  }

  // Delete Note
  async function handleDeleteNote(id: string) {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteDoc(doc(db, "notes", id));
      toast("Note deleted", "success");
    } catch (err) {
      console.error(err);
      toast("Failed to delete note", "error");
    }
  }

  // Copy Note Text
  function handleCopy(note: CRMNote) {
    navigator.clipboard.writeText(note.content);
    setCopiedId(note.id);
    toast("Note copied to clipboard", "success");
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Export Notes
  function exportNotes() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `crm-notes-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowMoreMenu(false);
  }

  function openCreateModal() {
    setEditingNote(null);
    setForm({
      content: "",
      relatedType: "lead",
      relatedId: leads[0]?.id || "",
      relatedName: leads[0]?.company || leads[0]?.name || "",
      activityDate: new Date().toISOString().slice(0, 16),
      tags: ["Meeting"],
      pinned: false,
    });
    setShowModal(true);
  }

  function openEditModal(note: CRMNote) {
    setEditingNote(note);
    setForm({
      content: note.content,
      relatedType: note.relatedType || "general",
      relatedId: note.relatedId || "",
      relatedName: note.relatedName || "",
      activityDate: note.activityDate ? new Date(note.activityDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      tags: note.tags || [],
      pinned: !!note.pinned,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingNote(null);
  }

  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  }

  // Unique authors
  const authors = useMemo(() => {
    const map = new Map<string, string>();
    notes.forEach((n) => {
      if (n.authorId && n.authorName) {
        map.set(n.authorId, n.authorName);
      }
    });
    return Array.from(map.entries());
  }, [notes]);

  // Filtered & Sorted Notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    if (currentView === "my") {
      result = result.filter((n) => n.authorId === crmUser?.uid);
    } else if (currentView === "leads") {
      result = result.filter((n) => n.relatedType === "lead");
    } else if (currentView === "clients") {
      result = result.filter((n) => n.relatedType === "client");
    } else if (currentView === "pinned") {
      result = result.filter((n) => n.pinned);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.content.toLowerCase().includes(q) ||
          (n.relatedName && n.relatedName.toLowerCase().includes(q)) ||
          (n.authorName && n.authorName.toLowerCase().includes(q)) ||
          (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    if (selectedAuthor !== "all") {
      result = result.filter((n) => n.authorId === selectedAuthor);
    }

    if (selectedTag !== "all") {
      result = result.filter((n) => n.tags?.includes(selectedTag));
    }

    if (selectedType !== "all") {
      result = result.filter((n) => n.relatedType === selectedType);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.activityDate || a.createdAt).getTime();
      const dateB = new Date(b.activityDate || b.createdAt).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    if (sortOrder === "desc") {
      result.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    }

    if (limitCount > 0) {
      result = result.slice(0, limitCount);
    }

    return result;
  }, [notes, currentView, searchQuery, selectedAuthor, selectedTag, selectedType, sortOrder, limitCount, crmUser]);

  const activeFiltersCount = (selectedAuthor !== "all" ? 1 : 0) + (selectedTag !== "all" ? 1 : 0) + (selectedType !== "all" ? 1 : 0);

  return (
    <div className="p-8 pb-20 bg-slate-50 min-h-screen text-slate-800 flex flex-col font-sans">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              className="flex items-center gap-2 text-2xl font-black text-[#0D1B3E] hover:text-[#C9A84C] transition-colors focus:outline-none"
            >
              <span>
                {currentView === "all" && "Notes Directory"}
                {currentView === "my" && "My Notes"}
                {currentView === "leads" && "Lead Notes"}
                {currentView === "clients" && "Client Notes"}
                {currentView === "pinned" && "Pinned Notes"}
              </span>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </button>

            {showViewDropdown && (
              <div className="absolute left-0 top-10 mt-1 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-2 text-sm">
                <button
                  onClick={() => { setCurrentView("all"); setShowViewDropdown(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between ${currentView === "all" ? "text-[#0D1B3E] font-bold bg-slate-50" : "text-slate-700"}`}
                >
                  All Notes
                  {currentView === "all" && <Check className="w-4 h-4 text-[#C9A84C]" />}
                </button>
                <button
                  onClick={() => { setCurrentView("my"); setShowViewDropdown(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between ${currentView === "my" ? "text-[#0D1B3E] font-bold bg-slate-50" : "text-slate-700"}`}
                >
                  My Notes
                  {currentView === "my" && <Check className="w-4 h-4 text-[#C9A84C]" />}
                </button>
                <button
                  onClick={() => { setCurrentView("leads"); setShowViewDropdown(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between ${currentView === "leads" ? "text-[#0D1B3E] font-bold bg-slate-50" : "text-slate-700"}`}
                >
                  Lead Notes
                  {currentView === "leads" && <Check className="w-4 h-4 text-[#C9A84C]" />}
                </button>
                <button
                  onClick={() => { setCurrentView("clients"); setShowViewDropdown(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between ${currentView === "clients" ? "text-[#0D1B3E] font-bold bg-slate-50" : "text-slate-700"}`}
                >
                  Client Notes
                  {currentView === "clients" && <Check className="w-4 h-4 text-[#C9A84C]" />}
                </button>
                <button
                  onClick={() => { setCurrentView("pinned"); setShowViewDropdown(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between ${currentView === "pinned" ? "text-[#0D1B3E] font-bold bg-slate-50" : "text-slate-700"}`}
                >
                  Pinned Notes
                  {currentView === "pinned" && <Check className="w-4 h-4 text-[#C9A84C]" />}
                </button>
              </div>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">Centralized activity logs, call summaries, and meeting takeaways.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toast("View saved to your presets", "success")}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-sm"
          >
            Save as
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-sm"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-11 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-2 text-xs text-slate-700">
                <button
                  onClick={exportNotes}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" /> Export as JSON
                </button>
                <button
                  onClick={() => { setShowMoreMenu(false); toast("Notes synchronized", "info"); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" /> Refresh List
                </button>
              </div>
            )}
          </div>

          <button
            onClick={openCreateModal}
            className="bg-[#0D1B3E] hover:bg-[#1a3070] text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Note
          </button>
        </div>
      </div>

      {/* Toolbar / Search & Filter Controls */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Left Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Add Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                activeFiltersCount > 0
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Add filter</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#C9A84C] text-[#0D1B3E] font-extrabold text-[10px] flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {showFilterMenu && (
              <div className="absolute left-0 top-11 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 p-4 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900 text-sm">Filter Notes</span>
                  <button onClick={() => setShowFilterMenu(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Author</label>
                  <select
                    value={selectedAuthor}
                    onChange={(e) => setSelectedAuthor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C]"
                  >
                    <option value="all">All Authors</option>
                    {authors.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Related Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C]"
                  >
                    <option value="all">All Types</option>
                    <option value="lead">Lead</option>
                    <option value="client">Client</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Tag</label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C]"
                  >
                    <option value="all">All Tags</option>
                    {PRESET_TAGS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedAuthor("all");
                      setSelectedType("all");
                      setSelectedTag("all");
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Reset all
                  </button>
                  <button
                    onClick={() => setShowFilterMenu(false)}
                    className="px-3.5 py-1.5 bg-[#0D1B3E] text-white font-bold rounded-lg text-xs"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notes, companies, authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#C9A84C] w-56 focus:w-72 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Count & Limit Control */}
          <div className="relative flex items-center text-xs font-semibold text-slate-500">
            <span>
              {filteredNotes.length} Note{filteredNotes.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => setShowLimitMenu(!showLimitMenu)}
              className="ml-1.5 text-slate-600 hover:text-[#0D1B3E] underline decoration-dotted font-bold transition-colors"
            >
              (Set limit: {limitCount === 0 ? "All" : limitCount})
            </button>

            {showLimitMenu && (
              <div className="absolute left-8 top-7 w-32 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5">
                {[25, 50, 100, 200, 0].map((lim) => (
                  <button
                    key={lim}
                    onClick={() => {
                      setLimitCount(lim);
                      setShowLimitMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center justify-between"
                  >
                    <span>{lim === 0 ? "No limit" : `${lim} notes`}</span>
                    {limitCount === lim && <Check className="w-3.5 h-3.5 text-[#C9A84C]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Toolbar */}
        <div className="flex items-center gap-3">
          {/* Activity Date Sort Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-sm"
          >
            <span className="text-sm font-extrabold">{sortOrder === "desc" ? "↓" : "↑"}</span>
            <span>Activity Date</span>
          </button>

          {/* Columns Selector */}
          <div className="relative">
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Columns</span>
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 top-11 w-44 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 p-3 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-1">
                  Visible Columns
                </span>
                {Object.keys(columns).map((colKey) => (
                  <label
                    key={colKey}
                    className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-slate-700 text-xs font-medium"
                  >
                    <span className="capitalize">{colKey.replace(/([A-Z])/g, " $1")}</span>
                    <input
                      type="checkbox"
                      checked={columns[colKey as keyof typeof columns]}
                      onChange={(e) =>
                        setColumns((prev) => ({
                          ...prev,
                          [colKey]: e.target.checked,
                        }))
                      }
                      className="rounded accent-[#0D1B3E]"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <div className="w-8 h-8 border-3 border-[#0D1B3E] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading notes...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          /* Empty State - Crisp Light A&M Theme */
          <div className="border border-slate-200/80 rounded-3xl bg-white py-24 px-6 flex flex-col items-center justify-center text-center shadow-sm">
            {/* Custom SVG Illustration */}
            <div className="w-28 h-28 mb-5 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="w-full h-full">
                <circle cx="80" cy="46" r="16" fill="#fed7aa" />
                <path d="M64 42 C 64 28, 96 28, 96 42 C 92 36, 70 36, 64 42 Z" fill="#f43f5e" />
                <path d="M62 64 L 98 64 L 92 100 L 68 100 Z" fill="#0D1B3E" />
                <path d="M66 98 L 94 98 L 98 126 L 62 126 Z" fill="#C9A84C" />
                <rect x="70" y="126" width="6" height="24" rx="2" fill="#fed7aa" />
                <rect x="84" y="126" width="6" height="24" rx="2" fill="#fed7aa" />
                <rect x="68" y="148" width="10" height="4" rx="2" fill="#0f172a" />
                <rect x="82" y="148" width="10" height="4" rx="2" fill="#0f172a" />
                <circle cx="106" cy="42" r="14" fill="none" stroke="#0D1B3E" strokeWidth="4" />
                <line x1="116" y1="52" x2="128" y2="64" stroke="#0D1B3E" strokeWidth="4" strokeLinecap="round" />
                <path d="M96 66 Q 108 58 116 54" fill="none" stroke="#fed7aa" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </div>

            <h2 className="text-2xl font-black text-[#0D1B3E] mb-2">
              {notes.length === 0 ? "Your organization doesn't have any Notes" : "No notes found matching your filters"}
            </h2>
            <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
              {notes.length === 0
                ? "Once you create a note, it will show up here along with author timestamps and client associations."
                : "Try resetting your search query or removing active filters to see other notes."}
            </p>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-6 py-3 bg-[#0D1B3E] hover:bg-[#1a3070] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Create first note
            </button>
          </div>
        ) : (
          /* Populated Notes Table */
          <div className="border border-slate-200/80 rounded-2xl bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/75 uppercase font-bold text-[11px] tracking-wider">
                    {columns.activityDate && <th className="py-3.5 px-5 w-44">Activity Date</th>}
                    {columns.note && <th className="py-3.5 px-5 min-w-[280px]">Note Content</th>}
                    {columns.relatedTo && <th className="py-3.5 px-5 w-52">Linked To</th>}
                    {columns.author && <th className="py-3.5 px-5 w-44">Created By</th>}
                    {columns.tags && <th className="py-3.5 px-5 w-44">Tags</th>}
                    {columns.actions && <th className="py-3.5 px-5 w-28 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNotes.map((note) => {
                    const formattedDate = note.activityDate
                      ? new Date(note.activityDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—";

                    return (
                      <tr
                        key={note.id}
                        className={`hover:bg-slate-50/80 transition-colors group ${
                          note.pinned ? "bg-amber-50/40" : ""
                        }`}
                      >
                        {/* Activity Date */}
                        {columns.activityDate && (
                          <td className="py-4 px-5 text-slate-700 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {note.pinned && <Pin className="w-3.5 h-3.5 text-[#C9A84C] fill-[#C9A84C]" />}
                              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-slate-800">{formattedDate}</span>
                            </div>
                          </td>
                        )}

                        {/* Note Content */}
                        {columns.note && (
                          <td className="py-4 px-5 text-slate-800">
                            <div className="line-clamp-2 text-sm leading-relaxed whitespace-pre-wrap font-medium select-text">
                              {note.content}
                            </div>
                          </td>
                        )}

                        {/* Related To */}
                        {columns.relatedTo && (
                          <td className="py-4 px-5">
                            {note.relatedName ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 max-w-[200px] truncate text-xs font-semibold">
                                <Building2 className="w-3 h-3 text-[#C9A84C] shrink-0" />
                                <span className="truncate">{note.relatedName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">General note</span>
                            )}
                          </td>
                        )}

                        {/* Author */}
                        {columns.author && (
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#0D1B3E] flex items-center justify-center font-bold text-[10px] text-white">
                                {note.authorName ? note.authorName.slice(0, 2).toUpperCase() : "U"}
                              </div>
                              <span className="text-slate-800 font-medium truncate max-w-[120px]">{note.authorName}</span>
                            </div>
                          </td>
                        )}

                        {/* Tags */}
                        {columns.tags && (
                          <td className="py-4 px-5">
                            <div className="flex flex-wrap gap-1">
                              {note.tags && note.tags.length > 0 ? (
                                note.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200"
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Actions */}
                        {columns.actions && (
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopy(note)}
                                title="Copy note text"
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                {copiedId === note.id ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => openEditModal(note)}
                                title="Edit note"
                                className="p-1.5 text-slate-500 hover:text-[#0D1B3E] hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                title="Delete note"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Note Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-black text-[#0D1B3E] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C9A84C]" />
                {editingNote ? "Edit Note" : "Create New Note"}
              </h3>
              <button 
                onClick={closeModal} 
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNote} className="p-6 space-y-4">
              {/* Note Content */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Note Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Record call summary, meeting minutes, client feedback, or internal observations..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-[#C9A84C] transition-colors resize-none text-sm leading-relaxed"
                />
              </div>

              {/* Related Entity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Link To</label>
                  <select
                    value={form.relatedType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        relatedType: e.target.value as any,
                        relatedId: "",
                        relatedName: "",
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-[#C9A84C] transition-colors text-xs"
                  >
                    <option value="lead">Lead</option>
                    <option value="client">Client</option>
                    <option value="general">General (No Entity)</option>
                  </select>
                </div>

                {form.relatedType === "lead" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Lead</label>
                    <select
                      value={form.relatedId}
                      onChange={(e) => {
                        const l = leads.find((lead) => lead.id === e.target.value);
                        setForm({
                          ...form,
                          relatedId: e.target.value,
                          relatedName: l ? (l.company ? `${l.company} (${l.name})` : l.name) : "",
                        });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-[#C9A84C] transition-colors text-xs"
                    >
                      <option value="">— Select a Lead —</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.company ? `${l.company} - ${l.name}` : l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.relatedType === "client" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Client</label>
                    <select
                      value={form.relatedId}
                      onChange={(e) => {
                        const c = clients.find((client) => client.id === e.target.value);
                        setForm({
                          ...form,
                          relatedId: e.target.value,
                          relatedName: c ? c.company || c.name : "",
                        });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-[#C9A84C] transition-colors text-xs"
                    >
                      <option value="">— Select a Client —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company ? `${c.company} (${c.name})` : c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Activity Date & Pin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Activity Date & Time</label>
                  <input
                    type="datetime-local"
                    value={form.activityDate}
                    onChange={(e) => setForm({ ...form, activityDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-[#C9A84C] transition-colors text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none font-semibold text-xs">
                    <input
                      type="checkbox"
                      checked={form.pinned}
                      onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#0D1B3E]"
                    />
                    <Pin className="w-3.5 h-3.5 text-[#C9A84C]" />
                    <span>Pin note to top</span>
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TAGS.map((tag) => {
                    const isSelected = form.tags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-[#0D1B3E] text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0D1B3E] hover:bg-[#1a3070] disabled:opacity-50 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all"
                >
                  {saving ? "Saving..." : editingNote ? "Update Note" : "Save Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
