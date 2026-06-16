"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Proposal, ProposalItem, ServiceTag, ProposalStatus, Lead } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { useSearchParams, useRouter } from "next/navigation";
import { PipelineService } from "@/lib/pipeline-service";

const SERVICES: { key: ServiceTag; label: string; bg: string; text: string }[] = [
  { key: "digital-marketing", label: "Digital Marketing", bg: "#dbeafe", text: "#1e40af" },
  { key: "ui-ux",             label: "UI/UX Design",      bg: "#fef3c7", text: "#92400e" },
  { key: "web-development",   label: "Web Development",   bg: "#d1fae5", text: "#065f46" },
  { key: "seo",               label: "SEO",               bg: "#ede9fe", text: "#5b21b6" },
  { key: "social-media",      label: "Social Media",      bg: "#fce7f3", text: "#9d174d" },
  { key: "branding",          label: "Branding",          bg: "#ffedd5", text: "#9a3412" },
  { key: "other",             label: "Other",             bg: "#f3f4f6", text: "#374151" },
];

const STATUSES: { key: ProposalStatus; label: string; color: string; bg: string; border: string }[] = [
  { key: "proposal", label: "Proposal", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  { key: "draft",    label: "Draft",    color: "#374151", bg: "#f3f4f6", border: "#e5e7eb" },
  { key: "sent",     label: "Sent",     color: "#1e40af", bg: "#dbeafe", border: "#bfdbfe" },
  { key: "accepted", label: "Accepted", color: "#065f46", bg: "#d1fae5", border: "#a7f3d0" },
  { key: "rejected", label: "Rejected", color: "#991b1b", bg: "#fee2e2", border: "#fecaca" },
];

const CURRENCIES = [
  { code: "AED", label: "AED (Dirham)" },
  { code: "USD", label: "USD (Dollar)" },
  { code: "INR", label: "INR (Rupee)" },
  { code: "EUR", label: "EUR (Euro)" },
  { code: "GBP", label: "GBP (Pound)" },
];

import { getMasterTemplate } from "@/lib/proposal-templates";

const EMPTY_ITEM: ProposalItem = { description: "", qty: 1, rate: 0, amount: 0 };

const EMPTY_FORM = {
  clientName: "", clientEmail: "", service: "web-development" as ServiceTag,
  status: "draft" as ProposalStatus, notes: "", validUntil: "",
  items: [{ ...EMPTY_ITEM }],
  currency: "AED",
};

function ProposalsContent() {
  const { crmUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<any>({ ...EMPTY_FORM, items: [{ ...EMPTY_ITEM }] });
  const [saving, setSaving]       = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only listen for click outside if we are adding a new proposal
    function handleClickOutside(event: MouseEvent) {
      if (activeRef.current && !activeRef.current.contains(event.target as Node)) {
        cancelEdit();
      }
    }
    if (isAddingNew) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddingNew]);

  useEffect(() => {
    const q = query(collection(db, "proposals"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Proposal))
        // Only valid proposal statuses are shown. 
        // We do not filter out "won" or "lost" here because those are lead stages,
        // and a proposal itself is either accepted or rejected.
        .filter(p => ["draft", "sent", "accepted", "rejected", "proposal"].includes(p.status));
      
      setProposals(list);
      setLoading(false);

      // Handle auto-edit from Lead transition
      const editLeadId = searchParams.get("editLead");
      if (editLeadId && list.length > 0) {
        const found = list.find(p => p.fromLeadId === editLeadId);
        if (found) {
          router.replace(`/proposals/${found.id}`, { scroll: false });
        }
      }
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [searchParams, router]);

  function calcItem(item: ProposalItem): ProposalItem {
    return { ...item, amount: item.qty * item.rate };
  }

  function updateItem(index: number, field: keyof ProposalItem, value: string | number) {
    const updated = form.items.map((item: any, i: number) => {
      if (i !== index) return item;
      const next = { ...item, [field]: field === "description" ? value : Number(value) };
      return calcItem(next);
    });
    setForm({ ...form, items: updated });
  }

  function addItem() { setForm({ ...form, items: [...form.items, { ...EMPTY_ITEM }] }); }
  function removeItem(i: number) { setForm({ ...form, items: form.items.filter((_: any, idx: number) => idx !== i) }); }

  const subtotal = form.items.reduce((sum: number, it: any) => sum + it.amount, 0);
  const tax      = subtotal * 0.05;
  const total    = subtotal + tax;

  function startAdding() {
    setIsAddingNew(true);
    const template = getMasterTemplate("web-development", "");
    setForm({ ...EMPTY_FORM, items: [{ ...EMPTY_ITEM }], ...template });
  }

  function viewProposal(id: string) {
    router.push(`/proposals/${id}`);
  }

  function cancelEdit() {
    setIsAddingNew(false);
  }

  async function handleSave() {
    if (!form.clientName) return;
    setSaving(true);
    try {
      const now  = new Date().toISOString();
      const data = { ...form, subtotal, tax, total, createdBy: crmUser?.uid ?? "" };
      
      const docRef = await addDoc(collection(db, "proposals"), { ...data, createdAt: now });
      const propId = docRef.id;
      
      if (form.status === "accepted") {
        await PipelineService.handleProposalStatusChange({ id: propId, ...data }, "accepted");
      }

      setIsAddingNew(false);
      
      // Instantly transport them to the high-fidelity document view!
      router.push(`/proposals/${propId}`);
    } finally { setSaving(false); }
  }

  async function deleteProposal(p: Proposal) {
    if (!confirm("Delete this proposal?")) return;
    await PipelineService.deleteProposal(p);
  }

  async function updateStatus(p: Proposal, status: ProposalStatus) {
    if (status === "accepted" && p.fromLeadId) {
      await PipelineService.acceptProposal(p.id, p.fromLeadId);
    } else if (p.status === "accepted" && status !== "accepted" && p.fromLeadId) {
      await PipelineService.withdrawProposal(p.id, p.fromLeadId, "proposal");
    } else {
      await PipelineService.handleProposalStatusChange(p, status);
    }
  }

  function statusInfo(key: string) {
    return STATUSES.find((s) => s.key === key) ?? STATUSES[0];
  }

  const totalValue = proposals.reduce((s, p) => s + (p.total || 0), 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Proposals</h1>
          <p className="page-subtitle">
            {proposals.filter(p => p.status === "accepted").length} accepted · {proposals.length} total · AED {totalValue.toLocaleString()} pipeline
          </p>
        </div>
        <button onClick={startAdding} className="btn-primary" disabled={isAddingNew}>
          <span className="text-base">+</span> New Proposal
        </button>
      </div>

      {/* Inline Editor for New Proposal */}
      {isAddingNew && (
        <div ref={activeRef} className="crm-card mb-6 border-2" style={{ borderColor: "#C9A84C" }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: "#0D1B3E" }}>New Proposal</h2>
          <ProposalForm form={form} setForm={setForm} subtotal={subtotal} tax={tax} total={total} updateItem={updateItem} addItem={addItem} removeItem={removeItem} handleSave={handleSave} cancelEdit={cancelEdit} saving={saving} />
        </div>
      )}

      {/* Proposals list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "#f0f2f8" }} />)}
        </div>
      ) : proposals.length === 0 && !isAddingNew ? (
        <div className="text-center py-16 crm-card">
          <p className="text-sm" style={{ color: "#9ca3af" }}>No proposals yet</p>
          <button onClick={startAdding} className="btn-primary mt-3 mx-auto">+ Create Proposal</button>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => {
            const st  = statusInfo(p.status);
            const svc = SERVICES.find((s) => s.key === p.service);

            return (
              <div key={p.id} className="crm-card transition-all hover:shadow-md border border-transparent hover:border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-3 cursor-pointer" onClick={() => viewProposal(p.id)}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#0D1B3E0d" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D1B3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#1a1a2e" }}>{p.clientName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{p.clientEmail} {p.phone && `· ${p.phone}`}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#c4c7d0" }}>{svc?.label} · {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <div className="text-right mr-2">
                      <p className="text-base font-bold" style={{ color: "#C9A84C" }}>{p.currency || "AED"} {p.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <span className="badge" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                    
                    <div className="flex gap-1">
                      {STATUSES.filter(s => s.key !== p.status).map(s => (
                        <button key={s.key} onClick={() => updateStatus(p, s.key)} className="text-[10px] px-2 py-1 rounded-md font-bold transition-all hover:opacity-80" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => deleteProposal(p)} className="p-2 text-red-400 hover:text-red-600 transition-colors">🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProposalForm({ form, setForm, subtotal, tax, total, updateItem, addItem, removeItem, handleSave, cancelEdit, saving }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Client Name *</label><input className="form-input" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Client name" /></div>
        <div>
          <label className="form-label">Service</label>
          <select 
            className="form-input" 
            value={form.service} 
            onChange={e => {
              const newService = e.target.value as ServiceTag;
              const template = getMasterTemplate(newService, form.clientName || form.company || "");
              setForm({ ...form, service: newService, ...template });
            }}
          >
            {SERVICES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProposalStatus })}>{STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
        <div><label className="form-label">Currency</label><select className="form-input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
        <div><label className="form-label">Valid Until</label><input className="form-input" type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} /></div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2"><label className="form-label mb-0">Line Items</label><button onClick={addItem} className="text-xs font-bold" style={{ color: "#C9A84C" }}>+ Add Item</button></div>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
          <div className="grid text-[10px] font-bold uppercase tracking-wide px-3 py-2" style={{ gridTemplateColumns: "1fr 60px 100px 100px 30px", gap: 8, background: "#f8f9fc", color: "#9ca3af" }}>
            <span>Description</span><span className="text-center">Qty</span><span className="text-center">Rate</span><span className="text-right">Amount</span><span></span>
          </div>
          {form.items.map((item: any, i: number) => (
            <div key={i} className="grid items-center px-3 py-1.5 border-t" style={{ gridTemplateColumns: "1fr 60px 100px 100px 30px", gap: 8, borderColor: "#f0f0f5" }}>
              <input className="form-input py-1 text-xs" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} placeholder="Service description" />
              <input className="form-input py-1 text-center text-xs" type="number" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} />
              <input className="form-input py-1 text-center text-xs" type="number" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} />
              <span className="text-xs font-bold text-right">{form.currency} {item.amount.toLocaleString()}</span>
              {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">✕</button>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-col items-end space-y-1 text-xs font-medium">
          <div className="flex gap-4"><span>Subtotal:</span><span>{form.currency} {subtotal.toLocaleString()}</span></div>
          <div className="flex gap-4"><span>VAT (5%):</span><span>{form.currency} {tax.toFixed(2)}</span></div>
          <div className="flex gap-4 text-sm font-bold pt-1 border-t" style={{ color: "#C9A84C", borderColor: "#e5e7eb" }}><span>Total:</span><span>{form.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving || !form.clientName} className="btn-primary flex-1 justify-center disabled:opacity-50">{saving ? "Saving..." : "Save Proposal"}</button>
        <button onClick={cancelEdit} className="px-6 py-2 rounded-xl border text-sm font-semibold" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Cancel</button>
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ProposalsContent />
    </Suspense>
  );
}
