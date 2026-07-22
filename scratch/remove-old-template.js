const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'proposals', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = 'function DynamicTemplate({';
const endMarker = 'export default function ProposalDetailPage() {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Error: Start or end marker not found.');
  process.exit(1);
}

console.log(`Found start index: ${startIndex}, end index: ${endIndex}`);

// Remove everything from startIndex up to endIndex
const newContent = content.substring(0, startIndex) + '\n\n' + content.substring(endIndex);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully removed legacy DynamicTemplate from page.tsx');
