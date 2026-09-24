"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { exportElementToMultiPagePDF } from "@/lib/pdf-export";

interface ProjectCompletedInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  invoice: any;
}

export default function ProjectCompletedInvoiceModal({
  isOpen,
  onClose,
  project,
  invoice,
}: ProjectCompletedInvoiceModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !project) return null;

  const invNumber = invoice?.invoiceNumber || "AM-INV-PENDING";
  const currency = invoice?.currency || project?.currency || "AED";
  const budget = Number(invoice?.total ?? project?.budget ?? 0);
  const paid = Number(invoice?.paidAmount ?? project?.paid ?? 0);
  const remaining = Math.max(0, budget - paid);
  const isPaid = (invoice?.status === "paid") || (paid >= budget && budget > 0);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    try {
      setDownloading(true);
      await exportElementToMultiPagePDF(
        printRef.current,
        `Invoice_${invNumber}_${(project?.clientName || "Client").replace(/\s+/g, "_")}.pdf`,
        { scale: 2 }
      );
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Celebration Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0D1B3E 0%, #1a2f6c 100%)",
            padding: "24px 28px",
            color: "#ffffff",
          }}
          className="relative"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "#22c55e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px rgba(34, 197, 94, 0.4)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Project Completed
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                Final Invoice Generated!
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 ml-12">
            The project &ldquo;{project.title}&rdquo; is now marked as complete. Its official invoice has been synchronized automatically.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Invoice Header Badge Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice Reference</p>
              <p className="text-lg font-bold text-[#0D1B3E] font-mono mt-0.5">{invNumber}</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Client: <span className="font-semibold text-slate-800">{project.clientName || "Client"}</span>
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isPaid
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                {isPaid ? "FULLY PAID" : "OUTSTANDING BALANCE"}
              </span>
            </div>
          </div>

          {/* 3-Column Financial Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Amount</p>
              <p className="text-lg font-bold text-[#0D1B3E] mt-1">
                {currency} {budget.toLocaleString()}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Total Received</p>
              <p className="text-lg font-bold text-emerald-700 mt-1">
                {currency} {paid.toLocaleString()}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Balance Due</p>
              <p className={`text-lg font-bold mt-1 ${remaining > 0 ? "text-amber-600" : "text-slate-400"}`}>
                {currency} {remaining.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Toggle Preview Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowFullPreview(!showFullPreview)}
              className="text-xs font-semibold text-[#0D1B3E] hover:text-[#C9A84C] flex items-center gap-1 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {showFullPreview ? "Hide Invoice Sheet" : "Preview Printable Invoice Sheet"}
            </button>
            <span className="text-xs text-slate-400">PDF Ready</span>
          </div>

          {/* Full Printable Area (Always present in DOM for PDF export, visually shown if toggled) */}
          <div
            style={{
              display: showFullPreview ? "block" : "none",
            }}
            className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[350px] overflow-y-auto"
          >
            {/* Visual Preview */}
            <div className="p-6 bg-white text-xs text-slate-800 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0D1B3E]">THE A.M. INTERNATIONALS</h3>
                  <p className="text-[10px] text-slate-500">Official Client Statement & Invoice</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#0D1B3E]">{invNumber}</p>
                  <p className="text-[10px] text-slate-400">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Billed To</p>
                <p className="font-bold text-slate-800">{project.clientName || "Client"}</p>
                {project.clientEmail && <p className="text-slate-500">{project.clientEmail}</p>}
                <p className="font-medium text-slate-600 mt-1">Project: {project.title}</p>
              </div>

              <table className="w-full text-left border border-slate-100 rounded">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2">
                      <p className="font-semibold text-slate-800">Project Delivery & Execution</p>
                      <p className="text-[10px] text-slate-400">{project.title}</p>
                    </td>
                    <td className="p-2 text-right font-bold text-slate-800">
                      {currency} {budget.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-48 space-y-1 text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{currency} {budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid to Date:</span>
                    <span className="font-semibold">{currency} {paid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#0D1B3E] border-t border-slate-200 pt-1">
                    <span>Balance Due:</span>
                    <span>{currency} {remaining.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden Offscreen Print Area (Always perfectly styled for A4 multi-page PDF generation) */}
          <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
            <div
              ref={printRef}
              style={{
                width: "800px",
                padding: "48px",
                background: "#ffffff",
                fontFamily: "Arial, sans-serif",
                color: "#1e293b",
                boxSizing: "border-box",
              }}
            >
              {/* Top Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0D1B3E", paddingBottom: "24px", marginBottom: "28px" }}>
                <div>
                  <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#0D1B3E", margin: "0 0 6px 0", letterSpacing: "1px" }}>THE A.M. INTERNATIONALS</h1>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Business Consulting & Digital Solutions</p>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: "4px 0 0 0" }}>Dubai, United Arab Emirates &middot; contact@theaminternationals.com</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ display: "inline-block", background: isPaid ? "#dcfce7" : "#fef3c7", color: isPaid ? "#166534" : "#92400e", fontWeight: "bold", fontSize: "12px", padding: "4px 12px", borderRadius: "20px", marginBottom: "8px" }}>
                    {isPaid ? "PAID IN FULL" : "PAYMENT DUE"}
                  </span>
                  <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0D1B3E", margin: 0, fontFamily: "monospace" }}>{invNumber}</h2>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Billed To / Details */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "28px" }}>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase", margin: "0 0 4px 0" }}>Invoice To</p>
                  <p style={{ fontSize: "15px", fontWeight: "bold", color: "#0f172a", margin: "0 0 2px 0" }}>{project.clientName || "Client"}</p>
                  {project.clientEmail && <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 2px 0" }}>{project.clientEmail}</p>}
                  {project.clientPhone && <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{project.clientPhone}</p>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "11px", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase", margin: "0 0 4px 0" }}>Project Details</p>
                  <p style={{ fontSize: "14px", fontWeight: "bold", color: "#0f172a", margin: "0 0 2px 0" }}>{project.title}</p>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>Status: Completed</p>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "28px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "11px", color: "#475569", textTransform: "uppercase" }}>Description</th>
                    <th style={{ padding: "12px 14px", textAlign: "right", fontSize: "11px", color: "#475569", textTransform: "uppercase" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px", fontSize: "13px" }}>
                      <strong style={{ color: "#0f172a" }}>Project Execution & Delivery</strong>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0" }}>Complete scope fulfillment for {project.title}</p>
                    </td>
                    <td style={{ padding: "14px", textAlign: "right", fontSize: "13px", fontWeight: "bold", color: "#0f172a" }}>
                      {currency} {budget.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Totals Summary */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "36px" }}>
                <div style={{ width: "260px", background: "#f8fafc", borderRadius: "10px", padding: "16px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                    <span>Total Project Budget:</span>
                    <span style={{ fontWeight: "bold", color: "#0f172a" }}>{currency} {budget.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#16a34a", marginBottom: "8px" }}>
                    <span>Total Paid to Date:</span>
                    <span style={{ fontWeight: "bold" }}>{currency} {paid.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "bold", color: "#0D1B3E", borderTop: "2px solid #cbd5e1", paddingTop: "8px" }}>
                    <span>Balance Remaining:</span>
                    <span>{currency} {remaining.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
                Thank you for your business. For any billing queries, please contact billing@theaminternationals.com.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Dismiss
          </button>

          <div className="flex items-center gap-2.5">
            <Link
              href="/invoice"
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              Open Invoices Page
            </Link>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-5 py-2 text-xs font-bold rounded-lg text-white shadow-sm flex items-center gap-1.5 transition-all"
              style={{
                background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a8a 100%)",
              }}
            >
              {downloading ? (
                <span>Generating PDF...</span>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download Invoice PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
