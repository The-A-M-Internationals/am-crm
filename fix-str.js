const fs = require('fs');

let c = fs.readFileSync('app/(dashboard)/dashboard/page.tsx', 'utf8');
c = c.replace('alert("Success! Processed reminders. Alerts sent: ${data.emailsSent}");', 'alert(`Success! Processed reminders. Alerts sent: ${data.emailsSent}`);');
c = c.replace('alert("Error: ${data.error || "Failed to trigger"}");', 'alert(`Error: ${data.error || "Failed to trigger"}`);');
fs.writeFileSync('app/(dashboard)/dashboard/page.tsx', c);

let inv = fs.readFileSync('app/(dashboard)/invoice/page.tsx', 'utf8');
inv = inv.replace('alert("Failed to send email!\\n\\nError: ${JSON.stringify(result.error)}`,', 'alert(`Failed to send email!\\n\\nError: ${JSON.stringify(result.error)}`);');
inv = inv.replace('alert("Invoice email sent to ${inv.clientEmail} successfully!");', 'alert(`Invoice email sent to ${inv.clientEmail} successfully!`);');
inv = inv.replace('alert("Network error: ${err.message}");', 'alert(`Network error: ${err.message}`);');
fs.writeFileSync('app/(dashboard)/invoice/page.tsx', inv);

console.log('Fixed quotes in both files');
