const fs = require('fs');
const path = require('path');

function fixUseClient(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixUseClient(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let c = fs.readFileSync(fullPath, 'utf8');
      
      // Remove all occurrences of "use client" or 'use client'
      if (c.includes("'use client'") || c.includes('"use client"')) {
        let lines = c.split('\n');
        lines = lines.filter(l => !l.includes("'use client'") && !l.includes('"use client"'));
        c = '"use client";\n' + lines.join('\n');
        fs.writeFileSync(fullPath, c);
      }
    }
  }
}
fixUseClient('app');
console.log('Fixed use client');
