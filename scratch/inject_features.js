const fs = require('fs');
let userCode = fs.readFileSync('app/(dashboard)/revenue/page.tsx', 'utf8');
const colleagueCode = fs.readFileSync('scratch/revenue_colleague_utf8.tsx', 'utf8');

// 1. Imports
const imports = `import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";`;

if (!userCode.includes('import * as XLSX')) {
  userCode = userCode.replace('import { useAuth } from "@/lib/auth-context";', `import { useAuth } from "@/lib/auth-context";\n${imports}`);
}

// 2. States
if (!userCode.includes('showDownloadMenu')) {
  userCode = userCode.replace('const [showExp, setShowExp] = useState(false);', `const [showExp, setShowExp] = useState(false);\n  const [showDownloadMenu, setShowDownloadMenu] = useState(false);\n  const [revErrors, setRevErrors] = useState<any>({});`);
}

// 3. Functions
const excelStrStart = 'const downloadExcelReport = () => {';
const pdfStrEnd = 'doc.save(`Revenue_Report_${new Date().toISOString().split("T")[0]}.pdf`);\n  };';
const excelIndex = colleagueCode.indexOf(excelStrStart);
const pdfIndex = colleagueCode.indexOf(pdfStrEnd) + pdfStrEnd.length;
const downloadFunctions = colleagueCode.substring(excelIndex, pdfIndex);

if (!userCode.includes(excelStrStart)) {
  userCode = userCode.replace('const openAddRevenue = () => {', `${downloadFunctions}\n\n  const openAddRevenue = () => {`);
}

// 4. Update saveRevenue validation
userCode = userCode.replace(`const saveRevenue = async () => {
    if (!revForm.description || !revForm.amount) {
      alert("Please fill all required fields");
      return;
    }`, `const saveRevenue = async () => {
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

// 5. Update UI Add Revenue Header with Download button
const headerBlockTarget = `<button
                  onClick={openAddRevenue}
                  className="btn-primary"
                  style={{ padding: "5px 12px", fontSize: 11, background: "#22c55e" }}
                >
                  + Add Revenue
                </button>`;
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
userCode = userCode.replace(headerBlockTarget, newHeaderBlock);


// 6. Update Form fields for Errors
// I'll use simple Regex replaces to inject the error classes and labels
// Client Name
userCode = userCode.replace(
  `<select\n                  className="form-input"\n                  value={revForm.clientName || ""}\n                  onChange={(e) =>`,
  `<select\n                  className="form-input"\n                  style={revErrors.clientName ? { borderColor: "#ef4444" } : undefined}\n                  value={revForm.clientName || ""}\n                  onChange={(e) => { setRevErrors({ ...revErrors, clientName: undefined });`
);
userCode = userCode.replace(
  `{dbClients.filter(c => c.active !== false).map((client) => (\n                    <option key={client.id} value={client.company || client.name}>\n                      {client.company || client.name}\n                    </option>\n                  ))}\n                </select>\n              </div>`,
  `{dbClients.filter(c => c.active !== false).map((client) => (\n                    <option key={client.id} value={client.company || client.name}>\n                      {client.company || client.name}\n                    </option>\n                  ))}\n                </select>\n                {revErrors.clientName && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{revErrors.clientName}</p>}\n              </div>`
);

// Description
userCode = userCode.replace(
  `<label className="form-label">Description *</label>\n                <input\n                  className="form-input"\n                  value={revForm.description}\n                  onChange={(e) =>\n                    setRevForm({ ...revForm, description: e.target.value })\n                  }\n                  placeholder="Consulting Fee, Retainer..."\n                />\n              </div>`,
  `<label className="form-label">Description *</label>\n                <input\n                  className="form-input"\n                  style={revErrors.description ? { borderColor: "#ef4444" } : undefined}\n                  value={revForm.description}\n                  onChange={(e) => {\n                    setRevForm({ ...revForm, description: e.target.value });\n                    setRevErrors({ ...revErrors, description: undefined });\n                  }}\n                  placeholder="Consulting Fee, Retainer..."\n                />\n                {revErrors.description && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{revErrors.description}</p>}\n              </div>`
);

// Amount
userCode = userCode.replace(
  `<input\n                    className="form-input"\n                    type="number"\n                    value={revForm.amount}\n                    onChange={(e) =>\n                      setRevForm({ ...revForm, amount: e.target.value })\n                    }\n                    placeholder="0"\n                  />\n                </div>`,
  `<input\n                    className="form-input"\n                    type="number"\n                    style={revErrors.amount ? { borderColor: "#ef4444" } : undefined}\n                    value={revForm.amount}\n                    onChange={(e) => {\n                      setRevForm({ ...revForm, amount: e.target.value });\n                      setRevErrors({ ...revErrors, amount: undefined });\n                    }}\n                    placeholder="0"\n                  />\n                  {revErrors.amount && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{revErrors.amount}</p>}\n                </div>`
);

fs.writeFileSync('app/(dashboard)/revenue/page.tsx', userCode);
console.log("Done patching revenue/page.tsx!");
