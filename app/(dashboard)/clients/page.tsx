"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Client, ServiceTag } from "@/types";
import { useAuth } from "@/lib/auth-context";

const SERVICES: { key: ServiceTag; label: string; bg: string; text: string }[] = [
  { key: "digital-marketing", label: "Digital Marketing", bg: "#e8f4ff", text: "#1a6bc4" },
  { key: "ui-ux",             label: "UI/UX Design",      bg: "#fff3e0", text: "#b35a00" },
  { key: "web-development",   label: "Web Development",   bg: "#e8fff3", text: "#0a7a3e" },
];

const EMPTY_FORM = {
  name: "", company: "", email: "", phone: "",
  services: [] as ServiceTag[],
  status: "active" as "active" | "inactive",
  address: "", website: "", notes: "",
};

function Initials({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#0D1B3E", "#1a3070", "#C9A84C", "#9a7a2e", "#1d4ed8", "#15803d"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0" style={{ background: bg }}>
      {initials}
    </div>
  );
}

export default function ClientsPage() {
  const { crmUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const canEdit = crmUser?.role === "admin" || crmUser?.role === "manager";

  async function fetchClients() {
    const snap = await getDocs(query(collection(db, "clients"), orderBy("createdAt", "desc")));
    setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client)));
    setLoading(false);
  }

  useEffect(() => { fetchClients(); }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setForm({
      name: client.name, company: client.company, email: client.email,
      phone: client.phone ?? "", services: client.services ?? [],
      status: client.status, address: client.address ?? "",
      website: client.website ?? "", notes: client.notes ?? "",
    });
    setShowModal(true);
  }

  function toggleService(svc: ServiceTag) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(svc)
        ? f.services.filter((s) => s !== svc)
        : [...f.services, svc],
    }));
  }

  async function handleSave() {
    if (!form.name || !form.company || !form.email) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (editing) {
        await updateDoc(doc(db, "clients", editing.id), { ...form });
      } else {
        await addDoc(collection(db, "clients"), { ...form, createdAt: now });
      }
      setShowModal(false);
      fetchClients();
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(id: string) {
    if (!confirm("Delete this client?")) return;
    await deleteDoc(doc(db, "clients", id));
    fetchClients();
  }

  const filtered = clients
    .filter((c) => statusFilter === "all" || c.status === statusFilter)
    .filter((c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D1B3E", fontFamily: "var(--font-playfair)" }}>Clients</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{clients.filter((c) => c.status === "active").length} active clients</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity" style={{ background: "#0D1B3E" }}>
            <span className="text-lg leading-none">+</span> Add Client
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <input
          className="px-4 py-2 rounded-lg border text-sm outline-none transition-colors"
          style={{ borderColor: "#e5e7eb", width: 280 }}
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
          onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
        />
        {["all", "active", "inactive"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as any)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
            style={{
              background: statusFilter === s ? "#0D1B3E" : "#f3f4f6",
              color: statusFilter === s ? "white" : "#6b7280",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="crm-card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "#f3f4f6" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: "#9ca3af" }}>No clients found</p>
            {canEdit && (
              <button onClick={openAdd} className="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: "#0D1B3E" }}>
                + Add Client
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f0f0f5" }}>
                {["Client", "Email", "Phone", "Services", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id} className="border-b hover:bg-gray-50 transition-colors cursor-pointer" style={{ borderColor: "#f0f0f5" }} onClick={() => canEdit && openEdit(client)}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Initials name={client.name} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#1a1a2e" }}>{client.name}</p>
                        <p className="text-xs" style={{ color: "#6b7280" }}>{client.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: "#6b7280" }}>{client.email}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: "#6b7280" }}>{client.phone || "—"}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {(client.services ?? []).map((svc) => {
                        const s = SERVICES.find((x) => x.key === svc);
                        return s ? (
                          <span key={svc} className="badge text-xs" style={{ background: s.bg, color: s.text }}>
                            {s.label.split(" ")[0]}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="badge capitalize" style={{
                      background: client.status === "active" ? "#f0fdf4" : "#f9fafb",
                      color: client.status === "active" ? "#15803d" : "#6b7280",
                    }}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteClient(client.id); }}
                        className="text-xs opacity-30 hover:opacity-70 transition-opacity"
                        style={{ color: "#ef4444" }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: "white" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "#0D1B3E", fontFamily: "var(--font-playfair)" }}>
                {editing ? "Edit Client" : "Add New Client"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" /></div>
                <div><label className="form-label">Company *</label><input className="form-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div><label className="form-label">Website</label><input className="form-input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
              <div>
                <label className="form-label">Services</label>
                <div className="flex gap-2 mt-1">
                  {SERVICES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleService(s.key)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                      style={{
                        background: form.services.includes(s.key) ? s.bg : "white",
                        color: form.services.includes(s.key) ? s.text : "#6b7280",
                        borderColor: form.services.includes(s.key) ? s.text : "#e5e7eb",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
              <div><label className="form-label">Notes</label><textarea className="form-input resize-none" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border text-sm font-medium" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50" style={{ background: "#0D1B3E" }}>
                {saving ? "Saving..." : editing ? "Update" : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .form-label { display: block; font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 4px; }
        .form-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 13px; color: #1a1a2e; outline: none; transition: border-color 0.15s; background: white; font-family: var(--font-poppins); }
        .form-input:focus { border-color: #C9A84C; }
      `}</style>
    </div>
  );
}
