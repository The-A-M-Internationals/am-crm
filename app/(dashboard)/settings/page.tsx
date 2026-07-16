"use client";

import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { PhoneInput } from "@/components/phone-input";

function Toggle({ defaultChecked = true }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <label className="toggle-wrapper cursor-pointer">
      <input type="checkbox" checked={on} onChange={() => setOn(!on)} />
      <span className="toggle-track" />
    </label>
  );
}

function SettingRow({
  label,
  desc,
  defaultOn = true,
}: {
  label: string;
  desc: string;
  defaultOn?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0"
      style={{ borderColor: "#f0f0f5" }}
    >
      <div className="flex-1 pr-4">
        <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>
          {label}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
          {desc}
        </p>
      </div>
      <Toggle defaultChecked={defaultOn} />
    </div>
  );
}

export default function SettingsPage() {
  const { crmUser } = useAuth();
  const [saved, setSaved] = useState(false);
  const [resendKey, setResendKey] = useState("");
  const [whatsapp, setWhatsapp] = useState("+91 90255 62311");
  const [currency, setCurrency] = useState("AED");
  const taxConfig = {
    AED: { label: "VAT (%)", value: 5 },
    INR: { label: "GST (%)", value: 18 },
    USD: { label: "Sales Tax (%)", value: 0 },
    GBP: { label: "VAT (%)", value: 20 },
  };

  const currentTax = taxConfig[currency as keyof typeof taxConfig];

  if (crmUser?.role !== "admin") {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#fee2e2" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#991b1b"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>
            Admin Access Required
          </p>
          <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
            Only admins can access Settings
          </p>
        </div>
      </div>
    );
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Settings
          </h1>
        <p className="page-subtitle">
          Manage your CRM configuration and preferences
        </p>
      </div>

      <div className="space-y-5">
        {/* Agency Info */}
        <div className="crm-card">
          <h2
            className="text-sm font-bold mb-4 flex items-center gap-2"
            style={{ color: "#0D1B3E" }}
          >
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
              style={{ background: "#0D1B3E1a", color: "#0D1B3E" }}
            >
              🏢
            </span>
            Agency Information
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Agency Name</label>
                <input
                  className="form-input"
                  defaultValue="The A&M Internationals FZC"
                />
              </div>
              <div>
                <label className="form-label">Tagline</label>
                <input
                  className="form-input"
                  defaultValue="Elevating the World, Elegantly"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Email</label>
                <input className="form-input" defaultValue="am@theaminternational.com" />
              </div>
              <div>
                <label className="form-label">WhatsApp</label>
                <PhoneInput value={whatsapp} onChange={setWhatsapp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Website</label>
                <input
                  className="form-input"
                  defaultValue="theaminternational.com"
                />
              </div>
              <div>
                <label className="form-label">Address</label>
                <input
                  className="form-input"
                  defaultValue="Ajman Free Zone, UAE"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="crm-card">
          <h2
            className="text-sm font-bold mb-4 flex items-center gap-2"
            style={{ color: "#0D1B3E" }}
          >
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
              style={{ background: "#C9A84C1a", color: "#C9A84C" }}
            >
              🎨
            </span>
            Brand Colors
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: "Primary Navy", hex: "#0D1B3E", bg: "#0D1B3E" },
              { name: "Accent Gold", hex: "#C9A84C", bg: "#C9A84C" },
            ].map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ borderColor: "#e5e7eb" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex-shrink-0"
                  style={{ background: c.bg }}
                />
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#1a1a2e" }}
                  >
                    {c.name}
                  </p>
                  <p
                    className="text-xs font-mono mt-0.5"
                    style={{ color: "#9ca3af" }}
                  >
                    {c.hex}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email / Resend */}
        <div className="crm-card">
          <h2
            className="text-sm font-bold mb-4 flex items-center gap-2"
            style={{ color: "#0D1B3E" }}
          >
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
              style={{ background: "#dbeafe", color: "#1d4ed8" }}
            >
              ✉
            </span>
            Email Configuration (Resend)
          </h2>
          <div className="space-y-3">
            <div>
              <label className="form-label">Resend API Key</label>
              <input
                className="form-input font-mono"
                type="password"
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                Get your API key from{" "}
                <a
                  href="https://resend.com"
                  target="_blank"
                  className="underline"
                  style={{ color: "#C9A84C" }}
                >
                  resend.com
                </a>{" "}
                and add it as <code>RESEND_API_KEY</code> in your{" "}
                <code>.env.local</code> file
              </p>
            </div>
            <div>
              <label className="form-label">From Email</label>
              <input
                className="form-input"
                defaultValue="crm@theaminternational.com"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="crm-card">
          <h2
            className="text-sm font-bold mb-2 flex items-center gap-2"
            style={{ color: "#0D1B3E" }}
          >
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
              style={{ background: "#d1fae5", color: "#065f46" }}
            >
              🔔
            </span>
            Notifications
          </h2>
          <SettingRow
            label="Email on new lead added"
            desc="Notify admin when a new lead is created"
            defaultOn={true}
          />
          <SettingRow
            label="Task due date reminders"
            desc="Send email to assignee 1 day before due date"
            defaultOn={true}
          />
          <SettingRow
            label="Calendar event reminders"
            desc="Remind assignee 1 day before calendar event"
            defaultOn={true}
          />
          <SettingRow
            label="Proposal status updates"
            desc="When a proposal is accepted or rejected"
            defaultOn={true}
          />
          <SettingRow
            label="Follow-up reminders"
            desc="Remind sales team of scheduled follow-ups"
            defaultOn={false}
          />
          <SettingRow
            label="Invoice overdue alerts"
            desc="Alert admin when invoice passes due date"
            defaultOn={true}
          />
        </div>

        {/* Invoice defaults */}
        <div className="crm-card">
          <h2
            className="text-sm font-bold mb-4 flex items-center gap-2"
            style={{ color: "#0D1B3E" }}
          >
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
              style={{ background: "#fef3c7", color: "#92400e" }}
            >
              💰
            </span>
            Invoice & Proposal Defaults
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Default {currentTax.label}</label>
              <input
                className="form-input"
                value={currentTax.value}
                type="number"
                readOnly
              />
            </div>
            <div>
              <label className="form-label">Validity Period (Days)</label>
              <input className="form-input" defaultValue="30" type="number" />
            </div>
            <div>
              <label className="form-label">Currency</label>
              <select
                className="form-input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="INR">INR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="form-label">Payment Terms</label>
              <input
                className="form-input"
                defaultValue="50% advance, 50% on delivery"
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-all"
          style={{
            background: saved ? "#22c55e" : "#0D1B3E",
            color: "white",
            letterSpacing: "0.05em",
          }}
        >
          {saved ? "✓ Settings Saved!" : "SAVE SETTINGS"}
        </button>
      </div>
    </div>
  );
}
