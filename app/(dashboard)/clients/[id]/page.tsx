"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, doc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Client, Proposal, Task, Invoice } from "@/types";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function ClientProfilePage({ params }: { params: { id: string } }) {
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
  const [quickTaskType, setQuickTaskType] = useState<"follow-up" | "meeting" | null>(null);
  const [quickTaskForm, setQuickTaskForm] = useState({ title: "", description: "", assignedTo: "", dueDate: "" });
  const [submittingTask, setSubmittingTask] = useState(false);

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

    // Fetch related data
    const fetchRelatedData = async () => {
      try {
        const [propSnap, projSnap, taskSnap, invSnap, membersSnap] = await Promise.all([
          getDocs(query(collection(db, "proposals"), where("clientId", "==", params.id))),
          getDocs(query(collection(db, "projects"), where("clientId", "==", params.id))),
          getDocs(query(collection(db, "tasks"), where("clientId", "==", params.id))),
          getDocs(query(collection(db, "invoices"), where("clientId", "==", params.id))),
          getDocs(collection(db, "users"))
        ]);

        setProposals(propSnap.docs.map(d => ({ id: d.id, ...d.data() } as Proposal)));
        setProjects(projSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
        setMembers(membersSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
        
        try {
          // Wrap invoices in a try/catch in case index is missing or collection is empty
          setInvoices(invSnap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
        } catch(e) {}

      } catch (err) {
        console.error("Error fetching related data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRelatedData();

    return () => unsubClient();
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
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  async function submitQuickTask() {
    if (!quickTaskForm.title || !quickTaskForm.assignedTo) return alert("Title and Assignee are required.");
    setSubmittingTask(true);
    try {
      const employee = members.find(m => m.uid === quickTaskForm.assignedTo);
      await addDoc(collection(db, "tasks"), {
        title: quickTaskForm.title,
        description: quickTaskForm.description,
        assignedTo: quickTaskForm.assignedTo,
        assignedToName: employee?.name || "Unknown",
        assignedBy: crmUser?.uid || "System",
        clientId: client?.id || "",
        clientName: client?.company || client?.name || "",
        relatedTo: "",
        relatedType: "",
        priority: "medium",
        status: "not-started",
        done: false,
        taskType: quickTaskType,
        createdAt: new Date().toISOString(),
        dueDate: quickTaskForm.dueDate || new Date().toISOString()
      });
      setQuickTaskType(null);
      setQuickTaskForm({ title: "", description: "", assignedTo: "", dueDate: "" });
      
      // Refresh tasks locally or rely on a snapshot listener if we switch tasks to snapshot
      const taskSnap = await getDocs(query(collection(db, "tasks"), where("clientId", "==", params.id)));
      setTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    } catch (e: any) {
      alert("Failed: " + e.message);
    } finally {
      setSubmittingTask(false);
    }
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#f8fafc] font-sans">
      
      {/* Top Navigation */}
      <div className="max-w-7xl mx-auto mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
        <Link href="/clients" className="hover:text-[#C9A84C] transition-colors">Clients</Link>
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
              <h1 className="text-2xl font-black text-[#0D1B3E] tracking-tight">{client.company || client.name}</h1>
              {client.company && client.name && (
                <p className="text-slate-500 font-medium text-sm mt-1">{client.name}</p>
              )}
              
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold uppercase tracking-widest border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Client
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">📧</div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="font-semibold text-slate-800 text-sm break-all">{client.email || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">📱</div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                  <p className="font-semibold text-slate-800 text-sm">{client.phone || "N/A"}</p>
                </div>
              </div>
              {client.address && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">📍</div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</p>
                    <p className="font-semibold text-slate-800 text-sm">{client.address}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8">
              <button onClick={() => router.push(`/clients`)} className="w-full py-3 bg-[#f0f2f8] text-[#0D1B3E] font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors">
                Edit Details in Directory
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-[#0D1B3E]">{projects.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Projects</span>
            </div>
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-[#C9A84C]">{proposals.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Proposals</span>
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
              <button onClick={() => router.push(`/projects?new=true&clientId=${client.id}`)} className="text-xs font-bold text-[#C9A84C] hover:text-[#b0923e] transition-colors">
                + New Project
              </button>
            </div>
            <div className="p-6">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">No projects yet.</div>
              ) : (
                <div className="space-y-4">
                  {projects.map(p => (
                    <div key={p.id} onClick={() => router.push(`/projects/${p.id}`)} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-[#C9A84C]/50 hover:shadow-md transition-all cursor-pointer group">
                      <div>
                        <h3 className="font-bold text-slate-800 group-hover:text-[#0D1B3E] transition-colors">{p.title}</h3>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{p.status}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#C9A84C]/10 group-hover:text-[#C9A84C] transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
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
                <div className="text-center py-8 text-slate-400 text-sm font-medium">No proposals linked.</div>
              ) : (
                <div className="space-y-4">
                  {proposals.map(p => (
                    <div key={p.id} onClick={() => router.push(`/proposals/${p.id}`)} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-[#C9A84C]/50 hover:shadow-md transition-all cursor-pointer group gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            p.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            p.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-100' :
                            p.status === 'sent' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {p.status}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="font-bold text-slate-800 group-hover:text-[#0D1B3E] transition-colors line-clamp-1">{p.service}</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-slate-800">
                          {p.currency === "USD" ? "$" : "AED"} {p.totalValue?.toLocaleString()}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#C9A84C]/10 group-hover:text-[#C9A84C] transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
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
                <button onClick={() => setQuickTaskType("follow-up")} className="text-xs font-bold text-[#0D1B3E] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                  + Follow-up
                </button>
                <button onClick={() => setQuickTaskType("meeting")} className="text-xs font-bold text-[#0D1B3E] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                  + Meeting
                </button>
                <button onClick={() => router.push(`/tasks`)} className="text-xs font-bold text-[#C9A84C] hover:text-[#b0923e] px-2 transition-colors">
                  View All
                </button>
              </div>
            </div>
            <div className="p-6">
              {tasks.filter(t => t.status !== "completed").length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">No pending tasks for this client.</div>
              ) : (
                <div className="space-y-3">
                  {tasks.filter(t => t.status !== "completed").map(t => (
                    <div key={t.id} onClick={() => router.push(`/tasks`)} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.taskType || "admin-action"}</span>
                        <h4 className="font-bold text-slate-700 text-sm">{t.title}</h4>
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

        </div>
      </div>

      {/* Quick Task Modal */}
      {quickTaskType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900 capitalize">New {quickTaskType.replace("-", " ")}</h3>
              <button onClick={() => setQuickTaskType(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Title *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#C9A84C]"
                  placeholder={`e.g. ${quickTaskType === 'meeting' ? 'Kickoff Sync' : 'Check in on proposal'}`}
                  value={quickTaskForm.title}
                  onChange={e => setQuickTaskForm({...quickTaskForm, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Assign To *</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#C9A84C]"
                  value={quickTaskForm.assignedTo}
                  onChange={e => setQuickTaskForm({...quickTaskForm, assignedTo: e.target.value})}
                >
                  <option value="">Select team member...</option>
                  {members.map(m => (
                    <option key={m.uid} value={m.uid}>{m.name}</option>
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
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Notes</label>
                <textarea 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#C9A84C] resize-none"
                  rows={3}
                  placeholder="Context for this action..."
                  value={quickTaskForm.description}
                  onChange={e => setQuickTaskForm({...quickTaskForm, description: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setQuickTaskType(null)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={submitQuickTask}
                disabled={submittingTask || !quickTaskForm.title || !quickTaskForm.assignedTo}
                className="flex-1 py-3 text-sm font-bold text-white bg-[#0D1B3E] rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {submittingTask ? "Saving..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
