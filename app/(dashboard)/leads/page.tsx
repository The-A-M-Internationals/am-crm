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
  { key: "seo",               label: "SEO",               bg: "#ede9fe", text: "#5b21b6" },
  { key: "social-media",      label: "Social Media",      bg: "#fce7f3", text: "#9d174d" },
  { key: "branding",          label: "Branding",          bg: "#ffedd5", text: "#9a3412" },
  { key: "other",             label: "Other",             bg: "#f3f4f6", text: "#374151" },
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
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<Lead | null>(null);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [isCustomAction, setIsCustomAction] = useState(false);
  const [filter, setFilter]     = useState<LeadStage | "all">("all");
  const [search, setSearch]     = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchLeads() {
    const snap = await getDocs(query(collection(db, "leads"), orderBy("createdAt", "desc")));
    setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead)));
    setLoading(false);
  }

  useEffect(() => { fetchLeads(); }, []);

  function openAdd() { setEditing(null); setForm({ ...EMPTY_FORM }); setIsCustomAction(false); setShowModal(true); }
  function openEdit(lead: Lead) {
    setEditing(lead);
    setForm({ name: lead.name, company: lead.company, email: lead.email, phone: lead.phone ?? "", service: lead.service, stage: lead.stage, followUpDate: lead.followUpDate ?? "", notes: lead.notes ?? "", source: lead.source ?? "", nextAction: (lead as any).nextAction ?? "" });
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
        // If won — auto create client
        if (form.stage === "won" && editing.stage !== "won") {
          const existing = await getDocs(query(collection(db, "clients")));
          const already = existing.docs.find(d => d.data().email === form.email);
          if (!already) {
            await addDoc(collection(db, "clients"), {
              name: form.name, company: form.company, email: form.email,
              phone: form.phone, services: [form.service], status: "active",
              fromLeadId: editing.id, createdAt: now,
            });
          }
        }
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
    // Auto-create client if won
    if (stage === "won") {
      const existing = await getDocs(query(collection(db, "clients")));
      const already = existing.docs.find(d => d.data().email === lead.email);
      if (!already) {
        await addDoc(collection(db, "clients"), {
          name: lead.name, company: lead.company, email: lead.email,
          phone: lead.phone, services: [lead.service], status: "active",
          fromLeadId: lead.id, createdAt: new Date().toISOString(),
        });
      }
    }
    fetchLeads();
  }

  const svcInfo  = (key: string) => SERVICES.find((s) => s.key === key) ?? SERVICES[2];
  const stgInfo  = (key: string) => STAGES.find((s) => s.key === key) ?? STAGES[0];

  const filtered = leads
    .filter(l => filter === "all" || l.stage === filter)
    .filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.company.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">{leads.length} total · {leads.filter(l => l.stage === "won").length} won · {leads.filter(l => l.stage === "lost").length} lost</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><span className="text-base">+</span> Add Lead</button>
      </div>

      {/* Stage summary pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setFilter("all")} className="px-4 py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: filter === "all" ? "#0D1B3E" : "white", color: filter === "all" ? "white" : "#6b7280", border: "1px solid", borderColor: filter === "all" ? "#0D1B3E" : "#e5e7eb" }}>
          All ({leads.length})
        </button>
        {STAGES.map(s => {
          const count = leads.filter(l => l.stage === s.key).length;
          return (
            <button key={s.key} onClick={() => setFilter(s.key)} className="px-4 py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: filter === s.key ? s.bg : "white", color: filter === s.key ? s.color : "#6b7280", border: `1px solid ${filter === s.key ? s.border : "#e5e7eb"}` }}>
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          className="form-input"
          style={{ maxWidth: 360 }}
          placeholder="🔍  Search leads by name or company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#f0f2f8" }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 crm-card">
          <p className="text-sm" style={{ color: "#9ca3af" }}>No leads found</p>
          <button onClick={openAdd} className="btn-primary mt-3 mx-auto">+ Add Lead</button>
        </div>
      ) : (
        <div className="crm-card p-0 overflow-hidden">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Service</th>
                <th>Stage</th>
                <th>Next Action</th>
                <th>Follow-up</th>
                <th>Move To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const svc = svcInfo(lead.service);
                const stg = stgInfo(lead.stage);
                const isExpanded = expandedId === lead.id;
                const nextAction = (lead as any).nextAction;
                return (
                  <>
                    <tr
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                      style={{ background: isExpanded ? "#fafbff" : "white" }}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: stg.bg, color: stg.color }}>
                            {lead.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: "#1a1a2e" }}>{lead.name}</p>
                            <p className="text-xs" style={{ color: "#9ca3af" }}>{lead.company}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge" style={{ background: svc.bg, color: svc.text }}>{svc.label.split(" ")[0]}</span></td>
                      <td><span className="badge" style={{ background: stg.bg, color: stg.color, border: `1px solid ${stg.border}` }}>{stg.label}</span></td>
                      <td>
                        {nextAction ? (
                          <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: `${stg.color}10`, color: stg.color }}>→ {nextAction}</span>
                        ) : <span style={{ color: "#c4c7d0" }}>—</span>}
                      </td>
                      <td className="text-xs" style={{ color: lead.followUpDate && new Date(lead.followUpDate) < new Date() ? "#ef4444" : "#6b7280" }}>
                        {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 flex-wrap">
                          {STAGES.filter(s => s.key !== lead.stage).map(s => (
                            <button key={s.key} onClick={() => moveStage(lead, s.key)} className="text-xs px-2 py-1 rounded-lg font-semibold transition-all hover:opacity-90" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: "10px" }}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(lead)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" }}>✎ Edit</button>
                          <button onClick={() => deleteLead(lead.id)} className="btn-danger">🗑</button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${lead.id}-expand`} style={{ background: "#fafbff" }}>
                        <td colSpan={7} style={{ padding: "12px 20px" }}>
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <p className="font-bold mb-1" style={{ color: "#6b7280" }}>CONTACT</p>
                              <p style={{ color: "#374151" }}>📧 {lead.email}</p>
                              {lead.phone && <p style={{ color: "#374151" }}>📱 {lead.phone}</p>}
                            </div>
                            <div>
                              <p className="font-bold mb-1" style={{ color: "#6b7280" }}>SOURCE</p>
                              <p style={{ color: "#374151" }}>{(lead as any).source || "—"}</p>
                            </div>
                            <div>
                              <p className="font-bold mb-1" style={{ color: "#6b7280" }}>NOTES</p>
                              <p style={{ color: "#374151" }}>{lead.notes || "—"}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
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
                <div><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Smith" /></div>
                <div><label className="form-label">Company *</label><input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+971 50 123 4567" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Service</label>
                  <select className="form-input" value={form.service} onChange={e => setForm({ ...form, service: e.target.value as ServiceTag })}>
                    {SERVICES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Stage</label>
                  <select className="form-input" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value as LeadStage, nextAction: "" })}>
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Next Action</label>
                <select className="form-input" value={isCustomAction ? "custom" : form.nextAction}
                  onChange={e => {
                    if (e.target.value === "custom") { setIsCustomAction(true); setForm({ ...form, nextAction: "" }); }
                    else { setIsCustomAction(false); setForm({ ...form, nextAction: e.target.value }); }
                  }}>
                  <option value="">Select next action...</option>
                  {NEXT_ACTIONS[form.stage].map(a => <option key={a} value={a}>{a}</option>)}
                  <option value="custom">Custom...</option>
                </select>
                {isCustomAction && (
                  <input className="form-input mt-2" placeholder="Type your custom action..." value={form.nextAction} autoFocus onChange={e => setForm({ ...form, nextAction: e.target.value })} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Follow-up Date</label><input className="form-input" type="date" value={form.followUpDate} onChange={e => setForm({ ...form, followUpDate: e.target.value })} /></div>
                <div>
                  <label className="form-label">Source</label>
                  <select className="form-input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                    <option value="">Select source...</option>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="form-label">Notes</label><textarea className="form-input resize-none" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." /></div>
            </div>

            {form.stage === "won" && editing && editing.stage !== "won" && (
              <div className="mt-4 px-4 py-3 rounded-xl text-xs font-medium" style={{ background: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0" }}>
                ✅ This lead will be automatically added to <strong>Clients</strong> when saved!
              </div>
            )}

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
