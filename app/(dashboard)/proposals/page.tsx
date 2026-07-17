"use client";
import { X, Eye, Pencil, Check } from "lucide-react";


import { useEffect, useState, Suspense, useRef } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Proposal, ProposalItem, ServiceTag, ProposalStatus, Lead } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { useSearchParams, useRouter } from "next/navigation";
import { PipelineService } from "@/lib/pipeline-service";
import { PhoneInput } from "@/components/phone-input";

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
  const [clients, setClients]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<any>({ ...EMPTY_FORM, items: [{ ...EMPTY_ITEM }] });
  const [saving, setSaving]       = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeRef.current && !activeRef.current.contains(event.target as Node)) {
        cancelEdit();
      }
    }
    if (isAddingNew || editingId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddingNew, editingId]);

  useEffect(() => {
    const q = query(collection(db, "proposals"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Proposal))
        // Only valid proposal statuses are shown. 
        // We do not filter out "won" or "lost" here because those are lead stages,
        // and a proposal itself is either accepted or rejected.
        .filter(p => ["draft", "sent", "accepted", "rejected", "proposal", "won", "lost"].includes(p.status));
      
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

    const qClients = query(collection(db, "clients"), where("active", "!=", false));
    const unsubClients = onSnapshot(qClients, (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribe();
      unsubClients();
    };
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
    setEditingId(null);
    setIsAddingNew(true);
    const template = getMasterTemplate("web-development", "");
    setForm({ ...EMPTY_FORM, items: [{ ...EMPTY_ITEM }], ...template });
  }

  function startEditing(p: Proposal) {
    setIsAddingNew(false);
    setEditingId(p.id);
    setForm({
      ...p,
      clientName: p.clientName || "",
      clientEmail: p.clientEmail || "",
      service: p.service || "web-development",
      status: p.status || "draft",
      notes: p.notes || "",
      validUntil: p.validUntil || "",
      items: p.items || [{ ...EMPTY_ITEM }],
      currency: p.currency || "AED",
    });
  }

  function viewProposal(id: string) {
    router.push(`/proposals/${id}`);
  }

  function cancelEdit() {
    setIsAddingNew(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM, items: [{ ...EMPTY_ITEM }] });
  }

  async function handleSave() {
    if (!form.clientName) return;
    setSaving(true);
    try {
      const now  = new Date().toISOString();
      const data = { ...form, subtotal, tax, total, updatedAt: now };
      
      if (editingId) {
        // Update existing proposal
        const docRef = doc(db, "proposals", editingId);
        const { id: _, ...saveData } = data;
        await updateDoc(docRef, saveData);
        
        await PipelineService.syncProposalDetails({ id: editingId, ...data });

        if (form.status === "accepted") {
          await PipelineService.handleProposalStatusChange({ id: editingId, ...data }, "accepted");
        }
        
        setEditingId(null);
      } else {
        // Create new proposal
        const dataWithCreator = { ...data, createdBy: crmUser?.uid ?? "" };
        const docRef = await addDoc(collection(db, "proposals"), { ...dataWithCreator, createdAt: now });
        const propId = docRef.id;
        
        await PipelineService.syncProposalDetails({ id: propId, ...dataWithCreator });

        if (form.status === "accepted") {
          await PipelineService.handleProposalStatusChange({ id: propId, ...dataWithCreator }, "accepted");
        }
        
        setIsAddingNew(false);
        router.push(`/proposals/${propId}`);
      }
    } catch (err) {
      console.error("Error saving proposal:", err);
      alert("Failed to save proposal. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProposal(p: Proposal) {
    if (!confirm("Delete this proposal?")) return;
    await PipelineService.deleteProposal(p);
  }

  async function updateStatus(p: Proposal, status: ProposalStatus) {
    if (status === "accepted") {
      try {
        const res = await fetch(`/api/proposals/${p.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signingName: "Admin",
            signingTitle: "Admin Acceptance",
            signatureData: null
          }),
        });
        if (!res.ok) throw new Error("API fallback failed");
      } catch (err) {
        console.error(err);
        alert("Failed to update status. Check console.");
      }
    } else if (p.status === "accepted" && p.fromLeadId) {
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
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header & Summary */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Proposals
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage and track your proposal pipeline</p>
        </div>
        <button onClick={startAdding} className="btn-primary shadow-lg shadow-blue-900/20 py-2.5 px-6 rounded-xl hover:-translate-y-0.5 transition-all" disabled={isAddingNew}>
          <span className="text-lg font-bold mr-1">+</span> Create Proposal
        </button>
      </div>

      {/* Top Summary Cards */}
      <div className="flex gap-4 mb-6 flex-shrink-0">
        <div className="bg-white rounded-xl p-4 flex-1 border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Proposals</p>
            <p className="text-2xl font-black text-slate-800">{proposals.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-xl text-slate-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg></div>
        </div>
        <div className="bg-white rounded-xl p-4 flex-1 border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Accepted</p>
            <p className="text-2xl font-black text-emerald-900">{proposals.filter(p => ["accepted", "won"].includes(p.status)).length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-xl text-emerald-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
        </div>
        <div className="bg-white rounded-xl p-4 flex-1 border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Pipeline Value</p>
            <p className="text-2xl font-black text-amber-900 tracking-tight">{totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <span className="text-[11px] font-black">AED</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 flex-1 border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">Win Rate</p>
            <p className="text-2xl font-black text-purple-900">
              {proposals.length > 0 ? Math.round((proposals.filter(p => ["accepted", "won"].includes(p.status)).length / proposals.length) * 100) : 0}%
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-xl text-purple-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg></div>
        </div>
      </div>

      {/* Inline Editor for New/Edit Proposal */}
      {(isAddingNew || editingId) && (
        <div ref={activeRef} className="bg-white p-6 rounded-2xl shadow-xl mb-8 border border-slate-200 font-sans relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#C9A84C] rounded-t-2xl"></div>
          <h2 className="text-xl font-bold mb-6" style={{ color: "#0D1B3E" }}>{editingId ? "Edit Proposal Details" : "Create New Proposal"}</h2>
          <ProposalForm form={form} setForm={setForm} subtotal={subtotal} tax={tax} total={total} updateItem={updateItem} addItem={addItem} removeItem={removeItem} handleSave={handleSave} cancelEdit={cancelEdit} saving={saving} isEditing={!!editingId} clients={clients} />
        </div>
      )}

      {/* Proposals list */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse bg-slate-100" />)}
        </div>
      ) : proposals.length === 0 && !isAddingNew ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-50 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No proposals found</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Get started by creating your first sales proposal. It only takes a minute.</p>
          <button onClick={startAdding} className="btn-primary mx-auto py-2.5 px-6">Create Proposal</button>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => {
            const st  = statusInfo(p.status);
            const svc = SERVICES.find((s) => s.key === p.service);

            return (
              <div key={p.id} className="bg-white rounded-2xl transition-all hover:shadow-lg border border-slate-200 hover:border-[#C9A84C] relative group">
                <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl" style={{ background: st.color }}></div>
                
                <div className="p-5 pl-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 cursor-pointer" onClick={() => viewProposal(p.id)}>
                  
                  {/* Left: Client & Core Info */}
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-black text-xl shadow-sm" style={{ background: `var(--navy)` }}>
                      {p.clientName?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold truncate text-[#0D1B3E] group-hover:text-blue-700 transition-colors">{p.clientName}</h3>
                      <p className="text-sm text-slate-500 font-medium truncate mt-0.5">{p.clientEmail} {p.phone && <span className="text-slate-300 mx-1">|</span>} {p.phone}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider" style={{ background: svc?.bg || "#f3f4f6", color: svc?.text || "#374151" }}>{svc?.label || "Unknown Service"}</span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Value & Status */}
                  <div className="flex flex-col items-start lg:items-end justify-center min-w-[140px]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-slate-400">{p.currency || "AED"}</span>
                      <span className="text-2xl font-black text-[#0D1B3E]">{p.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full mt-1.5 border" style={{ background: st.bg, color: st.color, borderColor: st.border }}>{st.label}</span>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity w-full lg:w-auto" onClick={e => e.stopPropagation()}>
                    <button
                      className="flex-1 lg:flex-none btn-primary py-2 px-4 flex items-center justify-center gap-2 rounded-xl shadow-sm hover:shadow"
                      style={{ background: "#0D1B3E", color: "white" }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await fetch("/api/send-proposal", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ proposalId: p.id, clientEmail: p.clientEmail }),
                          });
                          if (!res.ok) throw new Error("Failed to send proposal");
                          if (p.status !== "accepted" && p.status !== "rejected") {
                            await PipelineService.handleProposalStatusChange(p, "sent");
                          }
                          alert("Proposal sent successfully to" + p.clientEmail);
                        } catch (err) {
                          alert("Error sending proposal");
                        }
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                      Send
                    </button>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); viewProposal(p.id); }}
                      className="px-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors hidden sm:block"
                    >
                      View
                    </button>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditing(p); }}
                      className="px-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors hidden sm:block"
                    >
                      Edit
                    </button>

                    <div className="relative ml-auto lg:ml-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === p.id ? null : p.id); }}
                        className="p-2 border-2 border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                      </button>

                      {openMenu === p.id && (
                        <div 
                          className="absolute right-0 top-12 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-48 py-1 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="sm:hidden">
                            <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setOpenMenu(null); viewProposal(p.id); }}><Eye className="inline-block w-4 h-4 shrink-0 mr-1" /> View Proposal</button>
                            <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setOpenMenu(null); startEditing(p); }}><Pencil className="inline-block w-4 h-4 shrink-0 mr-1" /> Edit Details</button>
                            <div className="border-t border-slate-100 my-1"></div>
                          </div>
                          
                          <button
                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            onClick={() => { setOpenMenu(null); router.push(`/proposals/${p.id}?action=download`); }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download PDF
                          </button>
                          
                          <button
                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            onClick={async () => {
                              setOpenMenu(null);
                              if (!confirm("Duplicate this proposal?")) return;
                              try {
                                const { id: _, ...data } = p;
                                const docRef = await addDoc(collection(db, "proposals"), {
                                  ...data,
                                  status: "draft",
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                });
                                router.push(`/proposals/${docRef.id}`);
                              } catch (err) {
                                console.error(err);
                                alert("Failed to duplicate proposal");
                              }
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Duplicate
                          </button>

                          <div className="border-t border-slate-100 my-1" />
                          <button
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2"
                            onClick={() => { setOpenMenu(null); deleteProposal(p); }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            Delete Proposal
                          </button>
                        </div>
                      )}
                    </div>
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

function ProposalForm({ form, setForm, subtotal, tax, total, updateItem, addItem, removeItem, handleSave, cancelEdit, saving, isEditing, clients }: any) {
  return (
    <div className="space-y-6">
      
      {/* Service Selection Cards */}
      <div>
        <label className="text-sm font-bold text-slate-800 mb-3 block">1. Select Service Package</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {SERVICES.map(s => {
            const isSelected = form.service === s.key;
            return (
              <div 
                key={s.key} 
                onClick={() => {
                  const template = getMasterTemplate(s.key, form.clientName || form.company || "");
                  setForm({ ...form, service: s.key, ...template });
                }}
                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex flex-col items-center justify-center text-center gap-3 relative ${isSelected ? "border-blue-600 shadow-md bg-blue-50/50" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"}`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-white"><Check className="inline-block w-4 h-4 shrink-0 mr-1" /></span>
                  </div>
                )}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm" style={{ background: s.bg, color: s.text }}>
                  {s.label.charAt(0)}
                </div>
                <span className={`text-[11px] font-bold ${isSelected ? "text-blue-900" : "text-slate-600"}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <label className="text-sm font-bold text-slate-800 mb-3 block">2. Client Details</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="form-label text-xs">Client *</label>
            <select className="form-input py-2.5" value={form.clientId || ""} onChange={e => {
              const c = clients.find((cl: any) => cl.id === e.target.value);
              setForm({ 
                ...form, 
                clientId: e.target.value, 
                clientName: c ? (c.company || c.name) : "",
                clientEmail: c ? (c.email) : "",
                company: c ? (c.company) : "",
                phone: c ? (c.phone) : ""
              });
            }}>
              <option value="">-- Select Client --</option>
              {clients.filter((c: any) => c.active !== false).map((c: any) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
            </select>
          </div>
          <div><label className="form-label text-xs">Company</label><input className="form-input py-2.5" value={form.company || ""} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company Ltd" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="form-label text-xs">Client Email *</label><input className="form-input py-2.5" value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })} placeholder="email@example.com" /></div>
          <div><label className="form-label text-xs">Phone</label><PhoneInput value={form.phone || ""} onChange={(val) => setForm({ ...form, phone: val })} /></div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
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
              <input
                className="form-input py-1 text-center text-xs"
                type="number"
                value={item.qty === 0 ? "" : item.qty}
                onChange={(e) => updateItem(i, "qty", e.target.value)}
                placeholder="0"
              />
              <input
                className="form-input py-1 text-center text-xs"
                type="number"
                value={item.rate === 0 ? "" : item.rate}
                onChange={(e) => updateItem(i, "rate", e.target.value)}
                placeholder="0"
              />
              <span className="text-xs font-bold text-right">{form.currency} {item.amount.toLocaleString()}</span>
              {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><X className="inline-block w-4 h-4 shrink-0 mr-1" /></button>}
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
        <button onClick={handleSave} disabled={saving || !form.clientName} className="btn-primary flex-1 justify-center disabled:opacity-50">{saving ? "Saving..." : (isEditing ? "Update Proposal" : "Save Proposal")}</button>
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
