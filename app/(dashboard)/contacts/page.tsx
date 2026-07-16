'use client';

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export default function ContactsDirectoryPage() {
  const { crmUser } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Add Contact State
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "" });

  async function handleAddContact() {
    if (!form.name || !form.email) {
      alert("Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "leads"), {
        ...form,
        service: "other",
        stage: "lead",
        lifecycleStatus: "Not Contacted",
        active: true,
        createdAt: now,
        updatedAt: now,
        assignedTo: crmUser?.uid ?? ""
      });
      setShowAddModal(false);
      setForm({ name: "", company: "", email: "", phone: "" });
    } catch (err) {
      console.error(err);
      alert("Failed to add contact.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!crmUser) return;
    const q = query(collection(db, "leads"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeads(data);
      setLoading(false);
    });
    return () => unsub();
  }, [crmUser]);

  const filteredContacts = leads.filter((contact) => {
    if (contact.lifecycleStatus === 'Junk Lead') return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    
    const name = (contact.name || "").toLowerCase();
    const company = (contact.company || contact.companyName || "").toLowerCase();
    const email = (contact.email || "").toLowerCase();
    const phone = (contact.phone || "").toLowerCase();
    
    return name.includes(q) || company.includes(q) || email.includes(q) || phone.includes(q);
  });

  return (
    <div className="p-8 pb-20 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title text-3xl font-black text-[#0D1B3E] tracking-tight">Contacts Directory</h1>
          <p className="page-subtitle text-slate-500 mt-1">Global registry of clients, leads, and stakeholders.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="bg-[#0D1B3E] hover:bg-[#1a3070] text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Add Contact
        </button>
      </div>

      {/* Omnipresent Fuzzy Match Search Bar */}
      <div className="mb-8 relative w-full max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-slate-400 text-lg">🔍</span>
        </div>
        <input
          type="text"
          className="w-full pl-12 pr-4 py-3 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C] transition-all"
          placeholder="Search by name, company, email, or phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-40 bg-white/50 animate-pulse rounded-2xl border border-slate-100" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-20 bg-white/40 border border-slate-200/60 rounded-3xl backdrop-blur-md">
          <p className="text-slate-500 font-medium">No contacts match your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map(contact => (
            <div key={contact.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--navy)] flex items-center justify-center text-white font-bold text-lg shadow-inner flex-shrink-0">
                    {contact.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight group-hover:text-[#0D1B3E] transition-colors">{contact.name || "Unnamed Contact"}</h3>
                    <p className="text-xs font-semibold text-[#C9A84C] tracking-wide uppercase mt-0.5">{contact.company || contact.companyName || "No Company"}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2.5 mt-5">
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-5 flex justify-center text-slate-400">📞</span>
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="font-medium text-slate-600 hover:text-blue-500 hover:underline transition-colors truncate">
                      {contact.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No phone on record</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-5 flex justify-center text-slate-400">✉️</span>
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="font-medium text-slate-600 hover:text-blue-500 hover:underline transition-colors truncate">
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No email on record</span>
                  )}
                </div>
              </div>

              {contact.lifecycleStatus && contact.lifecycleStatus !== "Not Contacted" && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100">
                    {contact.lifecycleStatus}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0D1B3E]">Add New Contact</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Full Name *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C] outline-none transition-all"
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  placeholder="e.g. John Doe"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Email Address *</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C] outline-none transition-all"
                  value={form.email} 
                  onChange={e => setForm({ ...form, email: e.target.value })} 
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Company / Organization</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C] outline-none transition-all"
                  value={form.company} 
                  onChange={e => setForm({ ...form, company: e.target.value })} 
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C] outline-none transition-all"
                  value={form.phone} 
                  onChange={e => setForm({ ...form, phone: e.target.value })} 
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200/50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddContact}
                className="px-6 py-2.5 bg-[#C9A84C] hover:bg-[#b5953e] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
