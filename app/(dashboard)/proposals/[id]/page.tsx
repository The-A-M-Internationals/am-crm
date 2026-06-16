"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Proposal, ProposalStatus } from "@/types";

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
  if (proposal.isRichDocument) {
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

  // STANDARD / LEGACY PROPOSAL FALLBACK
  const serviceKey = proposal.service as string;
  const hasItems = proposal.items && proposal.items.length > 0;
  
  // Requirement: Automated Sub-Template Item Injection
  const defaultItems: Record<string, { description: string; qty: number; rate: number; amount: number }[]> = {
    "web-development": [
      { description: "Phase 1: Architecture & Discovery", qty: 1, rate: 0, amount: 0 },
      { description: "Phase 2: Frontend & Backend Implementation", qty: 1, rate: 0, amount: 0 },
      { description: "Phase 3: Cloud Deployment & QA", qty: 1, rate: 0, amount: 0 },
    ],
    "ui-ux": [
      { description: "Phase 1: User Research & Personas", qty: 1, rate: 0, amount: 0 },
      { description: "Phase 2: Wireframing & UX Architecture", qty: 1, rate: 0, amount: 0 },
      { description: "Phase 3: High-Fidelity UI Design & Handoff", qty: 1, rate: 0, amount: 0 },
    ],
    "digital-marketing": [
      { description: "Phase 1: Complete SEO & Competitor Audit", qty: 1, rate: 0, amount: 0 },
      { description: "Phase 2: Campaign Strategy & Setup", qty: 1, rate: 0, amount: 0 },
      { description: "Phase 3: Monthly Content Creation & Analytics", qty: 1, rate: 0, amount: 0 },
    ],
  };

  const displayItems = hasItems ? proposal.items : (defaultItems[serviceKey] || []);

  return (
    <>
      {/* Service-Specific Dynamic Template Header */}
      <div className="mb-12 border-l-4 border-slate-900 pl-6 py-2">
        {serviceKey === "web-development" && (
          <>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Web Development Phases & Scope</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              This proposal outlines the technical architecture, frontend and backend development phases, and deployment strategy tailored for your digital platform.
            </p>
          </>
        )}
        {(serviceKey === "ui-ux" || serviceKey === "ui-ux-design") && (
          <>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Design Deliverables & Prototyping</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              This quotation covers user research, wireframing, high-fidelity mockups, and interactive prototyping to ensure a seamless user experience.
            </p>
          </>
        )}
        {serviceKey === "digital-marketing" && (
          <>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Campaign Strategy & Execution</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Detailed below is the strategic marketing roadmap, including content creation, ad spend management, and performance analytics setup.
            </p>
          </>
        )}
        {!["web-development", "ui-ux", "ui-ux-design", "digital-marketing"].includes(serviceKey) && (
          <>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Professional Services Breakdown</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Comprehensive breakdown of the professional services, execution strategy, and associated investment required for this project.
            </p>
          </>
        )}
      </div>

      {/* Line Items Table */}
      <div className="pt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {serviceKey === "web-development" ? "Development Phase" : 
                 (serviceKey === "ui-ux" || serviceKey === "ui-ux-design") ? "Design Phase" : 
                 "Description of Services"}
              </th>
              <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-4">Qty / Hrs</th>
              <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right px-4">Rate</th>
              <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayItems.map((item, idx) => (
              <tr key={idx}>
                <td className="py-6 pr-8">
                  <p className="text-sm font-black text-slate-900 mb-1">{item.description}</p>
                  <p className="text-xs text-slate-400 font-medium">
                    {serviceKey === "web-development" ? "Technical implementation & testing" : 
                     serviceKey === "digital-marketing" ? "Strategic marketing execution" : 
                     "Standard professional execution"}
                  </p>
                </td>
                <td className="py-6 text-center text-sm font-bold text-slate-600 px-4">{item.qty}</td>
                <td className="py-6 text-right text-sm font-bold text-slate-600 px-4">{proposal.currency} {item.rate.toLocaleString()}</td>
                <td className="py-6 text-right text-sm font-black text-slate-900">{proposal.currency} {item.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Calculations */}
      <div className="flex justify-end pt-8 border-t border-slate-900">
        <div className="w-full max-w-xs space-y-3">
          <div className="flex justify-between text-sm font-bold text-slate-500">
            <span>Subtotal</span>
            <span>{proposal.currency} {proposal.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-500">
            <span>VAT (5%)</span>
            <span>{proposal.currency} {proposal.tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-baseline pt-4 border-t border-slate-100">
            <span className="text-lg font-black text-slate-900 uppercase tracking-tighter">Total Amount</span>
            <div className="text-right">
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{proposal.currency} {proposal.total.toLocaleString()}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payable in Full</p>
            </div>
          </div>
        </div>
      </div>

      {/* Signature and Terms */}
      <div className="grid grid-cols-2 gap-20 pt-16">
        <div className="space-y-6">
          <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Authorized Signature</h5>
          <div className="h-px bg-slate-200 w-full mt-12"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manager, The A&M Internationals FZC</p>
        </div>
        <div className="bg-slate-50 rounded-3xl p-8">
          <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Terms & Conditions</h5>
          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
            1. Payment is required within 7 days of quote acceptance.<br/>
            2. All services are governed by the A&M service agreement.<br/>
            3. This quotation is valid for 15 days from the date of issue.<br/>
            4. Total amount includes applicable VAT/Taxes.
          </p>
        </div>
      </div>
    </>
  );
}

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        router.push('/proposals');
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [router]);

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
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold animate-pulse tracking-tight">LOADING PROPOSAL...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">System Error</h3>
          <p className="text-slate-500 mb-8 font-medium leading-relaxed">{error || "The requested proposal could not be retrieved."}</p>
          <button onClick={() => router.push("/proposals")} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const st = STATUSES[proposal.status] || STATUSES.draft;

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 lg:p-8 overflow-y-auto">
      <div ref={panelRef} className="bg-[#F8FAFC] w-full max-w-7xl min-h-[90vh] rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col">
        {/* Close Button (Esc) */}
        <button 
          onClick={() => router.push("/proposals")}
          className="absolute top-8 right-8 w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all z-20 shadow-sm group"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform duration-300">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="flex-1 p-8 lg:p-12">
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex items-start justify-between flex-wrap gap-6">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">{proposal.clientName}</h1>
                  <span className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border" style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                    {st.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 font-bold">
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] uppercase">{proposal.service.replace(/-/g, ' ')}</span>
                  <span className="text-slate-300">•</span>
                  <span>ID: {proposal.id.toUpperCase()}</span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button className="px-8 py-4 rounded-2xl border border-slate-200 font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-white hover:border-slate-300 transition-all shadow-sm">Download PDF</button>
                <button 
                  onClick={handleSendProposal}
                  disabled={sending}
                  className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending..." : "Send Proposal"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Main Template Area */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-slate-200 rounded-[3rem] p-12 lg:p-20 shadow-xl min-h-[900px] relative overflow-hidden">
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

                  {/* Calculations */}
                  <div className="flex justify-end pt-8 border-t border-slate-900">
                    <div className="w-full max-w-xs space-y-3">
                      <div className="flex justify-between text-sm font-bold text-slate-500">
                        <span>Subtotal</span>
                        <span>{proposal.currency} {proposal.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-slate-500">
                        <span>VAT (5%)</span>
                        <span>{proposal.currency} {proposal.tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-baseline pt-4 border-t border-slate-100">
                        <span className="text-lg font-black text-slate-900 uppercase tracking-tighter">Total Amount</span>
                        <div className="text-right">
                          <p className="text-3xl font-black text-slate-900 tracking-tighter">{proposal.currency} {proposal.total.toLocaleString()}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payable in Full</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Signature and Terms */}
                  <div className="grid grid-cols-2 gap-20 pt-16">
                    <div className="space-y-6">
                      <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Authorized Signature</h5>
                      <div className="h-px bg-slate-200 w-full mt-12"></div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manager, The A&M Internationals FZC</p>
                    </div>
                    <div className="bg-slate-50 rounded-3xl p-8">
                      <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Terms & Conditions</h5>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                        1. Payment is required within 7 days of quote acceptance.<br/>
                        2. All services are governed by the A&M service agreement.<br/>
                        3. This quotation is valid for 15 days from the date of issue.<br/>
                        4. Total amount includes applicable VAT/Taxes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Details */}
            <div className="space-y-8">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Financial Overview</h3>
                
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Investment Amount</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-slate-400 font-bold text-lg">{proposal.currency || "AED"}</span>
                      <span className="text-4xl font-black text-slate-900 tracking-tighter">{proposal.total?.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="pt-6 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expiration</p>
                      <p className="text-sm font-bold text-slate-800">{proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' }) : "Indefinite"}</p>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client Contact</p>
                      <p className="text-sm font-bold text-slate-800 break-all">{proposal.clientEmail}</p>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Issued On</p>
                      <p className="text-sm font-bold text-slate-800">{new Date(proposal.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 relative z-10">Status Advisory</h4>
                <p className="text-sm leading-relaxed mb-8 text-slate-400 relative z-10 font-medium">This proposal is currently in <strong className="text-white">{st.label}</strong> status. Next action: digital signature request.</p>
                <button className="w-full py-4 bg-white text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-lg">
                  Execute Agreement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
