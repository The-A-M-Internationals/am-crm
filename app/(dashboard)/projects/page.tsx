"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, ServiceTag, ProjectStatus } from "@/types";
import { useAuth } from "@/lib/auth-context";
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
  clientName: "", title: "", service: "web-development" as ServiceTag,
  status: "not-started" as ProjectStatus, deadline: "",
  description: "", budget: "", currency: "AED",
};

function statusInfo(key: string) {
  return STATUSES.find((s) => s.key === key) ?? STATUSES[0];
}
function serviceInfo(key: string) {
  return SERVICES.find((s) => s.key === key) ?? SERVICES[2];
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

  const canEdit = crmUser?.role === "admin" || crmUser?.role === "manager";

  const searchParams = useSearchParams();

  async function fetchProjects() {
    const [pSnap, mSnap] = await Promise.all([
      getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc"))),
      getDocs(collection(db, "users")),
    ]);
    setProjects(pSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
    setMembers(mSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  useEffect(() => { 
    fetchProjects(); 
    
    // Handle redirect from Clients page
    if (searchParams.get("new") === "true") {
      const clientId = searchParams.get("clientId") || "";
      const clientName = searchParams.get("clientName") || "";
      setForm({ ...EMPTY_FORM, clientId, clientName, assignedTo: [] });
      setEditing(null);
      setShowModal(true);
      router.replace("/projects"); // Clean up URL
    }
  }, [searchParams, router]);

  function openAdd() { setEditing(null); setForm({ ...EMPTY_FORM, assignedTo: [] }); setShowModal(true); }
  function openEdit(p: Project) {
    setEditing(p);
    setForm({ 
      clientName: p.clientName, 
      title: p.title, 
      service: p.service, 
      status: p.status, 
      deadline: p.deadline ?? "", 
      description: p.description ?? "", 
      budget: p.budget?.toString() ?? "",
      currency: p.currency ?? "AED",
      assignedTo: p.assignedTo || []
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

  async function handleSave() {
    if (!form.clientName || !form.title) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const data = { 
        ...form, 
        budget: form.budget ? Number(form.budget) : undefined, 
        clientId: editing?.clientId || "" 
      };
      let projectId = editing?.id;
      if (editing) {
        await updateDoc(doc(db, "projects", editing.id), { ...data, updatedAt: now });
        if (data.status === "in-progress") {
          await createTasksForProject(editing.id, data);
        }
      } else {
        const docRef = await addDoc(collection(db, "projects"), { ...data, createdAt: now, updatedAt: now });
        projectId = docRef.id;
        if (data.status === "in-progress") {
          await createTasksForProject(projectId, data);
        }
      }
      setShowModal(false);
      fetchProjects();
    } finally { setSaving(false); }
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project?")) return;
    await deleteDoc(doc(db, "projects", id));
    fetchProjects();
  }

  async function updateStatus(project: Project, status: ProjectStatus) {
    await updateDoc(doc(db, "projects", project.id), { status, updatedAt: new Date().toISOString() });
    
    if (status === "in-progress") {
      await createTasksForProject(project.id, project);
    }
    
    setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, status } : p));
  }

  const filtered = statusFilter === "all" ? projects : projects.filter((p) => p.status === statusFilter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D1B3E", fontFamily: "var(--font-playfair)" }}>Projects</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{projects.filter((p) => p.status === "in-progress").length} active projects</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90" style={{ background: "#0D1B3E" }}>
            <span className="text-lg leading-none">+</span> New Project
          </button>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[{ key: "all", label: "All", color: "#6b7280", bg: "#f3f4f6" }, ...STATUSES].map((s) => (
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

      {/* Project cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-xl animate-pulse" style={{ background: "#f3f4f6" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: "#9ca3af" }}>No projects found</p>
          {canEdit && <button onClick={openAdd} className="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: "#0D1B3E" }}>+ New Project</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const st = statusInfo(project.status);
            const svc = serviceInfo(project.service);
            const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== "completed";
            return (
              <div 
                key={project.id} 
                className="crm-card hover:shadow-md transition-shadow cursor-pointer" 
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

                {project.description && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: "#9ca3af" }}>{project.description}</p>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t" style={{ borderColor: "#f0f0f5" }}>
                  {project.deadline ? (
                    <span className="text-xs" style={{ color: isOverdue ? "#ef4444" : "#9ca3af" }}>
                      {isOverdue ? "⚠ " : ""}Due {new Date(project.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  ) : <span />}
                  {project.budget && (
                    <span className="text-xs font-medium" style={{ color: "#C9A84C" }}>
                      {project.currency || "AED"} {Number(project.budget).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Quick status change */}
                {canEdit && (
                  <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                    {STATUSES.filter((s) => s.key !== project.status).map((s) => (
                      <button key={s.key} onClick={() => updateStatus(project, s.key)} className="text-xs px-1.5 py-0.5 rounded transition-opacity hover:opacity-80" style={{ background: `${s.color}12`, color: s.color, fontSize: "10px" }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Deadline</label><input className="form-input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                <div className="flex gap-2">
                  <div className="w-24">
                    <label className="form-label">Currency</label>
                    <select className="form-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                      {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="form-label">Budget</label>
                    <input className="form-input" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="5000" />
                  </div>
                </div>
              </div>
              <div><label className="form-label">Description</label><textarea className="form-input resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              
              <div>
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
