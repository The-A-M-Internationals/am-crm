"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
        const res = await fetch(`/api/proposals/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Proposal not found.");
          } else {
            throw new Error("Failed to fetch proposal details");
          }
          return;
        }
        const data = await res.json();
        setProposal(data as Proposal);
      } catch (err) {
        console.error("Error fetching proposal:", err);
        setError("Failed to load proposal details.");
      } finally {
        setLoading(false);
      }
    }
    fetchProposal();
  }, [id]);

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
      
      await updateDoc(docRef, cleanedProposal);
      
      if (proposal.status !== "accepted" && proposal.status !== "rejected" && proposal.status !== "proposal") {
        const updatedState = { ...proposal, status: "proposal" as ProposalStatus };
        setProposal(updatedState);
        setHistory(prev => [...prev.slice(0, historyIndex + 1), updatedState]);
        setHistoryIndex(prev => prev + 1);
      }
      
      alert("Changes saved successfully!");
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
      
      alert("Proposal sent successfully to " + proposal.clientEmail);
    } catch (err) {
      console.error("Error sending proposal:", err);
      alert("Error sending proposal. Please try again.");
    } finally {
      setSending(false);
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
    if (!id || !signingName || !signingTitle || !isAgreed) return;

    setSubmittingSign(true);
    try {
      const signatureData = (sigPad.current && !sigPad.current.isEmpty()) 
        ? sigPad.current.getCanvas().toDataURL("image/png") 
        : null;

      const res = await fetch("/api/accept-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: id,
          clientSignatureName: signingName,
          clientSignatureTitle: signingTitle,
          clientSignatureImage: signatureData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to sign proposal");
      }

      if (!proposal) throw new Error("Proposal not loaded");

      // Update local state so changes render immediately
      const acceptedState: Proposal = {
        ...proposal,
        status: "accepted" as ProposalStatus,
        clientSignatureName: signingName,
        clientSignatureTitle: signingTitle,
        clientSignatureImage: signatureData,
        signedAt: new Date().toISOString(),
      };
      
      setProposal(acceptedState);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), acceptedState]);
      setHistoryIndex(prev => prev + 1);

      setShowSignModal(false);
      alert("Proposal signed and accepted successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error signing proposal: " + (err.message || String(err)));
    } finally {
      setSubmittingSign(false);
    }
  }

  async function handleRejectProposal() {
    if (!id) return;
    if (!confirm("Are you sure you want to reject this proposal?")) return;
    
    setSubmittingSign(true);
    try {
      const res = await fetch("/api/reject-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id }),
      });

      if (!res.ok) throw new Error("Failed to reject proposal");

      if (!proposal) throw new Error("Proposal not loaded");

      const rejectedState: Proposal = {
        ...proposal,
        status: "rejected" as ProposalStatus,
      };
      
      setProposal(rejectedState);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), rejectedState]);
      setHistoryIndex(prev => prev + 1);

      setShowSignModal(false);
      alert("Proposal has been rejected.");
    } catch (err) {
      console.error("Error rejecting proposal:", err);
      alert("Error rejecting proposal. Please try again.");
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

      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
        <div className="flex items-center gap-3 mb-2 relative">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{proposal.clientName}</h1>
            <span className="badge rounded-full px-4 py-1 text-xs font-bold flex items-center shadow-sm select-none" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
              {st.label}
            </span>
            {!showAsClient && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSendProposal(); }}
                  className="px-4 py-1 bg-[#0D1B3E] text-white text-xs font-bold rounded-full hover:bg-[#1a3070] transition-colors shadow-sm select-none"
                >
                  ✉ Send Proposal
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); }}
                  className="px-4 py-1 bg-[#0D1B3E] text-white text-xs font-bold rounded-full hover:bg-[#1a3070] transition-colors flex items-center gap-2 shadow-sm select-none"
                >
                  Actions ▼
                </button>
              </>
            )}
            {showStatusMenu && !showAsClient && (
              <div className="absolute left-[calc(100%+0.5rem)] top-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-56 py-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setIsEditing(false); setShowStatusMenu(false); }} className="w-full text-left px-5 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 font-semibold text-slate-700 transition-colors">
                  <span className="text-lg">👁</span> View Proposal
                </button>
                <button onClick={() => { setIsEditing(true); setShowStatusMenu(false); }} className="w-full text-left px-5 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 font-semibold text-slate-700 transition-colors">
                  <span className="text-lg">✏️</span> Edit Proposal
                </button>
                <button onClick={() => { downloadPDF(); setShowStatusMenu(false); }} className="w-full text-left px-5 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 font-semibold text-slate-700 transition-colors">
                  <span className="text-lg">⬇️</span> Download PDF
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button onClick={() => { handleRejectProposal(); setShowStatusMenu(false); }} className="w-full text-left px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-bold transition-colors">
                  <span className="text-lg">🗑️</span> Delete Proposal
                </button>
              </div>
            )}
          </div>
        
        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
          {isEditing && (
            <div className="flex items-center gap-2 mr-2 select-none">
              <button
                onClick={() => {
                  if (historyIndex > 0) {
                    const prevIdx = historyIndex - 1;
                    setHistoryIndex(prevIdx);
                    setProposal(history[prevIdx]);
                  }
                }}
                disabled={historyIndex <= 0}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                title="Undo (Ctrl+Z)"
              >
                ↩ Undo
              </button>
              <button
                onClick={() => {
                  if (historyIndex < history.length - 1) {
                    const nextIdx = historyIndex + 1;
                    setHistoryIndex(nextIdx);
                    setProposal(history[nextIdx]);
                  }
                }}
                disabled={historyIndex >= history.length - 1}
                className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                title="Redo (Ctrl+Y)"
              >
                ↪ Redo
              </button>
            </div>
          )}

          {!showAsClient && isEditing && (
            <button 
              onClick={handleSaveChanges}
              disabled={savingChanges}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed select-none"
            >
              {savingChanges ? "Saving..." : "Save Changes"}
            </button>
          )}
          
          {showAsClient && (proposal.status !== "accepted" && proposal.status !== "won" ? (
            <button 
              onClick={() => setShowSignModal(true)}
              className="flex-1 sm:flex-initial px-8 py-4 rounded-2xl bg-[#0D1B3E] text-[#C9A84C] font-black text-xs uppercase tracking-widest hover:bg-[#1a3070] transition-all shadow-lg shadow-[#0D1B3E]/20 select-none"
            >
              Sign & Accept Proposal
            </button>
          ) : (
            <div className="px-6 py-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs uppercase tracking-widest flex items-center gap-2 select-none">
              <span className="text-base">✓</span> Signed & Accepted
            </div>
          ))}
        </div>
      </div>

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
                ✕
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
                  className="w-1/3 py-3 rounded-xl border border-red-200 text-red-600 font-bold text-xs uppercase tracking-wider hover:bg-red-50 transition-all text-xs"
                >
                  Decline / Reject
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowSignModal(false)}
                  className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingSign || !isAgreed || !signingName || !signingTitle}
                  className="w-1/3 py-3 rounded-xl bg-[#0D1B3E] text-[#C9A84C] font-black text-xs uppercase tracking-wider hover:bg-[#1a3070] transition-all shadow-md shadow-[#0D1B3E]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingSign ? "Signing..." : "Sign Agreement"}
                </button>
              </div>
            </form>
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
