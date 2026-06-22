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
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "files" | "payments">("overview");
  const [newFile, setNewFile] = useState({ name: "", url: "" });
  const [addingFile, setAddingFile] = useState(false);

  // Payment Log State
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: new Date().toISOString().split('T')[0], method: "Bank Transfer", notes: "" });
  const [loggingPayment, setLoggingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Edit Financials State
  const [showFinancialsModal, setShowFinancialsModal] = useState(false);
  const [finForm, setFinForm] = useState({ budget: "", due: "", paid: "", remaining: "" });
  const [savingFin, setSavingFin] = useState(false);

  // Reminder State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderBody, setReminderBody] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);

  // Dynamic Overview State
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  
  const [addingField, setAddingField] = useState(false);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldValue, setFieldValue] = useState("");

  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function logPayment() {
    if (!project || !paymentForm.amount) return;
    setLoggingPayment(true);
    try {
      const amountNum = Number(paymentForm.amount);
      const newPayment = {
        id: Math.random().toString(36).substr(2, 9),
        amount: amountNum,
        date: paymentForm.date,
        method: paymentForm.method,
        notes: paymentForm.notes,
        loggedBy: crmUser?.name || "System"
      };

      const updatedPayments = [...(project.payments || []), newPayment];
      
      // Auto-calculate new balance
      const basePaid = project.paid ?? 0;
      const loggedPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalPaid = basePaid + loggedPaid;
      const newRemaining = (project.budget ?? 0) - totalPaid;

      await updateDoc(doc(db, "projects", project.id), { 
        payments: updatedPayments,
        remaining: newRemaining,
        updatedAt: new Date().toISOString()
      });

      setProject({ ...project, payments: updatedPayments, remaining: newRemaining });
      setShowPaymentModal(false);
      setPaymentForm({ amount: "", date: new Date().toISOString().split('T')[0], method: "Bank Transfer", notes: "" });
    } catch (e) {
      console.error(e);
      alert("Failed to log payment");
    } finally {
      setLoggingPayment(false);
    }
  }

  function openEditFinancials() {
    if (!project) return;
    setFinForm({
      budget: project.budget?.toString() || "",
      due: project.due?.toString() || "",
      paid: project.paid?.toString() || "",
      remaining: project.remaining?.toString() || ""
    });
    setShowFinancialsModal(true);
  }

  async function saveFinancials() {
    if (!project) return;
    setSavingFin(true);
    try {
      const b = Number(finForm.budget) || 0;
      const d = Number(finForm.due) || 0;
      const p = Number(finForm.paid) || 0;
      const r = Number(finForm.remaining) || 0;

      await updateDoc(doc(db, "projects", project.id), {
        budget: b,
        due: d,
        paid: p,
        remaining: r,
        updatedAt: new Date().toISOString()
      });
      setProject({ ...project, budget: b, due: d, paid: p, remaining: r });
      setShowFinancialsModal(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save financials");
    } finally {
      setSavingFin(false);
    }
  }

  function openReminder() {
    const defaultText = `Dear ${project?.clientName || "Client"},\n\nWe hope this message finds you well.\n\nWe are writing to gently remind you that there is a pending balance of ${project?.currency || "AED"} ${project?.due?.toLocaleString() || "0"} on your account for the "${project?.title}" project. We understand that oversights happen, and we would greatly appreciate it if you could process this payment at your earliest convenience.\n\nIf you have already processed the payment, please kindly disregard this message.\n\nThank you for your continued partnership and trust in us.\n\nWarm regards,\nA&M Internationals Team`;
    setReminderBody(defaultText);
    setShowReminderModal(true);
  }

  async function sendReminder() {
    setSendingReminder(true);
    try {
      // Simulate sending
      await new Promise(res => setTimeout(res, 800));
      alert("Reminder sent successfully!");
      setShowReminderModal(false);
    } finally {
      setSendingReminder(false);
    }
  }

  // --- DYNAMIC OVERVIEW HANDLERS ---
  async function saveDescription() {
    if (!project) return;
    try {
      await updateDoc(doc(db, "projects", project.id), { description: descValue });
      setProject({ ...project, description: descValue });
      setEditingDesc(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save description");
    }
  }

  async function saveCustomField() {
    if (!project || !fieldLabel.trim() || !fieldValue.trim()) return;
    try {
      const newField = { id: Date.now().toString(), label: fieldLabel, value: fieldValue };
      const updated = [...(project.customFields || []), newField];
      await updateDoc(doc(db, "projects", project.id), { customFields: updated });
      setProject({ ...project, customFields: updated });
      setAddingField(false);
      setFieldLabel("");
      setFieldValue("");
    } catch (e) {
      console.error(e);
      alert("Failed to add field");
    }
  }

  async function deleteCustomField(id: string) {
    if (!project) return;
    try {
      const updated = (project.customFields || []).filter((f: any) => f.id !== id);
      await updateDoc(doc(db, "projects", project.id), { customFields: updated });
      setProject({ ...project, customFields: updated });
    } catch (e) {
      console.error(e);
    }
  }

  async function saveMilestone() {
    if (!project || !milestoneTitle.trim() || !milestoneDate) return;
    try {
      const newMilestone = { 
        id: Date.now().toString(), 
        title: milestoneTitle, 
        date: milestoneDate, 
        completed: false 
      };
      const updated = [...(project.milestones || []), newMilestone];
      await updateDoc(doc(db, "projects", project.id), { milestones: updated });
      setProject({ ...project, milestones: updated });
      setAddingMilestone(false);
      setMilestoneTitle("");
      setMilestoneDate("");
    } catch (e) {
      console.error(e);
      alert("Failed to add milestone");
    }
  }

  async function toggleMilestone(id: string) {
    if (!project) return;
    try {
      const updated = (project.milestones || []).map((m: any) => 
        m.id === id ? { ...m, completed: !m.completed } : m
      );
      await updateDoc(doc(db, "projects", project.id), { milestones: updated });
      setProject({ ...project, milestones: updated });
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteMilestone(id: string) {
    if (!project) return;
    try {
      const updated = (project.milestones || []).filter((m: any) => m.id !== id);
      await updateDoc(doc(db, "projects", project.id), { milestones: updated });
      setProject({ ...project, milestones: updated });
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) return <div className="p-8 animate-pulse text-sm text-gray-500">Loading project details...</div>;
  if (!project) return <div className="p-8 text-sm text-gray-500">Project not found. <Link href="/projects" className="text-blue-600 underline">Go back</Link></div>;

  const st = STATUSES.find(s => s.key === project.status) || STATUSES[0];
  
  const projectAssignees = project.assignedTo || [];
  const taskAssignees = projectTasks.map(t => t.assignedTo).filter(uid => uid);
  const allInvolvedUids = Array.from(new Set([...projectAssignees, ...taskAssignees]));
  const assignedUsers = users.filter(u => allInvolvedUids.includes(u.uid));

  const basePaid = project.paid ?? 0;
  const loggedPaid = (project.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = basePaid + loggedPaid;
  const calculatedRemaining = (project.budget ?? 0) - totalPaid;

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
        <div className="flex items-center gap-8 text-right">
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>TOTAL BUDGET</p>
            <p className="text-xl font-bold" style={{ color: "#0D1B3E" }}>
              {project.currency || "AED"} {(project.budget)?.toLocaleString() || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>CURRENT DUE</p>
            <p className="text-xl font-bold text-orange-500">
              {project.currency || "AED"} {(project.due)?.toLocaleString() || "0"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>TOTAL PAID</p>
            <p className="text-xl font-bold text-green-600">
              {project.currency || "AED"} {totalPaid.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>REMAINING</p>
            <p className="text-xl font-bold text-red-500">
              {project.currency || "AED"} {calculatedRemaining.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b mb-8" style={{ borderColor: "#f0f0f5" }}>
        {["overview", "tasks", "files", "payments"].map((tab) => (
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
              {/* DESCRIPTION BLOCK */}
              <div className="crm-card group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Description</h3>
                  {!editingDesc && (
                    <button 
                      onClick={() => { setDescValue(project.description || ""); setEditingDesc(true); }}
                      className="text-xs font-bold text-slate-400 hover:text-[#C9A84C] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>
                
                {editingDesc ? (
                  <div className="space-y-3">
                    <textarea 
                      className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-[#C9A84C] text-sm"
                      rows={4}
                      value={descValue}
                      onChange={e => setDescValue(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={saveDescription} className="btn-primary py-1.5 px-4 text-xs">Save</button>
                      <button onClick={() => setEditingDesc(false)} className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
                    {project.description || "No description provided. Click edit to add one."}
                  </p>
                )}
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

              {/* CUSTOM FIELDS BLOCK */}
              <div className="crm-card group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Project Details</h3>
                  <button 
                    onClick={() => setAddingField(true)}
                    className="text-xs font-bold text-[#C9A84C] hover:underline"
                  >
                    + Add Custom Field
                  </button>
                </div>

                {addingField && (
                  <div className="flex gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <input 
                      placeholder="Label (e.g. Server IP)" 
                      className="flex-1 p-2 text-xs rounded-lg border outline-none focus:border-[#C9A84C]"
                      value={fieldLabel}
                      onChange={e => setFieldLabel(e.target.value)}
                    />
                    <input 
                      placeholder="Value" 
                      className="flex-1 p-2 text-xs rounded-lg border outline-none focus:border-[#C9A84C]"
                      value={fieldValue}
                      onChange={e => setFieldValue(e.target.value)}
                    />
                    <button onClick={saveCustomField} className="btn-primary px-3 text-xs">Add</button>
                    <button onClick={() => setAddingField(false)} className="px-3 text-xs text-slate-500 font-bold hover:bg-slate-200 rounded-lg">✕</button>
                  </div>
                )}

                <div className="space-y-2">
                  {(!project.customFields || project.customFields.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">No custom fields added. Make this project scalable by tracking any arbitrary data points!</p>
                  ) : (
                    project.customFields.map((field: any) => (
                      <div key={field.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="flex gap-4">
                          <span className="text-xs font-bold text-slate-500 w-32 uppercase tracking-wider">{field.label}</span>
                          <span className="text-sm font-semibold text-slate-900">{field.value}</span>
                        </div>
                        <button onClick={() => deleteCustomField(field.id)} className="text-slate-300 hover:text-red-500 transition-colors">✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* MILESTONES BLOCK */}
              <div className="crm-card group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Milestones & Phases</h3>
                  <button 
                    onClick={() => setAddingMilestone(true)}
                    className="text-xs font-bold text-[#C9A84C] hover:underline"
                  >
                    + Add Milestone
                  </button>
                </div>

                {addingMilestone && (
                  <div className="flex gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <input 
                      placeholder="Phase Title (e.g. Design Approved)" 
                      className="flex-[2] p-2 text-xs rounded-lg border outline-none focus:border-[#C9A84C]"
                      value={milestoneTitle}
                      onChange={e => setMilestoneTitle(e.target.value)}
                    />
                    <input 
                      type="date"
                      className="flex-[1] p-2 text-xs rounded-lg border outline-none focus:border-[#C9A84C]"
                      value={milestoneDate}
                      onChange={e => setMilestoneDate(e.target.value)}
                    />
                    <button onClick={saveMilestone} className="btn-primary px-3 text-xs">Add</button>
                    <button onClick={() => setAddingMilestone(false)} className="px-3 text-xs text-slate-500 font-bold hover:bg-slate-200 rounded-lg">✕</button>
                  </div>
                )}

                <div className="space-y-2">
                  {(!project.milestones || project.milestones.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">No milestones defined. Add project phases to track progress!</p>
                  ) : (
                    project.milestones.map((m: any) => (
                      <div key={m.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors" style={{ background: m.completed ? "#f8fafc" : "white" }}>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleMilestone(m.id)}
                            className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${m.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}
                          >
                            {m.completed && <span className="text-[10px]">✓</span>}
                          </button>
                          <div>
                            <p className={`text-sm font-bold ${m.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{m.title}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Target: {new Date(m.date).toLocaleDateString("en-GB")}</p>
                          </div>
                        </div>
                        <button onClick={() => deleteMilestone(m.id)} className="text-slate-300 hover:text-red-500 transition-colors">✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {activeTab === "tasks" && (
            <div className="crm-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Project Tasks</h3>
                <Link href="/tasks" className="text-xs font-bold text-blue-600 hover:underline">
                  Manage in Task Board ↗
                </Link>
              </div>
              
              <div className="space-y-3">
                {projectTasks.length === 0 ? (
                  <p className="text-xs py-4 text-center" style={{ color: "#9ca3af" }}>No tasks assigned to this project yet.</p>
                ) : (
                  projectTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-4 rounded-xl border hover:border-slate-300 transition-colors" style={{ borderColor: "#f0f0f5", background: task.done ? "#f8fafc" : "white" }}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${task.done ? 'bg-green-500' : 'border-2 border-slate-300'}`} />
                        <div>
                          <p className={`text-sm font-bold ${task.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-50 text-red-600' : task.priority === 'medium' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span className="text-[10px] text-slate-400 font-medium">Due: {new Date(task.dueDate).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg">
                        {task.status.replace('-', ' ')}
                      </span>
                    </div>
                  ))
                )}
              </div>
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

          {activeTab === "payments" && (
            <div className="space-y-6">
              <div className="crm-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Payment Ledger</h3>
                    <p className="text-xs text-slate-500 mt-1">Track and manage financial transactions for this project.</p>
                  </div>
                  <div className="relative group">
                    <button className="btn-primary py-2 px-4 text-xs flex items-center gap-2 shadow-md">
                      Payment Actions ▼
                    </button>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <button 
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full text-left px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-3 transition-colors"
                      >
                        <span className="text-sm">💰</span> Log Manual Payment
                      </button>
                      <button 
                        onClick={openEditFinancials}
                        className="w-full text-left px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-3 transition-colors"
                      >
                        <span className="text-sm">✏️</span> Edit Financials
                      </button>
                      <button 
                        onClick={openReminder}
                        className="w-full text-left px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <span className="text-sm">🔔</span> Send Payment Reminder
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Total Budget</p>
                    <p className="text-lg font-black text-[#0D1B3E]">{project.currency || "AED"} {project.budget?.toLocaleString() || "0"}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-orange-100 bg-orange-50">
                    <p className="text-[10px] font-bold text-orange-600 mb-1 uppercase tracking-wider">Current Due</p>
                    <p className="text-lg font-black text-orange-700">{project.currency || "AED"} {project.due?.toLocaleString() || "0"}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-green-100 bg-green-50">
                    <p className="text-[10px] font-bold text-green-600 mb-1 uppercase tracking-wider">Total Paid</p>
                    <p className="text-lg font-black text-green-700">{project.currency || "AED"} {totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-red-100 bg-red-50">
                    <p className="text-[10px] font-bold text-red-600 mb-1 uppercase tracking-wider">Remaining</p>
                    <p className="text-lg font-black text-red-700">{project.currency || "AED"} {calculatedRemaining.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-500">Payment Progress</span>
                    <span className="text-green-600">{Math.round((totalPaid / (project.budget || 1)) * 100)}% Paid</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (totalPaid / (project.budget || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                <div className="space-y-3">
                  {(!project.payments || project.payments.length === 0) ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-400 font-medium">No payments logged yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 font-bold text-slate-500 text-xs">Date</th>
                            <th className="p-4 font-bold text-slate-500 text-xs">Method</th>
                            <th className="p-4 font-bold text-slate-500 text-xs text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {project.payments.slice().reverse().map((payment) => (
                            <tr key={payment.id} className="bg-white hover:bg-slate-50 transition-colors">
                              <td className="p-4 text-slate-900 font-medium">
                                {new Date(payment.date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                                {payment.notes && <p className="text-[10px] text-slate-400 mt-1">{payment.notes}</p>}
                                <p className="text-[9px] text-slate-300 mt-1">Logged by {payment.loggedBy}</p>
                              </td>
                              <td className="p-4 text-slate-600">
                                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">{payment.method}</span>
                              </td>
                              <td className="p-4 text-right font-bold text-green-600">
                                + {project.currency || "AED"} {payment.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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

      {/* Log Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900">Log New Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Amount ({project.currency || "AED"})</label>
                <input 
                  type="number" 
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-[#C9A84C]"
                  placeholder="e.g. 5000"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                  <input 
                    type="date" 
                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-[#C9A84C]"
                    value={paymentForm.date}
                    onChange={e => setPaymentForm({...paymentForm, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Method</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-[#C9A84C]"
                    value={paymentForm.method}
                    onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Stripe / Card">Card (Stripe)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Notes (Optional)</label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-[#C9A84C]"
                  placeholder="e.g. Milestone 1 payment"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={logPayment}
                disabled={loggingPayment || !paymentForm.amount}
                className="flex-1 py-3 text-sm font-bold text-white bg-[#0D1B3E] rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {loggingPayment ? "Logging..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Financials Modal */}
      {showFinancialsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900">Edit Financials</h3>
              <button onClick={() => setShowFinancialsModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Total Budget</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-[#C9A84C]"
                    value={finForm.budget}
                    onChange={e => {
                      const b = Number(e.target.value) || 0;
                      const p = Number(finForm.paid) || 0;
                      setFinForm({...finForm, budget: e.target.value, remaining: (b - p).toString()});
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Current Due</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-[#C9A84C]"
                    value={finForm.due}
                    onChange={e => setFinForm({...finForm, due: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Amount Paid</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-[#C9A84C]"
                    value={finForm.paid}
                    onChange={e => {
                      const p = Number(e.target.value) || 0;
                      const b = Number(finForm.budget) || 0;
                      setFinForm({...finForm, paid: e.target.value, remaining: (b - p).toString()});
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Remaining</label>
                  <input 
                    type="number" 
                    readOnly
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 outline-none"
                    value={finForm.remaining}
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={saveFinancials} 
              disabled={savingFin}
              className="mt-8 w-full py-3 bg-[#0D1B3E] hover:bg-[#1a3070] text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {savingFin ? "Saving..." : "Save Financials"}
            </button>
          </div>
        </div>
      )}

      {/* Send Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900">Send Payment Reminder</h3>
              <button onClick={() => setShowReminderModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Message Body</label>
                <textarea 
                  rows={10}
                  className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:border-[#C9A84C] text-sm font-medium text-slate-700 leading-relaxed resize-none"
                  value={reminderBody}
                  onChange={e => setReminderBody(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setShowReminderModal(false)} 
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={sendReminder} 
                disabled={sendingReminder}
                className="flex-1 py-3 bg-[#0D1B3E] hover:bg-[#1a3070] text-white rounded-xl font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {sendingReminder ? "Sending..." : <><span>✉️</span> Send Reminder Email</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
