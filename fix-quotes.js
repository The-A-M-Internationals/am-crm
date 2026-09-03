const fs = require('fs');
const files = [
  'app/(dashboard)/projects/[id]/page.tsx',
  'app/(dashboard)/tasks/page.tsx'
];
for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/employee"s/g, "employee's");
  fs.writeFileSync(file, c);
}
console.log('Fixed quotes');
