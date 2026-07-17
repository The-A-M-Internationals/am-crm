"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { updatePassword, getAuth } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SetupPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { crmUser } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    // If not logged in, or if they don't need a password change, redirect
    if (crmUser && !crmUser.requiresPasswordChange) {
      router.replace("/");
    } else if (!crmUser) {
      router.replace("/login");
    }
  }, [crmUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser || !crmUser) {
        throw new Error("Not logged in properly.");
      }

      // Update password in Firebase Auth
      await updatePassword(currentUser, password);

      // Remove the flag in Firestore
      const { collection, query, where, getDocs, updateDoc } = await import("firebase/firestore");
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", crmUser.uid));
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        await updateDoc(querySnap.docs[0].ref, { requiresPasswordChange: false });
      }

      // Redirect to dashboard with hard reload to clear cached AuthContext
      window.location.href = "/";
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update password. Try logging out and back in.");
    } finally {
      setLoading(false);
    }
  };

  if (!crmUser || !crmUser.requiresPasswordChange) {
    return <div className="min-h-screen bg-[#06101f]" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#06101f" }}>
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))", border: "1px solid rgba(201,168,76,0.3)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-playfair)" }}>Setup New Password</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>For security reasons, please change your temporary password to a private one before accessing the CRM.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-3.5 rounded-xl text-sm text-white outline-none transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(201,168,76,0.5)"; e.target.style.background = "rgba(201,168,76,0.04)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
              className="w-full px-4 py-3.5 rounded-xl text-sm text-white outline-none transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(201,168,76,0.5)"; e.target.style.background = "rgba(201,168,76,0.04)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
            />
          </div>

          {error && (
            <div className="text-xs px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-sm transition-all mt-4"
            style={{ background: loading ? "rgba(201,168,76,0.5)" : "linear-gradient(135deg, #C9A84C, #e2c070)", color: "#0D1B3E", letterSpacing: "0.05em" }}>
            {loading ? "SAVING..." : "SAVE PASSWORD & CONTINUE"}
          </button>
        </form>
      </div>
    </div>
  );
}
