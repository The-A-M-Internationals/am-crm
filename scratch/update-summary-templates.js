const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'proposal-templates.ts');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. digital-marketing
const dmSearch = `      packageRowLabels: {
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
      },`;
const dmReplace = dmSearch + `\n      commercialSummaryTitle: "9. Commercial Summary — Current Ask",\n      commercialSummaryDescription: \`\${clientCompany} has confirmed the immediate requirement is a Multi-Channel Digital Marketing campaign for lead generation. Based on this, the following is the recommended commercial structure:\`,\n      commercialSummaryRows: [\n        { item: "A&M Management Fee — Growth Package (recommended)", amount: "AED 9,999" },\n        { item: "Recommended Ad Spend (paid directly to networks)", amount: "AED 15,000" },\n        { item: "TOTAL MONTHLY OUTLAY", amount: "AED 24,999" }\n      ],`;

// 2. social-media
const smSearch = `      packageRowLabels: {
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
      },`;
const smReplace = smSearch + `\n      commercialSummaryTitle: "9. Commercial Summary — Current Ask",\n      commercialSummaryDescription: \`\${clientCompany} has confirmed the immediate requirement is Social Media Management. Based on this, the following is the recommended commercial structure:\`,\n      commercialSummaryRows: [\n        { item: "A&M Social Media Management — Growth Retainer (recommended)", amount: "AED 7,999" },\n        { item: "Recommended Ad Boost Budget (optional)", amount: "AED 1,500" },\n        { item: "TOTAL MONTHLY RETENTION OUTLAY", amount: "AED 9,499" }\n      ],`;

// 3. seo
const seoSearch = `      packageRowLabels: {
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
      },`;
const seoReplace = seoSearch + `\n      commercialSummaryTitle: "9. Commercial Summary — Current Ask",\n      commercialSummaryDescription: \`\${clientCompany} has confirmed the immediate requirement is Search Engine Optimization (SEO). Based on this, the following is the recommended commercial structure:\`,\n      commercialSummaryRows: [\n        { item: "A&M On-Page & Technical SEO — Growth Package (recommended)", amount: "AED 8,999" },\n        { item: "Link Building Spend (included)", amount: "AED 0" },\n        { item: "TOTAL MONTHLY Retainer Outlay", amount: "AED 8,999" }\n      ],`;

// 4. web-development
const webSearch = `      packageRowLabels: {
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
      },`;
const webReplace = webSearch + `\n      commercialSummaryTitle: "9. Commercial Summary — Current Ask",\n      commercialSummaryDescription: \`\${clientCompany} has confirmed the immediate requirement is Custom Web Development. Based on this, the following is the recommended commercial structure:\`,\n      commercialSummaryRows: [\n        { item: "A&M Web Development — Corporate Website (recommended)", amount: "AED 15,000" },\n        { item: "Cloud Hosting & Deployment Setup (included)", amount: "AED 0" },\n        { item: "TOTAL PROJECT FEE (50% upfront, 50% on launch)", amount: "AED 15,000" }\n      ],`;

// 5. ui-ux
const uiuxSearch = `      packageRowLabels: {
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
      },`;
const uiuxReplace = uiuxSearch + `\n      commercialSummaryTitle: "9. Commercial Summary — Current Ask",\n      commercialSummaryDescription: \`\${clientCompany} has confirmed the immediate requirement is UI/UX Product Design. Based on this, the following is the recommended commercial structure:\`,\n      commercialSummaryRows: [\n        { item: "A&M UI/UX Design — App Redesign Package (recommended)", amount: "AED 18,000" },\n        { item: "Interactive Prototype & Handoff (included)", amount: "AED 0" },\n        { item: "TOTAL DESIGN FEE (50% upfront, 50% on signoff)", amount: "AED 18,000" }\n      ],`;

// 6. branding
const brandSearch = `      packageRowLabels: {
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
      },`;
const brandReplace = brandSearch + `\n      commercialSummaryTitle: "9. Commercial Summary — Current Ask",\n      commercialSummaryDescription: \`\${clientCompany} has confirmed the immediate requirement is Strategic Brand Forge & Identity Design. Based on this, the following is the recommended commercial structure:\`,\n      commercialSummaryRows: [\n        { item: "A&M Brand Design — Core Identity Package (recommended)", amount: "AED 14,000" },\n        { item: "Full Brand Book & Style Guidelines (included)", amount: "AED 0" },\n        { item: "TOTAL BRANDING FEE (50% upfront, 50% on delivery)", amount: "AED 14,000" }\n      ],`;

// 7. fallback
const fallbackSearch = `    packageRowLabels: {
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
    },`;
const fallbackReplace = fallbackSearch + `\n    commercialSummaryTitle: "9. Commercial Summary — Current Ask",\n    commercialSummaryDescription: \`\${clientCompany} has confirmed the immediate requirement is Professional Services. Based on this, the following is the recommended commercial structure:\`,\n    commercialSummaryRows: [\n      { item: "Professional Service Fee — Premium Engagement (recommended)", amount: "AED 12,000" },\n      { item: "TOTAL ENGAGEMENT FEE", amount: "AED 12,000" }\n    ],`;

// Replace each of them
content = content.replace(dmSearch, dmReplace);
content = content.replace(smSearch, smReplace);
content = content.replace(seoSearch, seoReplace);
content = content.replace(webSearch, webReplace);
content = content.replace(uiuxSearch, uiuxReplace);
content = content.replace(brandSearch, brandReplace);
content = content.replace(fallbackSearch, fallbackReplace);

console.log('Replacing templates...');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Done.');
