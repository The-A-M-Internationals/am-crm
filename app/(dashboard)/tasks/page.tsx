"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, TaskPriority } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { PipelineService } from "@/lib/pipeline-service";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const PRIORITIES = [
  { key: "high",   label: "High",   color: "#991b1b", bg: "#fee2e2", border: "#fecaca" },
  { key: "medium", label: "Medium", color: "#92400e", bg: "#fef3c7", border: "#fde68a" },
  { key: "low",    label: "Low",    color: "#065f46", bg: "#d1fae5", border: "#a7f3d0" },
];

const TASK_STATUSES = [
  { key: "not-started", label: "Not Started", color: "#6b7280", bg: "#f3f4f6" },
  { key: "in-progress", label: "In Progress", color: "#1d4ed8", bg: "#eff6ff" },
  { key: "on-hold",     label: "On Hold",     color: "#92400e", bg: "#fef3c7" },
  { key: "completed",   label: "Completed",   color: "#065f46", bg: "#d1fae5" },
];

const EMPTY_FORM = {
  title: "", description: "", assignedTo: "", assignedToName: "",
  clientId: "", clientName: "", dueDate: "",
  priority: "medium" as TaskPriority,
  status: "not-started",
  relatedTo: "",
  relatedType: "" as "project" | "lead" | "client" | "",
};

export default function TasksPage() {
  const { crmUser } = useAuth();
  const router = useRouter();
  const [tasks, setTasks]     = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<any | null>(null);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState<"not-started" | "in-progress" | "completed">("not-started");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [creatingProject, setCreatingProject] = useState(false);
  const [logInputText, setLogInputText] = useState("");

  useEffect(() => {
    if (!crmUser) return;
    const tasksRef = collection(db, "tasks");
    const tasksQuery = crmUser.role === "employee"
      ? query(tasksRef, where("assignedTo", "==", crmUser.uid))
      : query(tasksRef);

    const unsubTasks = onSnapshot(tasksQuery, snap => {
      setTasks(prev => {
        let next = [...prev];
        snap.docChanges().forEach(change => {
          if (change.type === "added") {
            if (!next.find(t => t.id === change.doc.id)) {
              next.push({ id: change.doc.id, ...change.doc.data() });
            }
          }
          if (change.type === "modified") {
            const index = next.findIndex(t => t.id === change.doc.id);
            if (index !== -1) {
              next[index] = { id: change.doc.id, ...change.doc.data() };
            } else {
              next.push({ id: change.doc.id, ...change.doc.data() });
            }
          }
          if (change.type === "removed") {
            next = next.filter(t => t.id !== change.doc.id);
          }
        });
        return next.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      });
      setLoading(false);
    });
    const unsubUsers = onSnapshot(collection(db, "users"), snap => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubClients = onSnapshot(query(collection(db, "clients"), where("active", "!=", false)), snap => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubProjects = onSnapshot(collection(db, "projects"), snap => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubTasks();
      unsubUsers();
      unsubClients();
      unsubProjects();
    };
  }, []);

  function openAdd() { setEditing(null); setForm({ ...EMPTY_FORM, assignedTo: crmUser?.uid ?? "" }); setShowModal(true); }
  function openEdit(t: any) {
    setEditing(t);
    setForm({ 
      title: t.title, 
      description: t.description ?? "", 
      assignedTo: t.assignedTo ?? "", 
      assignedToName: t.assignedToName ?? "", 
      clientId: t.clientId ?? "", 
      clientName: t.clientName ?? "", 
      dueDate: t.dueDate ?? "", 
      priority: t.priority, 
      status: t.status ?? "not-started", 
      relatedTo: t.relatedTo ?? "",
      relatedType: t.relatedType ?? ""
    });
    setShowModal(true);
  }

  async function quickCreateProject() {
    if (!form.clientId || !form.title) {
      alert("Please select a client and give the task a title first.");
      return;
    }
    setCreatingProject(true);
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, "projects"), {
        title: form.title,
        clientName: form.clientName,
        clientId: form.clientId,
        status: "in-progress",
        service: "web-development",
        createdAt: now,
        updatedAt: now,
        assignedTo: form.assignedTo ? [form.assignedTo] : []
      });
      
      const newProjId = docRef.id;
      setForm(f => ({ ...f, relatedTo: newProjId, relatedType: "project" }));
      alert("✅ Project created and linked!");
    } catch (e) {
      console.error(e);
      alert("Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  }

  async function sendReminderEmail(task: any, memberEmail: string, memberName: string) {
    try {
      const html = `
        <div style="background:#f8f9fc;padding:40px 20px;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <div style="background:linear-gradient(135deg,#0D1B3E,#1a3070);padding:32px;text-align:center;">
              <h1 style="color:#C9A84C;margin:0;font-size:24px;letter-spacing:1px;">A&M CRM</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">Task Reminder</p>
            </div>
            <div style="padding:32px;">
              <p style="color:#1a1a2e;font-size:16px;margin-bottom:12px;">Hi <strong>${memberName}</strong>,</p>
              <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">This is a reminder that a task assigned to you is due <strong>tomorrow</strong>.</p>

              <div style="background:#f8f9fc;border-left:4px solid #C9A84C;padding:24px;border-radius:0 8px 8px 0;">
                <h3 style="color:#0D1B3E;margin:0 0 8px;font-size:18px;">${task.title}</h3>
                ${task.description ? `<p style="color:#4b5563;font-size:13px;margin:8px 0;">${task.description}</p>` : ""}
                <p style="color:#4b5563;font-size:13px;margin:4px 0;"><strong>Priority:</strong> ${task.priority}</p>
                <p style="color:#4b5563;font-size:13px;margin:4px 0;"><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              
              <div style="text-align:center;margin-top:30px;">
                <a href="https://crm.theaminternational.com/tasks" style="background:#0D1B3E;color:#C9A84C;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;display:inline-block;">View Task List</a>
              </div>

              <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:40px;">The A&M Internationals FZC · Elevating the World, Elegantly</p>
            </div>
          </div>
        </div>
      `;

      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: [memberEmail, "am@theaminternational.com"],
          subject: `⏰ Task Due Tomorrow: ${task.title}`,
          html,
        }),
      });
    } catch (err) { console.error("Email error:", err); }
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const member = members.find((m) => m.uid === form.assignedTo);
      const payload = { ...form, assignedToName: member?.name ?? form.assignedToName, assignedBy: crmUser?.uid ?? "" };

      if (editing) {
        await updateDoc(doc(db, "tasks", editing.id), payload);
      } else {
        await addDoc(collection(db, "tasks"), { ...payload, done: false, createdAt: now });
      }

      // Check if due date is tomorrow — send reminder
      if (form.dueDate && member?.email) {
        const due = new Date(form.dueDate);
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        if (due.toDateString() === tomorrow.toDateString()) {
          await sendReminderEmail({ ...form }, member.email, member.name);
        }
      }

      setShowModal(false);
    } finally { setSaving(false); }
  }

  async function toggleDone(task: any) {
    const newStatus = task.status === "completed" ? "in-progress" : "completed";
    if (newStatus === "completed") {
      await PipelineService.handleTaskCompletion(task, crmUser?.uid ?? "");
    } else {
      await updateDoc(doc(db, "tasks", task.id), { done: false, status: "in-progress" });
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    await deleteDoc(doc(db, "tasks", id));
  }

  async function updateStatus(task: any, status: string) {
    if (status === "completed") {
      await PipelineService.handleTaskCompletion(task, crmUser?.uid ?? "");
    } else {
      await updateDoc(doc(db, "tasks", task.id), { status, done: false });
      
      // Inverse State Synchronization
      // If a task is set to 'not-started', push that status up to the parent project
      if (status === "not-started" && task.relatedType === "project" && task.relatedTo) {
        await updateDoc(doc(db, "projects", task.relatedTo), { 
          status: "not-started",
          updatedAt: new Date().toISOString()
        });
      }
    }
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status, done: status === "completed" } : t));
  }

  const milestoneSteps = [
    { key: "not-started", label: "START" },
    { key: "dev", label: "DEV" },
    { key: "test", label: "TEST" },
    { key: "review", label: "REVIEW" },
    { key: "completed", label: "DONE" },
  ];

  const getMilestoneIndex = (status: string) => {
    switch (status) {
      case "not-started": return 0;
      case "dev": case "in-progress": return 1;
      case "test": return 2;
      case "review": return 3;
      case "completed": case "done": return 4;
      default: return 0;
    }
  };

  // Removed unused commitLogEntry

  const filtered = tasks
    .filter((t) => {
       if (filter === "not-started") return t.status === "not-started" || t.status === "on-hold";
       if (filter === "in-progress") return t.status === "in-progress" || t.status === "dev" || t.status === "test" || t.status === "review";
       if (filter === "completed") return t.status === "completed" || t.status === "done";
       return true;
    })
    .filter((t) => priorityFilter === "all" || t.priority === priorityFilter)
    .filter((t) => {
      // Conditional Task Visibility
      // Hide tasks immediately if their parent project is 'not-started'
      if (t.relatedType === "project" && t.relatedTo) {
        const proj = projects.find(p => p.id === t.relatedTo);
        if (proj && proj.status === "not-started") {
          return false;
        }
      }
      return true;
    });

  const pInfo = (key: string) => PRIORITIES.find((p) => p.key === key) ?? PRIORITIES[1];
  const sInfo = (key: string) => TASK_STATUSES.find((s) => s.key === key) ?? TASK_STATUSES[0];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{tasks.filter(t => t.status !== "completed").length} pending · {tasks.filter(t => t.status === "completed").length} completed</p>
        </div>
        {crmUser?.role !== "employee" && (
          <button onClick={openAdd} className="btn-primary"><span className="text-base">+</span> Add Task</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#f0f2f8" }}>
          {[
            { key: "not-started", label: "To Do" }, 
            { key: "in-progress", label: "In Progress" }, 
            { key: "completed", label: "Completed" }
          ].map((f) => {
            const count = tasks.filter(t => {
               if (f.key === "not-started") return t.status === "not-started" || t.status === "on-hold";
               if (f.key === "in-progress") return t.status === "in-progress" || t.status === "dev" || t.status === "test" || t.status === "review";
               if (f.key === "completed") return t.status === "completed" || t.status === "done";
               return true;
            }).length;
            
            return (
              <button 
                key={f.key} 
                onClick={() => setFilter(f.key as any)} 
                className="px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2" 
                style={{ 
                  background: filter === f.key ? "white" : "transparent", 
                  color: filter === f.key ? "#0D1B3E" : "#9ca3af", 
                  boxShadow: filter === f.key ? "0 2px 8px rgba(0,0,0,0.08)" : "none" 
                }}
              >
                {f.label}
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black" style={{ background: filter === f.key ? "#f0f2f8" : "rgba(13,27,62,0.05)" }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {PRIORITIES.map((p) => (
          <button key={p.key} onClick={() => setPriorityFilter(priorityFilter === p.key ? "all" : p.key)} className="badge cursor-pointer transition-all hover:opacity-80" style={{ background: priorityFilter === p.key ? p.bg : "white", color: priorityFilter === p.key ? p.color : "#9ca3af", border: `1px solid ${priorityFilter === p.key ? p.border : "#e5e7eb"}` }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Task list Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: "#f0f2f8" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 crm-card"><p className="text-sm" style={{ color: "#9ca3af" }}>{filter === "completed" ? "No completed tasks yet." : "No tasks in this stage! 🎉"}</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
          {filtered.map((task) => {
            const s = sInfo(task.status ?? "not-started");
            const isOverdue = task.dueDate && task.status !== "completed" && new Date(task.dueDate) < new Date();
            const progress = task.progress || 0;
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={task.id} 
                className="crm-card flex flex-col p-5 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden group border border-slate-100"
                style={{ opacity: task.status === "completed" ? 0.75 : 1 }}
                onClick={() => router.push(`/tasks/${task.id}`)}
              >
                {/* Top strip colored by priority */}
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: pInfo(task.priority).color }} />
                
                {/* Header row */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2 flex-wrap">
                    <span className="badge" style={{ background: pInfo(task.priority).bg, color: pInfo(task.priority).color, border: `1px solid ${pInfo(task.priority).border}` }}>
                      {task.priority}
                    </span>
                    <select
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); updateStatus(task, e.target.value); }}
                      value={task.status ?? "not-started"}
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded cursor-pointer outline-none appearance-none border-none shadow-sm"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {TASK_STATUSES.map(st => (
                        <option key={st.key} value={st.key} style={{ background: "white", color: "black", fontWeight: "bold" }}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                    {isOverdue && <span className="badge bg-red-50 text-red-600 border border-red-100">Overdue</span>}
                  </div>
                  {/* Checkbox button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleDone(task); }} 
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all focus:outline-none hover:scale-110 ml-2 shadow-sm" 
                    style={{ borderColor: task.status === "completed" ? "#22c55e" : "#d1d5db", background: task.status === "completed" ? "#22c55e" : "white" }}
                  >
                    {task.status === "completed" && <svg width="12" height="10" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                </div>

                {/* Title */}
                <h3 className="font-bold text-[#0D1B3E] text-base mb-3 leading-tight pr-2 flex-1" style={{ textDecoration: task.status === "completed" ? "line-through" : "none" }}>{task.title}</h3>

                {/* Interactive Segmented Milestone Tracker (Outside View) */}
                <div className="mb-4 mt-auto bg-slate-50/50 p-3 rounded-2xl border border-slate-100 shadow-inner relative overflow-visible" onClick={(e) => e.stopPropagation()}>
                  <div className="absolute left-5 right-5 h-1.5 bg-slate-200 top-1/2 -translate-y-1/2 rounded-full" />
                  <div 
                    className="absolute left-5 h-1.5 bg-blue-500 top-1/2 -translate-y-1/2 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                    style={{ width: `calc(${progress}% - ${progress === 100 ? 2 : progress === 0 ? 0 : 1.5}rem)` }}
                  />
                  <div className="flex justify-between relative z-10 px-1">
                    {[0, 25, 50, 75, 100].map((step) => {
                      const isCompleted = progress >= step;
                      return (
                        <button
                          key={step}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (task.progress !== step) {
                               await updateDoc(doc(db, "tasks", task.id), { progress: step });
                               if (task.relatedType === "project" && task.relatedTo) {
                                  const q = query(collection(db, "tasks"), where("relatedTo", "==", task.relatedTo));
                                  const snap = await getDocs(q);
                                  let total = 0; let count = 0;
                                  snap.forEach(d => { total += d.id === task.id ? step : (d.data().progress || 0); count++; });
                                  if (count > 0) {
                                      await updateDoc(doc(db, "projects", task.relatedTo), { progress: Math.round(total / count), updatedAt: new Date().toISOString() });
                                  }
                               }
                            }
                          }}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-[9px] font-black transition-all duration-300 ${
                            isCompleted 
                              ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] scale-110 border border-blue-400" 
                              : "bg-white text-slate-400 border border-slate-200 hover:bg-slate-50 hover:scale-105"
                          }`}
                        >
                          {step === 100 && isCompleted ? "✓" : step === 0 ? "🚀" : step}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Metadata */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[11px] font-bold shadow-inner">
                      {task.assignedToName ? task.assignedToName.charAt(0) : "?"}
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 truncate max-w-[90px]">{task.assignedToName || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.dueDate && (
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md tracking-wider shadow-sm border ${isOverdue ? "bg-red-50 text-red-600 border-red-100" : "bg-white text-slate-500 border-slate-200"}`}>
                        📅 {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    {crmUser?.role !== "employee" && (
                      <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Delete Task">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    )}
                  </div>
                </div>

              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}


      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="flex items-center justify-between mb-5">
              <h2 className="modal-title mb-0">{editing ? "Edit Task" : "Add Task"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="space-y-4">
              <div><label className="form-label">Task Title *</label><input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Follow up with client..." /></div>
              <div><label className="form-label">Description</label><textarea className="form-input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Assign To</label>
                  <select className="form-input" value={form.assignedTo} onChange={(e) => { const m = members.find(x => x.uid === e.target.value); setForm({ ...form, assignedTo: e.target.value, assignedToName: m?.name ?? "" }); }}>
                    <option value="">Select team member...</option>
                    {members.map((m) => <option key={m.uid} value={m.uid}>{m.name} ({m.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Client</label>
                  <select className="form-input" value={form.clientId} onChange={(e) => { const c = clients.find(x => x.id === e.target.value); setForm({ ...form, clientId: e.target.value, clientName: c?.company ?? c?.name ?? "" }); }}>
                    <option value="">Select client...</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
                    {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {TASK_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Due Date</label><input className="form-input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                <div>
                  <label className="form-label">Link to Project</label>
                  <div className="flex gap-2">
                    <select className="form-input flex-1" value={form.relatedTo} onChange={(e) => setForm({ ...form, relatedTo: e.target.value, relatedType: e.target.value ? "project" : "" })}>
                      <option value="">No Project</option>
                      {projects
                        .filter(p => p.status !== "completed")
                        .map((p) => <option key={p.id} value={p.id}>[{p.clientName}] {p.title}</option>)}
                    </select>
                    {form.clientId && !form.relatedTo && (
                      <button 
                        onClick={quickCreateProject}
                        disabled={creatingProject || !form.title}
                        className="px-2 py-1 rounded-lg border text-[10px] font-bold whitespace-nowrap transition-all hover:bg-gray-50 disabled:opacity-30"
                        style={{ borderColor: "#e5e7eb", color: "#0D1B3E" }}
                        title="Create a new project from this task"
                      >
                        {creatingProject ? "..." : "➕ New Project"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {form.dueDate && (() => { const due = new Date(form.dueDate); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); return due.toDateString() === tomorrow.toDateString(); })() && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                  ⚡ Due date is tomorrow — assignee will receive an email reminder when you save!
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Update" : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
