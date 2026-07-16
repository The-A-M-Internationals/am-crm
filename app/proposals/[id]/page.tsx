"use client";
import { X, Trash2, FileText, Pencil, Check } from "lucide-react";


import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Proposal, ProposalStatus, ProposalPackage, ProposalCustomSection } from "@/types";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/sidebar";
import { getMasterTemplate } from "@/lib/proposal-templates";
import DynamicTemplate from "@/components/dynamic-template";
import { PipelineService } from "@/lib/pipeline-service";
import SignatureCanvas from "react-signature-canvas";

const STATUSES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  proposal: { label: "Proposal", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  draft:    { label: "Draft",    color: "#374151", bg: "#f3f4f6", border: "#e5e7eb" },
  sent:     { label: "Sent",     color: "#1e40af", bg: "#dbeafe", border: "#bfdbfe" },
  accepted: { label: "Accepted", color: "#065f46", bg: "#d1fae5", border: "#a7f3d0" },
  rejected: { label: "Rejected", color: "#991b1b", bg: "#fee2e2", border: "#fecaca" },
  won:      { label: "Won",      color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  lost:     { label: "Lost",     color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
};



const getServiceHeaderSubtitle = (service: string) => {
  switch (service) {
    case "digital-marketing": return "The.am.forge · Digital Marketing Division";
    case "social-media":      return "Social Media Marketing & Management";
    case "seo":               return "Search Engine Optimization Division";
    case "web-development":   return "Digital Engineering & Web Development";
    case "ui-ux":             return "User Interface & User Experience Design";
    case "branding":          return "Strategic Branding & Visual Identity";
    default:                  return "Professional Consulting & Solutions";
  }
};

const getServiceDefaultSubject = (service: string) => {
  switch (service) {
    case "digital-marketing": return "Digital Marketing Retainer & Lead Generation Proposal";
    case "social-media":      return "Social Media Marketing & Retainer Proposal";
    case "seo":               return "Search Engine Optimization & Retainer Proposal";
    case "web-development":   return "Web Development Proposal";
    case "ui-ux":             return "UI/UX Design Proposal";
    case "branding":          return "Brand Identity Design Proposal";
    default:                  return "Professional Services Proposal";
  }
};

const getServiceEngagementModel = (service: string) => {
  switch (service) {
    case "web-development":
    case "ui-ux":
    case "branding":
      return "Project-Based Engagement";
    default:
      return "Monthly Retainer — Pick & Choose Package";
  }
};

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const isClientView = searchParams.get("view") === "client";
  
  const { user } = useAuth();
  const showAsClient = !user || isClientView;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);

  // Undo/Redo History Stack
  const [history, setHistory] = useState<Proposal[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Client signature modal state
  const [showSignModal, setShowSignModal] = useState(false);
  const [signingName, setSigningName] = useState("");
  const [signingTitle, setSigningTitle] = useState("");
  const [isAgreed, setIsAgreed] = useState(false);
  const [submittingSign, setSubmittingSign] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const sigPad = useRef<any>(null);

  // Feature modals state
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setShowStatusMenu(false);
    if (showStatusMenu) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showStatusMenu]);

  useEffect(() => {
    async function fetchProposal() {
      if (!id) return;
      try {
        const docRef = doc(db, "proposals", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setError("Proposal not found.");
          return;
        }
        setProposal({ id: docSnap.id, ...docSnap.data() } as Proposal);
      } catch (err: any) {
        console.warn("Client SDK fetch failed, falling back to API:", err.message);
        try {
          const res = await fetch(`/api/proposals/${id}`);
          if (!res.ok) throw new Error("API fallback failed");
          const data = await res.json();
          setProposal(data as Proposal);
          setError(null);
        } catch (fallbackErr: any) {
          console.error("Error fetching proposal:", fallbackErr);
          setError("Failed to load proposal details. ERROR: " + (err.message || String(err)));
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProposal();
  }, [id]);

  // Auto-mark as viewed for clients
  useEffect(() => {
    if (proposal && isClientView && !proposal.viewedAt) {
      fetch(`/api/proposals/${proposal.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view" })
      }).then(res => res.json()).then(data => {
         if (data.success) {
           setProposal(p => p ? { ...p, viewedAt: new Date().toISOString() } : p);
         }
      }).catch(console.error);
    }
  }, [proposal, isClientView]);

  // Initial history load
  useEffect(() => {
    if (proposal && history.length === 0) {
      setHistory([proposal]);
      setHistoryIndex(0);
    }
  }, [proposal, history]);

  const updateProposalState = (updated: Proposal) => {
    setProposal(updated);
    setHistory(prev => {
      const clean = prev.slice(0, historyIndex + 1);
      const next = [...clean, updated];
      setHistoryIndex(next.length - 1);
      return next;
    });
  };

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditing) return;

      const isZ = e.key.toLowerCase() === 'z';
      const isY = e.key.toLowerCase() === 'y';

      if ((e.ctrlKey || e.metaKey) && isZ) {
        if (e.shiftKey) {
          // Redo via Ctrl+Shift+Z
          if (historyIndex < history.length - 1) {
            e.preventDefault();
            const nextIdx = historyIndex + 1;
            setHistoryIndex(nextIdx);
            setProposal(history[nextIdx]);
          }
        } else {
          // Undo via Ctrl+Z
          if (historyIndex > 0) {
            e.preventDefault();
            const prevIdx = historyIndex - 1;
            setHistoryIndex(prevIdx);
            setProposal(history[prevIdx]);
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && isY) {
        // Redo via Ctrl+Y
        if (historyIndex < history.length - 1) {
          e.preventDefault();
          const nextIdx = historyIndex + 1;
          setHistoryIndex(nextIdx);
          setProposal(history[nextIdx]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, historyIndex, isEditing]);

  const handleSingleLineKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  async function handleSaveChanges() {
    if (!proposal || !id) return;
    setSavingChanges(true);
    try {
      const docRef = doc(db, "proposals", id);
      const cleanedProposal = JSON.parse(JSON.stringify(proposal));
      delete cleanedProposal.id;
      
      if (cleanedProposal.status !== "accepted" && cleanedProposal.status !== "rejected") {
        cleanedProposal.status = "proposal";
      }
      
      // Update Proposal
      await updateDoc(docRef, cleanedProposal);
      
      // Sync dynamic data back to Client if linked
      if (cleanedProposal.clientId) {
        const clientRef = doc(db, "clients", cleanedProposal.clientId);
        await updateDoc(clientRef, {
          name: cleanedProposal.clientName,
          company: cleanedProposal.company || cleanedProposal.clientName,
          email: cleanedProposal.clientEmail,
          phone: cleanedProposal.phone || "",
          updatedAt: new Date().toISOString(),
        });
      }
      
      // Sync dynamic data back to Lead if linked (and not already synced to a client)
      if (cleanedProposal.fromLeadId && !cleanedProposal.clientId) {
        const leadRef = doc(db, "leads", cleanedProposal.fromLeadId);
        await updateDoc(leadRef, {
          name: cleanedProposal.clientName,
          company: cleanedProposal.company || cleanedProposal.clientName,
          email: cleanedProposal.clientEmail,
          phone: cleanedProposal.phone || "",
          updatedAt: new Date().toISOString(),
        });
      }
      
      if (proposal.status !== "accepted" && proposal.status !== "rejected" && proposal.status !== "proposal") {
        const updatedState = { ...proposal, status: "proposal" as ProposalStatus };
        setProposal(updatedState);
        setHistory(prev => [...prev.slice(0, historyIndex + 1), updatedState]);
        setHistoryIndex(prev => prev + 1);
      }
      
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving proposal changes:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSavingChanges(false);
    }
  }

  async function downloadPDF() {
    try {
      const jsPDF = (await import("jspdf")).default;
      const html2canvas = (await import("html2canvas")).default;
      const element = document.getElementById("proposal-document-area");
      if (!element) return;
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Quotation_${proposal?.clientName || "Document"}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF");
    }
  }

  async function handleSendProposal() {
    if (!proposal) return;
    setSending(true);
    try {
      const res = await fetch("/api/send-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          clientEmail: proposal.clientEmail,
          proposalData: proposal, // Send the full proposal data to the server
        }),
      });

      if (!res.ok) throw new Error("Failed to send proposal");
      
      if (proposal.status !== "accepted" && proposal.status !== "rejected") {
        await PipelineService.handleProposalStatusChange(proposal, "sent");
        const sentState = { ...proposal, status: "sent" as ProposalStatus };
        setProposal(sentState);
        setHistory(prev => [...prev.slice(0, historyIndex + 1), sentState]);
        setHistoryIndex(prev => prev + 1);
      }
      
      alert("Proposal sent successfully to" + proposal.clientEmail);
    } catch (err) {
      console.error("Error sending proposal:", err);
      alert("Error sending proposal. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteProposal() {
    if (!proposal) return;
    if (!confirm("Are you sure you want to delete this proposal? This action cannot be undone.")) return;
    try {
      await PipelineService.deleteProposal(proposal);
      router.push("/proposals");
    } catch (err) {
      console.error(err);
      alert("Failed to delete proposal.");
    }
  }

  async function handleDuplicateProposal() {
    if (!proposal) return;
    if (!confirm("Are you sure you want to duplicate this proposal?")) return;
    try {
      const { id: _, ...data } = proposal;
      const docRef = await addDoc(collection(db, "proposals"), {
        ...data,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      router.push(`/proposals/${docRef.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to duplicate proposal.");
    }
  }

  async function handleSaveFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpDate || !user) return;
    setSavingFollowUp(true);
    try {
      await addDoc(collection(db, "tasks"), {
        title: `Follow up on proposal for ${proposal?.clientName}`,
        description: followUpNote || `Follow up on proposal #${proposal?.id.slice(-8)}`,
        assignedTo: user.uid,
        assignedToName: user.displayName || user.email || "Agent",
        assignedBy: user.uid,
        clientId: proposal?.clientId || "",
        clientName: proposal?.clientName || "",
        relatedTo: proposal?.id || "",
        relatedType: "proposal",
        taskType: "follow-up",
        dueDate: followUpDate,
        priority: "high",
        status: "not-started",
        done: false,
        createdAt: new Date().toISOString(),
      });
      setShowFollowUpModal(false);
      alert("Follow-up task successfully added to your Operations Board!");
    } catch (err) {
      console.error(err);
      alert("Failed to set follow-up.");
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function handleWhatsApp() {
    if (!proposal) return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'client');
    const text = `Hi ${proposal.clientName},\n\nHere is your proposal from The A&M Internationals:\n${url.toString()}\n\nPlease let us know if you have any questions!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    
    if (proposal.status !== "accepted" && proposal.status !== "rejected") {
      try {
        await PipelineService.handleProposalStatusChange(proposal, "sent");
        const sentState = { ...proposal, status: "sent" as ProposalStatus };
        setProposal(sentState);
        setHistory(prev => [...prev.slice(0, historyIndex + 1), sentState]);
        setHistoryIndex(prev => prev + 1);
      } catch (err) {
        console.error("Failed to update status to sent:", err);
      }
    }
  }

  async function handleSignProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !signingName || !signingTitle || !isAgreed || !proposal) return;

    setSubmittingSign(true);
    try {
      const signatureData = (sigPad.current && !sigPad.current.isEmpty()) 
        ? sigPad.current.getCanvas().toDataURL("image/png") 
        : null;

      const res = await fetch(`/api/proposals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signingName,
          signingTitle,
          signatureData,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to sign proposal via API");
      }

      const { updated } = await res.json();
      const now = updated.updatedAt || new Date().toISOString();

      // Update local state so changes render immediately
      const acceptedState: Proposal = {
        ...proposal,
        status: "accepted" as ProposalStatus,
        clientSignatureName: signingName,
        clientSignatureTitle: signingTitle,
        clientSignatureImage: signatureData,
        signedAt: now,
        updatedAt: now,
      };
      
      setProposal(acceptedState);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), acceptedState]);
      setHistoryIndex(prev => prev + 1);

      setShowSignModal(false);
      alert("Proposal signed and accepted successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error signing proposal:" + (err.message || String(err)));
    } finally {
      setSubmittingSign(false);
    }
  }

  async function handleRejectProposal() {
    if (!id || !proposal) return;
    if (!confirm("Are you sure you want to reject this proposal?")) return;
    
    setSubmittingSign(true);
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to reject proposal via API");
      }

      const { updated } = await res.json();
      const now = updated.updatedAt || new Date().toISOString();

      const rejectedState: Proposal = {
        ...proposal,
        status: "rejected" as ProposalStatus,
        updatedAt: now,
      };
      
      setProposal(rejectedState);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), rejectedState]);
      setHistoryIndex(prev => prev + 1);

      setShowSignModal(false);
      alert("Proposal has been rejected.");
    } catch (err: any) {
      console.error("Error rejecting proposal:", err);
      alert("Error rejecting proposal. Please try again:" + (err.message || String(err)));
    } finally {
      setSubmittingSign(false);
    }
  }

  async function handleStatusChange(newStatus: ProposalStatus) {
    if (!proposal) return;
    setShowStatusMenu(false);
    try {
      await PipelineService.handleProposalStatusChange(proposal, newStatus);
      const updatedState = { ...proposal, status: newStatus };
      setProposal(updatedState);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), updatedState]);
      setHistoryIndex(prev => prev + 1);
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status.");
    }
  }

  if (loading) {
    return (
      <div className="p-8 animate-pulse text-sm text-gray-500 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin mb-4"></div>
        <p>Loading proposal details...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="p-8 text-sm text-gray-500">
        {error || "Proposal not found."} <Link href="/proposals" className="text-blue-600 underline">Go back</Link>
      </div>
    );
  }

  const st = STATUSES[proposal.status] || STATUSES.draft;
  const editableTextClass = isEditing
    ? "outline-none rounded transition-all hover:bg-white/10 hover:outline hover:outline-dashed hover:outline-1 hover:outline-[#C9A84C]/50 focus:bg-white/5 focus:outline focus:outline-2 focus:outline-[#C9A84C] focus:shadow-sm px-1 py-0.5"
    : "";

  let mainContent = (
    <div className="p-8 bg-[#f8fafc] min-h-screen">
      {/* Top Bar with Breadcrumbs & CRM Access */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-6 border-b border-slate-200/50 pb-4">
        {user ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/proposals" className="hover:text-[#0D1B3E] transition-colors">Proposals</Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">{proposal.clientName}</span>
          </div>
        ) : (
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
            A&M CRM Quotation System
          </div>
        )}
        
        {user && (
          <Link 
            href="/proposals"
            className="text-xs bg-[#0D1B3E] text-white px-4 py-2 rounded-xl font-bold uppercase tracking-wider hover:bg-[#1a3070] transition-all shadow-sm select-none"
          >
            ← Back to Proposals
          </Link>
        )}
      </div>

      {/* Sales Command Center Header (Internal Users Only) */}
      {!showAsClient && (
        <div className="max-w-7xl mx-auto mb-8 bg-white border border-slate-200 rounded-3xl shadow-sm font-sans">
          {/* Top Info Bar */}
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h1 className="text-2xl font-black text-[#0D1B3E] tracking-tight">{proposal.clientName} Proposal</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-sm" style={{ background: st.bg, color: st.color, borderColor: st.border }}>{st.label}</span>
                <span className="text-sm font-bold text-slate-600">{proposal.currency || "AED"} {proposal.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-sm text-slate-300">|</span>
                <span className="text-sm font-medium text-slate-500">Created {new Date(proposal.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Prominent Action Bar */}
            <div className="flex flex-wrap items-center gap-2">
               <button onClick={handleSendProposal} disabled={sending} className="btn-primary py-2.5 px-5 shadow-md flex items-center gap-2 rounded-xl text-sm hover:-translate-y-0.5 transition-transform">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                 {sending ? "Sending..." : "Send Proposal"}
               </button>
               <button onClick={downloadPDF} className="bg-white border-2 border-slate-200 hover:bg-slate-50 py-2.5 px-4 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 shadow-sm transition-colors">
                 Download PDF
               </button>
               
               <div className="relative">
                 <button onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }} className="bg-white border-2 border-slate-200 hover:bg-slate-50 py-2.5 px-3 rounded-xl text-slate-600 flex items-center gap-1 shadow-sm transition-colors">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                 </button>
                 {showStatusMenu && (
                   <div className="absolute right-0 top-14 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl w-64 py-2 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                     <button onClick={() => { setIsEditing(!isEditing); setShowStatusMenu(false); }} className="w-full text-left px-5 py-3 text-sm hover:bg-slate-50 flex items-center gap-3 font-semibold text-slate-700 transition-colors">
                       <span className="text-lg opacity-70"><Pencil className="inline-block w-4 h-4 shrink-0 mr-1" /></span> {isEditing ? "Exit Edit Mode" : "Edit Details"}
                     </button>
                     <button onClick={() => { setShowFollowUpModal(true); setShowStatusMenu(false); }} className="w-full text-left px-5 py-3 text-sm hover:bg-amber-50 flex items-center gap-3 font-semibold text-amber-700 transition-colors">
                       <span className="text-lg">⏰</span> Add Follow-up
                     </button>
                     <div className="border-t border-slate-100 my-1" />
                     <button onClick={() => { handleStatusChange("accepted"); setShowStatusMenu(false); }} className="w-full text-left px-5 py-3 text-sm hover:bg-emerald-50 flex items-center gap-3 font-bold text-emerald-700 transition-colors">
                       <span className="text-lg"><Check className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Mark as Accepted
                     </button>
                     <button onClick={() => { handleStatusChange("rejected"); setShowStatusMenu(false); }} className="w-full text-left px-5 py-3 text-sm hover:bg-red-50 flex items-center gap-3 font-bold text-red-700 transition-colors">
                       <span className="text-lg"><X className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Mark as Rejected
                     </button>
                     <div className="border-t border-slate-100 my-1" />
                     <button onClick={() => { handleDuplicateProposal(); setShowStatusMenu(false); }} className="w-full text-left px-5 py-3 text-sm hover:bg-slate-50 flex items-center gap-3 font-semibold text-slate-700 transition-colors">
                       <span className="text-lg opacity-70"><FileText className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Duplicate Proposal
                     </button>
                     <div className="border-t border-slate-100 my-1" />
                     <button onClick={() => { handleDeleteProposal(); setShowStatusMenu(false); }} className="w-full text-left px-5 py-3 text-sm hover:bg-red-50 flex items-center gap-3 font-bold text-red-700 transition-colors">
                       <span className="text-lg"><Trash2 className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Delete Proposal
                     </button>
                   </div>
                 )}
               </div>
            </div>
          </div>
          
          {/* Dashboard Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            
            {/* Next Best Action */}
            <div className="p-6 bg-blue-50/40 relative">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                Next Best Action
              </h3>
              {proposal.status === "draft" || proposal.status === "proposal" ? (
                <div>
                  <p className="text-base font-bold text-slate-900 mb-1">Send to Client</p>
                  <p className="text-sm text-slate-500 mb-4 leading-relaxed">This proposal is ready. Send it to {proposal.clientName} to start the negotiation process.</p>
                  <button onClick={handleSendProposal} disabled={sending} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto">
                    {sending ? "Sending..." : "Send Now"}
                  </button>
                </div>
              ) : proposal.status === "sent" ? (
                <div>
                  <p className="text-base font-bold text-slate-900 mb-1">Follow up on Proposal</p>
                  <p className="text-sm text-slate-500 mb-4 leading-relaxed">It&apos;s been sent. Set a reminder to follow up in 2 days to maintain momentum.</p>
                  <button onClick={() => setShowFollowUpModal(true)} className="text-sm bg-amber-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-sm w-full sm:w-auto">
                    Set Follow-up
                  </button>
                </div>
              ) : proposal.status === "accepted" ? (
                <div>
                  <p className="text-base font-bold text-slate-900 mb-1">Start Onboarding</p>
                  <p className="text-sm text-slate-500 mb-4 leading-relaxed">Client has signed. Move them to the onboarding phase and initiate the project.</p>
                  <button onClick={async () => {
                    if (proposal.clientId) {
                      router.push(`/clients/${proposal.clientId}`);
                    } else if (proposal.clientEmail) {
                      const snap = await getDocs(query(collection(db, "clients"), where("email", "==", proposal.clientEmail.trim().toLowerCase())));
                      if (!snap.empty) {
                        router.push(`/clients/${snap.docs[0].id}`);
                      } else {
                        router.push(`/clients`);
                      }
                    } else {
                      router.push(`/clients`);
                    }
                  }} className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm w-full sm:w-auto">
                    View Client Profile
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-4 opacity-70">
                  <p className="text-base font-bold text-slate-700 mb-1">Archived</p>
                  <p className="text-sm text-slate-500">This proposal is no longer active.</p>
                </div>
              )}
            </div>
            
            {/* Engagement / Activity */}
            <div className="p-6 bg-white">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">Engagement Activity</h3>
              <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
                
                {/* Created Node */}
                <div className="relative">
                  <div className="absolute -left-6 top-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-slate-300 ring-2 ring-white z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-slate-900">Draft Created</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(proposal.createdAt).toLocaleDateString('en-GB')} • {new Date(proposal.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>

                {/* Sent Node */}
                {proposal.status !== "draft" && proposal.status !== "proposal" && (
                  <div className="relative">
                    <div className="absolute -left-6 top-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-blue-400 shadow-sm ring-2 ring-white z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-slate-900">Sent to Client</div>
                        {!proposal.sentAt && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Delivered</span>
                        )}
                      </div>
                      {proposal.sentAt && (
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(proposal.sentAt).toLocaleDateString('en-GB')} • {new Date(proposal.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Viewed Node */}
                {proposal.viewedAt && (
                  <div className="relative">
                    <div className="absolute -left-6 top-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-purple-400 shadow-sm ring-2 ring-white z-10">
                      <svg className="w-2.5 h-2.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-slate-900">Opened by Client</div>
                        <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">Viewed</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(proposal.viewedAt).toLocaleDateString('en-GB')} • {new Date(proposal.viewedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Signed Node */}
                {proposal.status === "accepted" && (
                  <div className="relative">
                    <div className="absolute -left-6 top-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-emerald-500 shadow-sm ring-2 ring-white z-10">
                      <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-slate-900">Proposal Signed</div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Approved</span>
                      </div>
                      {proposal.signedAt && (
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(proposal.signedAt).toLocaleDateString('en-GB')} • {new Date(proposal.signedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Internal Notes / Version History */}
            <div className="p-6 bg-slate-50/50 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Internal Notes</h3>
                <span className="text-[10px] font-bold bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-md text-slate-500">v{history.length}</span>
              </div>
              <textarea 
                className="w-full flex-1 min-h-[100px] p-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none bg-white shadow-sm transition-all"
                placeholder="Add private team notes or mentions here..."
                defaultValue={proposal.notes || ""}
                onBlur={(e) => updateProposalState({...proposal, notes: e.target.value})}
              ></textarea>
              <div className="mt-4 flex justify-between items-center">
                <button className="text-xs font-bold text-slate-500 hover:text-[#0D1B3E] transition-colors flex items-center gap-1" onClick={() => setShowHistoryModal(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Version History
                </button>
                {isEditing && (
                  <button 
                    onClick={handleSaveChanges}
                    disabled={savingChanges}
                    className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {savingChanges ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Editing Controls Bar (Visible only when editing) */}
          {isEditing && (
            <div className="bg-emerald-50 border-t border-emerald-100 p-3 flex justify-between items-center px-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Edit Mode Active
                </span>
                <span className="text-xs text-emerald-600/70 ml-2 hidden sm:block">Click on any text in the document below to edit it directly.</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { if (historyIndex > 0) { const prevIdx = historyIndex - 1; setHistoryIndex(prevIdx); setProposal(history[prevIdx]); } }} disabled={historyIndex <= 0} className="px-3 py-1.5 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-bold text-emerald-800 shadow-sm" title="Undo (Ctrl+Z)">↩ Undo</button>
                <button onClick={() => { if (historyIndex < history.length - 1) { const nextIdx = historyIndex + 1; setHistoryIndex(nextIdx); setProposal(history[nextIdx]); } }} disabled={historyIndex >= history.length - 1} className="px-3 py-1.5 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-bold text-emerald-800 shadow-sm" title="Redo (Ctrl+Y)">↪ Redo</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* If it's the client view, show a simpler header */}
      {showAsClient && (
        <div className="max-w-7xl mx-auto mb-8 bg-white border border-slate-200 rounded-3xl shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C9A84C] block mb-1">Proposal For</span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{proposal.clientName}</h1>
          </div>
          <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto">
            {proposal.status !== "accepted" && proposal.status !== "won" && proposal.status !== "rejected" ? (
              <>
                <button 
                  onClick={() => setShowSignModal(true)}
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-[#0D1B3E] text-white font-bold text-sm hover:bg-[#1a3070] transition-all shadow-lg shadow-[#0D1B3E]/20"
                >
                  Sign & Accept Proposal
                </button>
                <button onClick={downloadPDF} className="w-full md:w-auto px-6 py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all">
                  Download PDF
                </button>
              </>
            ) : proposal.status === "rejected" ? (
              <div className="px-6 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold text-sm flex items-center gap-2">
                <span className="text-lg"><X className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Proposal Declined
              </div>
            ) : (
              <div className="px-6 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center gap-2">
                <span className="text-lg"><Check className="inline-block w-4 h-4 shrink-0 mr-1" /></span> Signed & Accepted
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Document Content */}
      <div id="proposal-document-area" className="bg-white border border-[#CCCCCC] rounded-[3rem] shadow-xl relative overflow-hidden max-w-7xl mx-auto font-sans text-[#222222]">
        
        {/* Cover Page */}
        <div className="bg-[#0D1B3E] text-white p-12 lg:p-20 min-h-[920px] flex flex-col justify-between relative overflow-hidden">
          {/* Background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-24 -mt-24 select-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-32 -mb-32 select-none"></div>
          
          <div className="relative z-10 space-y-16">
            {/* Brand Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div 
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onKeyDown={handleSingleLineKeyDown}
                  onBlur={(e) => updateProposalState({ ...proposal, companyHeaderTitle: e.target.innerText })}
                  className={`text-sm font-black tracking-widest text-[#C9A84C] min-w-[200px] ${editableTextClass}`}
                >
                  {proposal.companyHeaderTitle || "THE A&M INTERNATIONALS"}
                </div>
                <div 
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onKeyDown={handleSingleLineKeyDown}
                  onBlur={(e) => updateProposalState({ ...proposal, companyHeaderSubtitle: e.target.innerText })}
                  className={`text-[10px] text-slate-400 font-bold uppercase tracking-widest block min-w-[200px] ${editableTextClass}`}
                >
                  {proposal.companyHeaderSubtitle || getServiceHeaderSubtitle(proposal.service)}
                </div>
              </div>
              <div 
                contentEditable={isEditing}
                suppressContentEditableWarning
                onKeyDown={handleSingleLineKeyDown}
                onBlur={(e) => updateProposalState({ ...proposal, documentTypeLabel: e.target.innerText })}
                className={`text-2xl font-black text-[#C9A84C] tracking-tighter ${editableTextClass}`}
              >
                {proposal.documentTypeLabel || "QUOTATION"}
              </div>
            </div>

            {/* Cover Title / Subject */}
            <div className="pt-20">
              <div 
                contentEditable={isEditing}
                suppressContentEditableWarning
                onKeyDown={handleSingleLineKeyDown}
                onBlur={(e) => updateProposalState({ ...proposal, subject: e.target.innerText })}
                className={`text-4xl lg:text-6xl font-black font-playfair text-white tracking-tight leading-tight min-h-[1.5em] ${editableTextClass}`}
              >
                {proposal.subject || getServiceDefaultSubject(proposal.service)}
              </div>
            </div>
          </div>

          {/* Metainfo block */}
          <div className="relative z-10 grid grid-cols-2 gap-8 pt-12 border-t border-white/10 text-sm select-none">
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prepared For</span>
                <div 
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onKeyDown={handleSingleLineKeyDown}
                  onBlur={(e) => updateProposalState({ ...proposal, clientName: e.target.innerText })}
                  className={`font-semibold text-white ${editableTextClass}`}
                >
                  {proposal.clientName}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prepared By</span>
                <div 
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onKeyDown={handleSingleLineKeyDown}
                  onBlur={(e) => updateProposalState({ ...proposal, preparedByLabel: e.target.innerText })}
                  className={`font-semibold text-white ${editableTextClass}`}
                >
                  {proposal.preparedByLabel || "The A&M Internationals (FZC) — The.am.forge"}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Document Reference</span>
                <div className="font-semibold text-[#C9A84C]">#{proposal.id.slice(-8).toUpperCase()}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date of Issue</span>
                <div className="font-semibold text-white">
                  {new Date(proposal.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Validity</span>
                <div 
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onKeyDown={handleSingleLineKeyDown}
                  onBlur={(e) => updateProposalState({ ...proposal, validityLabel: e.target.innerText })}
                  className={`font-semibold text-white ${editableTextClass}`}
                >
                  {proposal.validityLabel || "30 days from date of issue"}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Engagement Model</span>
                <div 
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onKeyDown={handleSingleLineKeyDown}
                  onBlur={(e) => updateProposalState({ ...proposal, engagementModelLabel: e.target.innerText })}
                  className={`font-semibold text-white ${editableTextClass}`}
                >
                  {proposal.engagementModelLabel || getServiceEngagementModel(proposal.service)}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Proposal Currency</span>
                <div 
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onKeyDown={handleSingleLineKeyDown}
                  onBlur={(e) => updateProposalState({ ...proposal, currency: e.target.innerText })}
                  className={`font-semibold text-white ${editableTextClass}`}
                >
                  {proposal.currency || "AED"}
                </div>
              </div>
            </div>
          </div>

          {/* Tagline Footer */}
          <div className="relative z-10 text-center pt-8 select-none">
            <div 
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => updateProposalState({ ...proposal, tagline: e.target.innerText })}
              className={`text-xs text-[#C9A84C] font-serif italic tracking-widest ${editableTextClass}`}
            >
              {proposal.tagline || "“ Elevating the World, Elegantly ”"}
            </div>
          </div>
        </div>

        {/* Content Pages (White Background) */}
        <div className="bg-white p-12 lg:p-20 space-y-16">
          {/* Running Header */}
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase border-b border-[#CCCCCC] pb-4 select-none">
            <span>{proposal.companyHeaderTitle || "THE A&M INTERNATIONALS"}</span>
            <span>Quotation</span>
            <span>{proposal.clientName}</span>
          </div>

          <DynamicTemplate 
            proposal={proposal} 
            isEditing={isEditing} 
            onChange={(updated) => updateProposalState(updated)} 
          />
        </div>
      </div>

      {/* Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 select-none">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden transform transition-all scale-100">
            <div className="bg-[#0D1B3E] p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black tracking-tight">Review & Sign Proposal</h3>
                <p className="text-xs text-[#C9A84C] font-semibold mt-0.5 font-sans">The A&M Internationals FZC</p>
              </div>
              <button 
                onClick={() => setShowSignModal(false)}
                className="text-slate-400 hover:text-white transition-colors text-xl font-bold"
              >
                <X className="inline-block w-4 h-4 shrink-0 mr-1" />
              </button>
            </div>
            
            <form onSubmit={handleSignProposal} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Your Full Name</label>
                <input 
                  type="text" 
                  required
                  value={signingName}
                  onChange={(e) => setSigningName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0D1B3E]/20 focus:border-[#0D1B3E] font-medium text-slate-800 transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Your Title / Designation</label>
                <input 
                  type="text" 
                  required
                  value={signingTitle}
                  onChange={(e) => setSigningTitle(e.target.value)}
                  placeholder="Managing Director"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0D1B3E]/20 focus:border-[#0D1B3E] font-medium text-slate-800 transition-all text-sm"
                />
              </div>

              {/* Signature Canvas */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                  <span>Draw Your Signature</span>
                  <button type="button" onClick={() => sigPad.current?.clear()} className="text-[10px] text-red-500 hover:text-red-700">Clear</button>
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
                  <SignatureCanvas 
                    ref={sigPad}
                    penColor="navy"
                    canvasProps={{ className: "w-full h-40 cursor-crosshair" }}
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox"
                  required
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-[#0D1B3E] focus:ring-[#0D1B3E] border-slate-300"
                />
                <span className="text-xs text-slate-500 leading-relaxed select-none group-hover:text-slate-700 transition-colors">
                  I accept and agree that this is a legally binding electronic signature. By signing, I authorize execution of the services outlined in this proposal.
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={handleRejectProposal}
                  disabled={submittingSign}
                  className="w-1/3 py-3 rounded-xl border border-red-200 text-red-600 font-bold text-xs uppercase tracking-wider hover:bg-red-50 transition-all"
                >
                  Decline / Reject
                </button>
                <button 
                  type="submit" 
                  disabled={!isAgreed || !signingName || !signingTitle || submittingSign}
                  className="w-2/3 py-3 rounded-xl bg-[#0D1B3E] text-[#C9A84C] font-black text-xs uppercase tracking-wider hover:bg-[#1a3070] transition-all shadow-lg shadow-[#0D1B3E]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingSign ? "Processing..." : "Sign & Accept"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow Up Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 select-none">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-amber-500 p-5 text-white flex justify-between items-center">
              <h3 className="text-lg font-black tracking-tight">Set Follow-up</h3>
              <button onClick={() => setShowFollowUpModal(false)} className="text-amber-100 hover:text-white text-xl font-bold"><X className="inline-block w-4 h-4 shrink-0 mr-1" /></button>
            </div>
            <form onSubmit={handleSaveFollowUp} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Due Date</label>
                <input 
                  type="date" 
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes (Optional)</label>
                <textarea 
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Ask about the pricing..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-medium h-24 resize-none"
                />
              </div>
              <button 
                type="submit" 
                disabled={savingFollowUp || !followUpDate}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-black text-xs uppercase tracking-wider hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {savingFollowUp ? "Saving..." : "Save Reminder"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 select-none">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden max-h-[80vh] flex flex-col">
            <div className="bg-[#0D1B3E] p-5 text-white flex justify-between items-center shrink-0">
              <h3 className="text-lg font-black tracking-tight">Version History</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white text-xl font-bold"><X className="inline-block w-4 h-4 shrink-0 mr-1" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {history.map((h, i) => (
                <div key={i} className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${i === historyIndex ? "border-[#C9A84C] bg-amber-50/30" : "border-slate-100 bg-slate-50 hover:border-slate-300"}`} onClick={() => { setHistoryIndex(i); setProposal(h); setShowHistoryModal(false); }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-black text-slate-800">Version {i + 1} {i === historyIndex && "(Current)"}</span>
                    <span className="text-xs font-bold text-slate-400">{new Date(h.updatedAt || h.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex gap-2 flex-wrap">
                    <span className="bg-white px-2 py-1 rounded shadow-sm border border-slate-200">Total: {h.currency || "AED"} {h.total?.toLocaleString()}</span>
                    <span className="bg-white px-2 py-1 rounded shadow-sm border border-slate-200">Status: {h.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );

  if (!showAsClient) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: "#f0f2f8" }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {mainContent}
        </main>
      </div>
    );
  }

  return mainContent;
}
