const fs = require('fs');

let c = fs.readFileSync('app/(dashboard)/dashboard/page.tsx', 'utf8');
c = c.replace(/✅ /g, '');
c = c.replace(/❌ /g, '');
fs.writeFileSync('app/(dashboard)/dashboard/page.tsx', c);

let inv = fs.readFileSync('app/(dashboard)/invoice/page.tsx', 'utf8');
inv = inv.replace(/✅ /g, '');
inv = inv.replace(/❌ /g, '');
fs.writeFileSync('app/(dashboard)/invoice/page.tsx', inv);

console.log('Cleaned emojis from alerts');
