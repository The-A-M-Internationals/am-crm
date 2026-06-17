"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Proposal, ProposalStatus } from "@/types";
import Link from "next/link";

const STATUSES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  proposal: { label: "Proposal", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  draft:    { label: "Draft",    color: "#374151", bg: "#f3f4f6", border: "#e5e7eb" },
  sent:     { label: "Sent",     color: "#1e40af", bg: "#dbeafe", border: "#bfdbfe" },
  accepted: { label: "Accepted", color: "#065f46", bg: "#d1fae5", border: "#a7f3d0" },
  rejected: { label: "Rejected", color: "#991b1b", bg: "#fee2e2", border: "#fecaca" },
  won:      { label: "Won",      color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  lost:     { label: "Lost",     color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
};

function DynamicTemplate({ proposal }: { proposal: Proposal }) {
  if (!proposal.isRichDocument) return null; // Safety fallback, though all are rich now

  return (
    <div className="space-y-16 pt-8">
      {/* 1. About The A&M Internationals */}
      <section>
        <h3 className="text-xl font-black text-slate-900 mb-4 border-b-2 border-[#0D1B3E] pb-2">1. About The A&M Internationals</h3>
        <p className="text-sm text-slate-600 leading-relaxed text-justify">{proposal.introduction}</p>
      </section>

      {/* 2. Our Understanding */}
      {proposal.understanding && proposal.understanding.length > 0 && (
        <section>
          <h3 className="text-xl font-black text-slate-900 mb-4 border-b-2 border-[#0D1B3E] pb-2">2. Our Understanding of {proposal.clientName}</h3>
          <ul className="list-disc pl-5 space-y-3">
            {proposal.understanding.map((point, i) => (
              <li key={i} className="text-sm text-slate-600 leading-relaxed text-justify">{point}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 3. Objective */}
      {proposal.objectives && proposal.objectives.length > 0 && (
        <section>
          <h3 className="text-xl font-black text-slate-900 mb-4 border-b-2 border-[#0D1B3E] pb-2">3. Objective of This Engagement</h3>
          <ul className="list-disc pl-5 space-y-3">
            {proposal.objectives.map((point, i) => (
              <li key={i} className="text-sm text-slate-600 leading-relaxed text-justify">{point}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. Our Approach */}
      {proposal.approachTitle && (
        <section>
          <h3 className="text-xl font-black text-slate-900 mb-4 border-b-2 border-[#0D1B3E] pb-2">4. {proposal.approachTitle}</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 text-justify">{proposal.approachDescription}</p>
          {proposal.approachFeatures && (
            <div>
              <p className="font-bold text-sm text-slate-900 mb-3">What&apos;s Included in Every Package</p>
              <ul className="list-disc pl-5 space-y-3">
                {proposal.approachFeatures.map((feat, i) => (
                  <li key={i} className="text-sm text-slate-600 leading-relaxed text-justify">{feat}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 5. Packages Table */}
      {proposal.packages && proposal.packages.length > 0 && (
        <section>
          <h3 className="text-xl font-black text-slate-900 mb-4 border-b-2 border-[#0D1B3E] pb-2">5. Packages — Pick What Fits</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 text-justify">
            All packages are designed specifically for your goals. The difference between them is the scale of activity, the recommended ad spend, and consequently the expected volume. Ad spend is shown transparently and is paid in addition to A&amp;M&apos;s management fee.
          </p>
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#0D1B3E] text-white">
                  <th className="p-4 border-r border-white/20 font-bold w-1/4">Component</th>
                  {proposal.packages.map((pkg, i) => (
                    <th key={i} className={`p-4 border-r border-white/20 font-bold text-center ${pkg.recommended ? "bg-[#C9A84C]" : ""}`}>
                      {pkg.name} {pkg.recommended && "★"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50">
                  <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">Best For</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className="p-4 text-center text-slate-600 border-r border-slate-200">{pkg.bestFor}</td>)}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">Active Campaigns</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className="p-4 text-center text-slate-600 border-r border-slate-200">{pkg.activeCampaigns}</td>)}
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">Ad Creatives / Month</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className="p-4 text-center text-slate-600 border-r border-slate-200">{pkg.adCreatives}</td>)}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">Audience Optimisation</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className="p-4 text-center text-slate-600 border-r border-slate-200">{pkg.optimisation}</td>)}
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">A/B Creative Testing</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className="p-4 text-center text-slate-600 border-r border-slate-200">{pkg.abTesting}</td>)}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">Recommended Ad Spend</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className="p-4 text-center text-slate-600 border-r border-slate-200">{proposal.currency || "AED"} {pkg.recommendedSpend.toLocaleString()}</td>)}
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">A&M Management Fee</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className="p-4 text-center text-slate-600 border-r border-slate-200">{proposal.currency || "AED"} {pkg.managementFee.toLocaleString()}</td>)}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">Review Call</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className="p-4 text-center text-slate-600 border-r border-slate-200">{pkg.reviewCall}</td>)}
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">Reporting Cadence</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className="p-4 text-center text-slate-600 border-r border-slate-200">{pkg.reporting}</td>)}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">Estimated Leads / Month</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className="p-4 text-center text-slate-600 border-r border-slate-200">{pkg.estimatedLeads}</td>)}
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">Estimated Cost / Lead</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className="p-4 text-center text-slate-600 border-r border-slate-200">{pkg.estimatedCostPerLead}</td>)}
                </tr>
                <tr className="bg-[#0D1B3E] text-white">
                  <td className="p-4 font-bold border-r border-white/20">TOTAL MONTHLY</td>
                  {proposal.packages.map((pkg, i) => <td key={i} className={`p-4 text-center font-bold border-r border-white/20 ${pkg.recommended ? "bg-[#C9A84C]" : ""}`}>{proposal.currency || "AED"} {(pkg.recommendedSpend + pkg.managementFee).toLocaleString()}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
          {proposal.packages.some(p => p.recommended) && (
            <p className="text-xs text-slate-500 italic mt-4">★ Recommended package for {proposal.clientName} given the current objectives. It offers the best balance of scale and cost efficiency.</p>
          )}
        </section>
      )}

      {/* 6. Video Production Add-ons */}
      {proposal.addons && proposal.addons.length > 0 && (
        <section>
          <h3 className="text-xl font-black text-slate-900 mb-4 border-b-2 border-[#0D1B3E] pb-2">6. Optional Add-Ons</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 text-justify">
            These add-ons are offered separately so they can be scaled up or down independently of the main campaign.
          </p>
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#0D1B3E] text-white">
                  <th className="p-4 border-r border-white/20 font-bold w-1/4">Add-On Package</th>
                  <th className="p-4 border-r border-white/20 font-bold w-1/2">Deliverables</th>
                  <th className="p-4 font-bold text-center">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {proposal.addons.map((addon, i) => (
                  <tr key={i} className="bg-slate-50">
                    <td className="p-4 font-bold text-slate-900 border-r border-slate-200">{addon.name}</td>
                    <td className="p-4 text-slate-600 border-r border-slate-200">{addon.deliverables}</td>
                    <td className="p-4 text-center font-bold text-slate-900">{proposal.currency || "AED"} {addon.cost.toLocaleString()} / {addon.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 7. Timeline */}
      {proposal.timeline && proposal.timeline.length > 0 && (
        <section>
          <h3 className="text-xl font-black text-slate-900 mb-4 border-b-2 border-[#0D1B3E] pb-2">7. Engagement Timeline</h3>
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#0D1B3E] text-white">
                  <th className="p-4 border-r border-white/20 font-bold w-1/5">Phase</th>
                  <th className="p-4 border-r border-white/20 font-bold">Activity</th>
                  <th className="p-4 font-bold text-center w-1/4">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {proposal.timeline.map((phase, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                    <td className="p-4 font-bold text-slate-900 border-r border-slate-200">{phase.phase}</td>
                    <td className="p-4 text-slate-600 border-r border-slate-200">{phase.activity}</td>
                    <td className="p-4 text-center text-slate-600">{phase.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 8. Exclusions */}
      {proposal.exclusions && proposal.exclusions.length > 0 && (
        <section>
          <h3 className="text-xl font-black text-slate-900 mb-4 border-b-2 border-[#0D1B3E] pb-2">8. What This Quotation Does Not Include</h3>
          <ul className="list-disc pl-5 space-y-3">
            {proposal.exclusions.map((exclusion, i) => (
              <li key={i} className="text-sm text-slate-600 leading-relaxed text-justify">{exclusion}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 9. Commercial Terms */}
      {proposal.terms && proposal.terms.length > 0 && (
        <section>
          <h3 className="text-xl font-black text-slate-900 mb-4 border-b-2 border-[#0D1B3E] pb-2">9. Commercial Terms & Conditions</h3>
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#0D1B3E] text-white">
                  <th className="p-4 border-r border-white/20 font-bold w-1/4">Term</th>
                  <th className="p-4 font-bold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {proposal.terms.map((term, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                    <td className="p-4 font-bold text-slate-900 border-r border-slate-200">{term.term}</td>
                    <td className="p-4 text-slate-600">{term.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 10. Acceptance */}
      <section className="pt-8">
        <h3 className="text-xl font-black text-slate-900 mb-6 border-b-2 border-[#0D1B3E] pb-2">10. Acceptance</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-12">
          By signing below, both parties agree to the scope, packages, commercial terms, and conditions set out in this quotation. On countersignature, this document becomes a binding agreement between The A&M Internationals (FZC) and {proposal.clientName}.
        </p>
        
        <div className="grid grid-cols-2 gap-16">
          <div>
            <p className="font-bold text-slate-900 mb-16">The A&M Internationals</p>
            <div className="border-b border-slate-300 w-full mb-2"></div>
            <p className="text-xs text-slate-500 mb-12">Authorised Signatory</p>
            
            <div className="border-b border-slate-300 w-full mb-2"></div>
            <p className="text-xs text-slate-500 mb-12">Name & Title</p>

            <div className="border-b border-slate-300 w-full mb-2"></div>
            <p className="text-xs text-slate-500">Date</p>
          </div>
          <div>
            <p className="font-bold text-slate-900 mb-16">{proposal.clientName}</p>
            <div className="border-b border-slate-300 w-full mb-2"></div>
            <p className="text-xs text-slate-500 mb-12">Authorised Signatory</p>
            
            <div className="border-b border-slate-300 w-full mb-2"></div>
            <p className="text-xs text-slate-500 mb-12">Name & Title</p>

            <div className="border-b border-slate-300 w-full mb-2"></div>
            <p className="text-xs text-slate-500">Date</p>
          </div>
        </div>

        <p className="text-center font-medium text-slate-800 italic mt-20">
          We look forward to partnering with {proposal.clientName} to elevate your digital presence.
        </p>
      </section>

    </div>
  );
}

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    async function fetchProposal() {
      if (!id) return;
      try {
        const docRef = doc(db, "proposals", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProposal({ id: docSnap.id, ...docSnap.data() } as Proposal);
        } else {
          setError("Proposal not found.");
        }
      } catch (err) {
        console.error("Error fetching proposal:", err);
        setError("Failed to load proposal details.");
      } finally {
        setLoading(false);
      }
    }
    fetchProposal();
  }, [id]);

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
      alert("Proposal sent successfully to " + proposal.clientEmail);
    } catch (err) {
      console.error("Error sending proposal:", err);
      alert("Error sending proposal. Please try again.");
    } finally {
      setSending(false);
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

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-6" style={{ color: "#9ca3af" }}>
        <Link href="/proposals" className="hover:text-[#0D1B3E] transition-colors">Proposals</Link>
        <span>/</span>
        <span className="font-semibold" style={{ color: "#0D1B3E" }}>{proposal.clientName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{proposal.clientName}</h1>
            <span className="badge" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
              {st.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 font-bold">
            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] uppercase">{(proposal.service || "").replace(/-/g, ' ')}</span>
            <span className="text-slate-300">•</span>
            <span>ID: {proposal.id.toUpperCase()}</span>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button onClick={downloadPDF} className="px-8 py-4 rounded-2xl border border-slate-200 font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-white hover:border-slate-300 transition-all shadow-sm">Download PDF</button>
          <button 
            onClick={handleSendProposal}
            disabled={sending}
            className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : "Send Proposal"}
          </button>
        </div>
      </div>

      {/* Main Document Content */}
      <div id="proposal-document-area" className="bg-white border border-slate-200 rounded-[3rem] p-12 lg:p-20 shadow-xl min-h-[900px] relative overflow-hidden max-w-7xl mx-auto">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
        
        {/* Quotation Framework */}
        <div className="relative z-10 space-y-16">
          {/* Quote Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl">AM</div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tighter">THE A&M INTERNATIONALS FZC</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Elevating the World, Elegantly</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">QUOTATION</h3>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Reference: #{proposal.id.slice(-8).toUpperCase()}</p>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Date: {new Date(proposal.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest pt-2">Valid Until: {proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }) : "Indefinite"}</p>
            </div>
          </div>

          {/* Billing Section */}
          <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-100">
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Service Provider</h4>
              <div className="text-sm font-bold text-slate-800 space-y-1">
                <p>The A&M Internationals FZC</p>
                <p>Ajman Free Zone, United Arab Emirates</p>
                <p>am@theaminternationals.com</p>
              </div>
            </div>
            <div className="text-right lg:text-left lg:pl-12">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Client Detail</h4>
              <div className="text-sm font-bold text-slate-800 space-y-1">
                <p className="text-lg font-black text-slate-900">{proposal.clientName}</p>
                <p>{proposal.company || "Individual Client"}</p>
                <p>{proposal.clientEmail}</p>
                <p>{proposal.phone || "No contact provided"}</p>
              </div>
            </div>
          </div>

          <DynamicTemplate proposal={proposal} />
        </div>
      </div>
    </div>
  );
}
