"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, query, where, orderBy, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, ProjectTask, ServiceTag, ProjectStatus } from "@/types";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

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
  
  // Technical Hub State
  const [editingTechHub, setEditingTechHub] = useState(false);
  const [techHubForm, setTechHubForm] = useState({
    figmaUrl: "",
    repoUrl: "",
    stagingUrl: "",
    productionUrl: "",
    techStack: [] as string[],
    coreFocus: "Dynamic Web App",
  });

  // Task Delegation State
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateForm, setDelegateForm] = useState({
    employeeId: "",
    title: "",
    instructions: "",
  });
  const [delegating, setDelegating] = useState(false);
  const [selectedDrawerTask, setSelectedDrawerTask] = useState<any | null>(null);
  const [logInputText, setLogInputText] = useState("");
  const [duplicateConflictTask, setDuplicateConflictTask] = useState<any | null>(null);
  const [duplicateInstructionNote, setDuplicateInstructionNote] = useState("");

  // File Category State
  const [fileCategory, setFileCategory] = useState<"Design" | "Development" | "Documentation" | "Credentials">("Documentation");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<"All" | "Design" | "Development" | "Documentation" | "Credentials">("All");

  const [addingField, setAddingField] = useState(false);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldValue, setFieldValue] = useState("");

  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");

  async function fetchProject() {
    const [pSnap, uSnap] = await Promise.all([
      getDoc(doc(db, "projects", id)),
      getDocs(collection(db, "users"))
    ]);

    if (pSnap.exists()) {
      let pData = pSnap.data() as any;
      if (crmUser && crmUser.role !== "admin") {
        delete pData.budget;
        delete pData.contractValue;
        delete pData.pipelineValue;
        delete pData.due;
        delete pData.paid;
        delete pData.remaining;
        delete pData.balance;
        delete pData.payments;
      }
      setProject({ id: pSnap.id, ...pData } as Project);
      setTechHubForm({
        figmaUrl: pData.figmaUrl ?? "",
        repoUrl: pData.repoUrl ?? "",
        stagingUrl: pData.stagingUrl ?? "",
        productionUrl: pData.productionUrl ?? "",
        techStack: pData.techStack || [],
        coreFocus: pData.coreFocus ?? "Dynamic Web App",
      });
    }
    setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { 
    fetchProject(); 
    
    const qTasks = query(collection(db, "tasks"), where("relatedTo", "==", id));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setProjectTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    return () => unsubTasks();
  }, [id, crmUser]);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("delegate") === "true") {
      setShowDelegateModal(true);
      setActiveTab("tasks");
    }
  }, [searchParams]);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  async function saveTechnicalHub() {
    if (!project) return;
    try {
      await updateDoc(doc(db, "projects", project.id), techHubForm);
      setProject({ ...project, ...techHubForm });
      setEditingTechHub(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save Technical Infrastructure Hub");
    }
  }

  async function delegateTask() {
    if (!project || !delegateForm.employeeId || !delegateForm.title) {
      alert("Please specify both an employee and a task title.");
      return;
    }

    // INTERCEPT DUPLICATE TASK ASSIGNMENT
    const assetAlreadyAssigned = projectTasks.find(
      t => t.relatedTo === project.id && t.assignedTo === delegateForm.employeeId
    );

    if (assetAlreadyAssigned) {
      setDuplicateConflictTask(assetAlreadyAssigned);
      return;
    }

    setDelegating(true);
    try {
      const now = new Date().toISOString();
      const employee = users.find(u => u.uid === delegateForm.employeeId);
      const { addDoc, collection } = await import("firebase/firestore");
      
      const payload = {
        title: delegateForm.title,
        description: delegateForm.instructions || `Task for project: ${project.title}`,
        assignedTo: delegateForm.employeeId,
        assignedToName: employee?.name || "Team Member",
        assignedBy: crmUser?.uid || "System",
        clientId: project.clientId || "",
        clientName: project.clientName || "",
        relatedTo: project.id,
        relatedType: "project",
        priority: "medium",
        status: "not-started",
        done: false,
        createdAt: now,
        dueDate: project.deadline || now,
        // Documentation cascade fields:
        projectSummary: (project as any).projectSummary || "",
        taskInstructions: delegateForm.instructions || ""
      };

      const docRef = await addDoc(collection(db, "tasks"), payload);
      
      // Update local task state
      setProjectTasks(prev => [...prev, { id: docRef.id, ...payload }]);
      setShowDelegateModal(false);
      setDelegateForm({ employeeId: "", title: "", instructions: "" });
      alert("Task successfully delegated and assigned!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to delegate task: " + (err.message || String(err)));
    } finally {
      setDelegating(false);
    }
  }

  // --- INLINE TASK COMMAND RUNWAY HELPERS ---
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

  async function updateTaskStatus(task: any, status: string) {
    try {
      const isCompleted = status === "completed" || status === "done";
      const dbStatus = status === "done" ? "completed" : status;
      await updateDoc(doc(db, "tasks", task.id), { status: dbStatus, done: isCompleted });
      
      if (selectedDrawerTask && selectedDrawerTask.id === task.id) {
        setSelectedDrawerTask({ ...selectedDrawerTask, status: dbStatus, done: isCompleted });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update status");
    }
  }

  async function commitLogEntry() {
    if (!selectedDrawerTask || !logInputText.trim()) return;
    try {
      const newLog = {
        id: Math.random().toString(36).substr(2, 9),
        text: logInputText,
        timestamp: new Date().toISOString(),
        authorName: crmUser?.name || "Team Member",
        authorUid: crmUser?.uid || ""
      };
      const updatedLogs = [...(selectedDrawerTask.logs || []), newLog];
      
      await updateDoc(doc(db, "tasks", selectedDrawerTask.id), { logs: updatedLogs });
      
      setSelectedDrawerTask({ ...selectedDrawerTask, logs: updatedLogs });
      setLogInputText("");
      alert("Log committed successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to commit log entry: " + (err.message || String(err)));
    }
  }

  async function updateTaskInstructions(task: any, instructions: string) {
    try {
      await updateDoc(doc(db, "tasks", task.id), { taskInstructions: instructions, description: instructions });
      if (selectedDrawerTask && selectedDrawerTask.id === task.id) {
        setSelectedDrawerTask({ ...selectedDrawerTask, taskInstructions: instructions, description: instructions });
      }
      alert("Instructions updated successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to update instructions");
    }
  }

  async function reallocateAsset(task: any, employeeId: string) {
    try {
      const employee = users.find(u => u.uid === employeeId);
      if (!employee) return;
      await updateDoc(doc(db, "tasks", task.id), { 
        assignedTo: employeeId, 
        assignedToName: employee.name 
      });
      if (selectedDrawerTask && selectedDrawerTask.id === task.id) {
        setSelectedDrawerTask({ ...selectedDrawerTask, assignedTo: employeeId, assignedToName: employee.name });
      }
      alert(`Asset reallocated to ${employee.name}`);
    } catch (e) {
      console.error(e);
      alert("Failed to reallocate asset");
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      alert("Task deleted successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to delete task");
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
        {crmUser?.role === "admin" && (
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
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b mb-8" style={{ borderColor: "#f0f0f5" }}>
        {["overview", "tasks", "files", crmUser?.role === "admin" ? "payments" : null].filter(Boolean).map((tab) => (
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

              {/* Technical Infrastructure Hub */}
              <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Technical Infrastructure Hub</h3>
                  {(crmUser?.role === "admin" || crmUser?.role === "lead") && !editingTechHub && (
                    <button 
                      onClick={() => setEditingTechHub(true)}
                      className="text-xs font-bold text-[#C9A84C] hover:underline"
                    >
                      ✏️ Edit Provisioning
                    </button>
                  )}
                </div>

                {editingTechHub ? (
                  <div className="space-y-4">
                    {/* Tech Stack Pills */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Core Architecture Stack</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {["Next.js", "Three.js", "Tailwind", "Node.js", "Firestore", "GSAP"].map((tech) => {
                          const selected = techHubForm.techStack.includes(tech);
                          return (
                            <button
                              key={tech}
                              type="button"
                              onClick={() => {
                                const newStack = selected
                                  ? techHubForm.techStack.filter((t) => t !== tech)
                                  : [...techHubForm.techStack, tech];
                                setTechHubForm({ ...techHubForm, techStack: newStack });
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
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
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Primary Core Focus</label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {["Dynamic Web App", "Static Branding", "E-Commerce Build"].map((focus) => {
                          const selected = techHubForm.coreFocus === focus;
                          return (
                            <button
                              key={focus}
                              type="button"
                              onClick={() => setTechHubForm({ ...techHubForm, coreFocus: focus })}
                              className={`py-1.5 px-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
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
                        <label className="block text-xs font-bold text-slate-500 mb-1">Figma Canvas URL</label>
                        <input className="form-input" value={techHubForm.figmaUrl} onChange={(e) => setTechHubForm({ ...techHubForm, figmaUrl: e.target.value })} placeholder="https://figma.com/file/..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Repository Endpoint</label>
                        <input className="form-input" value={techHubForm.repoUrl} onChange={(e) => setTechHubForm({ ...techHubForm, repoUrl: e.target.value })} placeholder="https://github.com/..." />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Staging Environment Link</label>
                          <input className="form-input" value={techHubForm.stagingUrl} onChange={(e) => setTechHubForm({ ...techHubForm, stagingUrl: e.target.value })} placeholder="https://staging.domain.com" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Production Endpoint</label>
                          <input className="form-input" value={techHubForm.productionUrl} onChange={(e) => setTechHubForm({ ...techHubForm, productionUrl: e.target.value })} placeholder="https://domain.com" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button onClick={saveTechnicalHub} className="btn-primary py-1.5 px-4 text-xs">Save Provisioning</button>
                      <button onClick={() => setEditingTechHub(false)} className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Display URLs in Monospace dark blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Figma Canvas URL", val: (project as any).figmaUrl },
                        { label: "Repository Endpoint", val: (project as any).repoUrl },
                        { label: "Staging Environment", val: (project as any).stagingUrl },
                        { label: "Production Endpoint", val: (project as any).productionUrl },
                      ].map((urlObj, index) => (
                        <div key={index} className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{urlObj.label}</span>
                          <div className="font-mono text-xs bg-slate-950/80 border-l-2 border-amber-500/60 text-slate-400 p-3 rounded-lg flex items-center tracking-wide justify-between shadow-sm">
                            <span className={`truncate mr-2 ${!urlObj.val ? "text-slate-500/70 italic" : "text-slate-300"}`}>
                              {urlObj.val || "Not Provisioned"}
                            </span>
                            {urlObj.val && (
                              <button 
                                onClick={() => copyToClipboard(urlObj.val)} 
                                className="text-[10px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-all flex-shrink-0"
                              >
                                Copy
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Display Stack Badges & Focus */}
                    <div className="flex items-center justify-between pt-2 flex-wrap gap-4 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Focus Scope</span>
                        <span className="text-xs font-bold bg-[#C9A84C20] text-[#C9A84C] px-3 py-1 rounded-lg">
                          {(project as any).coreFocus || "Dynamic Web App"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tech Stack Matrix</span>
                        <div className="flex flex-wrap gap-1.5">
                          {((project as any).techStack || []).length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No technologies defined</span>
                          ) : (
                            ((project as any).techStack || []).map((t: string) => (
                              <span key={t} className="text-xs font-bold bg-[#0D1B3E]/10 text-[#0D1B3E] px-2.5 py-1 rounded-md">
                                {t}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Macro-Phase Progress Rail */}
              {(() => {
                const getTaskProgressVal = (status: string) => {
                  switch (status) {
                    case "not-started": return 0;
                    case "dev": return 25;
                    case "test": return 50;
                    case "review": return 75;
                    case "done":
                    case "completed": return 100;
                    default: return 0;
                  }
                };
                
                const totalTasksCount = projectTasks.length;
                const progressMean = totalTasksCount > 0
                  ? Math.round(projectTasks.reduce((sum, t) => sum + getTaskProgressVal(t.status), 0) / totalTasksCount)
                  : 0;

                let activePhaseIndex = 0;
                if (progressMean <= 25) activePhaseIndex = 0;
                else if (progressMean <= 50) activePhaseIndex = 1;
                else if (progressMean <= 75) activePhaseIndex = 2;
                else activePhaseIndex = 3;

                return (
                  <div className="crm-card">
                    <h3 className="text-sm font-bold mb-4" style={{ color: "#0D1B3E" }}>Macro-Phase Progress Rail</h3>
                    
                    <div className="relative flex items-center justify-between mt-8 mb-12 px-4">
                      {/* Background Connecting Line */}
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />
                      
                      {/* Active Fill Connecting Line */}
                      <div 
                        className="absolute left-4 top-4 h-0.5 bg-blue-500 -z-10 transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                        style={{ width: `${Math.max(0, Math.min(92, progressMean * 0.92))}%` }}
                      />
                      
                      {[
                        { label: "Scope & Wireframes", range: "0-25%" },
                        { label: "Component Eng.", range: "26-50%" },
                        { label: "Logic & Integration", range: "51-75%" },
                        { label: "Optimization & Handoff", range: "76-100%" }
                      ].map((phase, idx) => {
                        const isActive = idx === activePhaseIndex;
                        const isCompleted = progressMean > (idx === 0 ? 25 : idx === 1 ? 50 : idx === 2 ? 75 : 100);
                        return (
                          <div key={idx} className="flex flex-col items-center relative">
                            {/* Circle Node */}
                            <div 
                              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-[10px] font-bold transition-all duration-300 relative z-10 bg-white ${
                                isActive 
                                  ? "bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.4)] border-blue-600"
                                  : isCompleted 
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-slate-300 text-slate-400"
                              }`}
                            >
                              {idx + 1}
                            </div>
                            {/* Label Vertical Stack */}
                            <div className="absolute top-10 text-center w-28 flex flex-col items-center justify-start pt-1">
                              <p className={`text-[10px] font-black tracking-wide leading-tight ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                                {phase.label}
                              </p>
                              <p className="text-[9px] font-semibold text-slate-400 mt-1 opacity-80">{phase.range}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-8 text-center text-xs font-semibold text-slate-500 border-t pt-4 border-slate-50">
                      Overall Progress Mean: <span className="text-blue-600 font-bold text-sm ml-1">{progressMean}%</span> based on {totalTasksCount} tasks.
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {activeTab === "tasks" && (
            <div className="space-y-4">
              {/* Metric header */}
              {(() => {
                const pending = projectTasks.filter(t => t.status !== "completed").length;
                const completed = projectTasks.filter(t => t.status === "completed").length;
                return (
                  <div className="bg-slate-950 text-slate-200 rounded-xl px-5 py-3 border border-slate-800 flex justify-between items-center shadow-inner">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Runway Velocity:</span>
                      <span className="text-[11px] font-bold text-slate-300">
                        {pending} Pending &middot; {completed} Completed
                      </span>
                    </div>
                    {(crmUser?.role === "admin" || crmUser?.role === "lead") && (
                      <button 
                        onClick={() => setShowDelegateModal(true)}
                        className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-opacity hover:opacity-90"
                        style={{ background: "#C9A84C", color: "#0D1B3E" }}
                      >
                        + Delegate New Task
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* The Runway Grid Layout */}
              <div className="space-y-2">
                {projectTasks.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/40 border border-slate-800/50 rounded-xl">
                    <p className="text-xs text-slate-500 italic">No tasks delegated to this workspace yet.</p>
                  </div>
                ) : (
                  projectTasks.map(task => {
                    const pct = Math.round((getMilestoneIndex(task.status) / 4) * 100);
                    
                    // Priority configurations
                    let pBg = "bg-slate-800 text-slate-400 border border-slate-700";
                    if (task.priority === "high") pBg = "bg-red-950/40 text-red-400 border border-red-900/50";
                    else if (task.priority === "medium") pBg = "bg-orange-950/40 text-orange-400 border border-orange-900/50";
                    
                    return (
                      <div 
                        key={task.id} 
                        onClick={() => setSelectedDrawerTask(task)}
                        className="group flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-50 dark:bg-slate-900/50 hover:dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
                      >
                        {/* Left Section: Title, Priority, Micro-avatar */}
                        <div className="flex items-center gap-4 min-w-0 md:w-1/3">
                          {/* Micro-avatar */}
                          <div 
                            className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0"
                            title={`Assigned to: ${task.assignedToName || "Unassigned"}`}
                          >
                            {task.assignedToName?.charAt(0).toUpperCase() || "?"}
                          </div>
                          
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate" style={{ textDecoration: task.status === "completed" ? "line-through text-slate-500" : "none" }}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${pBg}`}>
                                {task.priority || "medium"}
                              </span>
                              {task.dueDate && (
                                <span className="text-[9px] font-semibold text-slate-500">
                                  Due: {new Date(task.dueDate).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Center Section: Linear Progress Rail */}
                        <div className="w-full md:flex-1 flex flex-col justify-center px-0 md:px-8" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            <span>{task.status.replace("-", " ")}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800/80 rounded-full flex relative">
                            {/* Active segment fill */}
                            <div 
                              className="absolute top-0 bottom-0 left-0 bg-blue-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                              style={{ width: `${pct}%` }} 
                            />
                            {/* Stepper Hitboxes */}
                            {milestoneSteps.map((step, stepIdx) => (
                              <div
                                key={step.key}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTaskStatus(task, step.key);
                                }}
                                className="flex-1 h-full cursor-pointer z-10 hover:bg-blue-400/20 transition-colors"
                                title={`Set milestone to ${step.label}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Right Section: Hover controls & Inspect trigger */}
                        <div className="flex items-center justify-end gap-3 md:w-1/4">
                          {/* Management Hover Controls */}
                          {(crmUser?.role === "admin" || crmUser?.role === "lead") && (
                            <div 
                              className="hidden group-hover:flex items-center gap-2" 
                              onClick={e => e.stopPropagation()}
                            >
                              <button 
                                onClick={() => {
                                  const note = prompt("Append directions/instructions to this task:", task.taskInstructions || "");
                                  if (note !== null) {
                                    updateTaskInstructions(task, note);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[9px] font-black tracking-wider uppercase transition-all shadow-sm"
                                title="Append Directions"
                              >
                                📝 Add Note
                              </button>
                              
                              <select
                                value={task.assignedTo || ""}
                                onChange={(e) => reallocateAsset(task, e.target.value)}
                                className="bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[9px] font-black px-2 py-1.5 outline-none focus:border-[#C9A84C] cursor-pointer shadow-sm"
                              >
                                <option value="">Re-allocate Asset...</option>
                                {users
                                  .filter(u => u.role !== "admin")
                                  .map(u => (
                                    <option key={u.uid} value={u.uid}>{u.name}</option>
                                  ))
                                }
                              </select>
                            </div>
                          )}

                          {/* Inspect Layout Deep link */}
                          <button 
                            className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#0D1B3E] hover:bg-[#1a3070] text-[#C9A84C] shadow-md transition-all whitespace-nowrap border border-[#C9A84C]/30"
                          >
                            Inspect Layout 🔍
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div className="space-y-6">
              {/* Add File Form */}
              <div className="crm-card">
                <h3 className="text-sm font-bold mb-4" style={{ color: "#0D1B3E" }}>Add Shared File</h3>
                <div className="flex gap-4 items-center flex-wrap md:flex-nowrap">
                  <input 
                    className="form-input flex-1 bg-slate-50 border-slate-200 focus:border-[#C9A84C]" 
                    placeholder="File Name (e.g. Brand Guidelines)" 
                    value={newFile.name}
                    onChange={e => setNewFile({ ...newFile, name: e.target.value })}
                  />
                  <input 
                    className="form-input flex-1 bg-slate-50 border-slate-200 focus:border-[#C9A84C]" 
                    placeholder="URL (Google Drive, Figma, etc.)" 
                    value={newFile.url}
                    onChange={e => setNewFile({ ...newFile, url: e.target.value })}
                  />
                  <select 
                    className="form-input bg-slate-50 border-slate-200 focus:border-[#C9A84C]" 
                    value={fileCategory} 
                    onChange={e => setFileCategory(e.target.value as any)}
                    style={{ minWidth: "160px", height: "42px" }}
                  >
                    <option value="Design">Design</option>
                    <option value="Development">Development</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Credentials">Credentials</option>
                  </select>
                  <button 
                    onClick={addFile}
                    disabled={addingFile || !newFile.name || !newFile.url}
                    className="btn-primary whitespace-nowrap disabled:opacity-50 h-[42px] px-8 rounded-lg shadow-sm"
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
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Project Assets</h3>
                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-100">
                    {["All", "Design", "Development", "Documentation", "Credentials"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategoryFilter(cat as any)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                          activeCategoryFilter === cat
                            ? "bg-white text-[#0D1B3E] shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {(() => {
                    const shared = (project as any).sharedFiles || [];
                    const filtered = shared.filter((f: any) => 
                      activeCategoryFilter === "All" || (f.category || "Documentation") === activeCategoryFilter
                    );
                    
                    if (filtered.length === 0) {
                      return <p className="text-xs py-4 text-center" style={{ color: "#9ca3af" }}>No files match this category.</p>;
                    }

                    return filtered.map((file: any, index: number) => {
                      const origIndex = shared.indexOf(file);
                      // Determine category badge colors
                      let badgeBg = "bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md";
                      const cat = file.category || "Documentation";
                      if (cat === "Design") badgeBg = "bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md";
                      else if (cat === "Development") badgeBg = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md";
                      else if (cat === "Credentials") badgeBg = "bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md";
                      else if (cat === "Documentation") badgeBg = "bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md";

                      return (
                        <div key={index} className="flex items-center justify-between p-4 rounded-xl border bg-white hover:bg-slate-50 transition-all shadow-sm mb-3" style={{ borderColor: "#f0f0f5" }}>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">📎</div>
                            <div>
                              <div className="flex items-center gap-3 flex-wrap mb-1">
                                <p className="text-sm font-black" style={{ color: "#1a1a2e" }}>{file.name}</p>
                                <span className={badgeBg}>
                                  {cat}
                                </span>
                              </div>
                              <p className="text-[11px] font-medium" style={{ color: "#9ca3af" }}>Added by <span className="text-slate-600">{file.addedBy}</span> &middot; {new Date(file.at).toLocaleDateString("en-GB")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs font-bold text-[#0D1B3E] hover:underline"
                            >
                              Open Link ↗
                            </a>
                            {(crmUser?.role === "admin" || crmUser?.role === "lead") && (
                              <button 
                                onClick={() => deleteFile(origIndex)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Delete Asset"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
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

      {/* Delegate Task Modal */}
      {showDelegateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900">Delegate Task</h3>
              <button onClick={() => setShowDelegateModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Task Title *</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. Implement Figma Designs"
                  value={delegateForm.title}
                  onChange={e => setDelegateForm({...delegateForm, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Employee Asset *</label>
                <select 
                  className="form-input"
                  value={delegateForm.employeeId}
                  onChange={e => setDelegateForm({...delegateForm, employeeId: e.target.value})}
                >
                  <option value="">Select an employee...</option>
                  {users
                    .filter(u => u.role !== "admin")
                    .map(u => (
                      <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                    ))
                  }
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Task Instructions</label>
                <textarea 
                  className="form-input resize-none"
                  rows={4}
                  placeholder="Provide step-by-step directions for the employee..."
                  value={delegateForm.instructions}
                  onChange={e => setDelegateForm({...delegateForm, instructions: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowDelegateModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={delegateTask}
                disabled={delegating || !delegateForm.employeeId || !delegateForm.title}
                className="flex-1 py-3 text-sm font-bold text-white bg-[#0D1B3E] rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {delegating ? "Assigning..." : "Assign Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Assignment Interceptor Modal */}
      {duplicateConflictTask && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-red-600 mb-1">Duplicate Task Assignment</h3>
                <p className="text-xs text-slate-500">This employee is already assigned to an active task on this project: <strong className="text-slate-800">{duplicateConflictTask.title}</strong></p>
              </div>
              <button onClick={() => setDuplicateConflictTask(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Option A: Append Instruction Note</h4>
                <textarea 
                  className="w-full p-3 text-xs rounded-xl border border-blue-200 outline-none focus:border-blue-400 bg-white resize-none"
                  rows={3}
                  placeholder="Type new directive string to append chronologically..."
                  value={duplicateInstructionNote}
                  onChange={e => setDuplicateInstructionNote(e.target.value)}
                />
                <button 
                  onClick={async () => {
                    if (!duplicateInstructionNote.trim()) return;
                    try {
                      await updateDoc(doc(db, "tasks", duplicateConflictTask.id), { 
                        taskInstructions: (duplicateConflictTask.taskInstructions || "") + "\n\n[APPENDED DIRECTIVE]: " + duplicateInstructionNote 
                      });
                      alert("Instruction note appended successfully!");
                      setDuplicateConflictTask(null);
                      setDuplicateInstructionNote("");
                      setShowDelegateModal(false);
                      setDelegateForm({ employeeId: "", title: "", instructions: "" });
                    } catch(e) {
                      console.error(e);
                      alert("Failed to append note");
                    }
                  }}
                  disabled={!duplicateInstructionNote.trim()}
                  className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  Append Note to Existing Task
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    setDuplicateConflictTask(null);
                    setShowDelegateModal(false);
                    setSelectedDrawerTask(duplicateConflictTask);
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-[#C9A84C] hover:bg-[#C9A84C]/5 text-left transition-all group"
                >
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 group-hover:text-[#C9A84C]">Option B</h4>
                  <p className="text-xs font-semibold text-slate-700">Modify Existing Task</p>
                  <p className="text-[9px] text-slate-400 mt-1">Open detail drawer to adjust deadlines or parameters.</p>
                </button>

                <button 
                  onClick={() => {
                    setDuplicateConflictTask(null);
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition-all group"
                >
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Option C</h4>
                  <p className="text-xs font-semibold text-slate-700">Assign Alternate</p>
                  <p className="text-[9px] text-slate-400 mt-1">Return to dropdown to pick another team asset.</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Drawer */}
      <AnimatePresence>
        {selectedDrawerTask && (() => {
          const isLeadOrAdmin = crmUser?.role === "admin" || crmUser?.role === "lead";
          const isAssignedEmployee = crmUser?.uid === selectedDrawerTask.assignedTo;
          
          const summary = selectedDrawerTask.projectSummary || (project as any)?.projectSummary || "No master brief provided by Admin.";
          const instructions = selectedDrawerTask.taskInstructions || selectedDrawerTask.description || "No specific instructions provided by Lead.";
          const logs = selectedDrawerTask.logs || [];

          return (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity"
                onClick={() => setSelectedDrawerTask(null)}
              />
              
              {/* Sliding Panel */}
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-[700px] bg-slate-50 shadow-2xl border-l border-slate-200 z-[101] flex flex-col text-slate-800"
              >
                {/* Header */}
                <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-[#0D1B3E]">{selectedDrawerTask.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      {selectedDrawerTask.clientName && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          🏢 {selectedDrawerTask.clientName}
                        </span>
                      )}
                      {selectedDrawerTask.assignedToName && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                          👤 Assignee: {selectedDrawerTask.assignedToName}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDrawerTask(null)} 
                    className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Two Column Layout Body */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Column A (Scope) */}
                  <div className="space-y-6">
                    {/* Admin's Project Summary */}
                    <div className="crm-card bg-white p-4 rounded-2xl border border-slate-150 shadow-sm">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Project Execution Strategy</h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        {summary}
                      </p>
                    </div>

                    {/* Lead's Task Instructions */}
                    <div className="crm-card bg-white p-4 rounded-2xl border border-slate-150 shadow-sm">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Lead Directions & Scope</h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        {instructions}
                      </p>
                    </div>
                  </div>

                  {/* Column B (Execution Log) */}
                  <div className="space-y-6 flex flex-col h-full">
                    {/* Log Console for Employee */}
                    {isAssignedEmployee && !isLeadOrAdmin ? (
                      <div className="crm-card bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Status Log Entry</h4>
                        <textarea 
                          rows={4}
                          value={logInputText}
                          onChange={(e) => setLogInputText(e.target.value)}
                          placeholder="Type log entry update here..."
                          className="form-input resize-none text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-[#C9A84C]"
                        />
                        <button 
                          onClick={commitLogEntry}
                          disabled={!logInputText.trim()}
                          className="mt-3 py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#0D1B3E] hover:opacity-90 disabled:opacity-50 transition-all self-end"
                        >
                          Commit to Log Sheet
                        </button>
                      </div>
                    ) : (
                      isAssignedEmployee && (
                        <div className="text-xs text-slate-400 italic p-4 bg-white rounded-2xl border text-center shadow-sm">
                          Leads and Admins do not log status entries.
                        </div>
                      )
                    )}

                    {/* Log Timeline for Lead/Admin */}
                    {isLeadOrAdmin ? (
                      <div className="crm-card bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex-1 flex flex-col">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Chronological Log Stream</h4>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
                          {logs.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-8">No committed log entries found.</p>
                          ) : (
                            logs.slice().reverse().map((log: any) => (
                              <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-600">{log.authorName}</span>
                                  <span className="text-[8px] text-slate-400">{new Date(log.timestamp).toLocaleString("en-GB")}</span>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed font-medium">{log.text}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      !isAssignedEmployee && (
                        <div className="text-xs text-slate-400 italic p-4 bg-white rounded-2xl border text-center shadow-sm">
                          Logs are private to project assignees and managers.
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Footer Drawer Action items (Delete options) */}
                {isLeadOrAdmin && (
                  <div className="p-4 bg-white border-t border-slate-200 flex gap-3 justify-end">
                    <button 
                      onClick={() => {
                        deleteTask(selectedDrawerTask.id);
                        setSelectedDrawerTask(null);
                      }} 
                      className="px-4 py-2 border rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border-red-200 transition-all"
                    >
                      ✕ Delete Task
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
