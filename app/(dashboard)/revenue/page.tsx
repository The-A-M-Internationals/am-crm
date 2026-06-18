"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

const PIE_COLORS = ["#0D1B3E","#C9A84C","#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#ec4899"];
const MONTHS     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const EXP_CATS   = ["Office","Software","Marketing","Salary","Travel","Equipment","Other"];

const EMPTY_EXP = { description: "", amount: "", category: "", date: "" };
const EMPTY_REV = { description: "", amount: "", category: "Manual Entry", date: "" };

export default function RevenuePage() {
  const { crmUser } = useAuth();
  const [invoices,    setInvoices]    = useState<any[]>([]);
  const [expenses,    setExpenses]    = useState<any[]>([]);
  const [manualRev,   setManualRev]   = useState<any[]>([]);
  const [projects,    setProjects]    = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  
  const [showExp,     setShowExp]     = useState(false);
  const [editingExp,  setEditingExp]  = useState<any | null>(null);
  const [expForm,     setExpForm]     = useState({ ...EMPTY_EXP });

  const [showRev,     setShowRev]     = useState(false);
  const [editingRev,  setEditingRev]  = useState<any | null>(null);
  const [revForm,     setRevForm]     = useState({ ...EMPTY_REV });

  const [saving,      setSaving]      = useState(false);

  async function fetchData() {
    try {
      const [invSnap, expSnap, revSnap, projSnap] = await Promise.all([
        getDocs(collection(db, "invoices")),
        getDocs(collection(db, "expenses")),
        getDocs(collection(db, "manual_revenue")),
        getDocs(collection(db, "projects")),
      ]);
      setInvoices(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setExpenses(expSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setManualRev(revSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setProjects(projSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching revenue data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  if (crmUser?.role !== "admin") {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#fee2e2" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>Admin Access Only</p>
        </div>
      </div>
    );
  }

  // Calculations
  const invoiceRevenue = invoices.reduce((s, i) => {
    const paid = i.paidAmount !== undefined ? Number(i.paidAmount) : (i.status === "paid" ? Number(i.total) : 0);
    return s + paid;
  }, 0);
  
  // Requirement: Completed projects should add to revenue
  // We avoid double counting by subtracting what was already paid via invoices
  const completedProjectsValue = projects
    .filter(p => p.status === "completed")
    .reduce((s, p) => {
      const paidForProject = invoices
        .filter(inv => inv.projectId === p.id)
        .reduce((sum, inv) => {
          const paid = inv.paidAmount !== undefined ? Number(inv.paidAmount) : (inv.status === "paid" ? Number(inv.total) : 0);
          return sum + paid;
        }, 0);
      return s + Math.max(0, (Number(p.budget) || 0) - paidForProject);
    }, 0);

  const manualRevenueTotal = manualRev.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const totalRevenue  = invoiceRevenue + completedProjectsValue + manualRevenueTotal;
  const totalPending  = invoices.reduce((s, i) => {
    const paid = i.paidAmount !== undefined ? Number(i.paidAmount) : (i.status === "paid" ? Number(i.total) : 0);
    return s + Math.max(0, (Number(i.total) || 0) - paid);
  }, 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netProfit     = totalRevenue - totalExpenses;
  const profitMargin  = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const paidCount = invoices.filter(i => i.status === "paid").length;

  const year = new Date().getFullYear();
  const monthlyData = MONTHS.map((month, idx) => {
    const invRev = invoices
      .filter(i => { 
        const d = new Date(i.createdAt); 
        return d.getMonth() === idx && d.getFullYear() === year; 
      })
      .reduce((s, i) => {
        const paid = i.paidAmount !== undefined ? Number(i.paidAmount) : (i.status === "paid" ? Number(i.total) : 0);
        return s + paid;
      }, 0);
    
    const projRev = projects
      .filter(p => p.status === "completed")
      .filter(p => { const d = new Date(p.updatedAt || p.createdAt); return d.getMonth() === idx && d.getFullYear() === year; })
      .reduce((s, p) => {
        const paidForProject = invoices
          .filter(inv => inv.projectId === p.id)
          .reduce((sum, inv) => {
            const paid = inv.paidAmount !== undefined ? Number(inv.paidAmount) : (inv.status === "paid" ? Number(inv.total) : 0);
            return sum + paid;
          }, 0);
        return s + Math.max(0, (Number(p.budget) || 0) - paidForProject);
      }, 0);

    const manRev = manualRev
      .filter(r => { const d = new Date(r.date || r.createdAt); return d.getMonth() === idx && d.getFullYear() === year; })
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const rev = invRev + projRev + manRev;

    const exp = expenses
      .filter(e => { const d = new Date(e.date || e.createdAt); return d.getMonth() === idx && d.getFullYear() === year; })
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { month, Revenue: Math.round(rev), Expenses: Math.round(exp), Profit: Math.round(rev - exp) };
  });

  const clientMap: Record<string, number> = {};
  invoices.forEach(i => { 
    const paid = i.paidAmount !== undefined ? Number(i.paidAmount) : (i.status === "paid" ? Number(i.total) : 0);
    clientMap[i.clientName] = (clientMap[i.clientName] || 0) + paid; 
  });
  // Add completed projects remaining value to client map
  projects.filter(p => p.status === "completed").forEach(p => {
    const paidForProject = invoices
      .filter(inv => inv.projectId === p.id)
      .reduce((sum, inv) => {
        const paid = inv.paidAmount !== undefined ? Number(inv.paidAmount) : (inv.status === "paid" ? Number(inv.total) : 0);
        return sum + paid;
      }, 0);
    const remaining = Math.max(0, (Number(p.budget) || 0) - paidForProject);
    clientMap[p.clientName] = (clientMap[p.clientName] || 0) + remaining;
  });
  
  const clientData = Object.entries(clientMap).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value).slice(0, 8);

  const svcLabels: Record<string, string> = { "digital-marketing": "Digital Mktg", "ui-ux": "UI/UX", "web-development": "Web Dev", "seo": "SEO", "social-media": "Social", "branding": "Branding", "other": "Other" };
  const svcMap: Record<string, number> = {};
  invoices.forEach(i => { 
    const l = svcLabels[i.service] || i.service || "Other"; 
    const paid = i.paidAmount !== undefined ? Number(i.paidAmount) : (i.status === "paid" ? Number(i.total) : 0);
    svcMap[l] = (svcMap[l] || 0) + paid; 
  });
  projects.filter(p => p.status === "completed").forEach(p => {
    const l = svcLabels[p.service] || p.service || "Other";
    const paidForProject = invoices
      .filter(inv => inv.projectId === p.id)
      .reduce((sum, inv) => {
        const paid = inv.paidAmount !== undefined ? Number(inv.paidAmount) : (inv.status === "paid" ? Number(inv.total) : 0);
        return sum + paid;
      }, 0);
    const remaining = Math.max(0, (Number(p.budget) || 0) - paidForProject);
    svcMap[l] = (svcMap[l] || 0) + remaining;
  });
  const serviceData = Object.entries(svcMap).map(([name, value]) => ({ name, value: Math.round(value) }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "white", border: "1px solid #e8e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
        <p style={{ fontWeight: 700, color: "#0D1B3E", marginBottom: 4 }}>{label}</p>
        {payload.map((p: any) => <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>{p.name}: <strong>AED {Number(p.value).toLocaleString()}</strong></p>)}
      </div>
    );
  };

  // Expense modal open
  function openAddExpense() {
    setEditingExp(null);
    setExpForm({ ...EMPTY_EXP });
    setShowExp(true);
  }

  function openEditExpense(e: any) {
    setEditingExp(e);
    setExpForm({ description: e.description, amount: String(e.amount), category: e.category ?? "", date: e.date ?? "" });
    setShowExp(true);
  }

  async function saveExpense() {
    if (!expForm.description || !expForm.amount) return;
    setSaving(true);
    try {
      const payload = { ...expForm, amount: Number(expForm.amount) };
      if (editingExp) {
        await updateDoc(doc(db, "expenses", editingExp.id), payload);
      } else {
        await addDoc(collection(db, "expenses"), { ...payload, createdAt: new Date().toISOString() });
      }
      setShowExp(false);
      setExpForm({ ...EMPTY_EXP });
      setEditingExp(null);
      fetchData();
    } finally { setSaving(false); }
  }

  async function delExpense(id: string) {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    await deleteDoc(doc(db, "expenses", id));
    fetchData();
  }

  // Revenue modal open
  function openAddRevenue() {
    setEditingRev(null);
    setRevForm({ ...EMPTY_REV });
    setShowRev(true);
  }

  function openEditRevenue(r: any) {
    setEditingRev(r);
    setRevForm({ description: r.description, amount: String(r.amount), category: r.category ?? "Manual Entry", date: r.date ?? "" });
    setShowRev(true);
  }

  async function saveRevenue() {
    if (!revForm.description || !revForm.amount) return;
    setSaving(true);
    try {
      const payload = { ...revForm, amount: Number(revForm.amount) };
      if (editingRev) {
        await updateDoc(doc(db, "manual_revenue", editingRev.id), payload);
      } else {
        await addDoc(collection(db, "manual_revenue"), { ...payload, createdAt: new Date().toISOString() });
      }
      setShowRev(false);
      setRevForm({ ...EMPTY_REV });
      setEditingRev(null);
      fetchData();
    } finally { setSaving(false); }
  }

  async function delRevenue(id: string) {
    if (!confirm("Delete this revenue entry? This cannot be undone.")) return;
    await deleteDoc(doc(db, "manual_revenue", id));
    fetchData();
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Revenue</h1>
          <p className="page-subtitle">Financial overview — Admin only · {year}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAddRevenue} className="btn-secondary" style={{ borderColor: "#22c55e", color: "#22c55e" }}>
            <span className="text-base">+</span> Add Revenue/Profit
          </button>
          <button onClick={openAddExpense} className="btn-primary">
            <span className="text-base">+</span> Add Expense
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Revenue",  value: `AED ${totalRevenue.toLocaleString()}`,  color: "#C9A84C", sub: `${paidCount} paid + completed projects` },
          { label: "Pending",        value: `AED ${totalPending.toLocaleString()}`,  color: "#f59e0b", sub: "Awaiting payment" },
          { label: "Total Expenses", value: `AED ${totalExpenses.toLocaleString()}`, color: "#ef4444", sub: `${expenses.length} records` },
          { label: "Net Profit",     value: `AED ${netProfit.toLocaleString()}`,     color: netProfit >= 0 ? "#22c55e" : "#ef4444", sub: "Revenue − Expenses" },
          { label: "Profit Margin",  value: `${profitMargin}%`,                      color: "#8b5cf6", sub: "Of total revenue" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="absolute top-0 left-0 w-full h-1 rounded-t-xl" style={{ background: s.color }} />
            <p className="text-xs font-semibold mt-1 mb-1" style={{ color: "#9ca3af" }}>{s.label}</p>
            <p className="text-lg font-bold leading-tight" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "#c4c7d0" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: "#f0f2f8" }} />)}
        </div>
      ) : (
        <>
          {/* Monthly chart */}
          <div className="crm-card mb-6">
            <h2 className="text-sm font-bold mb-1" style={{ color: "#0D1B3E" }}>Monthly Revenue vs Expenses ({year})</h2>
            <p className="text-xs mb-5" style={{ color: "#9ca3af" }}>Gold = Revenue · Red = Expenses · Navy = Profit</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Revenue"  fill="#C9A84C" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Profit"   fill="#0D1B3E" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* By Client */}
            <div className="crm-card">
              <h2 className="text-sm font-bold mb-1" style={{ color: "#0D1B3E" }}>Revenue by Client</h2>
              <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>Paid invoices + completed projects</p>
              {clientData.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: "#9ca3af" }}>No revenue recorded yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={clientData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={3}>
                      {clientData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`AED ${v.toLocaleString()}`, "Revenue"]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* By Service */}
            <div className="crm-card">
              <h2 className="text-sm font-bold mb-1" style={{ color: "#0D1B3E" }}>Revenue by Service</h2>
              <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>Paid invoices + completed projects</p>
              {serviceData.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: "#9ca3af" }}>No revenue recorded yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={serviceData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} width={75} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`AED ${v.toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="value" fill="#C9A84C" radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Revenue entries table */}
          <div className="crm-card mb-6 p-0 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#f0f0f5" }}>
              <h2 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Other Revenue / Manual Profit</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: "#22c55e" }}>AED {manualRevenueTotal.toLocaleString()}</span>
                <button onClick={openAddRevenue} className="btn-secondary" style={{ padding: "5px 12px", fontSize: 11, borderColor: "#22c55e", color: "#22c55e" }}>+ Add</button>
              </div>
            </div>
            {manualRev.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm" style={{ color: "#9ca3af" }}>No manual revenue recorded</p>
                <button onClick={openAddRevenue} className="btn-secondary mt-3 mx-auto" style={{ fontSize: 12, borderColor: "#22c55e", color: "#22c55e" }}>+ Add Entry</button>
              </div>
            ) : (
              <table className="crm-table">
                <thead>
                  <tr><th>Description</th><th>Category</th><th>Date</th><th>Amount</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {manualRev.map(r => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.description}</td>
                      <td><span className="badge" style={{ background: "#f0fdf4", color: "#16a34a" }}>{r.category || "—"}</span></td>
                      <td className="text-xs" style={{ color: "#9ca3af" }}>
                        {r.date ? new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="font-bold" style={{ color: "#22c55e" }}>AED {Number(r.amount).toLocaleString()}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditRevenue(r)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80" style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" }}>✎ Edit</button>
                          <button onClick={() => delRevenue(r.id)} className="btn-danger">🗑 Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Expenses table */}
          <div className="crm-card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#f0f0f5" }}>
              <h2 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Expenses Breakdown</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: "#ef4444" }}>AED {totalExpenses.toLocaleString()}</span>
                <button onClick={openAddExpense} className="btn-primary" style={{ padding: "5px 12px", fontSize: 11 }}>+ Add</button>
              </div>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm" style={{ color: "#9ca3af" }}>No expenses recorded</p>
                <button onClick={openAddExpense} className="btn-primary mt-3 mx-auto" style={{ fontSize: 12 }}>+ Add Expense</button>
              </div>
            ) : (
              <table className="crm-table">
                <thead>
                  <tr><th>Description</th><th>Category</th><th>Date</th><th>Amount</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td className="font-medium">{e.description}</td>
                      <td><span className="badge badge-draft">{e.category || "—"}</span></td>
                      <td className="text-xs" style={{ color: "#9ca3af" }}>
                        {e.date ? new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="font-bold" style={{ color: "#ef4444" }}>AED {Number(e.amount).toLocaleString()}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {/* EDIT button */}
                          <button
                            onClick={() => openEditExpense(e)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                            style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" }}
                          >
                            ✎ Edit
                          </button>
                          {/* DELETE button */}
                          <button onClick={() => delExpense(e.id)} className="btn-danger">
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Add / Edit Expense Modal */}
      {showExp && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="modal-title mb-0">{editingExp ? "Edit Expense" : "Add Expense"}</h2>
              <button onClick={() => setShowExp(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Description *</label>
                <input className="form-input" value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} placeholder="Office rent, Adobe CC, Salary..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Amount (AED) *</label>
                  <input
                    className="form-input"
                    type="number"
                    value={expForm.amount === "0" || expForm.amount === 0 ? "" : expForm.amount}
                    onChange={e => setExpForm({ ...expForm, amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
                    <option value="">Select...</option>
                    {EXP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowExp(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
                Cancel
              </button>
              <button onClick={saveExpense} disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-50">
                {saving ? "Saving..." : editingExp ? "Update Expense" : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Revenue Modal */}
      {showRev && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="modal-title mb-0">{editingRev ? "Edit Revenue" : "Add Revenue/Profit"}</h2>
              <button onClick={() => setShowRev(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Description *</label>
                <input className="form-input" value={revForm.description} onChange={e => setRevForm({ ...revForm, description: e.target.value })} placeholder="Project bonus, Extra consultation, etc." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Amount (AED) *</label>
                  <input
                    className="form-input"
                    type="number"
                    value={revForm.amount === "0" || revForm.amount === 0 ? "" : revForm.amount}
                    onChange={e => setRevForm({ ...revForm, amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <input className="form-input" value={revForm.category} onChange={e => setRevForm({ ...revForm, category: e.target.value })} placeholder="Manual Entry" />
                </div>
              </div>
              <div>
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={revForm.date} onChange={e => setRevForm({ ...revForm, date: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRev(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
                Cancel
              </button>
              <button onClick={saveRevenue} disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-50" style={{ background: "#22c55e" }}>
                {saving ? "Saving..." : editingRev ? "Update Revenue" : "Add Revenue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
