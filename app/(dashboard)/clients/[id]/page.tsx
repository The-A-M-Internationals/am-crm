"use client";
import { X, ClipboardList, Rocket, CheckCircle2, Handshake, Contact, FileText } from "lucide-react";


import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Client, Proposal, Task, Invoice } from "@/types";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import CreateProjectModal from "@/components/CreateProjectModal";

export default function ClientProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const { crmUser } = useAuth();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Task State
  const [showQuickTask, setShowQuickTask] = useState(false);
  const [quickTaskType, setQuickTaskType] = useState<
    "follow-up" | "meeting" | null
  >(null);
  const [quickTaskForm, setQuickTaskForm] = useState({
    type: "meeting",
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    time: "",
  });
  const [submittingTask, setSubmittingTask] = useState(false);

  // New Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    // Fetch Client
    const unsubClient = onSnapshot(doc(db, "clients", params.id), (docSnap) => {
      if (docSnap.exists()) {
        setClient({ id: docSnap.id, ...docSnap.data() } as Client);
      } else {
        router.push("/clients");
      }
    });

    const unsubProposals = onSnapshot(query(collection(db, "proposals"), where("clientId", "==", params.id)), snap => {
      setProposals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Proposal)));
    });

    const unsubProjects = onSnapshot(query(collection(db, "projects"), where("clientId", "==", params.id)), snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTasks = onSnapshot(query(collection(db, "tasks"), where("clientId", "==", params.id)), snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    const unsubMembers = onSnapshot(collection(db, "users"), snap => {
      setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });

    const unsubInvoices = onSnapshot(query(collection(db, "invoices"), where("clientId", "==", params.id)), snap => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching invoices snapshot", error);
      setLoading(false);
    });

    return () => { 
      unsubClient(); 
      unsubProposals(); 
      unsubProjects(); 
      unsubTasks(); 
      unsubMembers(); 
      unsubInvoices(); 
    };
  }, [params.id, router]);

  if (loading || !client) {
    return (
      <div className="p-8 h-screen flex flex-col bg-[#f8fafc] animate-pulse">
        <div className="h-40 bg-white rounded-3xl mb-8 border border-slate-100"></div>
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-2 bg-white rounded-3xl border border-slate-100 h-96"></div>
          <div className="col-span-1 bg-white rounded-3xl border border-slate-100 h-96"></div>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  async function submitQuickTask() {
    if (!quickTaskForm.title || !quickTaskForm.assignedTo)
      return alert("Title and Assignee are required.");
    setSubmittingTask(true);
    try {
      const employee = members.find((m) => m.uid === quickTaskForm.assignedTo);
      await addDoc(collection(db, "tasks"), {
        title: quickTaskForm.title,
        description: quickTaskForm.description,
        assignedTo: quickTaskForm.assignedTo || "",
        assignedToName: employee?.name || crmUser?.name || "System",
        assignedBy: crmUser?.uid || "System",
        clientId: client?.id || "",
        clientName: client?.company || client?.name || "",
        relatedTo: "",
        relatedType: "",
        priority: quickTaskForm.type === "meeting" ? "high" : "medium",
        status: "not-started",
        done: false,
        taskType: quickTaskForm.type,
        createdAt: new Date().toISOString(),
        dueDate: quickTaskForm.dueDate || new Date().toISOString(),
      });
      if (quickTaskForm.type === "meeting" || quickTaskType === "meeting") {
        let timeParams = "";
        if (quickTaskForm.dueDate && quickTaskForm.time) {
           const startDate = new Date(`${quickTaskForm.dueDate}T${quickTaskForm.time}`);
           if (!isNaN(startDate.getTime())) {
             const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
             timeParams = `&startTime=${startDate.toISOString()}&endTime=${endDate.toISOString()}`;
           }
        }
        const url = `https://teams.microsoft.com/l/meeting/new?subject=${encodeURIComponent(quickTaskForm.title || "New Meeting")}&content=${encodeURIComponent(quickTaskForm.description || "Meeting notes")}${client?.email ? `&attendees=${client.email}` : ""}${timeParams}`;
        window.open(url, "_blank");
      }

      setShowQuickTask(false);
      setQuickTaskType(null);
      setQuickTaskForm({ type: "meeting", title: "", description: "", assignedTo: "", dueDate: "", time: "" });
    } catch (e: any) {
      alert("Failed:" + e.message);
    } finally {
      setSubmittingTask(false);
    }
  }

  // Derived state & Security Flags
  const isPrivileged = crmUser?.role === "admin" || crmUser?.role === "lead";
  const canViewFinances = crmUser?.role === "admin";
  const visibleTasks = isPrivileged 
    ? tasks 
    : tasks.filter(t => t.assignedTo === crmUser?.uid || !t.assignedTo);

  const openProjects = projects.filter(p => p.status !== "completed").length;
  const overdueTasks = visibleTasks.filter(t => !t.done && new Date(t.dueDate || "2099-01-01") < new Date()).length;
  const activityLog = [...tasks].filter(t => t.done).sort((a: any, b: any) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#f8fafc] font-sans">
      {/* Top Navigation */}
<<<<<<< HEAD
      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Link href="/clients" className="hover:text-[#C9A84C] transition-colors">Clients</Link>
          <span>/</span>
          <span className="text-[#0D1B3E]">{client.company || client.name}</span>
        </div>
        <button 
          onClick={() => setShowProjectModal(true)} 
          className="bg-[#0D1B3E] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
        >
          + New Project
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Operations */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. OVERVIEW CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#0D1B3E]"></div>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-xl font-black text-[#0D1B3E] border border-slate-100 shadow-sm shrink-0">
                  {getInitials(client.company || client.name)}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-[#0D1B3E] tracking-tight line-clamp-1">{client.company || client.name}</h1>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">Primary Contact: {client.name}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-[#f0fdf4] text-[#15803d] text-[10px] font-bold uppercase tracking-widest rounded-md border border-[#bbf7d0] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></span> {client.active === false ? "Inactive" : "Active"} Account
                    </span>
                    <span className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-md border border-slate-200">
                      Owner: {(client as any).assignedToName || "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 text-center shrink-0 w-full md:w-auto mt-4 md:mt-0">
                <div className="flex-1 md:w-28 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Open Projects</p>
                  <p className="text-2xl font-black text-[#0D1B3E]">{openProjects}</p>
                </div>
                <div className={`flex-1 md:w-28 p-3 rounded-xl border ${overdueTasks > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${overdueTasks > 0 ? "text-red-500" : "text-slate-400"}`}>Overdue Tasks</p>
                  <p className={`text-2xl font-black ${overdueTasks > 0 ? "text-red-600" : "text-[#0D1B3E]"}`}>{overdueTasks}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CLIENT SUMMARY / NOTES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <span className="text-lg"><ClipboardList className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Client Summary & Context
            </h2>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[80px]">
              {client.notes ? (
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">No summary or notes recorded for this client. Edit the client to add context on why they need us.</p>
              )}
            </div>
          </div>

          {/* 2. PROJECTS LIST (Compact) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="text-lg"><Rocket className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Projects
              </h2>
            </div>
            
            {projects.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">No active projects.</div>
            ) : (
              <div className="space-y-3">
                {projects.map(proj => (
                  <Link href={`/projects/${proj.id}`} key={proj.id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-[#0D1B3E]/30 hover:shadow-md transition-all">
                    <div className="mb-3 sm:mb-0">
                      <p className="font-bold text-[#0D1B3E] text-sm group-hover:text-[#C9A84C] transition-colors">{proj.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Owner: {proj.assignedToName || "Unassigned"}</p>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <span className="text-[10px] font-black px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-slate-500 uppercase tracking-widest">{proj.status}</span>
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                        <div className="h-full bg-emerald-500" style={{ width: `${proj.progress || 0}%` }}></div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 3. TASKS LIST (Filterable) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="text-lg"><CheckCircle2 className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Tasks
              </h2>
            </div>
            {visibleTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">No tasks assigned to you.</div>
            ) : (
              <div className="space-y-3">
                {visibleTasks.map(task => (
                  <div key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3 mb-3 sm:mb-0">
                      <div className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center ${task.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white"}`}>
                        {task.done && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${task.done ? "text-slate-400 line-through" : "text-[#0D1B3E]"}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1.5 py-0.5 bg-slate-100 rounded">{task.taskType || "task"}</span>
                          {task.dueDate && <span className={`text-[9px] font-bold uppercase tracking-widest ${new Date(task.dueDate) < new Date() && !task.done ? "text-red-500" : "text-slate-400"}`}>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                    {isPrivileged ? (
                      <select 
                        className="text-[10px] font-bold uppercase tracking-widest p-1.5 bg-white border border-slate-200 rounded outline-none focus:border-[#C9A84C]"
                        value={task.assignedTo || ""}
                        onChange={(e) => {
                          alert("To reassign, use the main Tasks board.");
                        }}
                      >
                        <option value="">Unassigned</option>
                        <option value={task.assignedTo}>{task.assignedToName || "Current Assignee"}</option>
                        <option disabled>---</option>
                        <option value="goToBoard">Manage in Tasks &rarr;</option>
                      </select>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-50 rounded border border-slate-100">
                        {task.assignedToName || "Unassigned"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Insights & Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* QUICK CREATE */}
          <div className="bg-[#0D1B3E] p-6 rounded-2xl shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <h3 className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 relative z-10">
              <button onClick={() => setShowQuickTask(true)} className="col-span-2 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-white/10 flex flex-col items-center gap-1.5">
                <span className="text-base"><Handshake className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Schedule Meeting
              </button>
              <button onClick={() => router.push(`/clients?edit=${client.id}`)} className="col-span-2 py-2.5 bg-[#C9A84C] hover:bg-[#b0923e] text-[#0D1B3E] rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
                Edit Client Details
              </button>
            </div>
          </div>

          {/* NEXT ACTION */}
          {(() => {
            const pendingTasks = tasks.filter(t => !t.done).sort((a, b) => new Date(a.dueDate || "2099-01-01").getTime() - new Date(b.dueDate || "2099-01-01").getTime());
            const urgentTask = pendingTasks[0];
            if (urgentTask) {
              return (
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl shadow-sm">
                  <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Suggested Next Action
                  </h3>
                  <p className="text-sm font-bold text-amber-900 leading-tight">{urgentTask.title}</p>
                  <p className="text-[10px] font-bold text-amber-700/70 uppercase tracking-widest mt-2">Due: {urgentTask.dueDate ? new Date(urgentTask.dueDate).toLocaleDateString() : "ASAP"}</p>
                </div>
              );
            }
            return (
              <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm">
                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Status: Clear
                </h3>
                <p className="text-sm font-bold text-emerald-900 leading-tight">No pending actions required.</p>
              </div>
            );
          })()}

          {/* RECENT ACTIVITY (OPERATIONS LOG) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <span className="text-lg">⏱️</span> Operations Log
            </h3>
            {activityLog.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-medium">No recent operations.</div>
            ) : (
              <div className="space-y-4 relative pl-5 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
                {activityLog.slice(0, 5).map((log, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[23px] top-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-white border-2 border-slate-300 ring-2 ring-white z-10">
                      <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs font-bold text-[#0D1B3E]"><span className="text-[#C9A84C]">{log.assignedToName || "User"}</span> completed {log.taskType || "task"}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">{log.title}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {(log as any).updatedAt ? new Date((log as any).updatedAt).toLocaleDateString() : (log.createdAt ? new Date(log.createdAt).toLocaleDateString() : "Recently")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CONTACTS DIRECTORY */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <span className="text-lg"><Contact className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Directory
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                  {getInitials(client.name)}
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-[#0D1B3E] text-sm line-clamp-1">{client.name}</p>
                  <p className="text-[9px] font-black text-[#C9A84C] uppercase tracking-widest">Primary Contact</p>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {client.phone && (
                  <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                    <span className="text-slate-400">P:</span>
                    <a href={`tel:${client.phone}`} className="hover:text-[#0D1B3E] truncate ml-2">{client.phone}</a>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                    <span className="text-slate-400">E:</span>
                    <a href={`mailto:${client.email}`} className="hover:text-[#0D1B3E] truncate ml-2">{client.email}</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PROPOSALS HISTORY */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="text-lg"><FileText className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Proposals History
            </h3>
            {proposals.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">No proposals.</div>
            ) : (
              <div className="space-y-2">
                {proposals.map(prop => (
                  <Link href={`/proposals/${prop.id}`} key={prop.id} className="flex justify-between items-center p-3 border border-slate-100 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-all group">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#0D1B3E] text-xs group-hover:text-blue-700 transition-colors">{prop.service || "Standard"} Proposal</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(prop.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest border ${
                      prop.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      prop.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                      prop.status === 'sent' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {prop.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

=======
      <div className="max-w-7xl mx-auto mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
        <Link
          href="/clients"
          className="hover:text-[#C9A84C] transition-colors"
        >
          Clients
        </Link>
        <span>/</span>
        <span className="text-[#0D1B3E]">{client.company || client.name}</span>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Client Identity & Quick Info */}
        <div className="space-y-8">
          {/* Main ID Card */}
          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#C9A84C]"></div>
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-3xl font-black text-[#0D1B3E] border-4 border-slate-100 shadow-sm mb-4">
                {getInitials(client.company || client.name)}
              </div>
              <h1 className="text-2xl font-black text-[#0D1B3E] tracking-tight">
                {client.company || client.name}
              </h1>
              {client.company && client.name && (
                <p className="text-slate-500 font-medium text-sm mt-1">
                  {client.name}
                </p>
              )}

              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold uppercase tracking-widest border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{" "}
                Active Client
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                  📧
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Email
                  </p>
                  <p className="font-semibold text-slate-800 text-sm break-all">
                    {client.email || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                  📱
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Phone
                  </p>
                  <p className="font-semibold text-slate-800 text-sm">
                    {client.phone || "N/A"}
                  </p>
                </div>
              </div>
              {client.address && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                    📍
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Address
                    </p>
                    <p className="font-semibold text-slate-800 text-sm">
                      {client.address}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8">
              <button
                onClick={() => router.push(`/clients`)}
                className="w-full py-3 bg-[#f0f2f8] text-[#0D1B3E] font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors"
              >
                Edit Details in Directory
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-[#0D1B3E]">
                {projects.length}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Projects
              </span>
            </div>
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-[#C9A84C]">
                {proposals.length}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Proposals
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Activity, Projects, Proposals */}
        <div className="lg:col-span-2 space-y-8">
          {/* Projects Panel */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-black text-[#0D1B3E] flex items-center gap-2">
                <span className="text-xl">🔨</span> Active Projects
              </h2>
              <button
                onClick={() =>
                  router.push(`/projects?new=true&clientId=${client.id}`)
                }
                className="text-xs font-bold text-[#C9A84C] hover:text-[#b0923e] transition-colors"
              >
                + New Project
              </button>
            </div>
            <div className="p-6">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">
                  No projects yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/projects/${p.id}`)}
                      className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-[#C9A84C]/50 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div>
                        <h3 className="font-bold text-slate-800 group-hover:text-[#0D1B3E] transition-colors">
                          {p.title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                          {p.status}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#C9A84C]/10 group-hover:text-[#C9A84C] transition-colors">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Proposals Panel */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-black text-[#0D1B3E] flex items-center gap-2">
                <span className="text-xl">📄</span> Proposals & Quotes
              </h2>
            </div>
            <div className="p-6">
              {proposals.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">
                  No proposals linked.
                </div>
              ) : (
                <div className="space-y-4">
                  {proposals.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/proposals/${p.id}`)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-[#C9A84C]/50 hover:shadow-md transition-all cursor-pointer group gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              p.status === "accepted"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : p.status === "rejected"
                                  ? "bg-red-50 text-red-600 border border-red-100"
                                  : p.status === "sent"
                                    ? "bg-blue-50 text-blue-600 border border-blue-100"
                                    : "bg-amber-50 text-amber-600 border border-amber-100"
                            }`}
                          >
                            {p.status}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 group-hover:text-[#0D1B3E] transition-colors line-clamp-1">
                          {p.service}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-slate-800">
                          {p.currency === "USD" ? "$" : "AED"}{" "}
                          {p.total.toLocaleString()}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#C9A84C]/10 group-hover:text-[#C9A84C] transition-colors">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Operations / Tasks Panel */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-black text-[#0D1B3E] flex items-center gap-2">
                <span className="text-xl">✅</span> Active Operations (Tasks)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuickTaskType("follow-up")}
                  className="text-xs font-bold text-[#0D1B3E] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Follow-up
                </button>
                <button
                  onClick={() => setQuickTaskType("meeting")}
                  className="text-xs font-bold text-[#0D1B3E] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Meeting
                </button>
                <button
                  onClick={() => router.push(`/tasks`)}
                  className="text-xs font-bold text-[#C9A84C] hover:text-[#b0923e] px-2 transition-colors"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="p-6">
              {tasks.filter((t) => t.status !== "completed").length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">
                  No pending tasks for this client.
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks
                    .filter((t) => t.status !== "completed")
                    .map((t) => (
                      <div
                        key={t.id}
                        onClick={() => router.push(`/tasks`)}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            {t.taskType || "admin-action"}
                          </span>
                          <h4 className="font-bold text-slate-700 text-sm">
                            {t.title}
                          </h4>
                        </div>
                        {t.dueDate && (
                          <div className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-500">
                            {new Date(t.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
>>>>>>> origin/anm-crm-fixes
        </div>
      </div>

      {/* Quick Task Modal */}
      {showQuickTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900 capitalize">
                {quickTaskType === "meeting" ? "Schedule a Meeting" : `New ${quickTaskType?.replace("-", " ")}`}
              </h3>
              <button
                onClick={() => { setShowQuickTask(false); setQuickTaskType(null); }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="inline-block w-4 h-4 shrink-0 mr-1" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#C9A84C]"
                  placeholder={`e.g. ${quickTaskType === "meeting" ? "Kickoff Sync" : "Check in on proposal"}`}
                  value={quickTaskForm.title}
                  onChange={(e) =>
                    setQuickTaskForm({
                      ...quickTaskForm,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Assign To *
                  </label>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#C9A84C]"
                    value={quickTaskForm.assignedTo}
                    onChange={(e) =>
                      setQuickTaskForm({
                        ...quickTaskForm,
                        assignedTo: e.target.value,
                      })
                    }
                  >
                    <option value="">Select team member...</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Date / Deadline</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#C9A84C]"
                    value={quickTaskForm.dueDate}
                    onChange={e => setQuickTaskForm({...quickTaskForm, dueDate: e.target.value})}
                  />
                </div>
                {quickTaskType === "meeting" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Time</label>
                    <input 
                      type="time" 
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#C9A84C]"
                      value={quickTaskForm.time}
                      onChange={e => setQuickTaskForm({...quickTaskForm, time: e.target.value})}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#C9A84C] resize-none"
                  rows={3}
                  placeholder="Context for this action..."
                  value={quickTaskForm.description}
                  onChange={(e) =>
                    setQuickTaskForm({
                      ...quickTaskForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowQuickTask(false); setQuickTaskType(null); }}
                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={submitQuickTask}
                disabled={
                  submittingTask ||
                  !quickTaskForm.title ||
                  !quickTaskForm.assignedTo
                }
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors shadow-md disabled:opacity-50 text-white ${quickTaskType === "meeting" ? "bg-[#6264A7] hover:bg-[#464775]" : "bg-[#0D1B3E] hover:opacity-90"}`}
              >
                {submittingTask ? "Saving..." : quickTaskType === "meeting" ? "Save & Schedule in Teams" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Create Project Modal */}
      <CreateProjectModal 
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        initialClient={{ id: client.id, name: client.company || client.name }}
      />
    </div>
  );
}
