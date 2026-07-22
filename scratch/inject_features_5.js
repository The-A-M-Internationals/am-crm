const fs = require('fs');

let userCodeRaw = fs.readFileSync('app/(dashboard)/revenue/page.tsx', 'utf8');
let userCode = userCodeRaw.replace(/\r\n/g, '\n');

const colleagueCodeRaw = fs.readFileSync('scratch/revenue_colleague_utf8.tsx', 'utf8');
const colleagueCode = colleagueCodeRaw.replace(/\r\n/g, '\n');
const collLines = colleagueCode.split('\n');

// Lines 442 to 973 (0-indexed: 441 to 973)
const funcs = collLines.slice(441, 973).join('\n');

// 1. Imports
const importTarget = 'import { X, Trash2, Pencil } from "lucide-react";';
if (userCode.includes(importTarget)) {
    userCode = userCode.replace(importTarget, importTarget + '\nimport * as XLSX from "xlsx";\nimport { saveAs } from "file-saver";\nimport jsPDF from "jspdf";\nimport autoTable from "jspdf-autotable";');
}

// 2. States
const stateTarget = '  const [showExp, setShowExp] = useState(false);';
if (userCode.includes(stateTarget)) {
    userCode = userCode.replace(stateTarget, '  const [showDownloadMenu, setShowDownloadMenu] = useState(false);\n  const [revErrors, setRevErrors] = useState<any>({});\n' + stateTarget);
}

// 3. Functions insertion
const funcTarget = '  function openAddRevenue() {';
if (userCode.includes(funcTarget)) {
    userCode = userCode.replace(funcTarget, funcs + '\n\n' + funcTarget);
}

// 4. SaveRevenue update
const saveTarget = '  async function saveRevenue() {\n    if (!revForm.description || !revForm.amount) return;';
const saveNew = `  async function saveRevenue() {
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
    }`;
if (userCode.includes(saveTarget)) {
    userCode = userCode.replace(saveTarget, saveNew);
}

// 5. Download Button
const btnTarget = `<button
                  onClick={openAddRevenue}
                  className="btn-primary"
                  style={{ padding: "5px 12px", fontSize: 11, background: "#22c55e" }}
                >
                  + Add Revenue
                </button>`;
const btnNew = `<div className="flex items-center gap-2 relative">
                  <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="btn-primary"
                    style={{ padding: "5px 12px", fontSize: 11, background: "#0D1B3E", color: "white" }}
                  >
                    <svg className="w-4 h-4 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download Report
                  </button>
                  {showDownloadMenu && (
                    <div className="absolute top-10 right-24 w-48 bg-white border rounded-xl shadow-lg z-50 py-2 text-left">
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
if (userCode.includes(btnTarget)) {
    userCode = userCode.replace(btnTarget, btnNew);
}

// 6. Validation Errors in UI
const clientTarget = `<select
                  className="form-input"
                  value={revForm.clientName || ""}
                  onChange={(e) =>`;
if (userCode.includes(clientTarget)) {
    userCode = userCode.replace(clientTarget, `<select
                  className="form-input"
                  style={revErrors.clientName ? { borderColor: "#ef4444" } : undefined}
                  value={revForm.clientName || ""}
                  onChange={(e) => { setRevErrors({ ...revErrors, clientName: undefined });`);
}

const clientEndTarget = `{dbClients.filter(c => c.active !== false).map((client) => (
                    <option key={client.id} value={client.company || client.name}>
                      {client.company || client.name}
                    </option>
                  ))}
                </select>
              </div>`;
if (userCode.includes(clientEndTarget)) {
    userCode = userCode.replace(clientEndTarget, `{dbClients.filter(c => c.active !== false).map((client) => (
                    <option key={client.id} value={client.company || client.name}>
                      {client.company || client.name}
                    </option>
                  ))}
                </select>
                {revErrors.clientName && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{revErrors.clientName}</p>}
              </div>`);
}

const descTarget = `<label className="form-label">Description *</label>
                <input
                  className="form-input"
                  value={revForm.description}
                  onChange={(e) =>
                    setRevForm({ ...revForm, description: e.target.value })
                  }
                  placeholder="Consulting Fee, Retainer..."
                />
              </div>`;
if (userCode.includes(descTarget)) {
    userCode = userCode.replace(descTarget, `<label className="form-label">Description *</label>
                <input
                  className="form-input"
                  style={revErrors.description ? { borderColor: "#ef4444" } : undefined}
                  value={revForm.description}
                  onChange={(e) => {
                    setRevForm({ ...revForm, description: e.target.value });
                    setRevErrors({ ...revErrors, description: undefined });
                  }}
                  placeholder="Consulting Fee, Retainer..."
                />
                {revErrors.description && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{revErrors.description}</p>}
              </div>`);
}

const amtTarget = `<input
                    className="form-input"
                    type="number"
                    value={revForm.amount}
                    onChange={(e) =>
                      setRevForm({ ...revForm, amount: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>`;
if (userCode.includes(amtTarget)) {
    userCode = userCode.replace(amtTarget, `<input
                    className="form-input"
                    type="number"
                    style={revErrors.amount ? { borderColor: "#ef4444" } : undefined}
                    value={revForm.amount}
                    onChange={(e) => {
                      setRevForm({ ...revForm, amount: e.target.value });
                      setRevErrors({ ...revErrors, amount: undefined });
                    }}
                    placeholder="0"
                  />
                  {revErrors.amount && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{revErrors.amount}</p>}
                </div>`);
}

fs.writeFileSync('app/(dashboard)/revenue/page.tsx', userCode);
console.log('SUCCESS');
