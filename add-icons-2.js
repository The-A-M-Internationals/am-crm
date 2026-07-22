const fs = require('fs');
const SVGS = {
  tasks: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  calendar: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  team: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/><path d="M12 14c-7 0-7 3-7 3v2h14v-2s0-3-7-3z"/></svg>'
};
const PAGES = {
  tasks: 'app/(dashboard)/tasks/page.tsx',
  calendar: 'app/(dashboard)/calendar/page.tsx',
  team: 'app/(dashboard)/team/page.tsx'
};
for (const [key, filepath] of Object.entries(PAGES)) {
  if (fs.existsSync(filepath)) {
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, (match, p1) => {
      if (p1.includes('A&M CRM')) return match;
      const cleanText = p1.replace(/<svg.*?>.*?<\/svg>/g, '').trim(); 
      return `<h1 className="page-title flex items-center gap-3">\n            ${SVGS[key]}\n            ${cleanText}\n          </h1>`;
    });
    fs.writeFileSync(filepath, content);
    console.log('Updated ' + filepath);
  }
}
