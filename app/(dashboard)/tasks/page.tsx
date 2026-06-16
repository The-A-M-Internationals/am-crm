"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, TaskPriority } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { PipelineService } from "@/lib/pipeline-service";
import { useRouter } from "next/navigation";

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
  const [filter, setFilter]     = useState<"all" | "pending" | "completed">("pending");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [creatingProject, setCreatingProject] = useState(false);

  useEffect(() => {
    const unsubTasks = onSnapshot(query(collection(db, "tasks"), orderBy("createdAt", "desc")), snap => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: [memberEmail, "am@theaminternational.com"],
          subject: `⏰ Task Due Tomorrow: ${task.title}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fc;padding:20px;border-radius:12px;">
              <div style="background:linear-gradient(135deg,#0D1B3E,#1a3070);padding:24px;border-radius:10px 10px 0 0;text-align:center;">
                <h1 style="color:#C9A84C;margin:0;font-size:22px;">A&M CRM</h1>
                <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">Task Reminder</p>
              </div>
              <div style="background:white;padding:24px;border-radius:0 0 10px 10px;">
                <p style="color:#1a1a2e;font-size:15px;">Hi <strong>${memberName}</strong>,</p>
                <p style="color:#6b7280;">This is a reminder that the following task is due <strong style="color:#ef4444;">tomorrow</strong>:</p>
                <div style="background:#f8f9fc;border-left:4px solid #C9A84C;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;">
                  <h3 style="color:#0D1B3E;margin:0 0 8px;">${task.title}</h3>
                  ${task.description ? `<p style="color:#6b7280;margin:0;font-size:13px;">${task.description}</p>` : ""}
                  <p style="color:#9ca3af;font-size:12px;margin:8px 0 0;">Priority: <strong style="color:#374151;">${task.priority}</strong> · Due: <strong style="color:#374151;">${new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong></p>
                </div>
                <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px;">The A&M Internationals FZC · Elevating the World, Elegantly</p>
              </div>
            </div>
          `,
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

  const filtered = tasks
    .filter((t) => filter === "all" ? true : filter === "completed" ? t.status === "completed" : t.status !== "completed")
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
        <button onClick={openAdd} className="btn-primary"><span className="text-base">+</span> Add Task</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#f0f2f8" }}>
          {[{ key: "pending", label: "Pending" }, { key: "completed", label: "Completed" }, { key: "all", label: "All" }].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key as any)} className="px-3 py-1 rounded-lg text-xs font-semibold transition-all" style={{ background: filter === f.key ? "white" : "transparent", color: filter === f.key ? "#0D1B3E" : "#9ca3af", boxShadow: filter === f.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {f.label}
            </button>
          ))}
        </div>
        {PRIORITIES.map((p) => (
          <button key={p.key} onClick={() => setPriorityFilter(priorityFilter === p.key ? "all" : p.key)} className="badge cursor-pointer transition-all hover:opacity-80" style={{ background: priorityFilter === p.key ? p.bg : "white", color: priorityFilter === p.key ? p.color : "#9ca3af", border: `1px solid ${priorityFilter === p.key ? p.border : "#e5e7eb"}` }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#f0f2f8" }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 crm-card"><p className="text-sm" style={{ color: "#9ca3af" }}>{filter === "completed" ? "No completed tasks yet." : "No pending tasks! 🎉"}</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const p = pInfo(task.priority);
            const s = sInfo(task.status ?? "not-started");
            const isOverdue = task.dueDate && task.status !== "completed" && new Date(task.dueDate) < new Date();
            return (
              <div key={task.id} className="crm-card flex items-start gap-4" style={{ opacity: task.status === "completed" ? 0.65 : 1 }}>
                <button onClick={() => toggleDone(task)} className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all" style={{ borderColor: task.status === "completed" ? "#22c55e" : "#d1d5db", background: task.status === "completed" ? "#22c55e" : "white" }}>
                  {task.status === "completed" && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(task)}>
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm font-semibold flex-1" style={{ color: "#1a1a2e", textDecoration: task.status === "completed" ? "line-through" : "none" }}>{task.title}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                      <span className="badge" style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>{task.priority}</span>
                      <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      {isOverdue && <span className="badge badge-overdue">Overdue</span>}
                    </div>
                  </div>
                  {task.description && <p className="text-xs mt-1 truncate" style={{ color: "#9ca3af" }}>{task.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {task.assignedToName && <span className="text-xs font-medium" style={{ color: "#6b7280" }}>👤 {task.assignedToName}</span>}
                    {task.clientName && <span className="text-xs" style={{ color: "#6b7280" }}>🏢 {task.clientName}</span>}
                    {task.dueDate && <span className="text-xs" style={{ color: isOverdue ? "#ef4444" : "#9ca3af" }}>📅 Due {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                  </div>
                  {/* Status quick change */}
                  <div className="flex gap-1 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {TASK_STATUSES.filter((st) => st.key !== (task.status ?? "not-started")).map((st) => (
                      <button key={st.key} onClick={() => updateStatus(task, st.key)} className="text-xs px-2 py-0.5 rounded-lg font-semibold transition-all hover:opacity-80" style={{ background: `${st.color}12`, color: st.color, fontSize: "10px" }}>
                        → {st.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id)} className="btn-danger flex-shrink-0">✕ Delete</button>
              </div>
            );
          })}
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
