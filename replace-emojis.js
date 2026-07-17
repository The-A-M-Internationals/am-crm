const fs = require('fs');
const path = require('path');

const EMOJI_MAP = {
  "🏝": "CalendarDays",
  "✕": "X",
  "🗑": "Trash2",
  "📝": "ClipboardList",
  "🚀": "Rocket",
  "✅": "CheckCircle2",
  "🤝": "Handshake",
  "📇": "Contact",
  "📄": "FileText",
  "🔍": "Search",
  "📞": "Phone",
  "✉": "Mail",
  "❌": "XCircle",
  "👋": "Hand",
  "🎉": "PartyPopper",
  "🏢": "Building2",
  "📅": "Calendar",
  "🚨": "AlertTriangle",
  "⚠": "AlertTriangle",
  "💰": "DollarSign",
  "📧": "Mail",
  "👁": "Eye",
  "⬇": "ArrowDown",
  "💬": "MessageSquare",
  "✏": "Pencil",
  "📊": "BarChart3",
  "🏆": "Trophy",
  "📉": "TrendingDown",
  "👤": "User",
  "🔔": "Bell",
  "✓": "Check",
  "🎨": "Palette",
  "⚙": "Settings",
  "⚡": "Zap",
  "🔨": "Hammer",
  "🎯": "Target",
  "📋": "Clipboard",
  "🌐": "Globe",
  "🔑": "Key",
  "📱": "Smartphone",
  "📈": "TrendingUp",
  "🎬": "Clapperboard",
  "✨": "Sparkles",
  "✦": "Sparkles",
  "★": "Star",
  "✍": "PenTool",
  "☰": "Menu"
};

function processFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'api') {
        processFiles(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') && !fullPath.includes('api')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      content = content.replace(/(alert|confirm|toast)\(["']([^"']*)["']/g, (match, fn, text) => {
        let clean = text;
        for (const emoji of Object.keys(EMOJI_MAP)) {
          clean = clean.split(emoji).join('').trim();
        }
        clean = clean.replace(/\uFE0F/g, '').trim();
        return `${fn}("${clean}"`;
      });
      
      let usedIcons = new Set();
      let changed = false;
      
      for (const [emoji, iconName] of Object.entries(EMOJI_MAP)) {
        const regex = new RegExp(emoji + '(\\uFE0F)?', 'g');
        if (regex.test(content)) {
          changed = true;
          usedIcons.add(iconName);
          content = content.replace(new RegExp('"' + emoji + '(\\uFE0F)?([^"]*)"', 'g'), `<${iconName} className="inline-block w-4 h-4 shrink-0 mr-1" />$2`);
          content = content.replace(new RegExp("'" + emoji + "(\\uFE0F)?([^']*)'", 'g'), `<${iconName} className="inline-block w-4 h-4 shrink-0 mr-1" />$2`);
          content = content.replace(regex, `<${iconName} className="inline-block w-4 h-4 shrink-0 mr-1" />`);
        }
      }
      
      if (changed) {
        const importStatement = `import { ${Array.from(usedIcons).join(', ')} } from "lucide-react";\n`;
        if (content.includes('"use client";')) {
          content = content.replace('"use client";', '"use client";\n' + importStatement);
        } else {
          content = importStatement + content;
        }
        fs.writeFileSync(fullPath, content);
        console.log(`Updated emojis to Lucide icons in ${fullPath}`);
      }
    }
  }
}

processFiles('app');
