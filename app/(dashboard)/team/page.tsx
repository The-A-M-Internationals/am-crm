"use client";
import { X, Trash2, Hand, DollarSign, Mail, Pencil, User, Check, Globe, Key } from "lucide-react";


import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CRMUser, UserRole } from "@/types";
import { useAuth } from "@/lib/auth-context";

const ROLES: {
  key: UserRole;
  label: string;
  color: string;
  bg: string;
  desc: string;
  canSeeFinance: boolean;
}[] = [
  {
    key: "admin",
    label: "Admin",
    color: "#C9A84C",
    bg: "#C9A84C18",
    desc: "Full access including Finance",
    canSeeFinance: true,
  },
  {
    key: "lead",
    label: "Lead",
    color: "#60a5fa",
    bg: "#eff6ff",
    desc: "Projects & Tasks management only",
    canSeeFinance: false,
  },
  {
    key: "employee",
    label: "Employee",
    color: "#a78bfa",
    bg: "#f5f3ff",
    desc: "Assigned tasks only",
    canSeeFinance: false,
  },
];

function roleInfo(key: string) {
  return ROLES.find((r) => r.key === key) ?? ROLES[2];
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
      style={{ background: "#0D1B3E" }}
    >
      {initials}
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "employee" as UserRole,
};

export default function TeamPage() {
  const { crmUser } = useAuth();
  const [members, setMembers] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingMember, setEditingMember] = useState<CRMUser | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("employee");

  const isAdmin = crmUser?.role === "admin";

  async function fetchMembers() {
    try {
      const snap = await getDocs(collection(db, "users"));
      setMembers(snap.docs.map((d) => {
        const data = d.data();
        return { ...data, uid: data.uid || d.id } as CRMUser;
      }));
    } catch (err) {
      console.error("Error fetching members:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  async function handleAdd() {
    if (!form.name || !form.email || !form.password) return;
    setSaving(true);
    setError("");
    try {
      // Use API route to handle user creation/reactivation via Admin SDK
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create/update user.");

      // Send welcome email
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: form.email,
            subject: "Welcome to A&M CRM — Your Account is Ready!",
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:var(--navy);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
                  <h1 style="color:#C9A84C;margin:0;font-size:26px;font-family:Georgia,serif;">A&M CRM</h1>
                  <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;letter-spacing:2px;">THE A&M INTERNATIONALS FZC</p>
                </div>
                <div style="background:white;padding:32px;border:1px solid #e8e8f0;border-top:none;border-radius:0 0 12px 12px;">
                  <h2 style="color:#0D1B3E;margin:0 0 8px;">Welcome, ${form.name}! <Hand className="inline-block w-4 h-4 shrink-0 mr-1" /></h2>
                  <p style="color:#6b7280;">You've been added to the A&M CRM. Here are your login details:</p>
                  <div style="background:#f8f9fc;border-left:4px solid #C9A84C;padding:20px;border-radius:0 10px 10px 0;margin:20px 0;">
                    <p style="margin:0 0 8px;font-size:13px;color:#374151;"><strong><Globe className="inline-block w-4 h-4 shrink-0 mr-1" /> CRM URL:</strong> <a href="https://crm.theaminternationals.com" style="color:#C9A84C;">crm.theaminternationals.com</a></p>
                    <p style="margin:0 0 8px;font-size:13px;color:#374151;"><strong><Mail className="inline-block w-4 h-4 shrink-0 mr-1" /> Email:</strong> ${form.email}</p>
                    <p style="margin:0 0 8px;font-size:13px;color:#374151;"><strong><Key className="inline-block w-4 h-4 shrink-0 mr-1" /> Password:</strong> ${form.password}</p>
                    <p style="margin:0;font-size:13px;color:#374151;"><strong><User className="inline-block w-4 h-4 shrink-0 mr-1" /> Role:</strong> ${form.role.charAt(0).toUpperCase() + form.role.slice(1)}</p>
                  </div>
                  <p style="color:#9ca3af;font-size:12px;">Please change your password after first login. For support contact <a href="mailto:am@theaminternationals.com" style="color:#C9A84C;">am@theaminternationals.com</a></p>
                  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:20px;">The A&M Internationals FZC · Ajman Free Zone, UAE · Elevating the World, Elegantly</p>
                </div>
              </div>
            `,
          }),
        });
      } catch (err) {
        console.warn("Welcome email could not be sent:", err);
      }

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
    if (!confirm("Remove this team member? This will also delete their login access.")) return;
    
    try {
      const res = await fetch("/api/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to delete user.");
      }

      fetchMembers();
    } catch (err: any) {
      alert("Error:" + err.message);
    }
  }

  async function updateMemberRole() {
    if (!editingMember) return;

    try {
      const snap = await getDocs(collection(db, "users"));
      const firestoreDoc = snap.docs.find(
        (d) => d.data().uid === editingMember.uid,
      );

      if (!firestoreDoc) {
        alert("User not found");
        return;
      }

      await updateDoc(doc(db, "users", firestoreDoc.id), {
        role: editRole,
      });

      setEditingMember(null);
      fetchMembers();

      alert("Role updated successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to update role");
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/><path d="M12 14c-7 0-7 3-7 3v2h14v-2s0-3-7-3z"/></svg>
            Team
          </h1>
          <p className="page-subtitle">
            {members.length} team member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {true && (
          <button
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setError("");
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <span className="text-base">+</span> Add Member
          </button>
        )}
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {ROLES.map((role) => {
          const count = members.filter((m) => m.role === role.key).length;
          return (
            <div key={role.key} className="crm-card flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: role.bg }}
              >
                <span
                  className="text-xs font-bold"
                  style={{ color: role.color }}
                >
                  {role.label[0]}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold" style={{ color: "#1a1a2e" }}>
                    {role.label}
                  </p>
                  {role.canSeeFinance && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-bold"
                      style={{ background: "#C9A84C18", color: "#C9A84C" }}
                    >
                      <DollarSign className="inline-block w-4 h-4 shrink-0 mr-1" />
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                  {count} member{count !== 1 ? "s" : ""}
                </p>
                <p
                  className="text-xs mt-1 leading-tight"
                  style={{ color: "#c4c7d0" }}
                >
                  {role.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Members list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl animate-pulse"
              style={{ background: "#f0f2f8" }}
            />
          ))}
        </div>
      ) : (
        <div className="crm-card p-0 overflow-visible overflow-x-auto">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Access</th>
                <th>Finance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const r = roleInfo(member.role);
                return (
                  <tr key={member.uid}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Initials name={member.name} />
                        <div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "#1a1a2e" }}
                          >
                            {member.name}
                          </p>
                          {member.uid === crmUser?.uid && (
                            <span
                              className="text-xs"
                              style={{ color: "#C9A84C" }}
                            >
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-sm" style={{ color: "#6b7280" }}>
                      {member.email}
                    </td>
                    <td>
                      <span
                        className="badge capitalize"
                        style={{ background: r.bg, color: r.color }}
                      >
                        {r.label}
                      </span>
                    </td>
                    <td className="text-xs" style={{ color: "#9ca3af" }}>
                      {r.desc}
                    </td>
                    <td>
                      {r.canSeeFinance ? (
                        <span
                          className="badge"
                          style={{ background: "#d1fae5", color: "#065f46" }}
                        >
                          <Check className="inline-block w-4 h-4 shrink-0 mr-1" /> Yes
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{ background: "#fee2e2", color: "#991b1b" }}
                        >
                          <X className="inline-block w-4 h-4 shrink-0 mr-1" /> No
                        </span>
                      )}
                    </td>
                    <td>
                      {true && (
                        <div className="flex items-center gap-2">
                          <button
                            title="Edit Member"
                            onClick={() => {
                              setEditingMember(member);
                              setEditRole(member.role);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105"
                            style={{
                              background: "#EEF4FF",
                              color: "#2563EB",
                              border: "1px solid #BFDBFE",
                              cursor: "pointer",
                            }}
                          >
                            <Pencil className="inline-block w-4 h-4 shrink-0 mr-1" /> Edit
                          </button>

                          <button
                            title="Remove Member"
                            onClick={() => deleteMember(member.uid)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105"
                            style={{
                              background: "#FEF2F2",
                              color: "#DC2626",
                              border: "1px solid #FECACA",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 className="inline-block w-4 h-4 shrink-0 mr-1" /> Revoke
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {members.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: "#9ca3af" }}>
                No team members yet
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit Access Modal */}
      {editingMember && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="modal-title mb-0">Edit Access</h2>
              <button
                onClick={() => setEditingMember(null)}
                className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="inline-block w-4 h-4 shrink-0 mr-1" />
              </button>
            </div>

            <div className="space-y-4">
              <div
                className="text-sm px-3 py-2 rounded-xl"
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                }}
              >
                Updating access for:
                <strong> {editingMember.name}</strong>
              </div>

              <div>
                <label className="form-label">Role</label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {ROLES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setEditRole(r.key)}
                      className="p-3 rounded-xl border text-left transition-all flex items-center gap-3"
                      style={{
                        background: editRole === r.key ? r.bg : "white",
                        borderColor:
                          editRole === r.key ? r.color + "66" : "#e5e7eb",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: editRole === r.key ? r.bg : "#f3f4f6",
                        }}
                      >
                        <span
                          className="text-xs font-bold"
                          style={{
                            color: editRole === r.key ? r.color : "#9ca3af",
                          }}
                        >
                          {r.label[0]}
                        </span>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className="text-sm font-semibold"
                            style={{
                              color: editRole === r.key ? r.color : "#1a1a2e",
                            }}
                          >
                            {r.label}
                          </p>

                          {r.canSeeFinance && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-bold"
                              style={{
                                background: "#C9A84C18",
                                color: "#C9A84C",
                              }}
                            >
                              <DollarSign className="inline-block w-4 h-4 shrink-0 mr-1" /> Finance
                            </span>
                          )}
                        </div>

                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "#9ca3af" }}
                        >
                          {r.desc}
                        </p>
                      </div>

                      {editRole === r.key && (
                        <span style={{ color: r.color }}><Check className="inline-block w-4 h-4 shrink-0 mr-1" /></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingMember(null)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                style={{
                  borderColor: "#e5e7eb",
                  color: "#6b7280",
                }}
              >
                Cancel
              </button>

              <button
                onClick={updateMemberRole}
                className="btn-primary flex-1 justify-center"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="modal-title mb-0">Add Team Member</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="inline-block w-4 h-4 shrink-0 mr-1" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="form-label">Email Address *</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@theaminternationals.com"
                />
              </div>
              <div>
                <label className="form-label">Temporary Password *</label>
                <input
                  className="form-input"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label className="form-label">Role</label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {ROLES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setForm({ ...form, role: r.key })}
                      className="p-3 rounded-xl border text-left transition-all flex items-center gap-3"
                      style={{
                        background: form.role === r.key ? r.bg : "white",
                        borderColor:
                          form.role === r.key ? r.color + "66" : "#e5e7eb",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: form.role === r.key ? r.bg : "#f3f4f6",
                        }}
                      >
                        <span
                          className="text-xs font-bold"
                          style={{
                            color: form.role === r.key ? r.color : "#9ca3af",
                          }}
                        >
                          {r.label[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className="text-sm font-semibold"
                            style={{
                              color: form.role === r.key ? r.color : "#1a1a2e",
                            }}
                          >
                            {r.label}
                          </p>
                          {r.canSeeFinance && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-bold"
                              style={{
                                background: "#C9A84C18",
                                color: "#C9A84C",
                              }}
                            >
                              <DollarSign className="inline-block w-4 h-4 shrink-0 mr-1" /> Finance
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "#9ca3af" }}
                        >
                          {r.desc}
                        </p>
                      </div>
                      {form.role === r.key && (
                        <span style={{ color: r.color }}><Check className="inline-block w-4 h-4 shrink-0 mr-1" /></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div
                  className="text-xs px-3 py-2 rounded-xl"
                  style={{
                    background: "#fef2f2",
                    color: "#ef4444",
                    border: "1px solid #fecaca",
                  }}
                >
                  {error}
                </div>
              )}
              <div
                className="text-xs px-3 py-2 rounded-xl"
                style={{
                  background: "#eff6ff",
                  color: "#1e40af",
                  border: "1px solid #bfdbfe",
                }}
              >
                <Mail className="inline-block w-4 h-4 shrink-0 mr-1" /> A welcome email with login credentials will be sent
                automatically!
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                {saving ? "Creating..." : "Add Member & Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
