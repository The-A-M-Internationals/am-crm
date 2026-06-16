import { Proposal, ServiceTag } from "@/types";

export const getMasterTemplate = (service: ServiceTag, clientCompany: string = "[Client Company]"): Partial<Proposal> => {
  const isRichDocument = true;

  if (service === "digital-marketing" || service === "social-media" || service === "seo") {
    return {
      isRichDocument,
      introduction: `The A&M Internationals is a UAE-based digital agency (Ajman Free Zone, Licence No. 51609) with a hybrid delivery team across India, the USA, and the UAE. Through our digital marketing division The.am.forge, we help education, healthcare and lifestyle brands convert their physical reputation into predictable, measurable digital growth. This proposal is built specifically for ${clientCompany} with the single, focused objective of generating qualified enquiries through Meta-platform advertising (Facebook & Instagram).`,
      understanding: [
        `${clientCompany} offers services/products targeting a specific audience demographic.`,
        `The immediate priority is to increase awareness, drive engagement, and generate qualified leads.`,
        `The challenge is awareness and reach. The target audience in the catchment area need to discover the brand, see the value proposition, and feel confident enough to take action.`,
        `Meta Ads (Facebook + Instagram) is the most cost-effective channel for this — it precisely targets the right demographic within a defined geographic radius and delivers measurable cost-per-lead.`
      ],
      objectives: [
        `Generate qualified enquiries (leads with phone number) through Meta Ads.`,
        `Build local brand awareness for ${clientCompany} in the target catchment area.`,
        `Deliver a measurable, transparent cost-per-lead so the management knows exactly what each enquiry costs.`,
        `Provide a clear monthly performance report so the management can see ROI at a glance.`
      ],
      approachTitle: "Our Approach — Meta Ads Lead Generation",
      approachDescription: "This engagement is focused exclusively on Meta-platform advertising (Facebook + Instagram). Meta is the best-performing channel because it allows precise targeting and delivers real-time leads at a measurable cost.",
      approachFeatures: [
        "Meta Business Manager & Ads Manager setup (under the client's ownership).",
        "Audience research and targeting setup (by demographics, interests, pin-code / radius).",
        "Ad creative design — static creatives (image ads with brand styling, core offers, CTA).",
        "Lead Form (Meta Instant Form) setup with required fields (Name, Phone, Email, Locality).",
        "Daily campaign monitoring, audience optimisation, A/B testing of creatives and headlines.",
        "Budget pacing — ad spend tracked daily so monthly budget is fully utilised and not over-spent.",
        "WhatsApp delivery of leads as they come in (real-time forwarding to the sales/admission team).",
        "Monthly performance report — impressions, reach, clicks, leads, cost per lead, top-performing creative."
      ],
      packages: [
        {
          name: "STARTER",
          bestFor: "First-time advertisers",
          activeCampaigns: "1",
          adCreatives: "2",
          optimisation: "Weekly",
          abTesting: "—",
          recommendedSpend: 8000,
          managementFee: 6999,
          reviewCall: "—",
          reporting: "Monthly",
          estimatedLeads: "15 - 25",
          estimatedCostPerLead: "₹320 - ₹550",
          recommended: false
        },
        {
          name: "GROWTH",
          bestFor: "Established brands",
          activeCampaigns: "2",
          adCreatives: "3",
          optimisation: "Twice weekly",
          abTesting: "Yes",
          recommendedSpend: 15000,
          managementFee: 9999,
          reviewCall: "1 per month",
          reporting: "Monthly",
          estimatedLeads: "30 - 50",
          estimatedCostPerLead: "₹300 - ₹500",
          recommended: true
        },
        {
          name: "SCALE",
          bestFor: "Aggressive growth drive",
          activeCampaigns: "2 + retargeting",
          adCreatives: "5",
          optimisation: "Daily",
          abTesting: "Yes (advanced)",
          recommendedSpend: 25000,
          managementFee: 14999,
          reviewCall: "2 per month",
          reporting: "Bi-weekly + Monthly",
          estimatedLeads: "60 - 95",
          estimatedCostPerLead: "₹280 - ₹450",
          recommended: false
        }
      ],
      addons: [
        {
          name: "VIDEO – BASIC",
          deliverables: "1 Reel / Short Video per month (edit only) • Client staff records the raw footage on a phone • Background music, captions, branding • 1 revision included",
          cost: 2499,
          period: "month"
        },
        {
          name: "VIDEO – STANDARD",
          deliverables: "3 Reels / Short Videos per month (edit only) • Client staff records the raw footage on a phone • Professional editing, music, captions, branding • Posting on Instagram, Facebook, YouTube Shorts • 1 revision per video included",
          cost: 6999,
          period: "month"
        },
        {
          name: "VIDEO – PREMIUM",
          deliverables: "3 Reels + 1 on-site shoot day per month • Professional videographer at the premises • Cinematic edit, music, captions, branding, colour grade • Posting on Instagram, Facebook, YouTube Shorts • 2 revisions per video included • Travel within city limits included",
          cost: 17999,
          period: "month"
        }
      ],
      timeline: [
        {
          phase: "Phase 1",
          activity: "Kick-off · Meta Business Manager setup · Pixel installation · Lead Form build · Audience research · First 2 ad creatives",
          duration: "Days 1 – 3"
        },
        {
          phase: "Phase 2",
          activity: "Campaign goes live · Daily monitoring · Audience optimisation · A/B creative testing · Lead delivery via WhatsApp",
          duration: "Day 4 onwards"
        },
        {
          phase: "Phase 3",
          activity: "Performance review · Creative refresh · Audience refinement · Monthly report delivery",
          duration: "Ongoing"
        }
      ],
      exclusions: [
        "Meta ad spend (paid directly to Meta — shown transparently as a separate budget line; not part of A&M's fee).",
        "Website design and development (available as a separate scope if required).",
        "Google Ads, YouTube Ads, or any platform outside Meta (Facebook & Instagram) unless specified.",
        "Influencer marketing or paid PR activities.",
        "Printing of physical materials (brochures, banners, flyers).",
        "Any work outside the chosen package — will be quoted separately as an add-on or a change order."
      ],
      terms: [
        { term: "Engagement Term", description: "Month-to-month retainer. Either party may terminate with 15 days written notice. No long-term lock-in." },
        { term: "Invoicing", description: "Monthly, in advance. Each invoice covers the upcoming month's management fee + ad-spend top-up (if routed through A&M)." },
        { term: "Ad Spend", description: `Recommended ad spend is paid by ${clientCompany}. The client may pay Meta directly via card, or route it through A&M (no markup — fully transparent).` },
        { term: "Payment Terms", description: "Net 7 from invoice date. Campaign goes live on receipt of the first month's payment." },
        { term: "Reporting", description: "Monthly performance report (PDF) delivered by the 5th of every month for the previous month." },
        { term: "Account Ownership", description: `All ad accounts, Pixel, Lead Forms, and campaign assets are created under ${clientCompany}'s ownership. The client retains full ownership at all times.` },
        { term: "Lead Ownership", description: `All leads belong exclusively to ${clientCompany} and are delivered in real time. No leads are shared with any other party.` },
        { term: "Performance Estimates", description: "Lead and CPL estimates are based on industry benchmarks. Actual results depend on ad spend, creative quality, audience size, seasonality, and competition. A&M does not guarantee a fixed number of leads." },
        { term: "Governing Law", description: "This engagement is governed by the laws of the United Arab Emirates. Disputes shall be resolved by mutual agreement in the first instance." }
      ]
    };
  }

  // Fallback for other services (Web Dev, UI/UX) - can be expanded later
  return {
    isRichDocument: false,
    introduction: `The A&M Internationals is a UAE-based digital agency. This proposal outlines our professional services for ${clientCompany}.`,
    understanding: [
      `${clientCompany} requires professional technical and design services.`,
      `The objective is to deliver a high-quality, scalable solution.`
    ],
    terms: [
      { term: "Payment Terms", description: "50% advance, 50% on completion." },
      { term: "Validity", description: "This quotation is valid for 15 days." }
    ]
  };
};
