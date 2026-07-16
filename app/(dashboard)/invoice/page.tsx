"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { PhoneInput } from "@/components/phone-input";

const SERVICES = [
  { key: "digital-marketing", label: "Digital Marketing" },
  { key: "ui-ux", label: "UI/UX Design" },
  { key: "web-development", label: "Web Development" },
  { key: "seo", label: "SEO" },
  { key: "social-media", label: "Social Media" },
  { key: "branding", label: "Branding" },
  { key: "other", label: "Other" },
];

const STATUSES = [
  {
    key: "unpaid",
    label: "Unpaid",
    color: "#92400e",
    bg: "#fef3c7",
    border: "#fde68a",
  },
  {
    key: "paid",
    label: "Paid",
    color: "#065f46",
    bg: "#d1fae5",
    border: "#a7f3d0",
  },
  {
    key: "overdue",
    label: "Overdue",
    color: "#991b1b",
    bg: "#fee2e2",
    border: "#fecaca",
  },
];

const EMPTY_FORM = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  clientAddress: "",
  service: "web-development",
  status: "unpaid",
  paidAmount: 0,
  dueDate: "",
  notes: "",
  currency: "AED",
  items: [{ description: "", qty: 1, rate: 0, amount: 0 }],
};

let invoiceCounter = 1000;

export default function InvoicePage() {
  const { crmUser } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    ...EMPTY_FORM,
    items: [{ description: "", qty: 1, rate: 0, amount: 0 }],
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  async function fetchInvoices() {
    try {
      const [invSnap, cliSnap] = await Promise.all([
        getDocs(query(collection(db, "invoices"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "clients"), where("status", "==", "active")))
      ]);
      
      const data = invSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setInvoices(data);
      setClients(cliSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      invoiceCounter = 1000 + data.length;
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenu(null);
    };

    if (openMenu) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [openMenu]);

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
            Admin Access Only
          </p>
        </div>
      </div>
    );
  }

  function calcItem(item: any) {
    return { ...item, amount: item.qty * item.rate };
  }

  function updateItem(i: number, field: string, value: any) {
    const items = form.items.map((it: any, idx: number) =>
      idx === i
        ? calcItem({
            ...it,
            [field]: field === "description" ? value : Number(value),
          })
        : it,
    );
    setForm({ ...form, items });
  }

  function addItem() {
    setForm({
      ...form,
      items: [...form.items, { description: "", qty: 1, rate: 0, amount: 0 }],
    });
  }

  function removeItem(i: number) {
    setForm({
      ...form,
      items: form.items.filter((_: any, idx: number) => idx !== i),
    });
  }

  const subtotal = form.items.reduce((s: number, it: any) => s + it.amount, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  function openAdd() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      items: [{ description: "", qty: 1, rate: 0, amount: 0 }],
    });
    setShowModal(true);
  }

  function openEdit(inv: any) {
    setEditing(inv);
    setForm({
      clientName: inv.clientName,
      clientEmail: inv.clientEmail ?? "",
      clientPhone: inv.clientPhone ?? "",
      clientAddress: inv.clientAddress ?? "",
      service: inv.service,
      status: inv.status,
      currency: inv.currency || "AED",
      paidAmount: inv.paidAmount ?? 0,
      dueDate: inv.dueDate ?? "",
      notes: inv.notes ?? "",
      items: inv.items,
    });
    setShowModal(true);
  }

  function openPreview(inv: any) {
    setPreview(inv);
    setShowPreview(true);
  }

  async function handleSave() {
    if (!form.clientName.trim()) {
      alert("Client Name is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (form.clientEmail && !emailRegex.test(form.clientEmail)) {
      alert(
        "Please enter a valid email address (example: abc@gmail.com, abc@yahoo.in, abc@company.co.uk)",
      );
      return;
    }
    const phoneRegex = /^\+\d{8,15}$/;

    if (form.clientPhone && !phoneRegex.test(form.clientPhone)) {
      alert(
        "Please enter a valid phone number with country code (Example: +919876543210)",
      );
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const invoiceNumber = editing ? editing.invoiceNumber : `AM-INV-${++invoiceCounter}`;
      const remainingAmount = total - (Number(form.paidAmount) || 0);
      const data = {
        ...form,
        subtotal,
        tax,
        total,
        paidAmount: Number(form.paidAmount) || 0,
        remainingAmount: remainingAmount,
        createdBy: crmUser?.uid,
      };
      if (editing) {
        await updateDoc(doc(db, "invoices", editing.id), data);
      } else {
        await addDoc(collection(db, "invoices"), {
          ...data,
          invoiceNumber,
          createdAt: now,
        });
      }
      setShowModal(false);
      fetchInvoices();
    } catch (err: any) {
      console.error("Save Invoice Error:", err);
      alert("Failed to save invoice: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteInvoice(inv: any) {
    if (!confirm(`Delete this invoice (${inv.invoiceNumber})?`)) return;

    try {
      // Send alert email to admin BEFORE deleting
      await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: "am@theaminternationals.com",
          subject: `🚨 Invoice Deleted - ${inv.invoiceNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #fee2e2;border-radius:8px;overflow:hidden;">
              <div style="background-color:#fee2e2;padding:20px;text-align:center;color:#991b1b;">
                <h2 style="margin:0;">Invoice Deleted</h2>
              </div>
              <div style="padding:24px;background-color:white;">
                <p><strong>Invoice Number:</strong> ${inv.invoiceNumber}</p>
                <p><strong>Client:</strong> ${inv.clientName}</p>
                <p><strong>Client Email:</strong> ${inv.clientEmail || "N/A"}</p>
                <p><strong>Total Amount:</strong> ${inv.currency || "AED"} ${inv.total?.toLocaleString()}</p>
                <p><strong>Status:</strong> ${inv.status}</p>
                <hr style="border:none;border-top:1px solid #f3f4f6;margin:20px 0;" />
                <p style="font-size:12px;color:#6b7280;"><strong>Deleted By:</strong> ${crmUser?.email || "Unknown User"}</p>
                <p style="font-size:12px;color:#6b7280;"><strong>Deleted At:</strong> ${new Date().toLocaleString()}</p>
              </div>
            </div>
          `,
        }),
      });

      // Delete invoice
      await deleteDoc(doc(db, "invoices", inv.id));
      fetchInvoices();
      alert("Invoice deleted and admin notified.");
    } catch (error: any) {
      console.error("Delete Invoice Error:", error);
      alert("Failed to delete invoice: " + error.message);
    }
  }

  async function updateStatus(inv: any, status: string) {
    try {
      await updateDoc(doc(db, "invoices", inv.id), { status });
      setInvoices((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, status } : i)),
      );
    } catch (err: any) {
      console.error(err);
      alert("Failed to update status");
    }
  }

  async function downloadPDF(inv: any) {
    try {
      const jsPDF = (await import("jspdf")).default;
      const html2canvas = (await import("html2canvas")).default;
      setPreview(inv);
      setShowPreview(true);
      await new Promise((r) => setTimeout(r, 500));
      const element = document.getElementById("invoice-print-area");
      if (!element) return;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${inv.invoiceNumber || "Invoice"}.pdf`);
      setShowPreview(false);
    } catch (err) {
      console.error(err);
      setShowPreview(false);
    }
  }

  async function sendEmail(inv: any) {
    if (!inv.clientEmail) {
      alert(
        "❌ No client email on this invoice! Please edit the invoice and add a client email first.",
      );
      return;
    }
    setSending(true);
    try {
      const curr = inv.currency || "AED";
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: inv.clientEmail,
          subject: `Invoice ${inv.invoiceNumber} from The A&M Internationals`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:var(--navy);padding:28px;border-radius:10px 10px 0 0;text-align:center;">
                <h1 className="page-title flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            A&M
          </h1>
                <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:12px;letter-spacing:2px;">THE A&M INTERNATIONALS FZC</p>
              </div>
              <div style="background:white;padding:28px;border:1px solid #e8e8f0;border-top:none;border-radius:0 0 10px 10px;">
                <p style="color:#1a1a2e;">Dear <strong>${inv.clientName}</strong>,</p>
                <p style="color:#6b7280;">Please find your invoice details below. Kindly make the payment by the due date.</p>
                <div style="background:#f8f9fc;border-radius:10px;padding:20px;margin:16px 0;">
                  <table style="width:100%;font-size:13px;">
                    <tr><td style="color:#9ca3af;padding:4px 0;">Invoice No.</td><td style="text-align:right;font-weight:600;color:#1a1a2e;">${inv.invoiceNumber}</td></tr>
                    <tr><td style="color:#9ca3af;padding:4px 0;">Service</td><td style="text-align:right;color:#1a1a2e;">${SERVICES.find((s) => s.key === inv.service)?.label || inv.service}</td></tr>
                    ${inv.dueDate ? `<tr><td style="color:#9ca3af;padding:4px 0;">Due Date</td><td style="text-align:right;font-weight:600;color:#ef4444;">${new Date(inv.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</td></tr>` : ""}
                    <tr><td style="color:#9ca3af;padding:4px 0;padding-top:12px;border-top:1px solid #e5e7eb;">Subtotal</td><td style="text-align:right;padding-top:12px;border-top:1px solid #e5e7eb;color:#1a1a2e;">${curr} ${inv.subtotal?.toLocaleString()}</td></tr>
                    <tr><td style="color:#9ca3af;padding:4px 0;">VAT (5%)</td><td style="text-align:right;color:#1a1a2e;">${curr} ${inv.tax?.toFixed(2)}</td></tr>
                    <tr><td style="font-weight:700;color:#0D1B3E;padding:8px 0 4px;font-size:15px;">Total</td><td style="text-align:right;font-weight:700;color:#C9A84C;font-size:15px;">${curr} ${inv.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                  </table>
                </div>
                <p style="color:#6b7280;font-size:13px;">For any queries, contact us at <a href="mailto:am@theaminternationals.com" style="color:#C9A84C;">am@theaminternationals.com</a> or WhatsApp <a href="https://wa.me/919025562311" style="color:#C9A84C;">+91 90255 62311</a></p>
                <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:20px;">The A&M Internationals FZC · Ajman Free Zone, UAE · theaminternationals.com</p>
              </div>
            </div>
          `,
        }),
      });

      const result = await res.json();

      if (result.error) {
        alert(
          `❌ Failed to send email!\n\nError: ${JSON.stringify(result.error)}`,
        );
      } else if (result.skipped) {
        alert(
          "⚠️ Email skipped — RESEND_API_KEY not configured in environment variables.",
        );
      } else {
        alert(`✅ Invoice email sent to ${inv.clientEmail} successfully!`);
      }
    } catch (err: any) {
      alert(`❌ Network error: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  function sendWhatsApp(inv: any) {
    const phone = inv.clientPhone?.replace(/\D/g, "");
    if (!phone) {
      alert("❌ No client phone number on this invoice!");
      return;
    }
    const curr = inv.currency || "AED";
    const msg = encodeURIComponent(
      `Hello ${inv.clientName},\n\nPlease find your invoice from The A&M Internationals:\n\n📄 Invoice No: ${inv.invoiceNumber}\n💰 Total: ${curr} ${inv.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}${inv.dueDate ? `\n📅 Due: ${new Date(inv.dueDate).toLocaleDateString("en-GB")}` : ""}\n\nFor queries: am@theaminternationals.com\n\nThank you!\nThe A&M Internationals FZC`,
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  const stInfo = (key: string) =>
    STATUSES.find((s) => s.key === key) ?? STATUSES[0];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">
            {invoices.filter((i) => i.status === "paid").length} paid ·{" "}
            {invoices.filter((i) => i.status === "unpaid").length} unpaid
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <span className="text-base">+</span> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Total Invoiced",
            value: `AED ${invoices.reduce((s, i) => s + (i.total || 0), 0).toLocaleString()}`,
            color: "#0D1B3E",
          },
          {
            label: "Paid",
            value: `AED ${invoices
              .filter((i) => i.status === "paid")
              .reduce((s, i) => s + (i.total || 0), 0)
              .toLocaleString()}`,
            color: "#065f46",
          },
          {
            label: "Outstanding",
            value: `AED ${invoices
              .filter((i) => i.status !== "paid")
              .reduce((s, i) => s + (i.total || 0), 0)
              .toLocaleString()}`,
            color: "#ef4444",
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: "#9ca3af" }}
            >
              {s.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Invoice list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl animate-pulse"
              style={{ background: "#f0f2f8" }}
            />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 crm-card">
          <p className="text-sm" style={{ color: "#9ca3af" }}>
            No invoices yet
          </p>
          <button onClick={openAdd} className="btn-primary mt-3 mx-auto">
            + New Invoice
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const st = stInfo(inv.status);
            const svc = SERVICES.find((s) => s.key === inv.service);
            const curr = inv.currency || "AED";
            return (
              <div key={inv.id} className="crm-card">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "#0D1B3E0d" }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0D1B3E"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-bold"
                          style={{ color: "#1a1a2e" }}
                        >
                          {inv.clientName}
                        </p>
                        <span
                          className="text-xs font-mono"
                          style={{ color: "#9ca3af" }}
                        >
                          {inv.invoiceNumber}
                        </span>
                      </div>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "#9ca3af" }}
                      >
                        {svc?.label} ·{" "}
                        {new Date(inv.createdAt).toLocaleDateString("en-GB")}
                        {inv.dueDate &&
                          ` · Due ${new Date(inv.dueDate).toLocaleDateString("en-GB")}`}
                      </p>
                      {inv.clientEmail && (
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "#9ca3af" }}
                        >
                          📧 {inv.clientEmail}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 relative">
                    <div className="text-right mr-2">
                      <p
                        className="text-base font-bold"
                        style={{ color: "#C9A84C" }}
                      >
                        {curr}{" "}
                        {inv.total?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <div className="flex flex-col items-end gap-0.5 mt-1">
                        <span className="text-[10px] font-bold text-[#22c55e]">
                          PAID: {curr} {inv.paidAmount?.toLocaleString() || 0}
                        </span>
                        <span className="text-[10px] font-bold text-[#ef4444]">
                          DUE: {curr} {((inv.total || 0) - (inv.paidAmount || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <span
                      className="badge"
                      style={{
                        background: st.bg,
                        color: st.color,
                        border: `1px solid ${st.border}`,
                      }}
                    >
                      {st.label}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(openMenu === inv.id ? null : inv.id);
                      }}
                      className="btn-primary"
                    >
                      Actions ▼
                    </button>

                    {openMenu === inv.id && (
                      <div 
                        className="absolute right-0 top-12 z-50 bg-white border rounded-xl shadow-lg w-56 py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            openPreview(inv);
                            setOpenMenu(null);
                          }}
                        >
                          👁 View Invoice
                        </button>

                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            downloadPDF(inv);
                            setOpenMenu(null);
                          }}
                        >
                          ⬇ Download PDF
                        </button>

                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            sendEmail(inv);
                            setOpenMenu(null);
                          }}
                        >
                          ✉ Send Email
                        </button>

                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            sendWhatsApp(inv);
                            setOpenMenu(null);
                          }}
                        >
                          💬 WhatsApp
                        </button>

                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            openEdit(inv);
                            setOpenMenu(null);
                          }}
                        >
                          ✏ Edit Invoice
                        </button>

                        <div className="border-t my-1" />

                        {STATUSES.filter((s) => s.key !== inv.status).map(
                          (s) => (
                            <button
                              key={s.key}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                              onClick={() => {
                                updateStatus(inv, s.key);
                                setOpenMenu(null);
                              }}
                            >
                              → Mark as {s.label}
                            </button>
                          ),
                        )}

                        <div className="border-t my-1" />

                        <button
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          onClick={() => {
                            deleteInvoice(inv);
                            setOpenMenu(null);
                          }}
                        >
                          🗑 Delete Invoice
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 680 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="modal-title mb-0">
                {editing ? "Edit Invoice" : "New Invoice"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Client *</label>
                  <select
                    className="form-input"
                    value={form.clientId || ""}
                    onChange={(e) => {
                      const selected = clients.find(c => c.id === e.target.value);
                      if (selected) {
                        setForm({
                          ...form,
                          clientId: e.target.value,
                          clientName: selected.company || selected.name || "",
                          clientEmail: selected.email || "",
                          clientPhone: selected.phone || "",
                          clientAddress: selected.address || ""
                        });
                      } else {
                        setForm({ ...form, clientId: "", clientName: "", clientEmail: "", clientPhone: "", clientAddress: "" });
                      }
                    }}
                  >
                    <option value="">-- Select a client --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Client Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) =>
                      setForm({ ...form, clientEmail: e.target.value })
                    }
                    placeholder="client@email.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-slate-500 font-semibold mb-1 block">Phone</label>
                  <PhoneInput value={form.clientPhone} onChange={(val: string) => setForm({ ...form, clientPhone: val })} />
                </div>
                <div>
                  <label className="form-label">Client Address</label>
                  <input
                    className="form-input"
                    value={form.clientAddress}
                    onChange={(e) =>
                      setForm({ ...form, clientAddress: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="form-label">Service</label>
                  <select
                    className="form-input"
                    value={form.service}
                    onChange={(e) =>
                      setForm({ ...form, service: e.target.value })
                    }
                  >
                    {SERVICES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <select
                    className="form-input"
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                  >
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="SAR">SAR</option>
                    <option value="QAR">QAR</option>
                    <option value="KWD">KWD</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Paid Amount ({form.currency || "AED"})</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.paidAmount === 0 ? "" : form.paidAmount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paidAmount:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="form-label">Remaining Amount ({form.currency || "AED"})</label>
                  <input
                    className="form-input bg-gray-50"
                    value={(total - (Number(form.paidAmount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    readOnly
                  />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label mb-0">Line Items</label>
                  <button
                    onClick={addItem}
                    className="text-xs font-bold"
                    style={{ color: "#C9A84C" }}
                  >
                    + Add Item
                  </button>
                </div>
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  <div
                    className="grid text-xs font-bold uppercase tracking-wide px-3 py-2"
                    style={{
                      gridTemplateColumns: "1fr 70px 100px 100px 28px",
                      gap: 8,
                      background: "#f8f9fc",
                      color: "#9ca3af",
                    }}
                  >
                    <span>Description</span>
                    <span className="text-center">Qty</span>
                    <span className="text-center">Rate ({form.currency || "AED"})</span>
                    <span className="text-right">Amount</span>
                    <span></span>
                  </div>
                  {form.items.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="grid items-center px-3 py-2 border-t"
                      style={{
                        gridTemplateColumns: "1fr 70px 100px 100px 28px",
                        gap: 8,
                        borderColor: "#f0f0f5",
                      }}
                    >
                      <input
                        className="form-input py-1.5"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(i, "description", e.target.value)
                        }
                        placeholder="Service..."
                      />
                      <input
                        className="form-input py-1.5 text-center"
                        type="number"
                        min="1"
                        value={item.qty === 0 ? "" : item.qty}
                        onChange={(e) => updateItem(i, "qty", e.target.value)}
                        placeholder="0"
                      />
                      <input
                        className="form-input py-1.5 text-center"
                        type="number"
                        min="0"
                        value={item.rate === 0 ? "" : item.rate}
                        onChange={(e) => updateItem(i, "rate", e.target.value)}
                        placeholder="0"
                      />
                      <span
                        className="text-sm font-bold text-right"
                        style={{ color: "#1a1a2e" }}
                      >
                        {form.currency || "AED"} {item.amount.toLocaleString()}
                      </span>
                      {form.items.length > 1 && (
                        <button
                          onClick={() => removeItem(i)}
                          className="btn-danger"
                          style={{ padding: "2px 6px", fontSize: "10px" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: "#6b7280" }}>Subtotal</span>
                    <span style={{ color: "#1a1a2e" }}>
                      {form.currency || "AED"} {subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "#6b7280" }}>VAT (5%)</span>
                    <span style={{ color: "#1a1a2e" }}>
                      {form.currency || "AED"} {tax.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className="flex justify-between font-bold pt-2 border-t text-base"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    <span style={{ color: "#0D1B3E" }}>Total</span>
                    <span style={{ color: "#C9A84C" }}>
                      {form.currency || "AED"}{" "}
                      {total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="form-label">Notes / Payment Terms</label>
                <textarea
                  className="form-input resize-none"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="50% advance, balance on delivery..."
                />
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
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Update Invoice"
                    : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview */}
      {showPreview && preview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div
            style={{
              width: "100%",
              maxWidth: 700,
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              id="invoice-print-area"
              style={{
                background: "white",
                padding: "40px",
                fontFamily: "Arial,sans-serif",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 32,
                  paddingBottom: 24,
                  borderBottom: "2px solid #f0f0f5",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        background: "var(--navy)",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          color: "#C9A84C",
                          fontWeight: 700,
                          fontSize: 12,
                          fontFamily: "Georgia,serif",
                          letterSpacing: "-0.5px",
                        }}
                      >
                        A&M
                      </span>
                    </div>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          fontSize: 15,
                          color: "#0D1B3E",
                        }}
                      >
                        The A&M Internationals FZC
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10,
                          color: "#9ca3af",
                          letterSpacing: 2,
                        }}
                      >
                        ELEVATING THE WORLD, ELEGANTLY
                      </p>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                    Ajman Free Zone, UAE
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                    am@theaminternationals.com · +91 90255 62311
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#C9A84C" }}>
                    theaminternationals.com
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#0D1B3E",
                      letterSpacing: -1,
                    }}
                  >
                    INVOICE
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#C9A84C",
                    }}
                  >
                    {preview.invoiceNumber}
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 11,
                      color: "#9ca3af",
                    }}
                  >
                    Date:{" "}
                    {new Date(preview.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  {preview.dueDate && (
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 11,
                        color: "#ef4444",
                        fontWeight: 600,
                      }}
                    >
                      Due:{" "}
                      {new Date(preview.dueDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* Bill to */}
              <div style={{ marginBottom: 24 }}>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: 2,
                  }}
                >
                  Bill To
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#1a1a2e",
                  }}
                >
                  {preview.clientName}
                </p>
                {preview.clientEmail && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    {preview.clientEmail}
                  </p>
                )}
                {preview.clientPhone && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    {preview.clientPhone}
                  </p>
                )}
                {preview.clientAddress && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    {preview.clientAddress}
                  </p>
                )}
              </div>

              {/* Items table */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: 20,
                }}
              >
                <thead>
                  <tr style={{ background: "#0D1B3E" }}>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#C9A84C",
                        letterSpacing: 1,
                      }}
                    >
                      DESCRIPTION
                    </th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#C9A84C",
                        letterSpacing: 1,
                        width: 60,
                      }}
                    >
                      QTY
                    </th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#C9A84C",
                        letterSpacing: 1,
                        width: 100,
                      }}
                    >
                      RATE ({preview.currency || "AED"})
                    </th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#C9A84C",
                        letterSpacing: 1,
                        width: 110,
                      }}
                    >
                      AMOUNT ({preview.currency || "AED"})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((item: any, i: number) => (
                    <tr
                      key={i}
                      style={{ background: i % 2 === 0 ? "white" : "#f8f9fc" }}
                    >
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: 12,
                          color: "#374151",
                        }}
                      >
                        {item.description}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: 12,
                          textAlign: "center",
                          color: "#374151",
                        }}
                      >
                        {item.qty}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: 12,
                          textAlign: "center",
                          color: "#374151",
                        }}
                      >
                        {item.rate.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: 12,
                          textAlign: "right",
                          fontWeight: 600,
                          color: "#1a1a2e",
                        }}
                      >
                        {item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 24,
                }}
              >
                <div style={{ minWidth: 240 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid #f0f0f5",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      Subtotal
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1a1a2e",
                      }}
                    >
                      {preview.currency || "AED"} {preview.subtotal?.toLocaleString()}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid #f0f0f5",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      VAT (5%)
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1a1a2e",
                      }}
                    >
                      {preview.currency || "AED"} {preview.tax?.toFixed(2)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid #f0f0f5",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      Paid Amount
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#22c55e",
                      }}
                    >
                      {preview.currency || "AED"} {preview.paidAmount?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid #f0f0f5",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      Remaining Due
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#ef4444",
                      }}
                    >
                      {preview.currency || "AED"} {((preview.total || 0) - (preview.paidAmount || 0)).toLocaleString()}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "#0D1B3E",
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                  >
                    <span
                      style={{ fontSize: 14, fontWeight: 700, color: "white" }}
                    >
                      TOTAL
                    </span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#C9A84C",
                      }}
                    >
                      {preview.currency || "AED"}{" "}
                      {preview.total?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {preview.notes && (
                <div
                  style={{
                    padding: "14px",
                    background: "#f8f9fc",
                    borderRadius: 8,
                    marginBottom: 24,
                    borderLeft: "3px solid #C9A84C",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "#6b7280",
                      fontWeight: 700,
                    }}
                  >
                    NOTES
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: "#374151",
                    }}
                  >
                    {preview.notes}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div
                style={{
                  textAlign: "center",
                  paddingTop: 20,
                  borderTop: "1px solid #f0f0f5",
                }}
              >
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                  Thank you for your business!
                </p>
                <p
                  style={{ margin: "4px 0 0", fontSize: 11, color: "#C9A84C" }}
                >
                  The A&M Internationals FZC · Ajman Free Zone, UAE ·
                  theaminternationals.com
                </p>
              </div>
            </div>

            {/* Preview action buttons */}
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: 16,
                background: "white",
                borderTop: "1px solid #f0f0f5",
                borderRadius: "0 0 16px 16px",
              }}
            >
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  background: "white",
                  color: "#6b7280",
                }}
              >
                Close
              </button>
              <button
                onClick={() => downloadPDF(preview)}
                className="btn-gold"
                style={{ flex: 1, justifyContent: "center" }}
              >
                ⬇ Download PDF
              </button>
              <button
                onClick={() => sendEmail(preview)}
                disabled={sending}
                className="btn-primary"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  background: "#1d4ed8",
                }}
              >
                ✉ Send Email
              </button>
              <button
                onClick={() => sendWhatsApp(preview)}
                className="btn-primary"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  background: "#25d366",
                }}
              >
                💬 WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
