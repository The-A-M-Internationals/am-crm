"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lead, ServiceTag, LeadStage } from "@/types";
import { useAuth } from "@/lib/auth-context";

const STAGES: { key: LeadStage; label: string; color: string; bg: string; border: string }[] = [
  { key: "lead",     label: "Lead",     color: "#7e22ce", bg: "#faf5ff", border: "#e9d5ff" },
  { key: "meeting",  label: "Meeting",  color: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
  { key: "proposal", label: "Proposal", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  { key: "won",      label: "Won",      color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  { key: "lost",     label: "Lost",     color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
];

const NEXT_ACTIONS: Record<LeadStage, string[]> = {
  lead:     ["Send intro email", "Make a call", "Connect on LinkedIn", "Research the client", "Schedule discovery call"],
  meeting:  ["Send meeting invite", "Prepare presentation", "Send agenda", "Follow up after meeting", "Share case studies"],
  proposal: ["Send proposal", "Follow up on proposal", "Schedule proposal call", "Negotiate terms", "Revise proposal"],
  won:      ["Send contract", "Schedule kickoff", "Onboard client", "Collect advance payment", "Set up project"],
  lost:     ["Send feedback request", "Re-engage in 3 months", "Add to nurture list", "Understand reason for loss"],
};

const SERVICES: { key: ServiceTag; label: string; bg: string; text: string }[] = [
  { key: "digital-marketing", label: "Digital Marketing", bg: "#dbeafe", text: "#1e40af" },
  { key: "ui-ux",             label: "UI/UX Design",      bg: "#fef3c7", text: "#92400e" },
  { key: "web-development",   label: "Web Development",   bg: "#d1fae5", text: "#065f46" },
];

const SOURCES = ["LinkedIn", "Referral", "Instagram", "Website", "WhatsApp", "Cold Call", "Email Campaign", "Other"];

const EMPTY_FORM = {
  name: "", company: "", email: "", phone: "",
  service: "web-development" as ServiceTag,
  stage: "lead" as LeadStage,
  followUpDate: "", notes: "", source: "", nextAction: "",
};

export default function LeadsPage() {
  const { crmUser } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [isCustomAction, setIsCustomAction] = useState(false);
  const [filter, setFilter] = useState<ServiceTag | "all">("all");

  async function fetchLeads() {
    const snap = await getDocs(query(collection(db, "leads"), orderBy("createdAt", "desc")));
    setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead)));
    setLoading(false);
  }

  useEffect(() => { fetchLeads(); }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setIsCustomAction(false);
    setShowModal(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setForm({
      name: lead.name, company: lead.company, email: lead.email,
      phone: lead.phone ?? "", service: lead.service, stage: lead.stage,
      followUpDate: lead.followUpDate ?? "", notes: lead.notes ?? "",
      source: lead.source ?? "", nextAction: (lead as any).nextAction ?? "",
    });
    setIsCustomAction(false);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.company || !form.email) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (editing) {
        await updateDoc(doc(db, "leads", editing.id), { ...form, updatedAt: now });
      } else {
        await addDoc(collection(db, "leads"), { ...form, assignedTo: crmUser?.uid ?? "", createdAt: now, updatedAt: now });
      }
      setShowModal(false); fetchLeads();
    } finally { setSaving(false); }
  }

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead?")) return;
    await deleteDoc(doc(db, "leads", id)); fetchLeads();
  }

  async function moveStage(lead: Lead, stage: LeadStage) {
    await updateDoc(doc(db, "leads", lead.id), { stage, updatedAt: new Date().toISOString() });
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, stage } : l));
  }

  const filtered = filter === "all" ? leads : leads.filter((l) => l.service === filter);
  const svcInfo = (key: string) => SERVICES.find((s) => s.key === key) ?? SERVICES[2];

  return (
    <div className="p-8 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">{leads.length} total · {leads.filter(l => l.stage === "won").length} won · {leads.filter(l => l.stage === "lost").length} lost</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#f0f2f8" }}>
            {[{ key: "all", label: "All" }, ...SERVICES.map((s) => ({ key: s.key, label: s.label.split(" ")[0] }))].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key as any)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: filter === f.key ? "white" : "transparent", color: filter === f.key ? "#0D1B3E" : "#9ca3af", boxShadow: filter === f.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={openAdd} className="btn-primary"><span className="text-base">+</span> Add Lead</button>
        </div>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex gap-4">{STAGES.map((s) => <div key={s.key} className="flex-1 h-64 rounded-2xl animate-pulse" style={{ background: "#f0f2f8", minWidth: 200 }} />)}</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 mt-6">
          {STAGES.map((stage) => {
            const stageLeads = filtered.filter((l) => l.stage === stage.key);
            return (
              <div key={stage.key} className="kanban-col flex-shrink-0" style={{ minWidth: 235, background: stage.bg, border: `1px solid ${stage.border}` }}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                    <span className="text-xs font-bold tracking-wide" style={{ color: stage.color }}>{stage.label.toUpperCase()}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${stage.color}18`, color: stage.color }}>{stageLeads.length}</span>
                </div>

                {stageLeads.map((lead) => {
                  const svc = svcInfo(lead.service);
                  const nextAction = (lead as any).nextAction;
                  return (
                    <div key={lead.id} className="kanban-card" onClick={() => openEdit(lead)}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#1a1a2e" }}>{lead.name}</p>
                          <p className="text-xs truncate" style={{ color: "#9ca3af" }}>{lead.company}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }} className="btn-danger flex-shrink-0" style={{ padding: "2px 6px", fontSize: "10px" }}>✕</button>
                      </div>
                      {nextAction && (
                        <div className="mb-2 px-2 py-1 rounded-lg text-xs font-medium" style={{ background: `${stage.color}10`, color: stage.color }}>
                          → {nextAction}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="badge" style={{ background: svc.bg, color: svc.text }}>{svc.label.split(" ")[0]}</span>
                        {lead.followUpDate && <span className="text-xs" style={{ color: "#9ca3af" }}>{new Date(lead.followUpDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {STAGES.filter((s) => s.key !== lead.stage).map((s) => (
                          <button key={s.key} onClick={() => moveStage(lead, s.key)} className="text-xs px-2 py-0.5 rounded-lg transition-all hover:opacity-90" style={{ background: `${s.color}15`, color: s.color, fontSize: "10px", fontWeight: 600 }}>
                            → {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {stageLeads.length === 0 && (
                  <div className="text-center py-8"><p className="text-xs" style={{ color: "#c4c7d0" }}>No leads here</p></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="modal-title mb-0">{editing ? "Edit Lead" : "Add New Lead"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" /></div>
                <div><label className="form-label">Company *</label><input className="form-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+971 50 123 4567" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Service</label>
                  <select className="form-input" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value as ServiceTag })}>
                    {SERVICES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Stage</label>
                  <select className="form-input" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as LeadStage, nextAction: "" })}>
                    {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* ✅ FIXED Next Action */}
              <div>
                <label className="form-label">Next Action</label>
                <select
                  className="form-input"
                  value={isCustomAction ? "custom" : form.nextAction}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setIsCustomAction(true);
                      setForm({ ...form, nextAction: "" });
                    } else {
                      setIsCustomAction(false);
                      setForm({ ...form, nextAction: e.target.value });
                    }
                  }}
                >
                  <option value="">Select next action...</option>
                  {NEXT_ACTIONS[form.stage].map((a) => <option key={a} value={a}>{a}</option>)}
                  <option value="custom">Custom...</option>
                </select>
                {isCustomAction && (
                  <input
                    className="form-input mt-2"
                    placeholder="Type your custom next action..."
                    value={form.nextAction}
                    autoFocus
                    onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Follow-up Date</label><input className="form-input" type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></div>
                <div>
                  <label className="form-label">Source</label>
                  <select className="form-input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                    <option value="">Select source...</option>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="form-label">Notes</label><textarea className="form-input resize-none" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.company || !form.email} className="btn-primary flex-1 justify-center disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Update Lead" : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}