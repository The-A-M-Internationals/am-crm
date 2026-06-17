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
      const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const newBalance = (project.budget || 0) - totalPaid;

      await updateDoc(doc(db, "projects", project.id), { 
        payments: updatedPayments,
        balance: newBalance,
        updatedAt: new Date().toISOString()
      });

      setProject({ ...project, payments: updatedPayments, balance: newBalance });
      setShowPaymentModal(false);
      setPaymentForm({ amount: "", date: new Date().toISOString().split('T')[0], method: "Bank Transfer", notes: "" });
    } catch (e) {
      console.error(e);
      alert("Failed to log payment");
    } finally {
      setLoggingPayment(false);
    }
  }

  if (loading) return <div className="p-8 animate-pulse text-sm text-gray-500">Loading project details...</div>;
  if (!project) return <div className="p-8 text-sm text-gray-500">Project not found. <Link href="/projects" className="text-blue-600 underline">Go back</Link></div>;

  const st = STATUSES.find(s => s.key === project.status) || STATUSES[0];
  
  const projectAssignees = project.assignedTo || [];
  const taskAssignees = projectTasks.map(t => t.assignedTo).filter(uid => uid);
  const allInvolvedUids = Array.from(new Set([...projectAssignees, ...taskAssignees]));
  const assignedUsers = users.filter(u => allInvolvedUids.includes(u.uid));

  const totalPaid = (project.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const calculatedBalance = (project.budget || 0) - totalPaid;

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
            <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>BUDGET</p>
            <p className="text-xl font-bold" style={{ color: "#0D1B3E" }}>
              {project.currency || "AED"} {project.budget?.toLocaleString() || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>TOTAL PAID</p>
            <p className="text-xl font-bold text-green-600">
              {project.currency || "AED"} {totalPaid.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>BALANCE</p>
            <p className="text-xl font-bold text-red-500">
              {project.currency || "AED"} {calculatedBalance.toLocaleString()}
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
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Payment Ledger</h3>
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="btn-primary py-1.5 px-4 text-xs"
                  >
                    + Log Payment
                  </button>
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
    </div>
  );
}
