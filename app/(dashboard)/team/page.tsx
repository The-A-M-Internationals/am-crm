"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { CRMUser, UserRole } from "@/types";
import { useAuth } from "@/lib/auth-context";

const ROLES: { key: UserRole; label: string; color: string; bg: string; desc: string }[] = [
  { key: "admin",    label: "Admin",    color: "#C9A84C", bg: "#C9A84C18", desc: "Full access to everything" },
  { key: "manager",  label: "Manager",  color: "#3b82f6", bg: "#eff6ff",  desc: "Manage leads, clients, team" },
  { key: "sales",    label: "Sales",    color: "#22c55e", bg: "#f0fdf4",  desc: "Leads, proposals, tasks" },
  { key: "designer", label: "Designer", color: "#f472b6", bg: "#fdf2f8",  desc: "Projects & assigned tasks" },
];

function roleInfo(key: string) {
  return ROLES.find((r) => r.key === key) ?? ROLES[3];
}

function Initials({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0" style={{ background: "#0D1B3E" }}>
      {initials}
    </div>
  );
}

const EMPTY_FORM = { name: "", email: "", password: "", role: "sales" as UserRole };

export default function TeamPage() {
  const { crmUser } = useAuth();
  const [members, setMembers] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = crmUser?.role === "admin";

  async function fetchMembers() {
    const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
    setMembers(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as CRMUser)));
    setLoading(false);
  }

  useEffect(() => { fetchMembers(); }, []);

  async function handleAdd() {
    if (!form.name || !form.email || !form.password) return;
    setSaving(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const now = new Date().toISOString();
      await addDoc(collection(db, "users"), {
        uid: cred.user.uid, name: form.name, email: form.email,
        role: form.role, createdAt: now,
      });
      setShowModal(false);
      fetchMembers();
    } catch (err: any) {
      setError(err.message ?? "Failed to create user.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMember(uid: string) {
    if (uid === crmUser?.uid) return alert("You cannot delete yourself.");
    if (!confirm("Remove this team member?")) return;
    const snap = await getDocs(query(collection(db, "users")));
    const docToDelete = snap.docs.find((d) => d.data().uid === uid);
    if (docToDelete) await deleteDoc(doc(db, "users", docToDelete.id));
    fetchMembers();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D1B3E", fontFamily: "var(--font-playfair)" }}>Team</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{members.length} team member{members.length !== 1 ? "s" : ""}</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setForm({ ...EMPTY_FORM }); setError(""); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90" style={{ background: "#0D1B3E" }}>
            <span className="text-lg leading-none">+</span> Add Member
          </button>
        )}
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {ROLES.map((role) => {
          const count = members.filter((m) => m.role === role.key).length;
          return (
            <div key={role.key} className="crm-card flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: role.bg }}>
                <span className="text-xs font-bold" style={{ color: role.color }}>{role.label[0]}</span>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>{role.label}</p>
                <p className="text-xs" style={{ color: "#9ca3af" }}>{count} member{count !== 1 ? "s" : ""}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Members list */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#f3f4f6" }} />)}</div>
      ) : (
        <div className="crm-card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f0f0f5" }}>
                {["Member", "Email", "Role", "Access", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const r = roleInfo(member.role);
                return (
                  <tr key={member.uid} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: "#f0f0f5" }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Initials name={member.name} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#1a1a2e" }}>{member.name}</p>
                          {member.uid === crmUser?.uid && (
                            <span className="text-xs" style={{ color: "#C9A84C" }}>You</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "#6b7280" }}>{member.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge capitalize" style={{ background: r.bg, color: r.color }}>{r.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "#9ca3af" }}>{r.desc}</td>
                    <td className="px-5 py-3.5">
                      {isAdmin && member.uid !== crmUser?.uid && (
                        <button onClick={() => deleteMember(member.uid)} className="text-xs opacity-30 hover:opacity-70 transition-opacity" style={{ color: "#ef4444" }}>Remove</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {members.length === 0 && (
            <div className="text-center py-12"><p className="text-sm" style={{ color: "#9ca3af" }}>No team members yet</p></div>
          )}
        </div>
      )}

      {/* Add modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "white" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "#0D1B3E", fontFamily: "var(--font-playfair)" }}>Add Team Member</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" /></div>
              <div><label className="form-label">Email Address *</label><input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@theaminternational.com" /></div>
              <div><label className="form-label">Temporary Password *</label><input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 characters" /></div>
              <div>
                <label className="form-label">Role</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {ROLES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setForm({ ...form, role: r.key })}
                      className="p-3 rounded-lg border text-left transition-all"
                      style={{
                        background: form.role === r.key ? r.bg : "white",
                        borderColor: form.role === r.key ? r.color + "66" : "#e5e7eb",
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: form.role === r.key ? r.color : "#1a1a2e" }}>{r.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }}>{error}</div>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border text-sm font-medium" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50" style={{ background: "#0D1B3E" }}>
                {saving ? "Creating..." : "Add Member"}
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
