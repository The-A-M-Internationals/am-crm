"use client";

import React from "react";
import { Proposal, ProposalPackage, ProposalCustomSection } from "@/types";
import { getMasterTemplate } from "@/lib/proposal-templates";

const formatAmountValue = (val: string | number, currency: string) => {
  if (typeof val === "number") {
    return `${currency} ${val.toLocaleString()}`;
  }
  return val || "";
};

const getPackageTotal = (pkg: ProposalPackage, currency: string) => {
  if (pkg.totalMonthly !== undefined && pkg.totalMonthly !== "") {
    return pkg.totalMonthly;
  }
  const spendStr = String(pkg.recommendedSpend || "0").replace(/[^\d.]/g, "");
  const feeStr = String(pkg.managementFee || "0").replace(/[^\d.]/g, "");
  const spendNum = parseFloat(spendStr) || 0;
  const feeNum = parseFloat(feeStr) || 0;
  const total = spendNum + feeNum;
  if (total > 0) {
    return `${currency} ${total.toLocaleString()}`;
  }
  return "";
};


export default function DynamicTemplate({ 
  proposal, 
  isEditing, 
  onChange,
  showAsClient
}: { 
  proposal: Proposal; 
  isEditing: boolean; 
  onChange: (p: Proposal) => void; 
  showAsClient?: boolean;
}) {
  const hasFinalPackage = (proposal.packages || []).some(p => p.status === 'final');

  const visiblePackages = isEditing 
    ? (proposal.packages || []) 
    : hasFinalPackage 
      ? (proposal.packages || []).filter(p => p.status === 'final')
      : (proposal.packages || []).filter(p => p.status !== 'hidden' && p.offered !== false);

  React.useEffect(() => {
    if (!isEditing && visiblePackages.length === 1) {
      const pkg = visiblePackages[0];
      if (proposal.selectedPackageName !== pkg.name) {
        const defaultVal = getPackageTotal(pkg, proposal.currency || "AED");
        const currentVal = pkg.totalMonthly !== undefined && pkg.totalMonthly !== "" ? pkg.totalMonthly : defaultVal;
        const priceNum = parseFloat(String(currentVal).replace(/[^\d.]/g, "")) || 0;
        onChange({ ...proposal, selectedPackageName: pkg.name, selectedPackagePrice: priceNum });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, visiblePackages.length, proposal.selectedPackageName, proposal.currency]);

  if (!proposal.isRichDocument) return null; // Safety fallback

  const deletePackage = (index: number) => {
    const newPackages = (proposal.packages || []).filter((_, idx) => idx !== index);
    onChange({ ...proposal, packages: newPackages });
  };

  const addPackage = () => {
    const newPkg: ProposalPackage = {
      name: "New Package",
      bestFor: "Description",
      activeCampaigns: "1-2 Campaigns",
      adCreatives: "4/Month",
      optimisation: "Weekly",
      abTesting: "Yes",
      recommendedSpend: 5000,
      managementFee: 2000,
      reviewCall: "Monthly",
      reporting: "Monthly",
      estimatedLeads: "20-30",
      estimatedCostPerLead: "AED 100",
      recommended: false
    };
    const newPackages = [...(proposal.packages || []), newPkg];
    onChange({ ...proposal, packages: newPackages });
  };

  const toggleRow = (rowKey: string) => {
    const current = proposal.disabledPackageRows || [];
    if (current.includes(rowKey)) {
      onChange({ ...proposal, disabledPackageRows: current.filter(k => k !== rowKey) });
    } else {
      onChange({ ...proposal, disabledPackageRows: [...current, rowKey] });
    }
  };

  const disabledRows = proposal.disabledPackageRows || [];

  const handleSingleLineKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur(); // Trigger save on Enter
    }
  };

  const editableTextClass = isEditing
    ? "outline-none rounded transition-all hover:bg-slate-200/50 hover:outline hover:outline-dashed hover:outline-1 hover:outline-[#C9A84C]/50 focus:bg-white focus:text-[#0D1B3E] focus:outline focus:outline-2 focus:outline-[#C9A84C] focus:shadow-sm px-2 py-1"
    : "";

  // Helper to extract default labels if not present
  const labels = proposal.packageRowLabels || {};
  const rowLabels = {
    bestFor: labels.bestFor ?? "Best For",
    activeCampaigns: labels.activeCampaigns ?? "Active Campaigns",
    adCreatives: labels.adCreatives ?? "Ad Creatives / Month",
    optimisation: labels.optimisation ?? "Audience Optimisation",
    abTesting: labels.abTesting ?? "A/B Testing",
    recommendedSpend: labels.recommendedSpend ?? "Recommended Ad Spend",
    managementFee: labels.managementFee ?? "Management Fee",
    reviewCall: labels.reviewCall ?? "Review Call",
    reporting: labels.reporting ?? "Reporting",
    estimatedLeads: labels.estimatedLeads ?? "Estimated Leads / Month",
    estimatedCostPerLead: labels.estimatedCostPerLead ?? "Estimated Cost Per Lead",
    totalMonthly: labels.totalMonthly ?? "TOTAL MONTHLY",
  };

  return (
    <div className="space-y-16 pt-8 text-[#222222]">
      {/* 1. About The A&M Internationals */}
      {proposal.introduction !== undefined && (
        <section className="relative group p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...proposal, introduction: undefined });
              }}
              className="absolute -top-3 -right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="relative mb-6 border-b border-slate-100 pb-3">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => {
                onChange({ ...proposal, aboutTitle: e.target.innerText });
              }}
              className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
            >
              {proposal.aboutTitle || "1. About The A&M Internationals"}
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
          </div>
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              onChange({ ...proposal, introduction: e.target.innerText });
            }}
            className={`text-sm text-[#222222] leading-relaxed text-justify min-h-[3em] font-sans ${editableTextClass}`}
          >
            {proposal.introduction}
          </div>
        </section>
      )}

      {/* 2. Our Understanding */}
      {proposal.understanding !== undefined && (
        <section className="relative group p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...proposal, understanding: undefined });
              }}
              className="absolute -top-3 -right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="relative mb-6 border-b border-slate-100 pb-3">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => {
                onChange({ ...proposal, understandingTitle: e.target.innerText });
              }}
              className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
            >
              {proposal.understandingTitle || `2. Our Understanding of ${proposal.clientName}`}
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
          </div>
          
          <div className="space-y-4">
            {(proposal.understanding || []).map((point, i) => (
              <div key={i} className="flex gap-3 items-start group/bullet">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mt-2.5 flex-shrink-0 select-none"></span>
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onKeyDown={handleSingleLineKeyDown}
                  onBlur={(e) => {
                    const newUnderstanding = [...(proposal.understanding || [])];
                    newUnderstanding[i] = e.target.innerText;
                    onChange({ ...proposal, understanding: newUnderstanding });
                  }}
                  className={`flex-1 text-sm text-[#222222] leading-relaxed text-justify ${editableTextClass}`}
                >
                  {point}
                </div>
                {isEditing && (
                  <button 
                    type="button" 
                    onClick={() => {
                      const newUnderstanding = (proposal.understanding || []).filter((_, idx) => idx !== i);
                      onChange({ ...proposal, understanding: newUnderstanding });
                    }}
                    className="text-red-400 hover:text-red-600 transition-colors text-xs px-2 mt-1.5 opacity-0 group-hover/bullet:opacity-100 font-bold select-none"
                    title="Remove bullet"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
              <button 
                type="button" 
                onClick={() => {
                  const newUnderstanding = [...(proposal.understanding || []), "New Point"];
                  onChange({ ...proposal, understanding: newUnderstanding });
                }}
                className="text-xs text-[#C9A84C] hover:text-[#0D1B3E] font-bold mt-2 flex items-center gap-1 transition-colors select-none"
              >
                + Add Understanding Bullet
              </button>
            )}
          </div>
        </section>
      )}

      {/* 3. Objective */}
      {proposal.objectives !== undefined && (
        <section className="relative group p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...proposal, objectives: undefined });
              }}
              className="absolute -top-3 -right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="relative mb-6 border-b border-slate-100 pb-3">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => {
                onChange({ ...proposal, objectivesTitle: e.target.innerText });
              }}
              className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
            >
              {proposal.objectivesTitle || "3. Objective of This Engagement"}
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
          </div>
          
          <div className="space-y-4">
            {(proposal.objectives || []).map((point, i) => (
              <div key={i} className="flex gap-3 items-start group/bullet">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mt-2.5 flex-shrink-0 select-none"></span>
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onKeyDown={handleSingleLineKeyDown}
                  onBlur={(e) => {
                    const newObjectives = [...(proposal.objectives || [])];
                    newObjectives[i] = e.target.innerText;
                    onChange({ ...proposal, objectives: newObjectives });
                  }}
                  className={`flex-1 text-sm text-[#222222] leading-relaxed text-justify ${editableTextClass}`}
                >
                  {point}
                </div>
                {isEditing && (
                  <button 
                    type="button" 
                    onClick={() => {
                      const newObjectives = (proposal.objectives || []).filter((_, idx) => idx !== i);
                      onChange({ ...proposal, objectives: newObjectives });
                    }}
                    className="text-red-400 hover:text-red-600 transition-colors text-xs px-2 mt-1.5 opacity-0 group-hover/bullet:opacity-100 font-bold select-none"
                    title="Remove bullet"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
              <button 
                type="button" 
                onClick={() => {
                  const newObjectives = [...(proposal.objectives || []), "New Objective"];
                  onChange({ ...proposal, objectives: newObjectives });
                }}
                className="text-xs text-[#C9A84C] hover:text-[#0D1B3E] font-bold mt-2 flex items-center gap-1 transition-colors select-none"
              >
                + Add Objective Bullet
              </button>
            )}
          </div>
        </section>
      )}

      {/* 4. Our Approach */}
      {proposal.approachTitle !== undefined && (
        <section className="relative group p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...proposal, approachTitle: undefined });
              }}
              className="absolute -top-3 -right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="relative mb-6 border-b border-slate-100 pb-3">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => {
                onChange({ ...proposal, approachTitle: e.target.innerText });
              }}
              className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
            >
              {proposal.approachTitle}
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
          </div>
          
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              onChange({ ...proposal, approachDescription: e.target.innerText });
            }}
            className={`text-sm text-[#222222] leading-relaxed text-justify mb-6 min-h-[3em] ${editableTextClass}`}
          >
            {proposal.approachDescription || "We utilize a customized execution model, focusing on quality, clear communication and rapid feedback loop."}
          </div>

          {proposal.approachFeatures && (
            <div className="space-y-4">
              {(proposal.approachFeatures || []).map((feature, i) => (
                <div key={i} className="flex gap-3 items-start group/bullet">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mt-2.5 flex-shrink-0 select-none"></span>
                  <div
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    onKeyDown={handleSingleLineKeyDown}
                    onBlur={(e) => {
                      const newFeatures = [...(proposal.approachFeatures || [])];
                      newFeatures[i] = e.target.innerText;
                      onChange({ ...proposal, approachFeatures: newFeatures });
                    }}
                    className={`flex-1 text-sm text-[#222222] leading-relaxed text-justify ${editableTextClass}`}
                  >
                    {feature}
                  </div>
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={() => {
                        const newFeatures = (proposal.approachFeatures || []).filter((_, idx) => idx !== i);
                        onChange({ ...proposal, approachFeatures: newFeatures });
                      }}
                      className="text-red-400 hover:text-red-600 transition-colors text-xs px-2 mt-1.5 opacity-0 group-hover/bullet:opacity-100 font-bold select-none"
                      title="Remove feature"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {isEditing && (
                <button 
                  type="button" 
                  onClick={() => {
                    const newFeatures = [...(proposal.approachFeatures || []), "New Feature/Step"];
                    onChange({ ...proposal, approachFeatures: newFeatures });
                  }}
                  className="text-xs text-[#C9A84C] hover:text-[#0D1B3E] font-bold mt-2 flex items-center gap-1 transition-colors select-none"
                >
                  + Add Feature/Step
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* 5. Packages Table */}
      {proposal.packages !== undefined && (
        <section id="packages-section" className="relative group p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...proposal, packages: undefined });
              }}
              className="absolute -top-3 -right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="relative mb-6 border-b border-slate-100 pb-3">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => {
                onChange({ ...proposal, packagesTitle: e.target.innerText });
              }}
              className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
            >
              {proposal.packagesTitle || "5. Packages — Pick What Fits"}
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
          </div>
          
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              onChange({ ...proposal, packagesDescription: e.target.innerText });
            }}
            className={`text-sm text-[#555555] leading-relaxed text-justify mb-6 min-h-[2em] ${editableTextClass}`}
          >
            {proposal.packagesDescription || "All packages are designed specifically for your goals. Choose the tier that matches your current business pace."}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#0D1B3E] text-white">
                  <th className="p-4 border-r border-slate-200/30 font-bold w-1/4 text-center">
                    <span className="font-playfair text-xs uppercase tracking-wider text-slate-300">Features</span>
                  </th>
                  {visiblePackages.map((pkg, i) => (
                    <th key={i} className={`p-4 border-r border-slate-200/30 font-bold text-center relative ${pkg.recommended ? "bg-[#C9A84C] text-[#0D1B3E]" : "text-[#C9A84C]"}`}>
                      <div className="flex flex-col gap-1 items-center">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], name: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`w-full text-center font-black uppercase tracking-wider text-xs py-0.5 rounded outline-none ${isEditing ? "border-b border-dashed border-current hover:bg-black/10 focus:bg-black/20" : ""}`}
                        >
                          {pkg.name}
                        </div>
                        {isEditing && (
                          <div className="flex flex-col items-stretch gap-2 mt-2 select-none w-full px-2">
                            <select
                              value={pkg.status || (pkg.offered === false ? 'hidden' : 'option')}
                              onChange={(e) => {
                                const newPackages = [...(proposal.packages || [])];
                                const val = e.target.value as 'option' | 'final' | 'hidden';
                                if (val === 'final') {
                                  newPackages.forEach(p => { if (p.status === 'final') p.status = 'option'; });
                                }
                                newPackages[i] = { ...newPackages[i], status: val };
                                onChange({ ...proposal, packages: newPackages });
                              }}
                              className={`text-[10px] p-1.5 rounded font-bold outline-none cursor-pointer border ${pkg.status === 'final' ? 'bg-green-100 border-green-300 text-green-800' : pkg.status === 'hidden' || pkg.offered === false ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 border-slate-300 text-slate-700'}`}
                            >
                              <option value="option">Show as Option</option>
                              <option value="final">Final Agreed Package</option>
                              <option value="hidden">Hide from Client</option>
                            </select>
                            
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <label className="flex items-center gap-1 cursor-pointer select-none text-[10px]">
                                <input 
                                  type="checkbox"
                                  checked={!!pkg.recommended}
                                  onChange={(e) => {
                                    const newPackages = (proposal.packages || []).map((p, idx) => ({
                                      ...p,
                                      recommended: idx === i ? e.target.checked : false
                                    }));
                                    onChange({ ...proposal, packages: newPackages });
                                  }}
                                  className="w-3 h-3 rounded text-[#0D1B3E] focus:ring-0 border-current bg-transparent"
                                />
                                <span>Recommend</span>
                              </label>
                              <button 
                                type="button"
                                onClick={() => deletePackage(i)}
                                className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-0.5 rounded transition-all font-bold text-[10px]"
                                title="Delete column"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                        {!isEditing && pkg.recommended && <span className="text-[10px] font-bold select-none uppercase tracking-widest mt-1">★ Recommended</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Best For */}
                {!disabledRows.includes("bestFor") && (
                  <tr className="bg-slate-50/20">
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, bestFor: e.target.innerText } });
                          }}
                          className={editableTextClass}
                        >
                          {rowLabels.bestFor}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("bestFor")}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200 font-medium">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], bestFor: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`w-full text-center ${editableTextClass} text-xs`}
                        >
                          {pkg.bestFor}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* 2. Active Campaigns */}
                {!disabledRows.includes("activeCampaigns") && (
                  <tr className="bg-white">
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, activeCampaigns: e.target.innerText } });
                          }}
                          className={editableTextClass}
                        >
                          {rowLabels.activeCampaigns}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("activeCampaigns")}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], activeCampaigns: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`w-full text-center ${editableTextClass} text-xs`}
                        >
                          {pkg.activeCampaigns}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* 3. Ad Creatives */}
                {!disabledRows.includes("adCreatives") && (
                  <tr className="bg-slate-50/20">
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, adCreatives: e.target.innerText } });
                          }}
                          className={editableTextClass}
                        >
                          {rowLabels.adCreatives}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("adCreatives")}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], adCreatives: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`w-full text-center ${editableTextClass} text-xs`}
                        >
                          {pkg.adCreatives}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* 4. Optimisation */}
                {!disabledRows.includes("optimisation") && (
                  <tr className="bg-white">
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, optimisation: e.target.innerText } });
                          }}
                          className={editableTextClass}
                        >
                          {rowLabels.optimisation}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("optimisation")}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], optimisation: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`w-full text-center ${editableTextClass} text-xs`}
                        >
                          {pkg.optimisation}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* 5. AB Testing */}
                {!disabledRows.includes("abTesting") && (
                  <tr className="bg-slate-50/20">
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, abTesting: e.target.innerText } });
                          }}
                          className={editableTextClass}
                        >
                          {rowLabels.abTesting}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("abTesting")}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], abTesting: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`w-full text-center ${editableTextClass} text-xs`}
                        >
                          {pkg.abTesting}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* 6. Recommended Spend */}
                {!disabledRows.includes("recommendedSpend") && (
                  <tr className="bg-white">
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, recommendedSpend: e.target.innerText } });
                          }}
                          className={editableTextClass}
                        >
                          {rowLabels.recommendedSpend}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("recommendedSpend")}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200 font-semibold">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], recommendedSpend: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`text-center font-bold text-xs text-[#222222] px-2 ${editableTextClass}`}
                        >
                          {formatAmountValue(pkg.recommendedSpend, proposal.currency || "AED")}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* 7. Management Fee */}
                {!disabledRows.includes("managementFee") && (
                  <tr className="bg-slate-50/20">
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, managementFee: e.target.innerText } });
                          }}
                          className={editableTextClass}
                        >
                          {rowLabels.managementFee}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("managementFee")}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200 font-semibold">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], managementFee: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`text-center font-bold text-xs text-[#222222] px-2 ${editableTextClass}`}
                        >
                          {formatAmountValue(pkg.managementFee, proposal.currency || "AED")}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* 8. Review Call */}
                {!disabledRows.includes("reviewCall") && (
                  <tr className="bg-white">
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, reviewCall: e.target.innerText } });
                          }}
                          className={editableTextClass}
                        >
                          {rowLabels.reviewCall}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("reviewCall")}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], reviewCall: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`w-full text-center ${editableTextClass} text-xs`}
                        >
                          {pkg.reviewCall}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* 9. Reporting */}
                {!disabledRows.includes("reporting") && (
                  <tr className="bg-slate-50/20">
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, reporting: e.target.innerText } });
                          }}
                          className={editableTextClass}
                        >
                          {rowLabels.reporting}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("reporting")}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], reporting: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`w-full text-center ${editableTextClass} text-xs`}
                        >
                          {pkg.reporting}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* 10. Estimated Leads */}
                {!disabledRows.includes("estimatedLeads") && (
                  <tr className="bg-white">
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, estimatedLeads: e.target.innerText } });
                          }}
                          className={editableTextClass}
                        >
                          {rowLabels.estimatedLeads}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("estimatedLeads")}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], estimatedLeads: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`w-full text-center ${editableTextClass} text-xs`}
                        >
                          {pkg.estimatedLeads}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* 11. Estimated CPL */}
                {!disabledRows.includes("estimatedCostPerLead") && (
                  <tr className="bg-slate-50/20">
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, estimatedCostPerLead: e.target.innerText } });
                          }}
                          className={editableTextClass}
                        >
                          {rowLabels.estimatedCostPerLead}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("estimatedCostPerLead")}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200 font-medium">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            newPackages[i] = { ...newPackages[i], estimatedCostPerLead: e.target.innerText };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`w-full text-center ${editableTextClass} text-xs`}
                        >
                          {pkg.estimatedCostPerLead}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* Custom Dynamic Rows */}
                {(proposal.customRows || []).map((row, rowIdx) => (
                  <tr key={row.id} className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/20"}>
                    <td className="p-4 font-semibold text-[#0D1B3E] border-r border-slate-200 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newRows = [...(proposal.customRows || [])];
                            newRows[rowIdx] = { ...newRows[rowIdx], label: e.target.innerText };
                            onChange({ ...proposal, customRows: newRows });
                          }}
                          className={editableTextClass}
                        >
                          {row.label}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              const newRows = (proposal.customRows || []).filter(r => r.id !== row.id);
                              onChange({ ...proposal, customRows: newRows });
                            }}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Remove Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => (
                      <td key={i} className="p-4 text-center text-[#222222] border-r border-slate-200 font-medium">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newPackages = [...(proposal.packages || [])];
                            const currentCustomVals = newPackages[i].customValues || {};
                            newPackages[i] = { 
                              ...newPackages[i], 
                              customValues: { ...currentCustomVals, [row.id]: e.target.innerText } 
                            };
                            onChange({ ...proposal, packages: newPackages });
                          }}
                          className={`w-full text-center ${editableTextClass} text-xs`}
                        >
                          {(pkg.customValues || {})[row.id] || "-"}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}

                {/* 12. TOTAL MONTHLY */}
                {!disabledRows.includes("totalMonthly") && (
                  <tr className="bg-[#0D1B3E] text-white">
                    <td className="p-4 font-bold border-r border-slate-200/20 group/row">
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const labels = proposal.packageRowLabels || {};
                            onChange({ ...proposal, packageRowLabels: { ...labels, totalMonthly: e.target.innerText } });
                          }}
                          className={`font-bold ${editableTextClass}`}
                        >
                          {rowLabels.totalMonthly}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => toggleRow("totalMonthly")}
                            className="text-red-400 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-opacity font-bold select-none text-xs px-1"
                            title="Hide Row"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {visiblePackages.map((pkg, i) => {
                      const defaultVal = getPackageTotal(pkg, proposal.currency || "AED");
                      const currentVal = pkg.totalMonthly !== undefined && pkg.totalMonthly !== "" ? pkg.totalMonthly : defaultVal;
                      return (
                        <td key={i} className={`p-4 text-center font-bold border-r border-slate-200/20 ${pkg.recommended ? "bg-[#C9A84C] text-[#0D1B3E]" : "text-[#C9A84C]"}`}>
                          <div
                            contentEditable={isEditing}
                            suppressContentEditableWarning
                            onKeyDown={handleSingleLineKeyDown}
                            onBlur={(e) => {
                              const newPackages = [...(proposal.packages || [])];
                              newPackages[i] = { ...newPackages[i], totalMonthly: e.target.innerText };
                              onChange({ ...proposal, packages: newPackages });
                            }}
                            className={`text-center font-bold px-2 ${editableTextClass}`}
                          >
                            {currentVal}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )}

                {/* 13. SELECTION BUTTONS (Client View Only) */}
                {!isEditing && showAsClient && visiblePackages.length > 1 && (
                  <tr>
                    <td className="p-4 border-r border-slate-200/20"></td>
                    {visiblePackages.map((pkg, i) => {
                      const defaultVal = getPackageTotal(pkg, proposal.currency || "AED");
                      const currentVal = pkg.totalMonthly !== undefined && pkg.totalMonthly !== "" ? pkg.totalMonthly : defaultVal;
                      const priceNum = parseFloat(String(currentVal).replace(/[^\d.]/g, "")) || 0;
                      const isSelected = proposal.selectedPackageName === pkg.name;

                      return (
                        <td key={i} className="p-4 text-center border-r border-slate-200/20 bg-slate-50/50">
                          <button
                            type="button"
                            onClick={() => onChange({ ...proposal, selectedPackageName: pkg.name, selectedPackagePrice: priceNum })}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${isSelected ? "bg-green-500 text-white shadow-green-500/30 scale-105" : "bg-[#0D1B3E] text-white hover:bg-[#1a3070]"}`}
                          >
                            {isSelected ? "Selected ✓" : "Select Package"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {isEditing && (
            <div className="flex flex-wrap items-center gap-4 mt-4 select-none">
              <button 
                type="button"
                onClick={addPackage}
                className="px-4 py-2 bg-[#0D1B3E] text-white rounded-lg text-xs font-bold hover:bg-[#1a3070] transition-colors shadow-sm"
              >
                + Add Package Column
              </button>

              <button 
                type="button"
                onClick={() => {
                  const newRowId = `customRow_${Date.now()}`;
                  const newRows = [...(proposal.customRows || []), { id: newRowId, label: "New Feature" }];
                  onChange({ ...proposal, customRows: newRows });
                }}
                className="px-4 py-2 bg-white border border-[#0D1B3E] text-[#0D1B3E] rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
              >
                + Add Feature Row
              </button>

              {disabledRows.length > 0 && (
                <div className="text-xs text-slate-500 flex flex-wrap gap-1.5 items-center">
                  <span className="font-semibold">Restore Rows:</span>
                  {disabledRows.map(rowKey => (
                    <button
                      key={rowKey}
                      type="button"
                      onClick={() => toggleRow(rowKey)}
                      className="px-2 py-1 bg-slate-100 hover:bg-[#C9A84C] hover:text-[#0D1B3E] rounded font-bold transition-all border border-slate-200 text-[10px]"
                    >
                      + {rowLabels[rowKey as keyof typeof rowLabels] || rowKey}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!isEditing && visiblePackages.some(p => p.recommended) && (
            <p className="text-xs text-[#555555] italic mt-4 select-none">★ Recommended package for {proposal.clientName} given current objectives. It offers the best scale-to-cost ratio.</p>
          )}
        </section>
      )}

      {/* 6. Optional Add-ons */}
      {proposal.addons !== undefined && (
        <section className="relative group p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...proposal, addons: undefined });
              }}
              className="absolute -top-3 -right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="relative mb-6 border-b border-slate-100 pb-3">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => {
                onChange({ ...proposal, addonsTitle: e.target.innerText });
              }}
              className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
            >
              {proposal.addonsTitle || "6. Optional Add-Ons"}
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
          </div>
          
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              onChange({ ...proposal, addonsDescription: e.target.innerText });
            }}
            className={`text-sm text-[#555555] leading-relaxed text-justify mb-6 min-h-[2em] ${editableTextClass}`}
          >
            {proposal.addonsDescription || "These add-ons are offered separately and can be selected to enhance the primary scope."}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm mb-4">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#0D1B3E] text-white">
                  <th className="p-4 border-r border-slate-200/25 font-bold w-1/4 select-none">Add-On Package</th>
                  <th className="p-4 border-r border-slate-200/25 font-bold w-1/2 select-none">Deliverables</th>
                  <th className="p-4 font-bold text-center w-1/5 select-none">Cost</th>
                  {isEditing && <th className="p-4 font-bold text-center w-12 select-none">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(proposal.addons || []).map((addon, i) => (
                  <tr key={i} className="bg-slate-50/10">
                    <td className="p-3 border-r border-slate-200">
                      <div
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onKeyDown={handleSingleLineKeyDown}
                        onBlur={(e) => {
                          const newAddons = [...(proposal.addons || [])];
                          newAddons[i] = { ...newAddons[i], name: e.target.innerText };
                          onChange({ ...proposal, addons: newAddons });
                        }}
                        className={`w-full font-bold ${editableTextClass} text-xs text-[#0D1B3E]`}
                      >
                        {addon.name}
                      </div>
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      <div
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newAddons = [...(proposal.addons || [])];
                          newAddons[i] = { ...newAddons[i], deliverables: e.target.innerText };
                          onChange({ ...proposal, addons: newAddons });
                        }}
                        className={`w-full text-[#222222] text-xs min-h-[1.5em] ${editableTextClass}`}
                      >
                        {addon.deliverables}
                      </div>
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      <div className="flex items-center gap-1 justify-center">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newAddons = [...(proposal.addons || [])];
                            newAddons[i] = { ...newAddons[i], cost: e.target.innerText };
                            onChange({ ...proposal, addons: newAddons });
                          }}
                          className={`text-center font-bold px-1 ${editableTextClass} text-xs text-[#222222]`}
                        >
                          {formatAmountValue(addon.cost, proposal.currency || "AED")}
                        </div>
                        <span className="text-xs text-slate-400 select-none">/</span>
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newAddons = [...(proposal.addons || [])];
                            newAddons[i] = { ...newAddons[i], period: e.target.innerText };
                            onChange({ ...proposal, addons: newAddons });
                          }}
                          className={`text-center px-1 ${editableTextClass} text-xs text-[#222222]`}
                        >
                          {addon.period}
                        </div>
                      </div>
                    </td>
                    {isEditing && (
                      <td className="p-3 text-center">
                        <button 
                          type="button" 
                          onClick={() => {
                            const newAddons = (proposal.addons || []).filter((_, idx) => idx !== i);
                            onChange({ ...proposal, addons: newAddons });
                          }}
                          className="text-red-500 hover:text-red-700 text-xs font-bold select-none"
                          title="Remove addon"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isEditing && (
            <button 
              type="button"
              onClick={() => {
                const newAddons = [...(proposal.addons || []), { name: "New Add-On", deliverables: "Deliverables Description", cost: 1000, period: "month" }];
                onChange({ ...proposal, addons: newAddons });
              }}
              className="px-4 py-2 bg-[#0D1B3E] text-white rounded-lg text-xs font-bold hover:bg-[#1a3070] transition-colors shadow-sm select-none"
            >
              + Add Add-On
            </button>
          )}
        </section>
      )}

      {/* 7. Timeline */}
      {proposal.timeline !== undefined && (
        <section className="relative group p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...proposal, timeline: undefined });
              }}
              className="absolute -top-3 -right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="relative mb-6 border-b border-slate-100 pb-3">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => {
                onChange({ ...proposal, timelineTitle: e.target.innerText });
              }}
              className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
            >
              {proposal.timelineTitle || "7. Engagement Timeline"}
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
          </div>
          
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm mb-4">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#0D1B3E] text-white">
                  <th className="p-4 border-r border-slate-200/25 font-bold w-1/5 select-none">Phase</th>
                  <th className="p-4 border-r border-slate-200/25 font-bold select-none">Activity</th>
                  <th className="p-4 font-bold text-center w-1/4 select-none">Duration</th>
                  {isEditing && <th className="p-4 font-bold text-center w-12 select-none">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(proposal.timeline || []).map((phase, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-slate-50/10" : "bg-white"}>
                    <td className="p-3 border-r border-slate-200">
                      <div
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onKeyDown={handleSingleLineKeyDown}
                        onBlur={(e) => {
                          const newTimeline = [...(proposal.timeline || [])];
                          newTimeline[i] = { ...newTimeline[i], phase: e.target.innerText };
                          onChange({ ...proposal, timeline: newTimeline });
                        }}
                        className={`w-full font-bold ${editableTextClass} text-xs text-[#0D1B3E]`}
                      >
                        {phase.phase}
                      </div>
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      <div
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newTimeline = [...(proposal.timeline || [])];
                          newTimeline[i] = { ...newTimeline[i], activity: e.target.innerText };
                          onChange({ ...proposal, timeline: newTimeline });
                        }}
                        className={`w-full text-xs min-h-[1.5em] ${editableTextClass} text-[#222222]`}
                      >
                        {phase.activity}
                      </div>
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      <div
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onKeyDown={handleSingleLineKeyDown}
                        onBlur={(e) => {
                          const newTimeline = [...(proposal.timeline || [])];
                          newTimeline[i] = { ...newTimeline[i], duration: e.target.innerText };
                          onChange({ ...proposal, timeline: newTimeline });
                        }}
                        className={`w-full text-center ${editableTextClass} text-xs font-semibold text-[#222222]`}
                      >
                        {phase.duration}
                      </div>
                    </td>
                    {isEditing && (
                      <td className="p-3 text-center">
                        <button 
                          type="button" 
                          onClick={() => {
                            const newTimeline = (proposal.timeline || []).filter((_, idx) => idx !== i);
                            onChange({ ...proposal, timeline: newTimeline });
                          }}
                          className="text-red-500 hover:text-red-700 text-xs font-bold select-none"
                          title="Remove phase"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isEditing && (
            <button 
              type="button"
              onClick={() => {
                const newTimeline = [...(proposal.timeline || []), { phase: "Phase X", activity: "Action description", duration: "1 Week" }];
                onChange({ ...proposal, timeline: newTimeline });
              }}
              className="px-4 py-2 bg-[#0D1B3E] text-white rounded-lg text-xs font-bold hover:bg-[#1a3070] transition-colors shadow-sm select-none"
            >
              + Add Timeline Phase
            </button>
          )}
        </section>
      )}

      {/* 8. Exclusions */}
      {proposal.exclusions !== undefined && (
        <section className="relative group p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...proposal, exclusions: undefined });
              }}
              className="absolute -top-3 -right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="relative mb-6 border-b border-slate-100 pb-3">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => {
                onChange({ ...proposal, exclusionsTitle: e.target.innerText });
              }}
              className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
            >
              {proposal.exclusionsTitle || "8. What This Quotation Does Not Include"}
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
          </div>
          
          <div className="space-y-4">
            {(proposal.exclusions || []).map((exclusion, i) => (
              <div key={i} className="flex gap-3 items-center group/bullet">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mt-2.5 flex-shrink-0 select-none"></span>
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onKeyDown={handleSingleLineKeyDown}
                  onBlur={(e) => {
                    const newExclusions = [...(proposal.exclusions || [])];
                    newExclusions[i] = e.target.innerText;
                    onChange({ ...proposal, exclusions: newExclusions });
                  }}
                  className={`flex-1 text-sm text-[#222222] ${editableTextClass}`}
                >
                  {exclusion}
                </div>
                {isEditing && (
                  <button 
                    type="button" 
                    onClick={() => {
                      const newExclusions = (proposal.exclusions || []).filter((_, idx) => idx !== i);
                      onChange({ ...proposal, exclusions: newExclusions });
                    }}
                    className="text-red-400 hover:text-red-600 transition-colors text-xs px-2 opacity-0 group-hover/bullet:opacity-100 font-bold select-none"
                    title="Remove exclusion"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
              <button 
                type="button" 
                onClick={() => {
                  const newExclusions = [...(proposal.exclusions || []), "New Exclusion Item"];
                  onChange({ ...proposal, exclusions: newExclusions });
                }}
                className="text-xs text-[#C9A84C] hover:text-[#0D1B3E] font-bold mt-2 flex items-center gap-1 transition-colors select-none"
              >
                + Add Exclusion Bullet
              </button>
            )}
          </div>
        </section>
      )}

      {/* 9. Commercial Summary */}
      {proposal.commercialSummaryRows !== undefined && (
        <section className="relative group p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...proposal, commercialSummaryRows: undefined });
              }}
              className="absolute -top-3 -right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="relative mb-6 border-b border-slate-100 pb-3">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => {
                onChange({ ...proposal, commercialSummaryTitle: e.target.innerText });
              }}
              className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
            >
              {proposal.commercialSummaryTitle || "9. Commercial Summary — Current Ask"}
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
          </div>
          
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              onChange({ ...proposal, commercialSummaryDescription: e.target.innerText });
            }}
            className={`text-sm text-[#555555] leading-relaxed text-justify mb-6 min-h-[2em] ${editableTextClass}`}
          >
            {proposal.commercialSummaryDescription || "Based on your immediate requirements, the following is the recommended commercial structure:"}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm mb-4">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#0D1B3E] text-white">
                  <th className="p-4 border-r border-slate-200/25 font-bold w-3/4 select-none">Scope Item / Description</th>
                  <th className="p-4 border-r border-slate-200/25 font-bold text-center w-1/4 select-none">Amount</th>
                  {isEditing && <th className="p-4 font-bold text-center w-12 select-none">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(proposal.commercialSummaryRows || []).map((row, i) => {
                  const isTotalRow = row.item.toLowerCase().includes("total") || row.item.toLowerCase().includes("outlay");
                  return (
                    <tr key={i} className={isTotalRow ? "bg-[#FBF6E5] font-bold" : "bg-slate-50/10"}>
                      <td className="p-3 border-r border-slate-200">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newRows = [...(proposal.commercialSummaryRows || [])];
                            newRows[i] = { ...newRows[i], item: e.target.innerText };
                            onChange({ ...proposal, commercialSummaryRows: newRows });
                          }}
                          className={`w-full ${isTotalRow ? "font-bold text-[#0D1B3E]" : "text-[#222222]"} ${editableTextClass} text-xs`}
                        >
                          {row.item}
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onKeyDown={handleSingleLineKeyDown}
                          onBlur={(e) => {
                            const newRows = [...(proposal.commercialSummaryRows || [])];
                            newRows[i] = { ...newRows[i], amount: e.target.innerText };
                            onChange({ ...proposal, commercialSummaryRows: newRows });
                          }}
                          className={`text-center font-bold px-1 ${editableTextClass} text-xs ${isTotalRow ? "text-[#C9A84C]" : "text-[#222222]"}`}
                        >
                          {row.amount}
                        </div>
                      </td>
                      {isEditing && (
                        <td className="p-3 text-center">
                          <button 
                            type="button" 
                            onClick={() => {
                              const newRows = (proposal.commercialSummaryRows || []).filter((_, idx) => idx !== i);
                              onChange({ ...proposal, commercialSummaryRows: newRows });
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-bold select-none"
                            title="Remove row"
                          >
                            ✕
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isEditing && (
            <button 
              type="button"
              onClick={() => {
                const newRows = [...(proposal.commercialSummaryRows || []), { item: "New Item Description", amount: "AED 5,000" }];
                onChange({ ...proposal, commercialSummaryRows: newRows });
              }}
              className="px-4 py-2 bg-[#0D1B3E] text-white rounded-lg text-xs font-bold hover:bg-[#1a3070] transition-colors shadow-sm select-none mb-4"
            >
              + Add Summary Row
            </button>
          )}
        </section>
      )}

      {/* 10. Commercial Terms */}
      {proposal.terms !== undefined && (
        <section className="relative group p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...proposal, terms: undefined });
              }}
              className="absolute -top-3 -right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="relative mb-6 border-b border-slate-100 pb-3">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => {
                onChange({ ...proposal, termsTitle: e.target.innerText });
              }}
              className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
            >
              {proposal.termsTitle || (proposal.commercialSummaryRows !== undefined ? "10. Commercial Terms & Conditions" : "9. Commercial Terms & Conditions")}
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm mb-4">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#0D1B3E] text-white">
                  <th className="p-4 border-r border-slate-200/25 font-bold w-1/4 select-none">Term</th>
                  <th className="p-4 font-bold select-none">Description</th>
                  {isEditing && <th className="p-4 font-bold text-center w-12 select-none">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(proposal.terms || []).map((term, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-slate-50/10" : "bg-white"}>
                    <td className="p-3 border-r border-slate-200">
                      <div
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onKeyDown={handleSingleLineKeyDown}
                        onBlur={(e) => {
                          const newTerms = [...(proposal.terms || [])];
                          newTerms[i] = { ...newTerms[i], term: e.target.innerText };
                          onChange({ ...proposal, terms: newTerms });
                        }}
                        className={`w-full font-bold ${editableTextClass} text-xs text-[#0D1B3E]`}
                      >
                        {term.term}
                      </div>
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      <div
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newTerms = [...(proposal.terms || [])];
                          newTerms[i] = { ...newTerms[i], description: e.target.innerText };
                          onChange({ ...proposal, terms: newTerms });
                        }}
                        className={`w-full text-xs min-h-[1.5em] ${editableTextClass} text-[#222222]`}
                      >
                        {term.description}
                      </div>
                    </td>
                    {isEditing && (
                      <td className="p-3 text-center">
                        <button 
                          type="button" 
                          onClick={() => {
                            const newTerms = (proposal.terms || []).filter((_, idx) => idx !== i);
                            onChange({ ...proposal, terms: newTerms });
                          }}
                          className="text-red-500 hover:text-red-700 text-xs font-bold select-none"
                          title="Remove term"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isEditing && (
            <button 
              type="button"
              onClick={() => {
                const newTerms = [...(proposal.terms || []), { term: "New Term", description: "Term description details" }];
                onChange({ ...proposal, terms: newTerms });
              }}
              className="px-4 py-2 bg-[#0D1B3E] text-white rounded-lg text-xs font-bold hover:bg-[#1a3070] transition-colors shadow-sm select-none"
            >
              + Add Term
            </button>
          )}
        </section>
      )}

      {/* Custom Sections */}
      {(proposal.customSections || []).map((sec) => (
        <section key={sec.id} className="relative group p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                const updated = (proposal.customSections || []).filter(s => s.id !== sec.id);
                onChange({ ...proposal, customSections: updated });
              }}
              className="absolute -top-3 -right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
            <div className="relative flex-1">
              <div
                contentEditable={isEditing}
                suppressContentEditableWarning
                onKeyDown={handleSingleLineKeyDown}
                onBlur={(e) => {
                  const updated = (proposal.customSections || []).map(s => 
                    s.id === sec.id ? { ...s, title: e.target.innerText } : s
                  );
                  onChange({ ...proposal, customSections: updated });
                }}
                className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
              >
                {sec.title}
              </div>
              <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  const updated = (proposal.customSections || []).map(s => {
                    if (s.id === sec.id) {
                      if (s.points) {
                        return { ...s, content: s.points.join("\n"), points: undefined };
                      } else {
                        return { ...s, points: s.content ? s.content.split("\n").filter(Boolean) : ["New Point"] };
                      }
                    }
                    return s;
                  });
                  onChange({ ...proposal, customSections: updated });
                }}
                className="text-xs text-[#C9A84C] hover:text-[#0D1B3E] font-bold border border-[#C9A84C]/30 px-2.5 py-1 rounded-xl transition-all shadow-sm bg-white hover:bg-slate-50 select-none ml-4"
              >
                {sec.points ? "✍ Switch to Text" : "☰ Switch to Bullets"}
              </button>
            )}
          </div>

          {sec.points ? (
            <div className="space-y-4">
              {sec.points.map((point, pointIdx) => (
                <div key={pointIdx} className="flex gap-3 items-start group/bullet">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mt-2.5 flex-shrink-0 select-none"></span>
                  <div
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    onKeyDown={handleSingleLineKeyDown}
                    onBlur={(e) => {
                      const updated = (proposal.customSections || []).map(s => {
                        if (s.id === sec.id && s.points) {
                          const newPoints = [...s.points];
                          newPoints[pointIdx] = e.target.innerText;
                          return { ...s, points: newPoints };
                        }
                        return s;
                      });
                      onChange({ ...proposal, customSections: updated });
                    }}
                    className={`flex-1 text-sm text-[#222222] leading-relaxed text-justify ${editableTextClass}`}
                  >
                    {point}
                  </div>
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={() => {
                        const updated = (proposal.customSections || []).map(s => {
                          if (s.id === sec.id && s.points) {
                            return { ...s, points: s.points.filter((_, idx) => idx !== pointIdx) };
                          }
                          return s;
                        });
                        onChange({ ...proposal, customSections: updated });
                      }}
                      className="text-red-400 hover:text-red-600 transition-colors text-xs px-2 mt-1.5 opacity-0 group-hover/bullet:opacity-100 font-bold select-none"
                      title="Remove point"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {isEditing && (
                <button 
                  type="button" 
                  onClick={() => {
                    const updated = (proposal.customSections || []).map(s => {
                      if (s.id === sec.id) {
                        return { ...s, points: [...(s.points || []), "New Bullet Point"] };
                      }
                      return s;
                    });
                    onChange({ ...proposal, customSections: updated });
                  }}
                  className="text-xs text-[#C9A84C] hover:text-[#0D1B3E] font-bold mt-2 flex items-center gap-1 transition-colors select-none"
                >
                  + Add Bullet Point
                </button>
              )}
            </div>
          ) : (
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={(e) => {
                const updated = (proposal.customSections || []).map(s => 
                  s.id === sec.id ? { ...s, content: e.target.innerText } : s
                );
                onChange({ ...proposal, customSections: updated });
              }}
              className={`text-sm text-[#222222] leading-relaxed text-justify min-h-[3em] whitespace-pre-wrap font-sans ${editableTextClass}`}
            >
              {sec.content}
            </div>
          )}
        </section>
      ))}

      {/* Layout Customizer Toolbar (Edit Mode Only) */}
      {isEditing && (
        <div className="my-12 py-8 px-6 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 bg-slate-50 hover:bg-slate-100/30 transition-all select-none">
          <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider text-xs">
            <svg className="w-4 h-4 text-[#C9A84C]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21L14.907 20.187M9.813 15.904L14.907 20.187M9.813 15.904l-1.81-1.81a9.027 9.027 0 010-12.766L9 2.25M14.907 20.187l1.81-1.81a9.027 9.027 0 000-12.766L15.75 5.25" />
            </svg>
            <span>Customize Proposal Sections</span>
          </div>
          <p className="text-xs text-slate-400 text-center max-w-md">Delete any section using the ✕ button on hover. Click below to add sections back or insert new custom sections.</p>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {proposal.introduction === undefined && (
              <button
                type="button"
                onClick={() => {
                  const template = getMasterTemplate(proposal.service, proposal.clientName);
                  onChange({ ...proposal, introduction: template.introduction || "About A&M" });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-[#0d1b3e] text-xs font-bold rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all shadow-sm"
              >
                + About
              </button>
            )}
            {proposal.understanding === undefined && (
              <button
                type="button"
                onClick={() => {
                  const template = getMasterTemplate(proposal.service, proposal.clientName);
                  onChange({ ...proposal, understanding: template.understanding || ["Understanding point 1"] });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-[#0d1b3e] text-xs font-bold rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all shadow-sm"
              >
                + Understanding
              </button>
            )}
            {proposal.objectives === undefined && (
              <button
                type="button"
                onClick={() => {
                  const template = getMasterTemplate(proposal.service, proposal.clientName);
                  onChange({ ...proposal, objectives: template.objectives || ["Objective 1"] });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-[#0d1b3e] text-xs font-bold rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all shadow-sm"
              >
                + Objectives
              </button>
            )}
            {proposal.approachTitle === undefined && (
              <button
                type="button"
                onClick={() => {
                  const template = getMasterTemplate(proposal.service, proposal.clientName);
                  onChange({
                    ...proposal,
                    approachTitle: template.approachTitle || "Our Approach",
                    approachDescription: template.approachDescription || "Approach description...",
                    approachFeatures: template.approachFeatures || []
                  });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-[#0d1b3e] text-xs font-bold rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all shadow-sm"
              >
                + Approach
              </button>
            )}
            {proposal.packages === undefined && (
              <button
                type="button"
                onClick={() => {
                  const template = getMasterTemplate(proposal.service, proposal.clientName);
                  onChange({ ...proposal, packages: template.packages || [] });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-[#0d1b3e] text-xs font-bold rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all shadow-sm"
              >
                + Packages Table
              </button>
            )}
            {proposal.addons === undefined && (
              <button
                type="button"
                onClick={() => {
                  const template = getMasterTemplate(proposal.service, proposal.clientName);
                  onChange({ ...proposal, addons: template.addons || [] });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-[#0d1b3e] text-xs font-bold rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all shadow-sm"
              >
                + Add-ons Table
              </button>
            )}
            {proposal.timeline === undefined && (
              <button
                type="button"
                onClick={() => {
                  const template = getMasterTemplate(proposal.service, proposal.clientName);
                  onChange({ ...proposal, timeline: template.timeline || [] });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-[#0d1b3e] text-xs font-bold rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all shadow-sm"
              >
                + Timeline
              </button>
            )}
            {proposal.exclusions === undefined && (
              <button
                type="button"
                onClick={() => {
                  const template = getMasterTemplate(proposal.service, proposal.clientName);
                  onChange({ ...proposal, exclusions: template.exclusions || [] });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-[#0d1b3e] text-xs font-bold rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all shadow-sm"
              >
                + Exclusions
              </button>
            )}
            {proposal.commercialSummaryRows === undefined && (
              <button
                type="button"
                onClick={() => {
                  const template = getMasterTemplate(proposal.service, proposal.clientName);
                  onChange({
                    ...proposal,
                    commercialSummaryTitle: template.commercialSummaryTitle || "9. Commercial Summary — Current Ask",
                    commercialSummaryDescription: template.commercialSummaryDescription || `Recommended commercial structure for the client's campaign:`,
                    commercialSummaryRows: template.commercialSummaryRows || [
                      { item: "Management Retainer Fee", amount: "AED 8,000" },
                      { item: "Advertising Budget (boost/ad spend)", amount: "AED 10,000" },
                      { item: "TOTAL MONTHLY OUTLAY", amount: "AED 18,000" }
                    ]
                  });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-[#0d1b3e] text-xs font-bold rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all shadow-sm"
              >
                + Commercial Summary Table
              </button>
            )}
            {proposal.terms === undefined && (
              <button
                type="button"
                onClick={() => {
                  const template = getMasterTemplate(proposal.service, proposal.clientName);
                  onChange({ ...proposal, terms: template.terms || [] });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-[#0d1b3e] text-xs font-bold rounded-xl hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all shadow-sm"
              >
                + Terms
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const newSection: ProposalCustomSection = {
                  id: `custom_${Date.now()}`,
                  title: "New Custom Section",
                  content: "Enter your custom content here..."
                };
                const currentCustoms = proposal.customSections || [];
                onChange({ ...proposal, customSections: [...currentCustoms, newSection] });
              }}
              className="px-4 py-1.5 bg-[#0D1B3E] hover:bg-[#1a3070] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1"
            >
              <span>+ Custom Text Section</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const newSection: ProposalCustomSection = {
                  id: `custom_${Date.now()}`,
                  title: "New Custom Bullet List",
                  content: "",
                  points: ["New Bullet Point"]
                };
                const currentCustoms = proposal.customSections || [];
                onChange({ ...proposal, customSections: [...currentCustoms, newSection] });
              }}
              className="px-4 py-1.5 bg-[#C9A84C] hover:bg-[#b08f36] text-[#0D1B3E] text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1"
            >
              <span>+ Custom Bullet List</span>
            </button>
          </div>
        </div>
      )}

      {/* 10. Acceptance */}
      {proposal.acceptanceTitle !== undefined && (
        <section className="relative group pt-8 p-6 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100/80">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...proposal, acceptanceTitle: undefined });
              }}
              className="absolute top-4 right-4 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-200"
              title="Remove Section"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="relative mb-6 border-b border-slate-100 pb-3">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onKeyDown={handleSingleLineKeyDown}
              onBlur={(e) => {
                onChange({ ...proposal, acceptanceTitle: e.target.innerText });
              }}
              className={`text-2xl font-black text-[#0D1B3E] font-playfair tracking-tight ${editableTextClass}`}
            >
              {proposal.acceptanceTitle || (proposal.commercialSummaryRows !== undefined ? "11. Acceptance" : "10. Acceptance")}
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-[#C9A84C]"></div>
          </div>
          
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              onChange({ ...proposal, acceptanceText: e.target.innerText });
            }}
            className={`text-sm text-[#222222] leading-relaxed mb-12 min-h-[2em] ${editableTextClass}`}
          >
            {proposal.acceptanceText || `By signing below, both parties agree to the scope, packages, commercial terms, and conditions set out in this quotation. On countersignature, this document becomes a binding agreement between The A&M Internationals (FZC) and ${proposal.clientName}.`}
          </div>
          
          <div className="grid grid-cols-2 gap-16">
            <div>
              <div
                contentEditable={isEditing}
                suppressContentEditableWarning
                onKeyDown={handleSingleLineKeyDown}
                onBlur={(e) => {
                  onChange({ ...proposal, providerSignatory: e.target.innerText });
                }}
                className={`font-bold text-[#0D1B3E] mb-16 ${editableTextClass}`}
              >
                {proposal.providerSignatory || "Sijith Mathew"}
              </div>
              <div className="border-b border-[#CCCCCC] w-full mb-2 h-10 flex items-end">
                <span className="font-serif italic text-2xl text-indigo-900 tracking-wider">Sijith Mathew</span>
              </div>
              <p className="text-xs text-slate-500 mb-12 select-none">Authorised Signatory</p>
              
              <div className="border-b border-[#CCCCCC] w-full mb-2 flex items-end pb-1">
                <span className="font-semibold text-slate-800 text-sm">Sijith Mathew | Co-Founder</span>
              </div>
              <p className="text-xs text-slate-500 mb-12 select-none">Name & Title</p>

              <div className="border-b border-[#CCCCCC] w-full mb-2">
                <input 
                  type="date" 
                  disabled={!isEditing} 
                  value={proposal.createdAt ? proposal.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]} 
                  onChange={(e) => onChange({ ...proposal, createdAt: new Date(e.target.value).toISOString() })}
                  className="bg-transparent border-none p-0 text-sm font-semibold text-slate-800 focus:ring-0 w-full"
                />
              </div>
              <p className="text-xs text-slate-500 select-none">Date</p>
            </div>
            <div>
              <div
                contentEditable={isEditing}
                suppressContentEditableWarning
                onKeyDown={handleSingleLineKeyDown}
                onBlur={(e) => {
                  onChange({ ...proposal, clientSignatory: e.target.innerText });
                }}
                className={`font-bold text-[#0D1B3E] mb-16 ${editableTextClass}`}
              >
                {proposal.clientSignatory || proposal.clientName}
              </div>
              {proposal.status === "accepted" || proposal.status === "won" ? (
                <div className="mb-4">
                  <div className="border-b border-[#CCCCCC] pb-2 h-20 flex items-end">
                    {proposal.clientSignatureImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={proposal.clientSignatureImage} alt="Signature" className="max-h-16 object-contain mix-blend-multiply" />
                    ) : (
                      <p className="font-serif italic text-2xl text-indigo-900 tracking-wider">
                        {proposal.clientSignatureName || proposal.clientName}
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1 select-none">✓ Digitally Signed & Accepted</p>
                </div>
              ) : (
                <div className="border-b border-[#CCCCCC] w-full mb-2 h-10"></div>
              )}
              <p className="text-xs text-slate-500 mb-12 select-none">Authorised Signatory</p>
              
              {proposal.status === "accepted" || proposal.status === "won" ? (
                <p className="font-semibold text-slate-800 border-b border-[#CCCCCC] pb-2 mb-2">
                  {proposal.clientSignatureTitle || "Authorized Signatory"}
                </p>
              ) : (
                <div className="border-b border-[#CCCCCC] w-full mb-2"></div>
              )}
              <p className="text-xs text-slate-500 mb-12 select-none">Name & Title</p>

              {proposal.status === "accepted" || proposal.status === "won" ? (
                <p className="font-semibold text-slate-800 border-b border-[#CCCCCC] pb-2 mb-2">
                  {proposal.signedAt ? new Date(proposal.signedAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString("en-GB")}
                </p>
              ) : (
                <div className="border-b border-[#CCCCCC] w-full mb-2"></div>
              )}
              <p className="text-xs text-slate-500 select-none">Date</p>
            </div>
          </div>

          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onKeyDown={handleSingleLineKeyDown}
            onBlur={(e) => {
              onChange({ ...proposal, footerClosingText: e.target.innerText });
            }}
            className={`w-full text-center font-medium text-[#222222] italic mt-20 ${editableTextClass}`}
          >
            {proposal.footerClosingText || `We look forward to partnering with ${proposal.clientName} to elevate your digital presence.`}
          </div>
          
          <div className="text-center text-[10px] text-slate-400 mt-12 border-t border-slate-200 pt-6 font-medium tracking-wider">
            A&amp;M Internationals (FZC) · Ajman Free Zone, UAE · Licence No. 51609 · theaminternationals.com · am@theaminternational.com · +91 90255 62311
          </div>
        </section>
      )}

    </div>
  );
}




