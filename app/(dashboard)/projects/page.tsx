"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, ServiceTag, ProjectStatus } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { PipelineService } from "@/lib/pipeline-service";
import { useRouter, useSearchParams } from "next/navigation";

const STATUSES: { key: ProjectStatus; label: string; color: string; bg: string }[] = [
  { key: "not-started", label: "Not Started", color: "#6b7280", bg: "#f9fafb" },
  { key: "in-progress", label: "In Progress", color: "#1d4ed8", bg: "#eff6ff" },
  { key: "review",      label: "In Review",   color: "#b35a00", bg: "#fff7ed" },
  { key: "completed",   label: "Completed",   color: "#15803d", bg: "#f0fdf4" },
  { key: "on-hold",     label: "On Hold",     color: "#b91c1c", bg: "#fef2f2" },
];

const SERVICES: { key: ServiceTag; label: string; bg: string; text: string }[] = [
  { key: "digital-marketing", label: "Digital Marketing", bg: "#e8f4ff", text: "#1a6bc4" },
  { key: "ui-ux",             label: "UI/UX Design",      bg: "#fff3e0", text: "#b35a00" },
  { key: "web-development",   label: "Web Development",   bg: "#e8fff3", text: "#0a7a3e" },
];

const CURRENCIES = [
  { code: "AED", label: "AED (Dirham)" },
  { code: "USD", label: "USD (Dollar)" },
  { code: "INR", label: "INR (Rupee)" },
  { code: "EUR", label: "EUR (Euro)" },
  { code: "GBP", label: "GBP (Pound)" },
];

const EMPTY_FORM = {
  clientId: "", clientName: "", title: "", service: "web-development" as ServiceTag,
  status: "not-started" as ProjectStatus, deadline: "",
  description: "", budget: "", due: "", remaining: "", paid: "", currency: "AED",
  projectSummary: "",
  techStack: [] as string[],
  figmaUrl: "",
  repoUrl: "",
  stagingUrl: "",
  productionUrl: "",
  coreFocus: "Dynamic Web App",
};

function statusInfo(key: string) {
  return STATUSES.find((s) => s.key === key) ?? STATUSES[0];
}
function serviceInfo(key: string) {
  return SERVICES.find((s) => s.key === key) ?? SERVICES[2];
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function ProjectsPage() {
  const { crmUser } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, assignedTo: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [activeDropdownProjectId, setActiveDropdownProjectId] = useState<string | null>(null);

  const canEdit = crmUser?.role === "admin" || crmUser?.role === "lead";

  const searchParams = useSearchParams();

  useEffect(() => { 
    const unsubProjects = onSnapshot(query(collection(db, "projects"), orderBy("createdAt", "desc")), snap => {
      let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
      if (crmUser && crmUser.role !== "admin") {
        list = list.map(p => {
          const clean = { ...p };
          delete clean.budget;
          delete (clean as any).contractValue;
          delete (clean as any).pipelineValue;
          delete (clean as any).due;
          delete (clean as any).paid;
          delete (clean as any).remaining;
          delete (clean as any).balance;
          delete (clean as any).payments;
          return clean;
        });
      }
      setProjects(list);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), snap => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    
    // Handle redirect from Clients page
    if (searchParams.get("new") === "true") {
      const clientId = searchParams.get("clientId") || "";
      const clientName = searchParams.get("clientName") || "";
      setForm({ ...EMPTY_FORM, clientId, clientName, assignedTo: [] });
      setEditing(null);
      setShowModal(true);
      router.replace("/projects"); // Clean up URL
    }

    return () => {
      unsubProjects();
      unsubUsers();
    };
  }, [searchParams, router, crmUser]);

  function openAdd() { setEditing(null); setForm({ ...EMPTY_FORM, assignedTo: [] }); setShowModal(true); }
  function openEdit(p: Project) {
    setEditing(p);
    setForm({ 
      clientId: p.clientId,
      clientName: p.clientName, 
      title: p.title, 
      service: p.service, 
      status: p.status, 
      deadline: p.deadline ?? "", 
      description: p.description ?? "", 
      budget: p.budget?.toString() ?? "",
      due: p.due?.toString() ?? "",
      remaining: p.remaining?.toString() ?? p.balance?.toString() ?? "",
      paid: p.paid?.toString() ?? "",
      currency: p.currency ?? "AED",
      assignedTo: p.assignedTo || [],
      projectSummary: (p as any).projectSummary ?? "",
      techStack: (p as any).techStack || [],
      figmaUrl: (p as any).figmaUrl ?? "",
      repoUrl: (p as any).repoUrl ?? "",
      stagingUrl: (p as any).stagingUrl ?? "",
      productionUrl: (p as any).productionUrl ?? "",
      coreFocus: (p as any).coreFocus ?? "Dynamic Web App",
    });
    setShowModal(true);
  }

  async function createTasksForProject(projectId: string, projectData: any) {
    if (!projectData.assignedTo || projectData.assignedTo.length === 0) return;
    
    const now = new Date().toISOString();
    
    // Check if tasks already exist for this project to avoid duplicates
    const existingTasksSnap = await getDocs(query(collection(db, "tasks"), where("relatedTo", "==", projectId)));
    if (!existingTasksSnap.empty) return;

    for (const uid of projectData.assignedTo) {
      const member = members.find(m => m.uid === uid);
      await addDoc(collection(db, "tasks"), {
        title: projectData.title,
        description: projectData.description || `Task for project: ${projectData.title}`,
        assignedTo: uid,
        assignedToName: member?.name || "Team Member",
        assignedBy: crmUser?.uid || "System",
        clientId: projectData.clientId || "",
        clientName: projectData.clientName || "",
        relatedTo: projectId,
        relatedType: "project",
        priority: "medium",
        status: "not-started",
        done: false,
        createdAt: now,
        dueDate: projectData.deadline || now
      });
    }
  }

  async function deleteTasksForProject(projectId: string) {
    try {
      const q = query(collection(db, "tasks"), where("relatedTo", "==", projectId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "tasks", d.id));
      }
      console.log(`Deleted ${snap.docs.length} tasks for project ${projectId}`);
    } catch (error) {
      console.error("Error deleting tasks for project:", error);
    }
  }

  async function handleSave() {
    if (!form.clientName || !form.title) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const data: any = { 
        ...form, 
        clientId: editing?.clientId || "" 
      };
      
      if (form.budget) data.budget = Number(form.budget);
      else delete data.budget;

      if (form.due) data.due = Number(form.due);
      else delete data.due;

      if (form.paid) data.paid = Number(form.paid);
      else delete data.paid;

      if (form.remaining) data.remaining = Number(form.remaining);
      else delete data.remaining;
      
      // Clean up legacy fields if present
      data.balance = null;

      let projectId = editing?.id;
      if (editing) {
        await updateDoc(doc(db, "projects", editing.id), { ...data, updatedAt: now });
        if (data.status === "in-progress") {
          await createTasksForProject(editing.id, data);
        } else if (data.status === "not-started") {
          await deleteTasksForProject(editing.id);
        }
      } else {
        const docRef = await addDoc(collection(db, "projects"), { ...data, createdAt: now, updatedAt: now });
        projectId = docRef.id;
        if (data.status === "in-progress") {
          await createTasksForProject(projectId, data);
        }
      }
      setShowModal(false);
    } finally { setSaving(false); }
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project? This will also remove associated tasks.")) return;
    await deleteDoc(doc(db, "projects", id));
    await deleteTasksForProject(id);
  }

  async function updateStatus(project: Project, status: ProjectStatus) {
    await PipelineService.updateProjectStatus(project.id, status, crmUser?.uid ?? "");
    
    // Create tasks if moving to in-progress
    if (status === "in-progress") {
      await createTasksForProject(project.id, project);
    }
    
    setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, status } : p));
  }

  const activeProjects = projects.filter(p => p.status !== "completed");
  const completedProjects = projects.filter(p => p.status === "completed");

  const filteredActive = statusFilter === "all" 
    ? activeProjects 
    : statusFilter === "completed" ? [] : activeProjects.filter(p => p.status === statusFilter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D1B3E", fontFamily: "var(--font-playfair)" }}>Projects</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{activeProjects.filter((p) => p.status === "in-progress").length} active projects</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90" style={{ background: "#0D1B3E" }}>
            <span className="text-lg leading-none">+</span> New Project
          </button>
        )}
      </div>

      {/* Status filter (for active column) */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {[{ key: "all", label: "All Active", color: "#6b7280", bg: "#f3f4f6" }, ...STATUSES.filter(s => s.key !== "completed")].map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key as any)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: statusFilter === s.key ? s.bg : "#f9fafb",
              color: statusFilter === s.key ? s.color : "#9ca3af",
              border: `1px solid ${statusFilter === s.key ? s.color + "44" : "#e5e7eb"}`,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-xl animate-pulse" style={{ background: "#f3f4f6" }} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Active Column */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              Active Pipeline ({filteredActive.length})
            </h2>
            
            {filteredActive.length === 0 ? (
              <div className="text-center py-12 crm-card border-dashed bg-slate-50/50">
                <p className="text-xs text-slate-400">No active projects found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredActive.map((project) => {
                  const st = statusInfo(project.status);
                  const svc = serviceInfo(project.service);
                  const isOverdue = project.deadline && new Date(project.deadline) < new Date();
                  return (
                    <div 
                      key={project.id} 
                      className="crm-card hover:shadow-md transition-shadow cursor-pointer flex flex-col relative" 
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#1a1a2e" }}>{project.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{project.clientName}</p>
                        </div>
                        {canEdit && (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openEdit(project)} className="text-xs opacity-50 hover:opacity-100 transition-opacity" style={{ color: "#1e40af" }}>✎</button>
                            <button onClick={() => deleteProject(project.id)} className="text-xs opacity-50 hover:opacity-100 transition-opacity" style={{ color: "#ef4444" }}>✕</button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="badge" style={{ background: svc.bg, color: svc.text }}>{svc.label.split(" ")[0]}</span>
                        <span className="badge capitalize" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      </div>

                      {/* Overlapping circular avatar badges of assigned employees */}
                      <div className="flex -space-x-2 overflow-hidden mb-3">
                        {(project.assignedTo || []).map((uid) => {
                          const member = members.find((m) => m.uid === uid);
                          if (!member) return null;
                          return (
                            <div 
                              key={uid} 
                              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm flex-shrink-0"
                              style={{ background: "#0D1B3E" }}
                              title={member.name}
                            >
                              {member.name ? getInitials(member.name) : "?"}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-col gap-2 mt-auto pt-3 border-t" style={{ borderColor: "#f0f0f5" }}>
                        <div className="flex items-center justify-between">
                          {project.deadline ? (
                            <span className="text-xs" style={{ color: isOverdue ? "#ef4444" : "#9ca3af" }}>
                              {isOverdue ? "⚠ " : ""}Due {new Date(project.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          ) : <span className="text-xs text-slate-400">No deadline</span>}
                          {crmUser?.role === "admin" && (
                            <span className="text-xs font-bold" style={{ color: "#C9A84C" }}>{project.currency} {(project.budget)?.toLocaleString()}</span>
                          )}
                        </div>
                        {crmUser?.role === "admin" && (
                          <div className="flex items-center justify-between text-[10px] font-medium bg-slate-50 p-1.5 rounded-lg">
                            <span className="text-slate-500">Paid: <strong className="text-green-600">{project.currency} {(project.paid)?.toLocaleString() || "0"}</strong></span>
                            <span className="text-slate-500">Due: <strong className="text-orange-600">{project.currency} {(project.due)?.toLocaleString() || "0"}</strong></span>
                            <span className="text-slate-500">Remaining: <strong className="text-red-600">{project.currency} {(project.remaining ?? project.balance)?.toLocaleString() || "0"}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Quick status change & Delegate Menu */}
                      {canEdit && (
                        <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: "#f0f0f5" }} onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button 
                              onClick={() => setActiveDropdownProjectId(activeDropdownProjectId === project.id ? null : project.id)}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-white flex items-center gap-1 transition-colors hover:bg-slate-50"
                              style={{ color: "#0D1B3E", borderColor: "#e5e7eb" }}
                            >
                              Change Status ▼
                            </button>
                            {activeDropdownProjectId === project.id && (
                              <div className="absolute left-0 bottom-full mb-1 w-40 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                                {STATUSES.map((s) => (
                                  <button
                                    key={s.key}
                                    onClick={() => {
                                      updateStatus(project, s.key);
                                      setActiveDropdownProjectId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                    style={{ color: s.color }}
                                  >
                                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }}></span>
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => router.push(`/projects/${project.id}?delegate=true`)}
                            className="text-xs font-bold text-[#C9A84C] hover:underline flex items-center gap-1"
                          >
                            Delegate
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed Column */}
          <div className="space-y-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              Success Archive ({completedProjects.length})
            </h2>

            <div className="space-y-3">
              {completedProjects.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border-2 border-dashed border-slate-100">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No archived projects</p>
                </div>
              ) : (
                completedProjects.map(p => (
                  <div 
                    key={p.id} 
                    className="crm-card bg-slate-50/50 border-slate-100 hover:bg-white hover:border-green-200 transition-all cursor-pointer group"
                    onClick={() => router.push(`/projects/${p.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-slate-700 group-hover:text-green-700 transition-colors">{p.title}</p>
                      <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">DONE</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mb-3">{p.clientName}</p>
                    
                    {crmUser?.role === "admin" && (
                      <div className="flex justify-between items-center text-[10px] font-bold pt-2 border-t border-slate-100">
                        <span className="text-slate-400 uppercase">Valued at</span>
                        <span className="text-slate-900">{p.currency} {p.budget?.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {/* Revert option */}
                    {canEdit && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); updateStatus(p, "in-progress"); }}
                        className="w-full mt-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest rounded-lg border border-slate-200 hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-all"
                      >
                        ↩ Revert to Active
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: "white" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "#0D1B3E", fontFamily: "var(--font-playfair)" }}>{editing ? "Edit Project" : "New Project"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div><label className="form-label">Project Title *</label><input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Website Redesign" /></div>
              <div><label className="form-label">Client Name *</label><input className="form-input" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Service</label>
                  <select className="form-input" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value as ServiceTag })}>
                    {SERVICES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                    {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className={crmUser?.role === "admin" ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
                <div><label className="form-label">Deadline</label><input className="form-input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                {crmUser?.role === "admin" && (
                  <div className="flex gap-2">
                    <div className="w-24">
                      <label className="form-label">Currency</label>
                      <select className="form-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                        {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="form-label">Budget</label>
                      <input
                        className="form-input"
                        type="number"
                        value={Number(form.budget) === 0 ? "" : form.budget}
                        onChange={(e) => {
                          const budgetVal = Number(e.target.value) || 0;
                          const paidVal = Number(form.paid) || 0;
                          setForm({
                            ...form,
                            budget: e.target.value,
                            remaining: (budgetVal - paidVal).toString()
                          });
                        }}
                        placeholder="Total Budget"
                      />
                    </div>
                  </div>
                )}
              </div>
              {crmUser?.role === "admin" && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Due</label>
                    <input
                      className="form-input"
                      type="number"
                      value={Number(form.due) === 0 ? "" : form.due}
                      onChange={(e) => setForm({ ...form, due: e.target.value })}
                      placeholder="Amount Due"
                    />
                  </div>
                  <div>
                    <label className="form-label">Paid</label>
                    <input
                      className="form-input"
                      type="number"
                      value={Number(form.paid) === 0 ? "" : form.paid}
                      onChange={(e) => {
                        const paidVal = Number(e.target.value) || 0;
                        const budgetVal = Number(form.budget) || 0;
                        setForm({
                          ...form,
                          paid: e.target.value,
                          remaining: (budgetVal - paidVal).toString()
                        });
                      }}
                      placeholder="Amount Paid"
                    />
                  </div>
                  <div>
                    <label className="form-label">Remaining</label>
                    <input
                      className="form-input bg-gray-50 text-gray-500"
                      type="number"
                      value={Number(form.remaining) === 0 ? "" : form.remaining}
                      readOnly
                      placeholder="Remaining"
                    />
                  </div>
                </div>
              )}
              <div><label className="form-label">Description</label><textarea className="form-input resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              
              <div>
                <label className="form-label">Project Summary (Execution Strategy, Deadlines, Details)</label>
                <textarea 
                  className="form-input resize-none" 
                  rows={4} 
                  value={form.projectSummary} 
                  onChange={(e) => setForm({ ...form, projectSummary: e.target.value })} 
                  placeholder="Enter detailed execution strategy, requirements, and deadlines..." 
                />
              </div>

              {/* Environment Provisioning Section */}
              <div className="border-t pt-4 mt-4" style={{ borderColor: "#f0f0f5" }}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-slate-500">Environment Provisioning</h4>
                
                {/* Tech Stack Pills */}
                <div className="mb-4">
                  <label className="form-label">Core Architecture Stack (Select framework environments)</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {["Next.js", "Three.js", "Tailwind", "Node.js", "Firestore", "GSAP"].map((tech) => {
                      const selected = form.techStack.includes(tech);
                      return (
                        <button
                          key={tech}
                          type="button"
                          onClick={() => {
                            const newStack = selected
                              ? form.techStack.filter((t) => t !== tech)
                              : [...form.techStack, tech];
                            setForm({ ...form, techStack: newStack });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            selected 
                              ? "bg-[#0D1B3E] text-white border-[#0D1B3E]" 
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {tech}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Core Focus Toggle */}
                <div className="mb-4">
                  <label className="form-label">Primary Core Focus</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {["Dynamic Web App", "Static Branding", "E-Commerce Build"].map((focus) => {
                      const selected = form.coreFocus === focus;
                      return (
                        <button
                          key={focus}
                          type="button"
                          onClick={() => setForm({ ...form, coreFocus: focus })}
                          className={`py-2 px-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                            selected
                              ? "bg-[#C9A84C] text-[#0D1B3E] border-[#C9A84C] shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {focus}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* URL Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="form-label">Figma Canvas URL</label>
                    <input className="form-input" value={form.figmaUrl} onChange={(e) => setForm({ ...form, figmaUrl: e.target.value })} placeholder="https://figma.com/file/..." />
                  </div>
                  <div>
                    <label className="form-label">Repository Endpoint</label>
                    <input className="form-input" value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} placeholder="https://github.com/..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Staging Environment Link</label>
                      <input className="form-input" value={form.stagingUrl} onChange={(e) => setForm({ ...form, stagingUrl: e.target.value })} placeholder="https://staging.domain.com" />
                    </div>
                    <div>
                      <label className="form-label">Production Endpoint</label>
                      <input className="form-input" value={form.productionUrl} onChange={(e) => setForm({ ...form, productionUrl: e.target.value })} placeholder="https://domain.com" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4" style={{ borderColor: "#f0f0f5" }}>
                <label className="form-label">Assign Team Members</label>
                <div className="grid grid-cols-2 gap-2 mt-2 p-3 rounded-xl border" style={{ borderColor: "#f0f0f5" }}>
                  {members.map((m) => (
                    <label key={m.uid} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-[#0D1B3E] focus:ring-[#0D1B3E]"
                        checked={form.assignedTo.includes(m.uid)}
                        onChange={(e) => {
                          const newAssigned = e.target.checked 
                            ? [...form.assignedTo, m.uid]
                            : form.assignedTo.filter(id => id !== m.uid);
                          setForm({ ...form, assignedTo: newAssigned });
                        }}
                      />
                      <span className="text-xs font-medium group-hover:text-[#0D1B3E]" style={{ color: "#6b7280" }}>{m.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border text-sm font-medium" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50" style={{ background: "#0D1B3E" }}>
                {saving ? "Saving..." : editing ? "Update" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .form-label { display: block; font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 4px; }
        .form-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 13px; color: #1a1a2e; outline: none; transition: border-color 0.15s; background: white; font-family: var(--font-poppins); }
        .form-input:focus { border-color: #C9A84C; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}
