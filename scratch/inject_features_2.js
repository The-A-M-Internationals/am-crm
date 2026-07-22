const fs = require('fs');
let userCode = fs.readFileSync('app/(dashboard)/revenue/page.tsx', 'utf8');
const colleagueCode = fs.readFileSync('scratch/revenue_colleague_utf8.tsx', 'utf8');

// 3. Functions
const excelStrStart = 'const downloadExcelReport = () => {';
const pdfStrEnd = 'doc.save(`Revenue_Report_${new Date().toISOString().split("T")[0]}.pdf`);\n  };';
const excelIndex = colleagueCode.indexOf(excelStrStart);
const pdfIndex = colleagueCode.indexOf(pdfStrEnd) + pdfStrEnd.length;
const downloadFunctions = colleagueCode.substring(excelIndex, pdfIndex);

if (!userCode.includes(excelStrStart)) {
  userCode = userCode.replace('  function openAddRevenue() {', `${downloadFunctions}\n\n  function openAddRevenue() {`);
}

// 4. Update saveRevenue validation
if (!userCode.includes('Client Name is required')) {
  userCode = userCode.replace(/async function saveRevenue\(\) \{[\s\S]*?if \(\!revForm\.description \|\| \!revForm\.amount\) \{[\s\S]*?alert\(\"Please fill all required fields\"\);[\s\S]*?return;[\s\S]*?\}/, `async function saveRevenue() {
    let errs: any = {};
    if (!revForm.clientName || !revForm.clientName.trim()) {
      errs.clientName = "Client Name is required";
    }
    if (!revForm.description || !revForm.description.trim()) {
      errs.description = "Description is required";
    }
    if (!revForm.amount || String(revForm.amount).trim() === "") {
      errs.amount = "Amount is required";
    }
    if (Object.keys(errs).length > 0) {
      setRevErrors(errs);
      return;
    }`);
}

// 5. Update UI Add Revenue Header with Download button
// The target in the user's code is at line 971
// <button
//   onClick={openAddRevenue}
//   className="btn-primary"
//   style={{ padding: "5px 12px", fontSize: 11, background: "#22c55e" }}
// >
//   + Add Revenue
// </button>
const headerRegex = /<button\s+onClick=\{openAddRevenue\}\s+className="btn-primary"\s+style=\{\{\s*padding:\s*"5px 12px",\s*fontSize:\s*11,\s*background:\s*"#22c55e"\s*\}\}\s*>\s*\+\s*Add Revenue\s*<\/button>/g;

const newHeaderBlock = `<div className="flex items-center gap-2 relative">
                  <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="btn-primary"
                    style={{ padding: "5px 12px", fontSize: 11, background: "#0D1B3E", color: "white" }}
                  >
                    <svg className="w-4 h-4 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download Report
                  </button>
                  {showDownloadMenu && (
                    <div className="absolute top-10 left-0 w-48 bg-white border rounded-xl shadow-lg z-50 py-2">
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                        onClick={() => {
                          downloadExcelReport();
                          setShowDownloadMenu(false);
                        }}
                      >
                        📊 Excel (.xlsx)
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                        onClick={() => {
                          downloadPDFReport();
                          setShowDownloadMenu(false);
                        }}
                      >
                        📄 PDF Report
                      </button>
                    </div>
                  )}
                  <button
                    onClick={openAddRevenue}
                    className="btn-primary"
                    style={{ padding: "5px 12px", fontSize: 11, background: "#22c55e" }}
                  >
                    + Add Revenue
                  </button>
                </div>`;
userCode = userCode.replace(headerRegex, newHeaderBlock);

fs.writeFileSync('app/(dashboard)/revenue/page.tsx', userCode);
console.log("Done patching revenue/page.tsx functions and buttons!");
