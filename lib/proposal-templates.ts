import { Proposal, ServiceTag } from "@/types";

export const getMasterTemplate = (service: ServiceTag, clientCompany: string = "[Client Company]"): Partial<Proposal> => {
  const isRichDocument = true;

  // ---------------------------------------------------------
  // DIGITAL MARKETING TEMPLATE
  // ---------------------------------------------------------
  if (service === "digital-marketing") {
    return {
      isRichDocument,
      introduction: `The A&M Internationals is a UAE-based digital agency (Ajman Free Zone, Licence No. 51609) with a hybrid delivery team across India, the USA, and the UAE. Through our digital marketing division The.am.forge, we help education, healthcare, lifestyle and corporate brands convert their market reputation into predictable, measurable digital growth. This proposal is built specifically for ${clientCompany} with the objective of generating qualified enquiries and brand awareness through a comprehensive multi-channel digital advertising campaign.`,
      understanding: [
        `${clientCompany} aims to capture high-intent digital demand and build local awareness.`,
        `The immediate priority is to increase qualified enquiries, engagement, and conversion rates.`,
        `A multi-channel marketing campaign (combining paid search and target-rich social ads) is ideal for delivering measurable cost-per-lead and building sustainable brand equity.`
      ],
      objectives: [
        `Generate qualified enquiries (leads with contact details) across chosen digital advertising channels.`,
        `Build local brand awareness and engagement for ${clientCompany} in the target catchment area.`,
        `Optimize campaigns daily to maintain a low and competitive cost-per-lead (CPL).`,
        `Provide a clear monthly performance report so the management can see ROI at a glance.`
      ],
      approachTitle: "Our Approach — Multi-Channel Lead Generation",
      approachDescription: "This engagement focuses on implementing high-converting digital advertising campaigns. We leverage channels with active search intent alongside visual social channels to ensure your brand captures current market demand and creates new awareness.",
      approachFeatures: [
        "Ad account configuration and tracking pixel/tag implementation.",
        "Audience research and target segmentation by demographics, interests, and geolocation.",
        "Copywriting and creative design for ad creatives (images, copy variations, CTA buttons).",
        "Landing page or lead form setup optimized for conversions.",
        "A/B testing of creatives, headlines, and audience segments.",
        "Monthly performance reports outlining impressions, clicks, leads, and conversion costs."
      ],
      packages: [
        {
          name: "STARTER",
          bestFor: "First-time advertisers",
          activeCampaigns: "1 Channel / 1 Campaign",
          adCreatives: "2 Creatives",
          optimisation: "Weekly Optimization",
          abTesting: "Basic",
          recommendedSpend: 8000,
          managementFee: 6999,
          reviewCall: "Email updates",
          reporting: "Monthly",
          estimatedLeads: "15 - 25",
          estimatedCostPerLead: "Based on campaign data",
          recommended: false
        },
        {
          name: "GROWTH",
          bestFor: "Established brands",
          activeCampaigns: "2 Channels / 2 Campaigns",
          adCreatives: "4 Creatives",
          optimisation: "Twice Weekly Optimization",
          abTesting: "Yes",
          recommendedSpend: 15000,
          managementFee: 9999,
          reviewCall: "1 Call / Month",
          reporting: "Monthly",
          estimatedLeads: "30 - 50",
          estimatedCostPerLead: "Optimized for lowest CPL",
          recommended: true
        },
        {
          name: "SCALE",
          bestFor: "Aggressive growth drive",
          activeCampaigns: "Multi-channel / Retargeting",
          adCreatives: "6+ Creatives",
          optimisation: "Daily Optimization",
          abTesting: "Advanced (A/B + Multivariate)",
          recommendedSpend: 25000,
          managementFee: 14999,
          reviewCall: "2 Calls / Month",
          reporting: "Bi-weekly & Monthly",
          estimatedLeads: "60 - 95",
          estimatedCostPerLead: "Advanced optimization",
          recommended: false
        }
      ],
      packageRowLabels: {
        bestFor: "Best For",
        activeCampaigns: "Campaign Scope",
        adCreatives: "Ad Creatives / Month",
        optimisation: "Optimization Frequency",
        abTesting: "A/B Testing",
        recommendedSpend: "Recommended Ad Spend",
        managementFee: "Management Fee",
        reviewCall: "Strategy/Review Calls",
        reporting: "Reporting Frequency",
        estimatedLeads: "Est. Lead Range",
        estimatedCostPerLead: "Target CPL Range",
        totalMonthly: "TOTAL MONTHLY Retainer"
      },
      commercialSummaryTitle: "9. Commercial Summary — Current Ask",
      commercialSummaryDescription: `${clientCompany} has confirmed the immediate requirement is a Multi-Channel Digital Marketing campaign for lead generation. Based on this, the following is the recommended commercial structure:`,
      commercialSummaryRows: [
        { item: "A&M Management Fee — Growth Package (recommended)", amount: "AED 9,999" },
        { item: "Recommended Ad Spend (paid directly to networks)", amount: "AED 15,000" },
        { item: "TOTAL MONTHLY OUTLAY", amount: "AED 24,999" }
      ],
      addons: [
        {
          name: "VIDEO REELS ADD-ON",
          deliverables: "Professional video editing of raw footage provided by client, incorporating subtitles, brand elements, and engaging hooks.",
          cost: 2999,
          period: "month"
        },
        {
          name: "LANDING PAGE OPTIMIZATION",
          deliverables: "Design and creation of a high-converting, mobile-responsive landing page specifically for the advertising campaigns.",
          cost: 4999,
          period: "one-time"
        }
      ],
      timeline: [
        { phase: "Phase 1: Setup", activity: "Kick-off, channel planning, tag installation, audience mapping, and ad creatives approval.", duration: "Days 1 – 5" },
        { phase: "Phase 2: Launch", activity: "Campaigns go live, tracking validation, and initial budget calibration.", duration: "Day 6 onwards" },
        { phase: "Phase 3: Scale", activity: "Ongoing optimization, creative refreshes, and performance audits.", duration: "Ongoing" }
      ],
      exclusions: [
        "Ad spend (paid directly to advertising platforms — shown transparently as a separate line; not part of A&M's fee).",
        "Website core design and code development (available as a separate scope if required).",
        "Influencer booking fees and product samples.",
        "Professional on-site shoots unless explicitly contracted."
      ],
      terms: [
        { term: "Engagement Term", description: "Month-to-month retainer. Either party may terminate with 15 days written notice." },
        { term: "Ad Spend", description: `Recommended ad spend is paid by ${clientCompany} directly to the ad network or via pre-funded account.` },
        { term: "Payment Terms", description: "Monthly in advance. Campaign goes live on receipt of payment." },
        { term: "Reporting", description: "Monthly performance report delivered by the 5th of the following month." }
      ],
      companyHeaderTitle: "THE A&M INTERNATIONALS",
      companyHeaderSubtitle: "The.am.forge · Digital Marketing Division",
      documentTypeLabel: "QUOTATION",
      subject: "Digital Marketing Retainer & Lead Generation Proposal",
      preparedByLabel: "The A&M Internationals (FZC) — The.am.forge",
      validityLabel: "30 days from date of issue",
      engagementModelLabel: "Monthly Retainer — Pick & Choose Package",
      tagline: "“ Elevating the World, Elegantly ”",
      currency: "AED",
      aboutTitle: "1. About The A&M Internationals",
      understandingTitle: `2. Our Understanding of ${clientCompany}`,
      objectivesTitle: "3. Objective of This Engagement",
      packagesTitle: "5. Retainer Packages & Retainer Options",
      packagesDescription: "All packages are designed specifically for your goals. Choose the tier that matches your current business pace.",
      addonsTitle: "6. Optional Add-Ons",
      addonsDescription: "These add-ons are offered separately and can be selected to enhance the primary scope.",
      timelineTitle: "7. Execution Timeline",
      exclusionsTitle: "8. What This Quotation Does Not Include",
      termsTitle: "10. Commercial Terms & Conditions",
      acceptanceTitle: "11. Acceptance & Sign-off",
      acceptanceText: `By signing below, both parties agree to the scope, packages, commercial terms, and conditions set out in this quotation. On countersignature, this document becomes a binding agreement between The A&M Internationals (FZC) and ${clientCompany}.`,
      providerSignatory: "The A&M Internationals",
      clientSignatory: clientCompany,
      footerClosingText: `We look forward to partnering with ${clientCompany} to elevate your digital presence.`
    };
  }

  // ---------------------------------------------------------
  // SOCIAL MEDIA TEMPLATE
  // ---------------------------------------------------------
  if (service === "social-media") {
    return {
      isRichDocument,
      introduction: `At The A&M Internationals, we build social-first brands. In today's digital landscape, your social media presence is your digital handshake. This proposal details our social media management strategy, crafted specifically for ${clientCompany} to build an active, engaged community, tell your brand story, and drive customer loyalty.`,
      understanding: [
        `${clientCompany} needs a consistent, high-quality, and aesthetic presence across major social channels.`,
        `The primary challenge is creating unique, engaging content regularly that appeals to your target demographic and aligns with platform algorithms.`,
        `A successful social strategy requires a mix of storytelling, custom graphic design, and short-form video content.`
      ],
      objectives: [
        `Establish a cohesive visual grid and unified brand tone of voice.`,
        `Grow organic reach, profile visits, and engagement (comments, shares, saves).`,
        `Create high-performing short-form videos (Reels/Shorts) to leverage organic algorithms.`,
        `Maintain a reliable content calendar and manage community comments and enquiries.`
      ],
      approachTitle: "Our Approach — Social Media Management",
      approachDescription: "We design social media calendars that blend aesthetic branding with high-value messaging. Our content is planned in monthly sprints, allowing for review, revision, and timely scheduling.",
      approachFeatures: [
        "Social media channel audit and profile optimization (bio, highlights, linkages).",
        "Monthly content calendar development (post design, copywriting, and hashtags).",
        "Custom graphic design for static posts, carousel slides, and stories.",
        "Short-form video editing (Reels, TikTok, or YouTube Shorts).",
        "Scheduling, caption optimization, and basic community comment response.",
        "Monthly analytics reports tracking follower growth, reach, and top content."
      ],
      packages: [
        {
          name: "STARTER SOCIAL",
          bestFor: "Maintaining active profiles",
          activeCampaigns: "3 Posts per Week",
          adCreatives: "Custom Graphics",
          optimisation: "2 Reels / Month Included",
          abTesting: "Instagram + Facebook",
          recommendedSpend: 0,
          managementFee: 4999,
          reviewCall: "Email Review",
          reporting: "Monthly Report",
          estimatedLeads: "Consistently Active Grid",
          estimatedCostPerLead: "Basic Profile Support",
          recommended: false
        },
        {
          name: "GROWTH SOCIAL",
          bestFor: "Active audience building",
          activeCampaigns: "5 Posts per Week",
          adCreatives: "Graphics & Carousels",
          optimisation: "4 Reels / Month Included",
          abTesting: "IG, FB + LinkedIn",
          recommendedSpend: 1500,
          managementFee: 7999,
          reviewCall: "1 Planning Call / Month",
          reporting: "Monthly + Competitor Review",
          estimatedLeads: "Active Community Growth",
          estimatedCostPerLead: "Engagement Focus",
          recommended: true
        },
        {
          name: "ELITE SOCIAL",
          bestFor: "Video-first scaling",
          activeCampaigns: "Daily Content / Story Updates",
          adCreatives: "High-End Visual Identity",
          optimisation: "8 Reels / Month Included",
          abTesting: "All Major Platforms",
          recommendedSpend: 3000,
          managementFee: 11999,
          reviewCall: "2 Calls / Month",
          reporting: "Detailed Analytics + Insights",
          estimatedLeads: "Rapid Organic + Paid Reach",
          estimatedCostPerLead: "Full Service Social",
          recommended: false
        }
      ],
      packageRowLabels: {
        bestFor: "Best For",
        activeCampaigns: "Posting Frequency",
        adCreatives: "Content Format",
        optimisation: "Video / Reel Count",
        abTesting: "Platforms Covered",
        recommendedSpend: "Ad Boost Budget",
        managementFee: "Retainer Fee",
        reviewCall: "Review Meetings",
        reporting: "Analytics Reporting",
        estimatedLeads: "Expected Outcome",
        estimatedCostPerLead: "Community Support",
        totalMonthly: "TOTAL MONTHLY Retainer"
      },
      commercialSummaryTitle: "9. Commercial Summary — Current Ask",
      commercialSummaryDescription: `${clientCompany} has confirmed the immediate requirement is Social Media Management. Based on this, the following is the recommended commercial structure:`,
      commercialSummaryRows: [
        { item: "A&M Social Media Management — Growth Retainer (recommended)", amount: "AED 7,999" },
        { item: "Recommended Ad Boost Budget (optional)", amount: "AED 1,500" },
        { item: "TOTAL MONTHLY RETENTION OUTLAY", amount: "AED 9,499" }
      ],
      addons: [
        {
          name: "ON-SITE SHOOT DAY",
          deliverables: "A videographer visits your location for a half-day shoot to capture raw brand footage and product b-roll for Reels/Shorts.",
          cost: 3500,
          period: "day"
        },
        {
          name: "INFLUENCER OUTREACH PACK",
          deliverables: "Identification, vetting, and coordination with 5 local micro-influencers for product exchanges or sponsored posts.",
          cost: 2500,
          period: "campaign"
        }
      ],
      timeline: [
        { phase: "Phase 1: Discovery & Strategy", activity: "Brand guidelines review, profile optimization, visual style definition, and first content pillar brainstorm.", duration: "Week 1" },
        { phase: "Phase 2: Asset Creation", activity: "Copywriting, graphic design, video editing, and content calendar assembly for approval.", duration: "Week 2" },
        { phase: "Phase 3: Go-Live & Management", activity: "Scheduling posts, daily community check-ins, and performance tracking.", duration: "Ongoing" }
      ],
      exclusions: [
        "Advertising budgets paid to social networks (optional paid boosts).",
        "Handling customer service complaints (we direct queries to your support team).",
        "Sourcing paid stock images or custom copyright fonts (unless provided by client)."
      ],
      terms: [
        { term: "Retainer Period", description: "Month-to-month contract. 15 days cancellation notice." },
        { term: "Approval Window", description: "Client agrees to review and approve content calendars within 3 business days of receipt." },
        { term: "Payment Details", description: "Paid monthly in advance before content creation begins." }
      ],
      companyHeaderTitle: "THE A&M INTERNATIONALS",
      companyHeaderSubtitle: "Social Media Marketing & Management",
      documentTypeLabel: "QUOTATION",
      subject: "Social Media Marketing & Retainer Proposal",
      preparedByLabel: "The A&M Internationals (FZC)",
      validityLabel: "30 days from date of issue",
      engagementModelLabel: "Monthly Retainer — Pick & Choose Package",
      tagline: "“ Elevating the World, Elegantly ”",
      currency: "AED",
      aboutTitle: "1. About The A&M Internationals",
      understandingTitle: `2. Our Understanding of ${clientCompany}`,
      objectivesTitle: "3. Objective of This Engagement",
      packagesTitle: "5. Retainer Packages & Retainer Options",
      packagesDescription: "All packages are designed specifically for your goals. Choose the tier that matches your current business pace.",
      addonsTitle: "6. Optional Add-Ons",
      addonsDescription: "These add-ons are offered separately and can be selected to enhance the primary scope.",
      timelineTitle: "7. Execution Timeline",
      exclusionsTitle: "8. What This Quotation Does Not Include",
      termsTitle: "10. Commercial Terms & Conditions",
      acceptanceTitle: "11. Acceptance & Sign-off",
      acceptanceText: `By signing below, both parties agree to the scope, packages, commercial terms, and conditions set out in this quotation. On countersignature, this document becomes a binding agreement between The A&M Internationals (FZC) and ${clientCompany}.`,
      providerSignatory: "The A&M Internationals",
      clientSignatory: clientCompany,
      footerClosingText: `We look forward to partnering with ${clientCompany} to elevate your digital presence.`
    };
  }

  // ---------------------------------------------------------
  // SEO TEMPLATE
  // ---------------------------------------------------------
  if (service === "seo") {
    return {
      isRichDocument,
      introduction: `The A&M Internationals specializes in organic search acquisition. Search Engine Optimization (SEO) is the highest-yielding digital asset because it captures users who are actively searching for your solutions. This proposal outlines our data-driven SEO strategy for ${clientCompany} designed to fix technical site issues, achieve high keyword rankings, drive organic traffic, and secure inbound leads without ongoing ad spend.`,
      understanding: [
        `${clientCompany} wants to build sustainable, compounding organic web traffic.`,
        `Competing for high-commercial-value terms requires a balanced strategy of technical optimization, keyword alignment, and domain authority building.`,
        `SEO is a long-term asset — once high rankings are achieved, the inbound traffic is free and highly qualified.`
      ],
      objectives: [
        `Audit and resolve website crawlability, layout, and speed issues.`,
        `Rank on the first page of Google for primary services and commercial keywords.`,
        `Optimize metadata, structure, and site copy to improve keyword relevance.`,
        `Build domain authority through strategic backlink acquisition and content marketing.`
      ],
      approachTitle: "Our Three-Pillar SEO Framework",
      approachDescription: "Our search strategy targets Technical health (crawlability and site speed), On-Page relevance (content, titles, headings), and Off-Page authority (link profile). This holistic approach ensures long-term rankings.",
      approachFeatures: [
        "Technical site speed audit, indexing validation, and schema markup setup.",
        "Keyword research, search intent mapping, and competitor rank analysis.",
        "Meta titles, page descriptions, and header hierarchy optimization.",
        "Creating new, search-optimized content (blog articles or service landing pages).",
        "Ethical, white-hat link building and directory authority citations.",
        "Google Search Console tracking and monthly organic keyword reports."
      ],
      packages: [
        {
          name: "LOCAL SEO FORGE",
          bestFor: "Local service companies",
          activeCampaigns: "Up to 10 Target Keywords",
          adCreatives: "Google Map Pack Focus",
          optimisation: "Technical Health Check",
          abTesting: "On-Page Optimization",
          recommendedSpend: 0,
          managementFee: 4999,
          reviewCall: "Quarterly Review Call",
          reporting: "Monthly Rank Report",
          estimatedLeads: "Improved Google Map Visibility",
          estimatedCostPerLead: "Local Authority",
          recommended: false
        },
        {
          name: "ORGANIC GROWTH",
          bestFor: "National brands / B2B",
          activeCampaigns: "Up to 25 Target Keywords",
          adCreatives: "2 Blog Articles / Month Included",
          optimisation: "Advanced Technical Audit",
          abTesting: "Complete On-Page Optimization",
          recommendedSpend: 0,
          managementFee: 8999,
          reviewCall: "Monthly Progress Call",
          reporting: "Rankings + Traffic Report",
          estimatedLeads: "First Page Keyword Rankings",
          estimatedCostPerLead: "compounding traffic",
          recommended: true
        },
        {
          name: "SEO DOMINANCE",
          bestFor: "Competitive sectors / E-commerce",
          activeCampaigns: "50+ Target Keywords",
          adCreatives: "4 Blog Articles / Month Included",
          optimisation: "Weekly Health Monitoring",
          abTesting: "Schema & Landing Page Build",
          recommendedSpend: 2000,
          managementFee: 14999,
          reviewCall: "Bi-weekly Calls",
          reporting: "Advanced ROI Analytics",
          estimatedLeads: "Market Leadership",
          estimatedCostPerLead: "Enterprise Link Building",
          recommended: false
        }
      ],
      packageRowLabels: {
        bestFor: "Best For",
        activeCampaigns: "Keyword Target",
        adCreatives: "Articles / Content",
        optimisation: "Technical Review",
        abTesting: "On-Page Strategy",
        recommendedSpend: "Link Building Spend",
        managementFee: "Monthly SEO Fee",
        reviewCall: "Strategy Calls",
        reporting: "Reporting Type",
        estimatedLeads: "Growth Objective",
        estimatedCostPerLead: "Authority Support",
        totalMonthly: "TOTAL MONTHLY SEO Retainer"
      },
      commercialSummaryTitle: "9. Commercial Summary — Current Ask",
      commercialSummaryDescription: `${clientCompany} has confirmed the immediate requirement is Search Engine Optimization (SEO). Based on this, the following is the recommended commercial structure:`,
      commercialSummaryRows: [
        { item: "A&M On-Page & Technical SEO — Growth Package (recommended)", amount: "AED 8,999" },
        { item: "Link Building Spend (included)", amount: "AED 0" },
        { item: "TOTAL MONTHLY Retainer Outlay", amount: "AED 8,999" }
      ],
      addons: [
        {
          name: "TECHNICAL SPEED BOOSTER",
          deliverables: "One-time technical code-level site speed optimization to improve Google Core Web Vitals score to 90+.",
          cost: 3900,
          period: "one-time"
        },
        {
          name: "SEO COPYWRITING PACK",
          deliverables: "4 additional high-quality, keyword-optimized articles written by our specialized copywriters.",
          cost: 2400,
          period: "pack"
        }
      ],
      timeline: [
        { phase: "Month 1: Technical & Foundation", activity: "Site speed fixes, schema updates, crawling audit, and deep competitor keyword analysis.", duration: "Weeks 1 – 4" },
        { phase: "Month 2: On-Page Forge", activity: "Optimizing metadata, title tag tuning, image compressed alt tags, and structural content rewrites.", duration: "Weeks 5 – 8" },
        { phase: "Month 3 & Beyond: Authority & Scaling", activity: "Organic link outreach, content posting, rank monitoring, and conversion layout optimization.", duration: "Ongoing" }
      ],
      exclusions: [
        "Third-party CMS or hosting fees.",
        "Major website redesigns or migrating site frameworks (quoted separately if required).",
        "Writing core legal terms or privacy policy pages."
      ],
      terms: [
        { term: "Minimum Term", description: "3-month recommended term to see indexable results. 30 days notice applies thereafter." },
        { term: "Rankings Disclaimer", description: "We follow search engine guidelines strictly. We cannot guarantee specific rank positions as search algorithms update frequently." },
        { term: "Payment Details", description: "Monthly in advance." }
      ],
      companyHeaderTitle: "THE A&M INTERNATIONALS",
      companyHeaderSubtitle: "Search Engine Optimization Division",
      documentTypeLabel: "QUOTATION",
      subject: "Search Engine Optimization & Retainer Proposal",
      preparedByLabel: "The A&M Internationals (FZC)",
      validityLabel: "30 days from date of issue",
      engagementModelLabel: "Monthly Retainer — Pick & Choose Package",
      tagline: "“ Elevating the World, Elegantly ”",
      currency: "AED",
      aboutTitle: "1. About The A&M Internationals",
      understandingTitle: `2. Our Understanding of ${clientCompany}`,
      objectivesTitle: "3. Objective of This Engagement",
      packagesTitle: "5. Retainer Packages & Retainer Options",
      packagesDescription: "All packages are designed specifically for your goals. Choose the tier that matches your current business pace.",
      addonsTitle: "6. Optional Add-Ons",
      addonsDescription: "These add-ons are offered separately and can be selected to enhance the primary scope.",
      timelineTitle: "7. Execution Timeline",
      exclusionsTitle: "8. What This Quotation Does Not Include",
      termsTitle: "10. Commercial Terms & Conditions",
      acceptanceTitle: "11. Acceptance & Sign-off",
      acceptanceText: `By signing below, both parties agree to the scope, packages, commercial terms, and conditions set out in this quotation. On countersignature, this document becomes a binding agreement between The A&M Internationals (FZC) and ${clientCompany}.`,
      providerSignatory: "The A&M Internationals",
      clientSignatory: clientCompany,
      footerClosingText: `We look forward to partnering with ${clientCompany} to elevate your digital presence.`
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
      packageRowLabels: {
        bestFor: "Best For",
        activeCampaigns: "Scope / Pages",
        adCreatives: "UI Design / Features",
        optimisation: "SEO & Optimization",
        abTesting: "Integrations / Database",
        recommendedSpend: "Hosting / Setup",
        managementFee: "Development Fee",
        reviewCall: "Revision Rounds",
        reporting: "Handoff / Support",
        estimatedLeads: "Performance",
        estimatedCostPerLead: "Security Grade",
        totalMonthly: "TOTAL PROJECT FEE"
      },
      commercialSummaryTitle: "9. Commercial Summary — Current Ask",
      commercialSummaryDescription: `${clientCompany} has confirmed the immediate requirement is Custom Web Development. Based on this, the following is the recommended commercial structure:`,
      commercialSummaryRows: [
        { item: "A&M Web Development — Corporate Website (recommended)", amount: "AED 15,000" },
        { item: "Cloud Hosting & Deployment Setup (included)", amount: "AED 0" },
        { item: "TOTAL PROJECT FEE (50% upfront, 50% on launch)", amount: "AED 15,000" }
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
      ],
      companyHeaderTitle: "THE A&M INTERNATIONALS",
      companyHeaderSubtitle: "Digital Engineering & Web Development",
      documentTypeLabel: "QUOTATION",
      subject: "Web Development Proposal",
      preparedByLabel: "The A&M Internationals (FZC)",
      validityLabel: "30 days from date of issue",
      engagementModelLabel: "Project-Based Engagement",
      tagline: "“ Elevating the World, Elegantly ”",
      currency: "AED",
      aboutTitle: "1. About The A&M Internationals",
      understandingTitle: `2. Our Understanding of ${clientCompany}`,
      objectivesTitle: "3. Objective of This Engagement",
      packagesTitle: "5. Packages & Scope Options",
      packagesDescription: "All packages are designed specifically for your goals. Choose the tier that matches your current business pace.",
      addonsTitle: "6. Optional Add-Ons",
      addonsDescription: "These add-ons are offered separately and can be selected to enhance the primary scope.",
      timelineTitle: "7. Execution Timeline",
      exclusionsTitle: "8. What This Quotation Does Not Include",
      termsTitle: "10. Commercial Terms & Conditions",
      acceptanceTitle: "11. Acceptance & Sign-off",
      acceptanceText: `By signing below, both parties agree to the scope, packages, commercial terms, and conditions set out in this quotation. On countersignature, this document becomes a binding agreement between The A&M Internationals (FZC) and ${clientCompany}.`,
      providerSignatory: "The A&M Internationals",
      clientSignatory: clientCompany,
      footerClosingText: `We look forward to partnering with ${clientCompany} to elevate your digital presence.`
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
      packageRowLabels: {
        bestFor: "Best For",
        activeCampaigns: "Number of Screens",
        adCreatives: "Visual Style",
        optimisation: "Research / Audit",
        abTesting: "Prototyping",
        recommendedSpend: "Design System",
        managementFee: "Design Fee",
        reviewCall: "Revision Rounds",
        reporting: "Handoff Format",
        estimatedLeads: "User Testing",
        estimatedCostPerLead: "Conversion Focus",
        totalMonthly: "TOTAL DESIGN FEE"
      },
      commercialSummaryTitle: "9. Commercial Summary — Current Ask",
      commercialSummaryDescription: `${clientCompany} has confirmed the immediate requirement is UI/UX Product Design. Based on this, the following is the recommended commercial structure:`,
      commercialSummaryRows: [
        { item: "A&M UI/UX Design — App Redesign Package (recommended)", amount: "AED 18,000" },
        { item: "Interactive Prototype & Handoff (included)", amount: "AED 0" },
        { item: "TOTAL DESIGN FEE (50% upfront, 50% on signoff)", amount: "AED 18,000" }
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
      ],
      companyHeaderTitle: "THE A&M INTERNATIONALS",
      companyHeaderSubtitle: "User Interface & User Experience Design",
      documentTypeLabel: "QUOTATION",
      subject: "UI/UX Design Proposal",
      preparedByLabel: "The A&M Internationals (FZC)",
      validityLabel: "30 days from date of issue",
      engagementModelLabel: "Project-Based Engagement",
      tagline: "“ Elevating the World, Elegantly ”",
      currency: "AED",
      aboutTitle: "1. About The A&M Internationals",
      understandingTitle: `2. Our Understanding of ${clientCompany}`,
      objectivesTitle: "3. Objective of This Engagement",
      packagesTitle: "5. Packages & Design Options",
      packagesDescription: "All packages are designed specifically for your goals. Choose the tier that matches your current business pace.",
      addonsTitle: "6. Optional Add-Ons",
      addonsDescription: "These add-ons are offered separately and can be selected to enhance the primary scope.",
      timelineTitle: "7. Execution Timeline",
      exclusionsTitle: "8. What This Quotation Does Not Include",
      termsTitle: "10. Commercial Terms & Conditions",
      acceptanceTitle: "11. Acceptance & Sign-off",
      acceptanceText: `By signing below, both parties agree to the scope, packages, commercial terms, and conditions set out in this quotation. On countersignature, this document becomes a binding agreement between The A&M Internationals (FZC) and ${clientCompany}.`,
      providerSignatory: "The A&M Internationals",
      clientSignatory: clientCompany,
      footerClosingText: `We look forward to partnering with ${clientCompany} to elevate your digital presence.`
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
      packageRowLabels: {
        bestFor: "Best For",
        activeCampaigns: "Logo Concepts",
        adCreatives: "Visual Identity System",
        optimisation: "Stationery / Collateral",
        abTesting: "Social Media Kit",
        recommendedSpend: "Brand Strategy",
        managementFee: "Branding Fee",
        reviewCall: "Revision Rounds",
        reporting: "Deliverables Format",
        estimatedLeads: "Brand Book",
        estimatedCostPerLead: "Market Focus",
        totalMonthly: "TOTAL BRANDING FEE"
      },
      commercialSummaryTitle: "9. Commercial Summary — Current Ask",
      commercialSummaryDescription: `${clientCompany} has confirmed the immediate requirement is Strategic Brand Forge & Identity Design. Based on this, the following is the recommended commercial structure:`,
      commercialSummaryRows: [
        { item: "A&M Brand Design — Core Identity Package (recommended)", amount: "AED 14,000" },
        { item: "Full Brand Book & Style Guidelines (included)", amount: "AED 0" },
        { item: "TOTAL BRANDING FEE (50% upfront, 50% on delivery)", amount: "AED 14,000" }
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
      ],
      companyHeaderTitle: "THE A&M INTERNATIONALS",
      companyHeaderSubtitle: "Strategic Branding & Visual Identity",
      documentTypeLabel: "QUOTATION",
      subject: "Brand Identity Design Proposal",
      preparedByLabel: "The A&M Internationals (FZC)",
      validityLabel: "30 days from date of issue",
      engagementModelLabel: "Project-Based Engagement",
      tagline: "“ Elevating the World, Elegantly ”",
      currency: "AED",
      aboutTitle: "1. About The A&M Internationals",
      understandingTitle: `2. Our Understanding of ${clientCompany}`,
      objectivesTitle: "3. Objective of This Engagement",
      packagesTitle: "5. Packages & Scope Options",
      packagesDescription: "All packages are designed specifically for your goals. Choose the tier that matches your current business pace.",
      addonsTitle: "6. Optional Add-Ons",
      addonsDescription: "These add-ons are offered separately and can be selected to enhance the primary scope.",
      timelineTitle: "7. Execution Timeline",
      exclusionsTitle: "8. What This Quotation Does Not Include",
      termsTitle: "10. Commercial Terms & Conditions",
      acceptanceTitle: "11. Acceptance & Sign-off",
      acceptanceText: `By signing below, both parties agree to the scope, packages, commercial terms, and conditions set out in this quotation. On countersignature, this document becomes a binding agreement between The A&M Internationals (FZC) and ${clientCompany}.`,
      providerSignatory: "The A&M Internationals",
      clientSignatory: clientCompany,
      footerClosingText: `We look forward to partnering with ${clientCompany} to elevate your digital presence.`
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
    packageRowLabels: {
      bestFor: "Best For",
      activeCampaigns: "Scope",
      adCreatives: "Deliverables",
      optimisation: "Technical Scope",
      abTesting: "Integrations",
      recommendedSpend: "Third-Party Cost",
      managementFee: "Management Fee",
      reviewCall: "Review/Meetings",
      reporting: "Reporting Type",
      estimatedLeads: "Target Goal",
      estimatedCostPerLead: "Service Quality",
      totalMonthly: "TOTAL ENGAGEMENT FEE"
    },
    commercialSummaryTitle: "9. Commercial Summary — Current Ask",
    commercialSummaryDescription: `${clientCompany} has confirmed the immediate requirement is Professional Services. Based on this, the following is the recommended commercial structure:`,
    commercialSummaryRows: [
      { item: "Professional Service Fee — Premium Engagement (recommended)", amount: "AED 12,000" },
      { item: "TOTAL ENGAGEMENT FEE", amount: "AED 12,000" }
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
