"use client";
import { X, Trash2, Pencil } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";


const PIE_COLORS = [
  "#0D1B3E",
  "#C9A84C",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const EXP_CATS = [
  "Office",
  "Software",
  "Marketing",
  "Salary",
  "Travel",
  "Equipment",
  "Other",
];

const EMPTY_EXP = {
  clientName: "",
  currency: "AED",
  description: "",
  amount: "",
  category: "",
  date: "",
};

const EMPTY_REV = {
  description: "",
  amount: "",
  category: "Manual Entry",
  date: "",
  clientName: "",
  paymentMethod: "Bank Transfer",
  status: "received",
  notes: "",
  currency: "AED",
};

const PAY_METHODS = ["Bank Transfer", "Cash", "Card", "Stripe", "Other"];
const REV_STATUSES = [
  { key: "received", label: "Received", color: "#16a34a", bg: "#f0fdf4" },
  { key: "pending", label: "Pending", color: "#d97706", bg: "#fffbeb" },
];

export default function RevenuePage() {
  const { crmUser } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [manualRev, setManualRev] = useState<any[]>([]);
  const [dbClients, setDbClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expenses" | "manual_revenue">("expenses");
  const [showExp, setShowExp] = useState(false);
  const [editingExp, setEditingExp] = useState<any | null>(null);
  const [expForm, setExpForm] = useState({ ...EMPTY_EXP });

  const [showRev, setShowRev] = useState(false);
  const [editingRev, setEditingRev] = useState<any | null>(null);
  const [revForm, setRevForm] = useState({ ...EMPTY_REV });
  const [revErrors, setRevErrors] = useState<{
    clientName?: string;
    description?: string;
    amount?: string;
  }>({});

  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({
    AED: 1,
    USD: 3.67,
    GBP: 4.95,
    INR: 0.043,
  });

  // Wait to do return until after hooks

  // Fetching exchange rates for currency conversion
  async function fetchExchangeRates() {
    try {
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/AED");

      const data = await res.json();

      setRates({
        AED: 1,
        USD: 1 / data.rates.USD,
        GBP: 1 / data.rates.GBP,
        INR: 1 / data.rates.INR,
      });
    } catch (error) {
      console.error("Exchange rate fetch failed:", error);
    }
  }

  function convertToAED(amount: number, currency: string) {
    return amount * (rates[currency] || 1);
  }

  async function fetchData() {
    try {
      const [invSnap, expSnap, revSnap, cliSnap] = await Promise.all([
        getDocs(collection(db, "invoices")),
        getDocs(collection(db, "expenses")),
        getDocs(collection(db, "manual_revenue")),
        getDocs(collection(db, "clients"))
      ]);
      setInvoices(invSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setExpenses(expSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setManualRev(revSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDbClients(cliSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (crmUser?.role === "admin") {
      fetchData();
      fetchExchangeRates();
    }
  }, [crmUser]);

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
  // Calculations
  const paidInvoices = invoices.filter((i) => i.status === "paid");

  const invoiceRevenue = paidInvoices.reduce(
    (s, i) => s + (Number(i.total) || 0),
    0,
  );

  const manualRevenueTotal = manualRev
    .filter((r) => r.status === "received")
    .reduce(
      (s, r) => s + convertToAED(Number(r.amount) || 0, r.currency || "AED"),
      0,
    );

  const totalRevenue = invoiceRevenue + manualRevenueTotal;

  const totalPending = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalExpenses = expenses.reduce(
    (s, e) => s + convertToAED(Number(e.amount) || 0, e.currency || "AED"),
    0,
  );

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin =
    totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const year = new Date().getFullYear();
  const monthlyData = MONTHS.map((month, idx) => {
    const invRev = paidInvoices

      .filter((i) => {
        const d = new Date(i.createdAt);
        return d.getMonth() === idx && d.getFullYear() === year;
      })
      .reduce((s, i) => s + (Number(i.total) || 0), 0);

    const manRev = manualRev
      .filter((r) => {
        const d = new Date(r.date || r.createdAt);
        return (
          d.getMonth() === idx &&
          d.getFullYear() === year &&
          r.status === "received"
        );
      })
      .reduce(
        (s, r) => s + convertToAED(Number(r.amount) || 0, r.currency || "AED"),
        0,
      );

    const rev = invRev + manRev;

    const exp = expenses
      .filter((e) => {
        const d = new Date(e.date || e.createdAt);
        return d.getMonth() === idx && d.getFullYear() === year;
      })
      .reduce(
        (s, e) => s + convertToAED(Number(e.amount) || 0, e.currency || "AED"),
        0,
      );
    return {
      month,
      Revenue: Math.round(rev),
      Expenses: Math.round(exp),
      Profit: Math.round(rev - exp),
    };
  });

  const clientMap: Record<string, number> = {};
  paidInvoices.forEach((i) => {
    clientMap[i.clientName] =
      (clientMap[i.clientName] || 0) + (Number(i.total) || 0);
  });
  manualRev
    .filter((r) => r.status === "received" && r.clientName)
    .forEach((r) => {
      clientMap[r.clientName] =
        (clientMap[r.clientName] || 0) +
        convertToAED(Number(r.amount) || 0, r.currency || "AED");
    });

  const clients = Array.from(
    new Set(
      [
        ...invoices.map((i) => i.clientName),
        ...expenses.map((e) => e.clientName),
        ...manualRev.map((r) => r.clientName),
      ].filter(Boolean),
    ),
  );

  const clientData = Object.entries(clientMap)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const svcLabels: Record<string, string> = {
    "digital-marketing": "Digital Mktg",
    "ui-ux": "UI/UX",
    "web-development": "Web Dev",
    seo: "SEO",
    "social-media": "Social",
    branding: "Branding",
    other: "Other",
  };
  const svcMap: Record<string, number> = {};
  paidInvoices.forEach((i) => {
    const l = svcLabels[i.service] || i.service || "Other";
    svcMap[l] = (svcMap[l] || 0) + (Number(i.total) || 0);
  });
  // Client Financial Calculation
  const selectedClientInvoices = selectedClient
    ? invoices.filter((inv) => inv.clientName === selectedClient)
    : [];

  const clientBudget = selectedClientInvoices.reduce(
    (sum, inv) => sum + (Number(inv.total) || 0),
    0,
  );

  const clientPaid =
    selectedClientInvoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) +
    manualRev
      .filter((r) => r.clientName === selectedClient && r.status === "received")
      .reduce(
        (sum, r) =>
          sum + convertToAED(Number(r.amount) || 0, r.currency || "AED"),
        0,
      );

  const clientPending = selectedClientInvoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const clientExpenses = selectedClient
    ? expenses.filter((e) => e.clientName === selectedClient)
    : [];

  const totalClientExpenses = clientExpenses.reduce(
    (sum, e) => sum + convertToAED(Number(e.amount) || 0, e.currency || "AED"),
    0,
  );

  const serviceData = Object.entries(svcMap).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: "white",
          border: "1px solid #e8e8f0",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <p style={{ fontWeight: 700, color: "#0D1B3E", marginBottom: 4 }}>
          {label}
        </p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
            {p.name}: <strong>AED {Number(p.value).toLocaleString()}</strong>
          </p>
        ))}
      </div>
    );
  };

  // Expense helpers
  function openAddExpense() {
    setEditingExp(null);
    setExpForm({ ...EMPTY_EXP });
    setShowExp(true);
  }

  function openEditExpense(e: any) {
    setEditingExp(e);
    setExpForm({
      clientName: e.clientName ?? "",
      currency: e.currency ?? "AED",
      description: e.description,
      amount: String(e.amount),
      category: e.category ?? "",
      date: e.date ?? "",
    });
    setShowExp(true);
  }

  async function saveExpense() {
    if (!expForm.description || !expForm.amount) return;
    setSaving(true);
    try {
      const payload = { ...expForm, amount: Number(expForm.amount) };
      if (editingExp) {
        await updateDoc(doc(db, "expenses", editingExp.id), payload);
      } else {
        await addDoc(collection(db, "expenses"), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }
      setShowExp(false);
      setExpForm({ ...EMPTY_EXP });
      setEditingExp(null);
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function delExpense(id: string) {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    await deleteDoc(doc(db, "expenses", id));
    fetchData();
  }
  const downloadExcelReport = () => {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      {
        TotalRevenue: totalRevenue,
        PendingRevenue: totalPending,
        TotalExpenses: totalExpenses,
        NetProfit: netProfit,
        ProfitMargin: `${profitMargin}%`,
      },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    const invoiceSheet = XLSX.utils.json_to_sheet(invoices);
    const expenseSheet = XLSX.utils.json_to_sheet(expenses);
    const monthlySheet = XLSX.utils.json_to_sheet(monthlyData);

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, invoiceSheet, "Invoices");
    XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expenses");
    XLSX.utils.book_append_sheet(workbook, monthlySheet, "Monthly");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(
      blob,
      `Revenue_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };
  const downloadPDFReport = async () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Load Logo

    const response = await fetch("/logo.jpg");
    const blob = await response.blob();

    const reader = new FileReader();

    const logoData = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    // Header Background
    doc.setFillColor(13, 27, 62);
    doc.rect(0, 0, 210, 35, "F");

    // Gold Line
    doc.setFillColor(201, 168, 76);
    doc.rect(0, 35, 210, 2, "F");

    // Company Logo
    doc.addImage(logoData, "JPEG", 15, 8, 45, 18);

    // Report Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);

    doc.text("REVENUE REPORT", 105, 18, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);

    doc.text("Financial Performance Dashboard", 105, 25, {
      align: "center",
    });

    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 31, {
      align: "center",
    });

    // Executive Summary Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(13, 27, 62);

    doc.text("Executive Summary", 15, 48);

    // Card 1 - Revenue
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(15, 55, 42, 28, 3, 3, "F");

    doc.setDrawColor(201, 168, 76);
    doc.roundedRect(15, 55, 42, 28, 3, 3);

    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Revenue", 20, 64);

    doc.setFontSize(14);
    doc.setTextColor(201, 168, 76);

    doc.text(`AED ${totalRevenue.toLocaleString()}`, 20, 75);
    // Card 2 - Expenses
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(62, 55, 42, 28, 3, 3, "F");

    doc.setDrawColor(220, 53, 69);
    doc.roundedRect(62, 55, 42, 28, 3, 3);

    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Expenses", 67, 64);

    doc.setFontSize(14);
    doc.setTextColor(220, 53, 69);

    doc.text(`AED ${totalExpenses.toLocaleString()}`, 67, 75);
    // Card 3 - Profit
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(109, 55, 42, 28, 3, 3, "F");

    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(109, 55, 42, 28, 3, 3);

    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Net Profit", 114, 64);

    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);

    doc.text(`AED ${netProfit.toLocaleString()}`, 114, 75);

    // Card 4 - Margin
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(156, 55, 39, 28, 3, 3, "F");

    doc.setDrawColor(13, 27, 62);
    doc.roundedRect(156, 55, 39, 28, 3, 3);

    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Margin", 161, 64);

    doc.setFontSize(15);
    doc.setTextColor(13, 27, 62);

    doc.text(`${profitMargin}%`, 161, 75);

    // Client Financial Summary Title

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(13, 27, 62);

    doc.text("Client Financial Summary", 15, 98);

    // =====================================
    // Build Client Table Data
    // =====================================

    const clientRows = clients.map((client) => {
      const invoiceRevenue = paidInvoices
        .filter((i) => i.clientName === client)
        .reduce((sum, i) => sum + (Number(i.total) || 0), 0);

      const manualRevenue = manualRev
        .filter((r) => r.clientName === client && r.status === "received")
        .reduce(
          (sum, r) =>
            sum + convertToAED(Number(r.amount) || 0, r.currency || "AED"),
          0,
        );

      const totalRevenue = invoiceRevenue + manualRevenue;

      const expense = expenses
        .filter((e) => e.clientName === client)
        .reduce(
          (sum, e) =>
            sum + convertToAED(Number(e.amount) || 0, e.currency || "AED"),
          0,
        );

      const profit = totalRevenue - expense;

      const margin =
        totalRevenue > 0
          ? `${Math.round((profit / totalRevenue) * 100)}%`
          : "0%";

      return [
        client,
        `AED ${totalRevenue.toLocaleString()}`,
        `AED ${expense.toLocaleString()}`,
        `AED ${profit.toLocaleString()}`,
        margin,
      ];
    });

    // =====================================
    // Client Financial Table
    // =====================================

    autoTable(doc, {
      startY: 103,

      head: [["Client", "Revenue", "Expense", "Profit", "Margin"]],

      body: clientRows,

      theme: "grid",

      headStyles: {
        fillColor: [13, 27, 62],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        fontSize: 10,
      },

      bodyStyles: {
        fontSize: 9,
        textColor: 60,
        halign: "center",
        valign: "middle",
      },

      alternateRowStyles: {
        fillColor: [247, 247, 247],
      },

      styles: {
        cellPadding: 4,
        lineColor: [230, 230, 230],
        lineWidth: 0.2,
      },

      columnStyles: {
        0: {
          halign: "left",
          cellWidth: 50,
        },

        1: {
          cellWidth: 35,
        },

        2: {
          cellWidth: 35,
        },

        3: {
          cellWidth: 35,
        },

        4: {
          cellWidth: 25,
        },
      },
    });
    const clientTableEnd = (doc as any).lastAutoTable.finalY + 12;

    // =====================================
    // Revenue Breakdown
    // =====================================

    const invoiceRevenueAED = paidInvoices.reduce(
      (sum, invoice) => sum + (Number(invoice.total) || 0),
      0,
    );

    const manualRevenueAED = manualRev
      .filter((r) => r.status === "received")
      .reduce(
        (sum, r) =>
          sum + convertToAED(Number(r.amount) || 0, r.currency || "AED"),
        0,
      );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(13, 27, 62);

    doc.text("Revenue Breakdown", 15, clientTableEnd + 2);

    autoTable(doc, {
      startY: clientTableEnd + 8,
      head: [["Revenue Source", "Amount"]],
      body: [
        ["Invoice Revenue", `AED ${invoiceRevenueAED.toLocaleString()}`],
        ["Manual Revenue", `AED ${manualRevenueAED.toLocaleString()}`],
        ["Total Revenue", `AED ${totalRevenue.toLocaleString()}`],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [13, 27, 62],
        textColor: 255,
      },
    });

    const revenueTableEnd = (doc as any).lastAutoTable.finalY + 10;
    const finalY = revenueTableEnd;
    // =====================================
    // Financial Highlights
    // =====================================

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(13, 27, 62);

    doc.text("Financial Highlights", 15, finalY);

    // Background Box
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(15, finalY + 5, 180, 40, 3, 3, "F");

    // Left Column
    doc.text("Paid Invoices", 22, finalY + 15);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(paidInvoices.length.toString(), 22, finalY + 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);

    doc.text("Pending Revenue", 22, finalY + 32);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(245, 158, 11);

    doc.text(`AED ${totalPending.toLocaleString()}`, 22, finalY + 40);

    // ============================
    // Middle Column
    // ============================

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);

    doc.text("Active Clients", 82, finalY + 15);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);

    doc.text(clients.length.toString(), 82, finalY + 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);

    doc.text("Expense Records", 82, finalY + 32);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(239, 68, 68);

    doc.text(expenses.length.toString(), 82, finalY + 40);

    // ============================
    // Right Column
    // ============================

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);

    doc.text("Profit Margin", 145, finalY + 15);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);

    if (profitMargin >= 50) {
      doc.setTextColor(34, 197, 94);
    } else if (profitMargin >= 20) {
      doc.setTextColor(245, 158, 11);
    } else {
      doc.setTextColor(239, 68, 68);
    }

    doc.text(`${profitMargin}%`, 145, finalY + 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);

    doc.text("Overall Business Performance", 145, finalY + 34);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    if (profitMargin >= 50) {
      doc.setTextColor(34, 197, 94);
      doc.text("Excellent", 145, finalY + 40);
    } else if (profitMargin >= 20) {
      doc.setTextColor(245, 158, 11);
      doc.text("Good", 145, finalY + 40);
    } else {
      doc.setTextColor(239, 68, 68);
      doc.text("Needs Attention", 145, finalY + 40);
    }
    // =====================================
    // Executive Notes
    // =====================================

    const notesY = finalY + 50;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(13, 27, 62);

    doc.text("Executive Notes", 15, notesY);

    doc.setFillColor(255, 252, 243);
    doc.roundedRect(15, notesY + 5, 180, 38, 3, 3, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);

    doc.text(
      "• This report summarizes revenue, expenses and profitability based on paid invoices.",
      20,
      notesY + 16,
    );

    doc.text(
      "• Revenue values are normalized into AED for consistent financial reporting.",
      20,
      notesY + 24,
    );

    doc.text(
      "• Generated automatically from the A&M International CRM.",
      20,
      notesY + 32,
    );

    doc.text(
      "• Intended for Management, Finance Team and Founders.",
      20,
      notesY + 40,
    );

    // Position for Footer
    const footerY = notesY + 55;
    // =====================================
    // Footer Line
    // =====================================

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(15, footerY, 195, footerY);

    // =====================================
    // Footer Left
    // =====================================

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(13, 27, 62);

    doc.text("A&M International", 15, footerY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);

    doc.text("Revenue & Financial Report", 15, footerY + 13);

    // =====================================
    // Footer Center
    // =====================================

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(140);

    doc.text("Generated automatically by CRM", 105, footerY + 11, {
      align: "center",
    });

    // =====================================
    // Footer Right
    // =====================================

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(239, 68, 68);

    doc.text("CONFIDENTIAL", 195, footerY + 8, {
      align: "right",
    });

    // =====================================
    // Page Number
    // =====================================

    const totalPages = doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      doc.setFontSize(8);

      doc.setTextColor(150);

      doc.text(`Page ${i} of ${totalPages}`, 195, 290, {
        align: "right",
      });
    }

    // =====================================
    // Save PDF
    // =====================================

    doc.save(`Revenue_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };


  function openAddRevenue() {
    setEditingRev(null);
    setRevForm({ ...EMPTY_REV });
    setRevErrors({});
    setShowRev(true);
  }

  function openEditRevenue(r: any) {
    setEditingRev(r);
    setRevForm({
      description: r.description,
      amount: String(r.amount),
      category: r.category ?? "Manual Entry",
      date: r.date ?? "",
      clientName: r.clientName ?? "",
      paymentMethod: r.paymentMethod ?? "Bank Transfer",
      status: r.status ?? "received",
      notes: r.notes ?? "",
      currency: r.currency || "AED",
    });
    setRevErrors({});
    setShowRev(true);
  }

  async function saveRevenue() {
    const errors: { clientName?: string; description?: string; amount?: string } = {};
    if (!revForm.clientName || !revForm.clientName.trim()) {
      errors.clientName = "Client Name is required";
    }
    if (!revForm.description || !revForm.description.trim()) {
      errors.description = "Description is required";
    }
    if (!revForm.amount || String(revForm.amount).trim() === "") {
      errors.amount = "Amount is required";
    }
    if (Object.keys(errors).length > 0) {
      setRevErrors(errors);
      return;
    }
    setRevErrors({});
    setSaving(true);
    try {
      const payload = {
        ...revForm,
        amount: Number(revForm.amount),
      };
      if (editingRev) {
        await updateDoc(doc(db, "manual_revenue", editingRev.id), payload);
      } else {
        await addDoc(collection(db, "manual_revenue"), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }
      setShowRev(false);
      setRevForm({ ...EMPTY_REV });
      setEditingRev(null);
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function delRevenue(id: string) {
    if (!confirm("Delete this revenue entry? This cannot be undone.")) return;
    await deleteDoc(doc(db, "manual_revenue", id));
    fetchData();
  }

  const getRevStatusBadge = (statusKey: string) => {
    return REV_STATUSES.find((s) => s.key === statusKey) || REV_STATUSES[0];
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Revenue
          </h1>
          <p className="page-subtitle">
            Financial overview — Admin only · {year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openAddRevenue} className="btn-secondary" style={{ borderColor: "#22c55e", color: "#22c55e" }}>
            <span className="text-base">+</span> Add Revenue/Profit
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="btn-primary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> 
              Download Report
            </button>
            
            {showDownloadMenu && (
              <div
                className="absolute right-0 mt-2 bg-white border rounded-xl shadow-lg z-50 py-1"
                style={{ minWidth: "180px" }}
              >
                <button
                  onClick={() => {
                    downloadExcelReport();
                    setShowDownloadMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  📊 Excel Report
                </button>
                <button
                  onClick={() => {
                    downloadPDFReport();
                    setShowDownloadMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  📄 PDF Report
                </button>
              </div>
            )}
          </div>

          <button onClick={openAddExpense} className="btn-primary">
            <span className="text-base">+</span> Add Expense
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          {
            label: "Total Revenue",
            value: `AED ${totalRevenue.toLocaleString()}`,
            color: "#C9A84C",
            sub: `${paidInvoices.length} paid invoices + ${manualRev.filter((r) => r.status === "received").length} manual`,
          },
          {
            label: "Pending",
            value: `AED ${totalPending.toLocaleString()}`,
            color: "#f59e0b",
            sub: "Awaiting payment",
          },
          {
            label: "Total Expenses",
            value: `AED ${totalExpenses.toLocaleString()}`,
            color: "#ef4444",
            sub: `${expenses.length} records`,
          },
          {
            label: "Net Profit",
            value: `AED ${netProfit.toLocaleString()}`,
            color: netProfit >= 0 ? "#22c55e" : "#ef4444",
            sub: "Revenue − Expenses",
          },
          {
            label: "Profit Margin",
            value: `${profitMargin}%`,
            color: "#8b5cf6",
            sub: "Of total revenue",
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div
              className="absolute top-0 left-0 w-full h-1 rounded-t-xl"
              style={{ background: s.color }}
            />
            <p
              className="text-xs font-semibold mt-1 mb-1"
              style={{ color: "#9ca3af" }}
            >
              {s.label}
            </p>
            <p
              className="text-lg font-bold leading-tight"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
            <p className="text-xs mt-1" style={{ color: "#c4c7d0" }}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl animate-pulse"
              style={{ background: "#f0f2f8" }}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="crm-card mb-6">
            <label className="form-label font-semibold">
              Select Client Overview
            </label>
            <select
              className="form-input"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Select Client</option>
              {dbClients.filter(c => c.active !== false).map((client) => (
                <option key={client.id} value={client.company || client.name}>
                  {client.company || client.name}
                </option>
              ))}
            </select>
          </div>

          {selectedClient && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="stat-card">
                <p className="text-xs">Invoice Budget</p>

                <p className="text-lg font-bold">
                  AED {clientBudget.toLocaleString()}
                </p>
              </div>

              <div className="stat-card">
                <p className="text-xs">Paid Revenue</p>
                <p className="text-lg font-bold" style={{ color: "#22c55e" }}>
                  AED {clientPaid.toLocaleString()}
                </p>
              </div>

              <div className="stat-card">
                <p className="text-xs">Pending Due</p>
                <p className="text-lg font-bold" style={{ color: "#f59e0b" }}>
                  AED {clientPending.toLocaleString()}
                </p>
              </div>

              <div className="stat-card">
                <div>
                  <p className="text-xs">Total Invoices</p>
                  <p className="text-lg font-bold">
                    {selectedClientInvoices.length}
                  </p>
                </div>

                <div>
                  <p className="text-xs">Client Expenses</p>
                  <p className="text-lg font-bold" style={{ color: "#ef4444" }}>
                    AED {totalClientExpenses.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Monthly chart */}
          <div className="crm-card mb-6">
            <h2 className="text-sm font-bold mb-1" style={{ color: "#0D1B3E" }}>
              Monthly Revenue vs Expenses ({year})
            </h2>
            <p className="text-xs mb-5" style={{ color: "#9ca3af" }}>
              Gold = Revenue (Invoices + Manual) · Red = Expenses · Navy =
              Profit
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={monthlyData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                barGap={4}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f5"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="Revenue"
                  fill="#C9A84C"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="Expenses"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="Profit"
                  fill="#0D1B3E"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* By Client */}
            <div className="crm-card">
              <h2
                className="text-sm font-bold mb-1"
                style={{ color: "#0D1B3E" }}
              >
                Revenue by Client
              </h2>
              <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>
                From paid invoices and manual revenue
              </p>
              {clientData.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: "#9ca3af" }}>
                    No paid revenue yet
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#c4c7d0" }}>
                    Mark invoices as &quot;Paid&quot; or add received manual
                    revenue
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={clientData} dataKey="value">
                      {clientData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [
                        `AED ${v.toLocaleString()}`,
                        "Revenue",
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* By Service */}
            <div className="crm-card">
              <h2
                className="text-sm font-bold mb-1"
                style={{ color: "#0D1B3E" }}
              >
                Revenue by Service
              </h2>
              <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>
                From paid invoices only
              </p>
              {serviceData.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: "#9ca3af" }}>
                    No paid invoices yet
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={clientData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {clientData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [
                        `AED ${v.toLocaleString()}`,
                        "Revenue",
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* By Service */}
            <div className="crm-card">
              <h2
                className="text-sm font-bold mb-1"
                style={{ color: "#0D1B3E" }}
              >
                Revenue by Service
              </h2>
              <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>
                From paid invoices only
              </p>
              {serviceData.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: "#9ca3af" }}>
                    No paid invoices yet
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={serviceData}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f5"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                      }
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#374151" }}
                      width={75}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v: number) => [
                        `AED ${v.toLocaleString()}`,
                        "Revenue",
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      fill="#C9A84C"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Client revenue table */}
          {clientData.length > 0 && (
            <div className="crm-card p-0 overflow-hidden mb-6">
              <div
                className="px-5 py-4 border-b flex items-center justify-between"
                style={{ borderColor: "#f0f0f5" }}
              >
                <h2 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>
                  Revenue per Client
                </h2>
                <span
                  className="text-sm font-bold"
                  style={{ color: "#C9A84C" }}
                >
                  AED {totalRevenue.toLocaleString()}
                </span>
              </div>
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Revenue</th>
                    <th>% Share</th>
                    <th>Invoices</th>
                  </tr>
                </thead>
                <tbody>
                  {clientData.map((c, i) => (
                    <tr key={c.name}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              background: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="font-bold" style={{ color: "#C9A84C" }}>
                        AED {c.value.toLocaleString()}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-1.5 rounded-full"
                            style={{ background: "#f0f0f5" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.round((c.value / totalRevenue) * 100)}%`,
                                background: PIE_COLORS[i % PIE_COLORS.length],
                              }}
                            />
                          </div>
                          <span
                            className="text-xs font-semibold"
                            style={{ color: "#6b7280" }}
                          >
                            {Math.round((c.value / totalRevenue) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-xs" style={{ color: "#9ca3af" }}>
                        {
                          paidInvoices.filter(
                            (inv) => inv.clientName === c.name,
                          ).length
                        }{" "}
                        paid
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabs Section for Breakdown Tables */}
          <div
            className="flex border-b mb-4"
            style={{ borderColor: "#f0f0f5" }}
          >
            <button
              onClick={() => setActiveTab("expenses")}
              className={`pb-2.5 px-6 text-sm font-bold border-b-2 transition-all ${
                activeTab === "expenses"
                  ? "border-[#C9A84C] text-[#C9A84C]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Expenses Breakdown (AED {totalExpenses.toLocaleString()})
            </button>

            <button
              onClick={() => setActiveTab("manual_revenue")}
              className={`pb-2.5 px-6 text-sm font-bold border-b-2 transition-all ${
                activeTab === "manual_revenue"
                  ? "border-[#C9A84C] text-[#C9A84C]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Manual Revenue / Profit (AED {manualRevenueTotal.toLocaleString()}
              )
            </button>
          </div>

          {activeTab === "expenses" ? (
            <div className="crm-card p-0 overflow-hidden mb-6">
              <div
                className="px-5 py-4 border-b flex items-center justify-between"
                style={{ borderColor: "#f0f0f5" }}
              >
                <h2 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>
                  Expenses Breakdown
                </h2>

                <div className="flex items-center gap-3">
                  <span
                    className="text-sm font-bold"
                    style={{ color: "#ef4444" }}
                  >
                    AED {totalExpenses.toLocaleString()}
                  </span>

                  <button
                    onClick={openAddExpense}
                    className="btn-primary"
                    style={{ padding: "5px 12px", fontSize: 11 }}
                  >
                    + Add Expense
                  </button>
                </div>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: "#9ca3af" }}>
                    No expenses recorded
                  </p>

                  <button
                    onClick={openAddExpense}
                    className="btn-primary mt-3 mx-auto"
                    style={{ fontSize: 12 }}
                  >
                    + Add Expense
                  </button>
                </div>
              ) : (
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <td className="font-medium">{e.description}</td>

                        <td>
                          <span className="badge badge-draft">
                            {e.category || "—"}
                          </span>
                        </td>

                        <td className="text-sm" style={{ color: "#6b7280" }}>
                          {e.clientName || "—"}
                        </td>

                        <td className="text-xs" style={{ color: "#9ca3af" }}>
                          {e.date
                            ? new Date(e.date).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>

                        <td>
                          <div
                            className="font-bold"
                            style={{ color: "#ef4444" }}
                          >
                            {e.currency || "AED"}{" "}
                            {Number(e.amount).toLocaleString()}
                          </div>

                          {(e.currency || "AED") !== "AED" && (
                            <div
                              className="text-xs"
                              style={{ color: "#6b7280" }}
                            >
                              AED{" "}
                              {convertToAED(
                                Number(e.amount),
                                e.currency || "AED",
                              ).toFixed(2)}
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditExpense(e)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                              style={{
                                background: "#eff6ff",
                                color: "#1e40af",
                                border: "1px solid #bfdbfe",
                              }}
                            >
                              <Pencil className="inline-block w-4 h-4 shrink-0 mr-1" /> Edit
                            </button>

                            <button
                              onClick={() => delExpense(e.id)}
                              className="btn-danger"
                            >
                              <Trash2 className="inline-block w-4 h-4 shrink-0 mr-1" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* Manual revenue breakdown table */
            <div className="crm-card p-0 overflow-hidden mb-6">
              <div
                className="px-5 py-4 border-b flex items-center justify-between"
                style={{ borderColor: "#f0f0f5" }}
              >
                <h2 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>
                  Manual Revenue / Profits list
                </h2>
                <button
                  onClick={openAddRevenue}
                  className="btn-primary"
                  style={{
                    padding: "5px 12px",
                    fontSize: 11,
                    background: "#22c55e",
                  }}
                >
                  + Add Revenue
                </button>
              </div>
              {manualRev.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: "#9ca3af" }}>
                    No manual revenue entries recorded
                  </p>
                </div>
              ) : (
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Client</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualRev.map((r) => {
                      const st = getRevStatusBadge(r.status);
                      return (
                        <tr key={r.id}>
                          <td className="font-medium">{r.description}</td>
                          <td>
                            <span className="badge badge-draft">
                              {r.category || "Manual Entry"}
                            </span>
                          </td>
                          <td className="text-sm" style={{ color: "#6b7280" }}>
                            {r.clientName || "—"}
                          </td>
                          <td className="text-sm" style={{ color: "#6b7280" }}>
                            {r.paymentMethod || "Bank Transfer"}
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{ background: st.bg, color: st.color }}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="text-xs" style={{ color: "#9ca3af" }}>
                            {r.date
                              ? new Date(r.date).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td>
                            <div
                              className="font-bold"
                              style={{ color: "#22c55e" }}
                            >
                              {r.currency || "AED"}{" "}
                              {Number(r.amount).toLocaleString()}
                            </div>
                            {(r.currency || "AED") !== "AED" && (
                              <div
                                className="text-xs"
                                style={{ color: "#6b7280" }}
                              >
                                AED{" "}
                                {convertToAED(
                                  Number(r.amount),
                                  r.currency || "AED",
                                ).toFixed(2)}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditRevenue(r)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                                style={{
                                  background: "#f0fdf4",
                                  color: "#16a34a",
                                  border: "1px solid #bbf7d0",
                                }}
                              >
                                <Pencil className="inline-block w-4 h-4 shrink-0 mr-1" /> Edit
                              </button>
                              <button
                                onClick={() => delRevenue(r.id)}
                                className="btn-danger"
                              >
                                <Trash2 className="inline-block w-4 h-4 shrink-0 mr-1" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Expense Modal */}
      {showExp && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="modal-title mb-0">
                {editingExp ? "Edit Expense" : "Add Expense"}
              </h2>
              <button
                onClick={() => setShowExp(false)}
                className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="inline-block w-4 h-4 shrink-0 mr-1" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Client</label>

                <select
                  className="form-input"
                  value={expForm.clientName || ""}
                  onChange={(e) =>
                    setExpForm({
                      ...expForm,
                      clientName: e.target.value,
                    })
                  }
                >
                  <option value="">Select Client</option>
                  {dbClients.filter(c => c.active !== false).map((client) => (
                    <option key={client.id} value={client.company || client.name}>
                      {client.company || client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Description *</label>
                <input
                  className="form-input"
                  value={expForm.description}
                  onChange={(e) =>
                    setExpForm({ ...expForm, description: e.target.value })
                  }
                  placeholder="Office rent, Adobe CC, Salary..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Currency</label>

                  <select
                    className="form-input"
                    value={expForm.currency || "AED"}
                    onChange={(e) =>
                      setExpForm({
                        ...expForm,
                        currency: e.target.value,
                      })
                    }
                  >
                    <option value="AED">AED</option>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">
                    Amount ({expForm.currency || "AED"}) *
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    value={expForm.amount}
                    onChange={(e) =>
                      setExpForm({ ...expForm, amount: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={expForm.category}
                    onChange={(e) =>
                      setExpForm({ ...expForm, category: e.target.value })
                    }
                  >
                    <option value="">Select...</option>
                    {EXP_CATS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={expForm.date}
                  onChange={(e) =>
                    setExpForm({ ...expForm, date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowExp(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
              >
                Cancel
              </button>
              {editingExp && (
                <button
                  onClick={() => {
                    delExpense(editingExp.id);
                    setShowExp(false);
                  }}
                  className="btn-danger px-4"
                >
                  <Trash2 className="inline-block w-4 h-4 shrink-0 mr-1" /> Delete
                </button>
              )}
              <button
                onClick={saveExpense}
                disabled={saving}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingExp
                    ? "Update Expense"
                    : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Revenue Modal */}
      {showRev && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="modal-title mb-0">
                {editingRev ? "Edit Revenue Entry" : "Add Revenue Entry"}
              </h2>
              <button
                onClick={() => {
                  setShowRev(false);
                  setRevErrors({});
                }}
                className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="inline-block w-4 h-4 shrink-0 mr-1" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Client Name *</label>
                <select
                  className="form-input"
                  style={
                    revErrors.clientName
                      ? { borderColor: "#ef4444" }
                      : undefined
                  }
                  value={revForm.clientName || ""}
                  onChange={(e) => {
                    setRevForm({
                      ...revForm,
                      clientName: e.target.value,
                    });
                    if (revErrors.clientName) {
                      setRevErrors({ ...revErrors, clientName: undefined });
                    }
                  }}
                >
                  <option value="">-- Select Client --</option>
                  {dbClients.filter(c => c.active !== false).map((client) => (
                    <option key={client.id} value={client.company || client.name}>
                      {client.company || client.name}
                    </option>
                  ))}
                </select>
                {revErrors.clientName && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "#ef4444" }}
                  >
                    {revErrors.clientName}
                  </p>
                )}
              </div>
              <div>
                <label className="form-label">Description *</label>
                <input
                  className="form-input"
                  style={
                    revErrors.description
                      ? { borderColor: "#ef4444" }
                      : undefined
                  }
                  value={revForm.description}
                  onChange={(e) => {
                    setRevForm({ ...revForm, description: e.target.value });
                    if (revErrors.description) {
                      setRevErrors({ ...revErrors, description: undefined });
                    }
                  }}
                  placeholder="Consulting Fee, Retainer..."
                />
                {revErrors.description && (
                  <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                    {revErrors.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Currency</label>
                  <select
                    className="form-input"
                    value={revForm.currency || "AED"}
                    onChange={(e) =>
                      setRevForm({
                        ...revForm,
                        currency: e.target.value,
                      })
                    }
                  >
                    <option value="AED">AED</option>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">
                    Amount ({revForm.currency || "AED"}) *
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    style={
                      revErrors.amount ? { borderColor: "#ef4444" } : undefined
                    }
                    value={revForm.amount}
                    onChange={(e) => {
                      setRevForm({ ...revForm, amount: e.target.value });
                      if (revErrors.amount) {
                        setRevErrors({ ...revErrors, amount: undefined });
                      }
                    }}
                    placeholder="0"
                  />
                  {revErrors.amount && (
                    <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                      {revErrors.amount}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-input"
                    value={revForm.paymentMethod || "Bank Transfer"}
                    onChange={(e) =>
                      setRevForm({ ...revForm, paymentMethod: e.target.value })
                    }
                  >
                    {PAY_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={revForm.status || "received"}
                    onChange={(e) =>
                      setRevForm({ ...revForm, status: e.target.value })
                    }
                  >
                    {REV_STATUSES.map((status) => (
                      <option key={status.key} value={status.key}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={revForm.date}
                  onChange={(e) =>
                    setRevForm({ ...revForm, date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input resize-none"
                  rows={2}
                  value={revForm.notes || ""}
                  onChange={(e) =>
                    setRevForm({ ...revForm, notes: e.target.value })
                  }
                  placeholder="Additional payment details..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRev(false);
                  setRevErrors({});
                }}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
              >
                Cancel
              </button>
              {editingRev && (
                <button
                  onClick={() => {
                    delRevenue(editingRev.id);
                    setShowRev(false);
                    setRevErrors({});
                  }}
                  className="btn-danger px-4"
                >
                  <Trash2 className="inline-block w-4 h-4 shrink-0 mr-1" /> Delete
                </button>
              )}
              <button
                onClick={saveRevenue}
                disabled={saving}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingRev
                    ? "Update Revenue"
                    : "Add Revenue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
