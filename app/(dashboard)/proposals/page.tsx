"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Proposal, ProposalItem, ServiceTag, ProposalStatus } from "@/types";
import { useAuth } from "@/lib/auth-context";

const SERVICES: { key: ServiceTag; label: string }[] = [
  { key: "digital-marketing", label: "Digital Marketing" },
  { key: "ui-ux",             label: "UI/UX Design" },
  { key: "web-development",   label: "Web Development" },
];

const STATUSES: { key: ProposalStatus; label: string; color: string; bg: string; border: string }[] = [
  { key: "draft",    label: "Draft",    color: "#374151", bg: "#f3f4f6", border: "#e5e7eb" },
  { key: "sent",     label: "Sent",     color: "#1e40af", bg: "#dbeafe", border: "#bfdbfe" },
  { key: "accepted", label: "Accepted", color: "#065f46", bg: "#d1fae5", border: "#a7f3d0" },
  { key: "rejected", label: "Rejected", color: "#991b1b", bg: "#fee2e2", border: "#fecaca" },
];

const EMPTY_ITEM: ProposalItem = { description: "", qty: 1, rate: 0, amount: 0 };

const EMPTY_FORM = {
  clientName: "", service: "web-development" as ServiceTag,
  status: "draft" as ProposalStatus, notes: "", validUntil: "",
  items: [{ ...EMPTY_ITEM }],
};

export default function ProposalsPage() {
  const { crmUser } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Proposal | null>(null);
  const [form, setForm]           = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM, items: [{ ...EMPTY_ITEM }] });
  const [saving, setSaving]       = useState(false);

  async function fetchProposals() {
    const snap = await getDocs(query(collection(db, "proposals"), orderBy("createdAt", "desc")));
    setProposals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Proposal)));
    setLoading(false);
  }

  useEffect(() => { fetchProposals(); }, []);

  function calcItem(item: ProposalItem): ProposalItem {
    return { ...item, amount: item.qty * item.rate };
  }

  function updateItem(index: number, field: keyof ProposalItem, value: string | number) {
    const updated = form.items.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, [field]: field === "description" ? value : Number(value) };
      return calcItem(next);
    });
    setForm({ ...form, items: updated });
  }

  function addItem() { setForm({ ...form, items: [...form.items, { ...EMPTY_ITEM }] }); }
  function removeItem(i: number) { setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) }); }

  const subtotal = form.items.reduce((sum, it) => sum + it.amount, 0);
  const tax      = subtotal * 0.05;
  const total    = subtotal + tax;

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, items: [{ ...EMPTY_ITEM }] });
    setShowModal(true);
  }

  function openEdit(p: Proposal) {
    setEditing(p);
    setForm({
      clientName: p.clientName, service: p.service, status: p.status,
      notes: p.notes ?? "", validUntil: p.validUntil ?? "", items: p.items,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.clientName) return;
    setSaving(true);
    try {
      const now  = new Date().toISOString();
      const data = { ...form, subtotal, tax, total, createdBy: crmUser?.uid ?? "" };
      if (editing) {
        await updateDoc(doc(db, "proposals", editing.id), data);
      } else {
        await addDoc(collection(db, "proposals"), { ...data, createdAt: now });
      }
      setShowModal(false); fetchProposals();
    } finally { setSaving(false); }
  }

  async function deleteProposal(id: string) {
    if (!confirm("Are you sure you want to delete this proposal? This cannot be undone.")) return;
    await deleteDoc(doc(db, "proposals", id));
    fetchProposals();
  }

  async function updateStatus(p: Proposal, status: ProposalStatus) {
    await updateDoc(doc(db, "proposals", p.id), { status });
    setProposals((prev) => prev.map((x) => x.id === p.id ? { ...x, status } : x));
  }

  function statusInfo(key: string) {
    return STATUSES.find((s) => s.key === key) ?? STATUSES[0];
  }

  const totalValue    = proposals.reduce((s, p) => s + (p.total || 0), 0);
  const acceptedValue = proposals.filter(p => p.status === "accepted").reduce((s, p) => s + (p.total || 0), 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Proposals</h1>
          <p className="page-subtitle">
            {proposals.filter(p => p.status === "accepted").length} accepted ·{" "}
            {proposals.length} total · AED {totalValue.toLocaleString()} pipeline
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <span className="text-base">+</span> New Proposal
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATUSES.map(s => {
          const count = proposals.filter(p => p.status === s.key).length;
          const value = proposals.filter(p => p.status === s.key).reduce((sum, p) => sum + (p.total || 0), 0);
          return (
            <div key={s.key} className="stat-card">
              <div className="absolute top-0 left-0 w-full h-1 rounded-t-xl" style={{ background: s.color }} />
              <p className="text-xs font-semibold mt-1 mb-1" style={{ color: "#9ca3af" }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{count}</p>
              <p className="text-xs mt-1 font-medium" style={{ color: "#c4c7d0" }}>AED {value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {/* Proposals list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "#f0f2f8" }} />)}
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16 crm-card">
          <p className="text-sm" style={{ color: "#9ca3af" }}>No proposals yet</p>
          <button onClick={openAdd} className="btn-primary mt-3 mx-auto">+ Create Proposal</button>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => {
            const st  = statusInfo(p.status);
            const svc = SERVICES.find((s) => s.key === p.service);
            return (
              <div key={p.id} className="crm-card">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  {/* Left — info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#0D1B3E0d" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D1B3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#1a1a2e" }}>{p.clientName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                        {svc?.label} ·{" "}
                        {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {p.validUntil && ` · Valid until ${new Date(p.validUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                        {p.items?.length || 0} line item{(p.items?.length || 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Right — amount + actions */}
                  <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                    <div className="text-right mr-2">
                      <p className="text-base font-bold" style={{ color: "#C9A84C" }}>
                        AED {p.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>incl. 5% VAT</p>
                    </div>

                    {/* Status badge */}
                    <span className="badge" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                      {st.label}
                    </span>

                    {/* Status change buttons */}
                    {STATUSES.filter(s => s.key !== p.status).map(s => (
                      <button
                        key={s.key}
                        onClick={() => updateStatus(p, s.key)}
                        className="badge cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                      >
                        → {s.label}
                      </button>
                    ))}

                    {/* EDIT button */}
                    <button
                      onClick={() => openEdit(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" }}
                    >
                      ✎ Edit
                    </button>

                    {/* DELETE button */}
                    <button
                      onClick={() => deleteProposal(p.id)}
                      className="btn-danger"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 680 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="modal-title mb-0">
                {editing ? `Edit Proposal — ${editing.clientName}` : "New Proposal"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Client Name *</label>
                  <input className="form-input" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Client or company name" />
                </div>
                <div>
                  <label className="form-label">Service</label>
                  <select className="form-input" value={form.service} onChange={e => setForm({ ...form, service: e.target.value as ServiceTag })}>
                    {SERVICES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProposalStatus })}>
                    {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Valid Until</label>
                  <input className="form-input" type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label mb-0">Line Items</label>
                  <button onClick={addItem} className="text-xs font-bold" style={{ color: "#C9A84C" }}>+ Add Item</button>
                </div>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                  <div className="grid text-xs font-bold uppercase tracking-wide px-3 py-2.5" style={{ gridTemplateColumns: "1fr 70px 100px 100px 28px", gap: 8, background: "#f8f9fc", color: "#9ca3af" }}>
                    <span>Description</span>
                    <span className="text-center">Qty</span>
                    <span className="text-center">Rate (AED)</span>
                    <span className="text-right">Amount</span>
                    <span></span>
                  </div>
                  {form.items.map((item, i) => (
                    <div key={i} className="grid items-center px-3 py-2 border-t" style={{ gridTemplateColumns: "1fr 70px 100px 100px 28px", gap: 8, borderColor: "#f0f0f5" }}>
                      <input className="form-input py-1.5" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} placeholder="Service or item description" />
                      <input className="form-input py-1.5 text-center" type="number" min="1" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} />
                      <input className="form-input py-1.5 text-center" type="number" min="0" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} />
                      <span className="text-sm font-bold text-right" style={{ color: "#1a1a2e" }}>AED {item.amount.toLocaleString()}</span>
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="btn-danger" style={{ padding: "2px 6px", fontSize: "10px" }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: "#6b7280" }}>Subtotal</span>
                    <span style={{ color: "#1a1a2e" }}>AED {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "#6b7280" }}>VAT (5%)</span>
                    <span style={{ color: "#1a1a2e" }}>AED {tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2.5 border-t text-base" style={{ borderColor: "#e5e7eb" }}>
                    <span style={{ color: "#0D1B3E" }}>Total</span>
                    <span style={{ color: "#C9A84C" }}>AED {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Notes / Payment Terms</label>
                <textarea className="form-input resize-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="50% advance, balance on delivery..." />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
                Cancel
              </button>
              {editing && (
                <button
                  onClick={() => { deleteProposal(editing.id); setShowModal(false); }}
                  className="btn-danger px-4"
                >
                  🗑 Delete
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !form.clientName}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Update Proposal" : "Create Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
