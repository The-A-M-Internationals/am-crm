"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, query, where, orderBy, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, ProjectTask, ServiceTag, ProjectStatus } from "@/types";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

const STATUSES: { key: ProjectStatus; label: string; color: string; bg: string }[] = [
  { key: "not-started", label: "Not Started", color: "#6b7280", bg: "#f9fafb" },
  { key: "in-progress", label: "In Progress", color: "#1d4ed8", bg: "#eff6ff" },
  { key: "review",      label: "In Review",   color: "#b35a00", bg: "#fff7ed" },
  { key: "completed",   label: "Completed",   color: "#15803d", bg: "#f0fdf4" },
  { key: "on-hold",     label: "On Hold",     color: "#b91c1c", bg: "#fef2f2" },
];

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { crmUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "files">("overview");
  const [newFile, setNewFile] = useState({ name: "", url: "" });
  const [addingFile, setAddingFile] = useState(false);

  async function fetchProject() {
    const [pSnap, uSnap, tSnap] = await Promise.all([
      getDoc(doc(db, "projects", id)),
      getDocs(collection(db, "users")),
      getDocs(query(collection(db, "tasks"), where("relatedTo", "==", id)))
    ]);

    if (pSnap.exists()) {
      setProject({ id: pSnap.id, ...pSnap.data() } as Project);
    }
    setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
    setProjectTasks(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  useEffect(() => { fetchProject(); }, [id]);

  async function addFile() {
    if (!newFile.name || !newFile.url || !project) return;
    setAddingFile(true);
    try {
      const fileObj = { 
        name: newFile.name, 
        url: newFile.url, 
        addedBy: crmUser?.name || "Admin", 
        at: new Date().toISOString() 
      };
      const updatedFiles = [...(project as any).sharedFiles || [], fileObj];
      await updateDoc(doc(db, "projects", project.id), { sharedFiles: updatedFiles });
      setProject({ ...project, sharedFiles: updatedFiles } as any);
      setNewFile({ name: "", url: "" });
    } catch (e) {
      console.error(e);
      alert("Failed to add file");
    } finally {
      setAddingFile(false);
    }
  }

  async function deleteFile(index: number) {
    if (!project || !confirm("Remove this shared file?")) return;
    try {
      const currentFiles = [...(project as any).sharedFiles || []];
      currentFiles.splice(index, 1);
      await updateDoc(doc(db, "projects", project.id), { sharedFiles: currentFiles });
      setProject({ ...project, sharedFiles: currentFiles } as any);
    } catch (e) {
      console.error(e);
      alert("Failed to delete file");
    }
  }

  if (loading) return <div className="p-8 animate-pulse text-sm text-gray-500">Loading project details...</div>;
  if (!project) return <div className="p-8 text-sm text-gray-500">Project not found. <Link href="/projects" className="text-blue-600 underline">Go back</Link></div>;

  const st = STATUSES.find(s => s.key === project.status) || STATUSES[0];
  
  // Collect all unique user IDs assigned either to the project or any of its tasks
  const projectAssignees = project.assignedTo || [];
  const taskAssignees = projectTasks.map(t => t.assignedTo).filter(uid => uid);
  const allInvolvedUids = Array.from(new Set([...projectAssignees, ...taskAssignees]));
  
  const assignedUsers = users.filter(u => allInvolvedUids.includes(u.uid));

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-6" style={{ color: "#9ca3af" }}>
        <Link href="/projects" className="hover:text-[#0D1B3E] transition-colors">Projects</Link>
        <span>/</span>
        <span className="font-semibold" style={{ color: "#0D1B3E" }}>{project.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold" style={{ color: "#0D1B3E", fontFamily: "var(--font-playfair)" }}>{project.title}</h1>
            <span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
          </div>
          <p className="text-sm font-medium" style={{ color: "#6b7280" }}>{project.clientName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>BUDGET</p>
          <p className="text-xl font-bold" style={{ color: "#C9A84C" }}>
            {project.currency || "AED"} {project.budget?.toLocaleString() || "—"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b mb-8" style={{ borderColor: "#f0f0f5" }}>
        {["overview", "tasks", "files"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className="pb-4 text-sm font-bold capitalize relative transition-colors"
            style={{ color: activeTab === tab ? "#0D1B3E" : "#9ca3af" }}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-full" style={{ background: "#C9A84C" }} />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="crm-card">
                <h3 className="text-sm font-bold mb-4" style={{ color: "#0D1B3E" }}>Description</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
                  {project.description || "No description provided for this project."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="crm-card">
                  <h3 className="text-xs font-bold mb-3" style={{ color: "#9ca3af" }}>TIMELINE</h3>
                  <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>
                    Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Not set"}
                  </p>
                </div>
                <div className="crm-card">
                  <h3 className="text-xs font-bold mb-3" style={{ color: "#9ca3af" }}>SERVICE TYPE</h3>
                  <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#1a1a2e" }}>{project.service}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="crm-card">
              <h3 className="text-sm font-bold mb-4" style={{ color: "#0D1B3E" }}>Project Tasks</h3>
              <p className="text-xs" style={{ color: "#9ca3af" }}>This module is being connected to the Task Manager...</p>
            </div>
          )}

          {activeTab === "files" && (
            <div className="space-y-6">
              {/* Add File Form */}
              <div className="crm-card">
                <h3 className="text-sm font-bold mb-4" style={{ color: "#0D1B3E" }}>Add Shared File</h3>
                <div className="flex gap-3">
                  <input 
                    className="form-input" 
                    placeholder="File Name (e.g. Brand Guidelines)" 
                    value={newFile.name}
                    onChange={e => setNewFile({ ...newFile, name: e.target.value })}
                  />
                  <input 
                    className="form-input" 
                    placeholder="URL (Google Drive, Figma, etc.)" 
                    value={newFile.url}
                    onChange={e => setNewFile({ ...newFile, url: e.target.value })}
                  />
                  <button 
                    onClick={addFile}
                    disabled={addingFile || !newFile.name || !newFile.url}
                    className="btn-primary whitespace-nowrap disabled:opacity-50"
                  >
                    {addingFile ? "Adding..." : "+ Add"}
                  </button>
                </div>
                <p className="text-[10px] mt-2" style={{ color: "#9ca3af" }}>
                  Paste a link to any project asset (Figma, Drive, Dropbox, etc.) to share it with the team.
                </p>
              </div>

              {/* Files List */}
              <div className="crm-card">
                <h3 className="text-sm font-bold mb-4" style={{ color: "#0D1B3E" }}>Project Assets</h3>
                <div className="space-y-2">
                  {((project as any).sharedFiles || []).length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: "#9ca3af" }}>No files shared yet.</p>
                  ) : (
                    (project as any).sharedFiles.map((file: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border hover:bg-gray-50 transition-colors" style={{ borderColor: "#f0f0f5" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">📎</div>
                          <div>
                            <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>{file.name}</p>
                            <p className="text-[10px]" style={{ color: "#9ca3af" }}>Added by {file.addedBy} · {new Date(file.at).toLocaleDateString("en-GB")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs font-bold text-[#0D1B3E] hover:underline"
                          >
                            Open Link ↗
                          </a>
                          {(crmUser?.role === "admin" || crmUser?.role === "manager") && (
                            <button 
                              onClick={() => deleteFile(i)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Delete Asset"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="crm-card">
            <h3 className="text-sm font-bold mb-4" style={{ color: "#0D1B3E" }}>Team Members</h3>
            <div className="space-y-3">
              {assignedUsers.length ? assignedUsers.map(user => (
                <div key={user.uid} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#C9A84C20", color: "#C9A84C" }}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: "#1a1a2e" }}>{user.name}</p>
                    <p className="text-[10px]" style={{ color: "#9ca3af" }}>{user.role}</p>
                  </div>
                </div>
              )) : <p className="text-xs text-gray-400">No members assigned.</p>}
            </div>
          </div>

          <div className="crm-card">
            <h3 className="text-sm font-bold mb-4" style={{ color: "#0D1B3E" }}>Last Update</h3>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              {project.updatedAt ? new Date(project.updatedAt).toLocaleString("en-GB") : "Never"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
