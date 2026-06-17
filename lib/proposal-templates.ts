import { Proposal, ServiceTag } from "@/types";

export const getMasterTemplate = (service: ServiceTag, clientCompany: string = "[Client Company]"): Partial<Proposal> => {
  const isRichDocument = true;

  // ---------------------------------------------------------
  // DIGITAL MARKETING, SOCIAL MEDIA, SEO TEMPLATE
  // ---------------------------------------------------------
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
        { phase: "Phase 1", activity: "Kick-off · Meta Business Manager setup · Pixel installation · Lead Form build", duration: "Days 1 – 3" },
        { phase: "Phase 2", activity: "Campaign goes live · Daily monitoring · Audience optimisation", duration: "Day 4 onwards" },
        { phase: "Phase 3", activity: "Performance review · Creative refresh · Audience refinement", duration: "Ongoing" }
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

  // ---------------------------------------------------------
  // WEB DEVELOPMENT TEMPLATE (Placeholder for future update)
  // ---------------------------------------------------------
  if (service === "web-development") {
    return {
      isRichDocument,
      introduction: `The A&M Internationals is a premier digital engineering and development agency. We specialize in building robust, scalable, and high-performance web applications. This proposal outlines the technical architecture, frontend and backend development phases, and deployment strategy tailored specifically for ${clientCompany}.`,
      understanding: [
        `${clientCompany} requires a modern, responsive, and highly performant web presence.`,
        `The platform must be secure, user-friendly, and optimized for search engines and conversions.`,
        `Key functionalities will include custom integrations, content management, and scalable infrastructure.`
      ],
      objectives: [
        `Deliver a fully responsive, pixel-perfect web application aligned with brand guidelines.`,
        `Implement a secure, scalable backend architecture to support future growth.`,
        `Ensure optimal page load speeds, SEO compliance, and accessibility standards.`,
        `Provide comprehensive QA testing and seamless cloud deployment.`
      ],
      approachTitle: "Our Approach — Agile Web Development",
      approachDescription: "We utilize an agile development methodology, ensuring transparency, continuous feedback, and rapid iterations throughout the software development lifecycle.",
      approachFeatures: [
        "Requirement analysis and technical stack selection.",
        "Architecture planning and database schema design.",
        "Iterative frontend and backend development sprints.",
        "Rigorous Quality Assurance (QA) and cross-browser testing.",
        "Cloud hosting setup, CI/CD pipeline configuration, and final deployment."
      ],
      packages: [
        {
          name: "LANDING PAGE",
          bestFor: "Single product/event campaigns",
          activeCampaigns: "1 Page",
          adCreatives: "Custom UI",
          optimisation: "Basic SEO",
          abTesting: "Contact Form",
          recommendedSpend: 0,
          managementFee: 5000,
          reviewCall: "1 Revision",
          reporting: "Post-launch",
          estimatedLeads: "Fast Loading",
          estimatedCostPerLead: "Mobile Ready",
          recommended: false
        },
        {
          name: "CORPORATE WEBSITE",
          bestFor: "Established businesses",
          activeCampaigns: "Up to 10 Pages",
          adCreatives: "CMS Integration",
          optimisation: "Advanced SEO",
          abTesting: "Analytics Setup",
          recommendedSpend: 0,
          managementFee: 15000,
          reviewCall: "2 Revisions",
          reporting: "Training Session",
          estimatedLeads: "High Performance",
          estimatedCostPerLead: "Secure Hosting",
          recommended: true
        },
        {
          name: "CUSTOM WEB APP",
          bestFor: "Complex platforms/SaaS",
          activeCampaigns: "Unlimited",
          adCreatives: "Custom Backend",
          optimisation: "API Integrations",
          abTesting: "User Auth & DB",
          recommendedSpend: 0,
          managementFee: 35000,
          reviewCall: "Agile Sprints",
          reporting: "Weekly Demos",
          estimatedLeads: "Fully Scalable",
          estimatedCostPerLead: "Enterprise Grade",
          recommended: false
        }
      ],
      addons: [
        { name: "MAINTENANCE - BASIC", deliverables: "Monthly security patches, uptime monitoring, and minor text updates.", cost: 1500, period: "month" },
        { name: "MAINTENANCE - PRO", deliverables: "Weekly backups, plugin updates, 5 hours of developer time for new features.", cost: 4500, period: "month" }
      ],
      timeline: [
        { phase: "Phase 1: Architecture & Discovery", activity: "Requirement gathering, tech stack selection, and database design.", duration: "Week 1 - 2" },
        { phase: "Phase 2: Frontend & Backend Implementation", activity: "Core development, API integrations, and CMS setup.", duration: "Week 3 - 6" },
        { phase: "Phase 3: Cloud Deployment & QA", activity: "Security testing, performance optimization, and go-live.", duration: "Week 7" }
      ],
      exclusions: [
        "Domain name registration and third-party SaaS subscription costs.",
        "Ongoing content creation or copywriting services (unless explicitly stated).",
        "Video production or custom photography."
      ],
      terms: [
        { term: "Payment Terms", description: "50% advance to initiate the project, 25% upon design approval, 25% prior to final deployment." },
        { term: "Intellectual Property", description: `Upon final payment, all source code and design assets will be transferred to ${clientCompany}.` },
        { term: "Warranty", description: "30-day post-launch bug fixing and support warranty included." }
      ]
    };
  }

  // ---------------------------------------------------------
  // UI/UX DESIGN TEMPLATE (Placeholder for future update)
  // ---------------------------------------------------------
  if (service === "ui-ux") {
    return {
      isRichDocument,
      introduction: `The A&M Internationals brings digital products to life through human-centric design. We bridge the gap between user needs and business goals. This proposal outlines our strategic approach to User Interface and User Experience (UI/UX) design for ${clientCompany}.`,
      understanding: [
        `${clientCompany} requires an intuitive, frictionless digital experience to improve user retention.`,
        `The interface must reflect the brand's premium positioning while remaining highly accessible.`,
        `A scalable design system is needed to maintain consistency across all digital touchpoints.`
      ],
      objectives: [
        `Conduct deep user research to inform architectural decisions.`,
        `Design a modern, intuitive interface that maximizes user engagement and conversion.`,
        `Deliver a comprehensive, developer-ready Design System.`,
        `Provide interactive prototypes to validate user journeys before development.`
      ],
      approachTitle: "Our Approach — Human-Centric Design",
      approachDescription: "Our design process is rooted in empathy and data. We iterate rapidly from low-fidelity wireframes to polished interfaces, ensuring every pixel serves a purpose.",
      approachFeatures: [
        "Stakeholder workshops and user persona development.",
        "Information architecture and comprehensive wireframing.",
        "High-fidelity UI design using Figma.",
        "Interactive prototyping for user testing and stakeholder approval.",
        "Complete developer handoff with assets and style guides."
      ],
      packages: [
        {
          name: "UX AUDIT",
          bestFor: "Existing products",
          activeCampaigns: "Heuristic Evaluation",
          adCreatives: "Usability Testing",
          optimisation: "Competitor Benchmarking",
          abTesting: "Redesign Recommendations",
          recommendedSpend: 0,
          managementFee: 8000,
          reviewCall: "Presentation",
          reporting: "PDF Report",
          estimatedLeads: "Actionable Insights",
          estimatedCostPerLead: "Quick Turnaround",
          recommended: false
        },
        {
          name: "APP REDESIGN",
          bestFor: "Outdated interfaces",
          activeCampaigns: "Up to 15 Screens",
          adCreatives: "New Visual Identity",
          optimisation: "Design System Build",
          abTesting: "Interactive Prototype",
          recommendedSpend: 0,
          managementFee: 18000,
          reviewCall: "2 Revisions",
          reporting: "Figma Handoff",
          estimatedLeads: "Modern Look",
          estimatedCostPerLead: "Improved Conversion",
          recommended: true
        },
        {
          name: "FULL PRODUCT DESIGN",
          bestFor: "New startups/SaaS",
          activeCampaigns: "Unlimited Screens",
          adCreatives: "Deep User Research",
          optimisation: "Complex Workflows",
          abTesting: "User Testing Sessions",
          recommendedSpend: 0,
          managementFee: 40000,
          reviewCall: "Iterative Sprints",
          reporting: "Full Component Library",
          estimatedLeads: "Zero to One",
          estimatedCostPerLead: "Enterprise Ready",
          recommended: false
        }
      ],
      addons: [
        { name: "BRANDING PACK", deliverables: "Logo design, color palette, typography selection, and brand guidelines document.", cost: 7500, period: "project" },
        { name: "CUSTOM ILLUSTRATIONS", deliverables: "Set of 10 bespoke vector illustrations tailored to the brand style.", cost: 3500, period: "project" }
      ],
      timeline: [
        { phase: "Phase 1: User Research & Personas", activity: "Stakeholder interviews, user journey mapping, and architecture planning.", duration: "Week 1 - 2" },
        { phase: "Phase 2: Wireframing & UX", activity: "Low-fidelity wireframes and structural validation.", duration: "Week 3 - 4" },
        { phase: "Phase 3: High-Fidelity UI Design", activity: "Visual design, prototyping, and developer handoff.", duration: "Week 5 - 6" }
      ],
      exclusions: [
        "Frontend or backend software development (design only).",
        "Copywriting (lorem ipsum will be used unless copy is provided).",
        "Purchase of premium stock photography or third-party fonts."
      ],
      terms: [
        { term: "Payment Terms", description: "50% advance, 50% upon final Figma file handoff." },
        { term: "Revisions", description: "Packages include 2 rounds of structural revisions. Additional revisions billed hourly." },
        { term: "Intellectual Property", description: `All design assets and source files belong to ${clientCompany} upon full payment.` }
      ]
    };
  }

  // ---------------------------------------------------------
  // BRANDING TEMPLATE (Placeholder for future update)
  // ---------------------------------------------------------
  if (service === "branding") {
    return {
      isRichDocument,
      introduction: `At The A&M Internationals, we believe a brand is more than just a logo—it's a promise, an identity, and a feeling. We specialize in forging unforgettable brand identities that resonate with your target audience. This proposal details our strategy for defining and visualizing the core essence of ${clientCompany}.`,
      understanding: [
        `${clientCompany} is entering a competitive market and requires a distinct, memorable visual identity.`,
        `The brand needs to communicate trust, premium quality, and innovation to its audience.`,
        `A cohesive brand system is required to ensure consistency across print, digital, and physical mediums.`
      ],
      objectives: [
        `Uncover the core brand archetype and articulate the brand story.`,
        `Design a timeless, versatile logo and comprehensive visual identity system.`,
        `Create a definitive Brand Guidelines document to govern all future communications.`,
        `Develop essential marketing collateral to support immediate operational needs.`
      ],
      approachTitle: "Our Approach — Strategic Brand Forge",
      approachDescription: "We start with strategy, diving deep into market research and brand positioning before a single pixel is drawn. Our design choices are intentional, driven by psychology and market differentiation.",
      approachFeatures: [
        "Discovery workshops and competitor landscape analysis.",
        "Moodboarding and visual direction alignment.",
        "Logo conceptualization, refinement, and finalization.",
        "Typography, color psychology, and graphical element selection.",
        "Delivery of a complete, actionable Brand Book."
      ],
      packages: [
        {
          name: "BRAND REFRESH",
          bestFor: "Minor visual updates",
          activeCampaigns: "Logo Modernization",
          adCreatives: "Updated Color Palette",
          optimisation: "Basic Typography",
          abTesting: "—",
          recommendedSpend: 0,
          managementFee: 6000,
          reviewCall: "1 Revision",
          reporting: "Mini Style Guide",
          estimatedLeads: "Quick Update",
          estimatedCostPerLead: "Digital Focus",
          recommended: false
        },
        {
          name: "CORE IDENTITY",
          bestFor: "New startups",
          activeCampaigns: "3 Logo Concepts",
          adCreatives: "Full Color & Type System",
          optimisation: "Business Cards & Letterhead",
          abTesting: "Social Media Kit",
          recommendedSpend: 0,
          managementFee: 14000,
          reviewCall: "2 Revisions",
          reporting: "Full Brand Book",
          estimatedLeads: "Comprehensive",
          estimatedCostPerLead: "Market Ready",
          recommended: true
        },
        {
          name: "CORPORATE REBRAND",
          bestFor: "Enterprise overhaul",
          activeCampaigns: "Unlimited Concepts",
          adCreatives: "Extensive Brand Strategy",
          optimisation: "Full Marketing Collateral",
          abTesting: "Packaging/Merch Design",
          recommendedSpend: 0,
          managementFee: 28000,
          reviewCall: "Iterative Workshops",
          reporting: "Executive Brand Bible",
          estimatedLeads: "Strategic",
          estimatedCostPerLead: "Physical & Digital",
          recommended: false
        }
      ],
      addons: [
        { name: "PITCH DECK DESIGN", deliverables: "Custom 15-slide PowerPoint/Keynote pitch deck aligned with the new brand.", cost: 4000, period: "project" },
        { name: "PACKAGING DESIGN", deliverables: "Custom box, label, and unboxing experience design for one core product line.", cost: 6500, period: "project" }
      ],
      timeline: [
        { phase: "Phase 1: Brand Strategy & Discovery", activity: "Market research, moodboards, and positioning.", duration: "Week 1 - 2" },
        { phase: "Phase 2: Identity Design", activity: "Logo concepts, color palette, and typography.", duration: "Week 3 - 4" },
        { phase: "Phase 3: Collateral & Guidelines", activity: "Stationery design, social kits, and Brand Book handover.", duration: "Week 5 - 6" }
      ],
      exclusions: [
        "Printing costs for physical business cards, letterheads, or merchandise.",
        "Trademark registration or legal IP services.",
        "Website development or digital marketing execution."
      ],
      terms: [
        { term: "Payment Terms", description: "50% advance, 50% upon delivery of the final Brand Book." },
        { term: "Revisions", description: "Includes specified rounds of revision. Total redesigns after concept approval billed separately." },
        { term: "Intellectual Property", description: `Full copyright of the finalized logo and brand assets transfers to ${clientCompany} upon payment.` }
      ]
    };
  }

  // ---------------------------------------------------------
  // GENERIC FALLBACK (Other Services)
  // ---------------------------------------------------------
  return {
    isRichDocument: true, // Now EVERYTHING gets the rich layout!
    introduction: `The A&M Internationals is a premier agency delivering top-tier professional services across the UAE and globally. This proposal outlines our tailored execution strategy specifically developed for ${clientCompany}.`,
    understanding: [
      `${clientCompany} requires specialized professional services to achieve their strategic objectives.`,
      `The priority is delivering a high-quality, scalable solution on time and within budget.`,
      `We understand the unique challenges of your sector and have formulated a plan to ensure success.`
    ],
    objectives: [
      `Deliver outstanding results aligned with the client's strategic vision.`,
      `Ensure transparent communication and milestone tracking throughout the project.`,
      `Provide long-term value and measurable return on investment.`
    ],
    approachTitle: "Our Approach — Professional Excellence",
    approachDescription: "We utilize a proven, systematic methodology to execute projects. Our team focuses on collaboration, precision, and delivering tangible business outcomes.",
    approachFeatures: [
      "Dedicated account management and strategic consulting.",
      "Comprehensive requirement gathering and scoping.",
      "Agile execution with regular review checkpoints.",
      "Rigorous quality assurance prior to final delivery."
    ],
    packages: [
      {
        name: "STANDARD ENGAGEMENT",
        bestFor: "Core requirements",
        activeCampaigns: "Standard Scope",
        adCreatives: "Standard Delivery",
        optimisation: "Standard Support",
        abTesting: "—",
        recommendedSpend: 0,
        managementFee: 5000,
        reviewCall: "Monthly",
        reporting: "Final Report",
        estimatedLeads: "Reliable",
        estimatedCostPerLead: "Cost Effective",
        recommended: false
      },
      {
        name: "PREMIUM ENGAGEMENT",
        bestFor: "Comprehensive needs",
        activeCampaigns: "Extended Scope",
        adCreatives: "Priority Delivery",
        optimisation: "Priority Support",
        abTesting: "Advanced Features",
        recommendedSpend: 0,
        managementFee: 12000,
        reviewCall: "Bi-weekly",
        reporting: "Detailed Analytics",
        estimatedLeads: "High Impact",
        estimatedCostPerLead: "Best Value",
        recommended: true
      }
    ],
    addons: [],
    timeline: [
      { phase: "Phase 1: Discovery", activity: "Kick-off, planning, and resource allocation.", duration: "Week 1" },
      { phase: "Phase 2: Execution", activity: "Core project work and milestone reviews.", duration: "Weeks 2-4" },
      { phase: "Phase 3: Handoff", activity: "Final delivery, training, and closure.", duration: "Week 5" }
    ],
    exclusions: [
      "Any third-party software licenses or subscription fees.",
      "Work explicitly outside the agreed-upon scope of work."
    ],
    terms: [
      { term: "Payment Terms", description: "50% advance, 50% on project completion." },
      { term: "Validity", description: "This quotation is valid for 15 days from the date of issue." },
      { term: "Governing Law", description: "This engagement is governed by the laws of the United Arab Emirates." }
    ]
  };
};
