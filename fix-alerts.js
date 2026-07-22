const fs = require('fs');
const path = require('path');

function processFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'api') {
        processFiles(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Fix raw JSX injected into alert/confirm without quotes
      content = content.replace(/alert\(\s*<[A-Za-z0-9]+ className="inline-block w-4 h-4 shrink-0 mr-1" \/> (.*?),\s*\);/gs, 'alert("$1");');
      content = content.replace(/confirm\(\s*<[A-Za-z0-9]+ className="inline-block w-4 h-4 shrink-0 mr-1" \/> (.*?),\s*\);/gs, 'confirm("$1");');

      // Fix JSX strings injected into alert/confirm with quotes/backticks
      content = content.replace(/alert\(\s*[`'"]<[A-Za-z0-9]+ className="inline-block w-4 h-4 shrink-0 mr-1" \/> (.*?)[`'"]\s*\);/gs, 'alert("$1");');
      content = content.replace(/confirm\(\s*[`'"]<[A-Za-z0-9]+ className="inline-block w-4 h-4 shrink-0 mr-1" \/> (.*?)[`'"]\s*\);/gs, 'confirm("$1");');
      
      // Inline fixes (e.g. alert(`<CheckCircle /> message`))
      content = content.replace(/<[A-Za-z0-9]+ className="inline-block w-4 h-4 shrink-0 mr-1" \/>\s*/g, (match, offset, string) => {
        // If it's inside an alert or confirm, remove it!
        // Very hacky but we can just check if the nearest preceding word is alert or confirm
        const before = string.substring(Math.max(0, offset - 50), offset);
        if (before.includes('alert') || before.includes('confirm')) {
           return '';
        }
        return match; // Otherwise keep it
      });

      if (content !== fs.readFileSync(fullPath, 'utf8')) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed alerts in', fullPath);
      }
    }
  }
}

processFiles('app');
