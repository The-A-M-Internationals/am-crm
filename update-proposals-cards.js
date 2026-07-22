const fs = require('fs');

const file = 'app/(dashboard)/proposals/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 p-8 bg-blue-50 text-blue-500 rounded-full opacity-50"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg></div>
          <p className="text-sm font-bold text-slate-500 mb-2 z-10">Total Proposals</p>
          <p className="text-4xl font-black text-[#0D1B3E] z-10">{proposals.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 p-8 bg-emerald-50 text-emerald-500 rounded-full opacity-50"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
          <p className="text-sm font-bold text-slate-500 mb-2 z-10">Accepted</p>
          <p className="text-4xl font-black text-emerald-600 z-10">{proposals.filter(p => ["accepted", "won"].includes(p.status)).length}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 p-8 bg-amber-50 text-amber-500 rounded-full opacity-50"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <p className="text-sm font-bold text-slate-500 mb-2 z-10">Pipeline Value</p>
          <p className="text-4xl font-black text-[#C9A84C] z-10 tracking-tight"><span className="text-xl font-bold text-amber-600/70 mr-1">AED</span>{totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 p-8 bg-purple-50 text-purple-500 rounded-full opacity-50"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg></div>
          <p className="text-sm font-bold text-slate-500 mb-2 z-10">Win Rate</p>
          <p className="text-4xl font-black text-purple-600 z-10">
            {proposals.length > 0 ? Math.round((proposals.filter(p => ["accepted", "won"].includes(p.status)).length / proposals.length) * 100) : 0}%
          </p>
        </div>
      </div>`;

const replacement = `<div className="flex flex-wrap gap-4 mb-6 flex-shrink-0">
        <div className="bg-white rounded-xl p-4 flex-1 border border-slate-200/60 shadow-sm flex items-center justify-between min-w-[200px]">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Proposals</p>
            <p className="text-2xl font-black text-slate-800">{proposals.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg></div>
        </div>
        
        <div className="bg-white rounded-xl p-4 flex-1 border border-slate-200/60 shadow-sm flex items-center justify-between min-w-[200px]">
          <div>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Accepted</p>
            <p className="text-2xl font-black text-emerald-900">{proposals.filter(p => ["accepted", "won"].includes(p.status)).length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
        </div>

        <div className="bg-white rounded-xl p-4 flex-1 border border-slate-200/60 shadow-sm flex items-center justify-between min-w-[200px]">
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Pipeline Value</p>
            <p className="text-2xl font-black text-amber-900 tracking-tight"><span className="text-sm font-bold text-amber-600/70 mr-1">AED</span>{totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        </div>

        <div className="bg-white rounded-xl p-4 flex-1 border border-slate-200/60 shadow-sm flex items-center justify-between min-w-[200px]">
          <div>
            <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">Win Rate</p>
            <p className="text-2xl font-black text-purple-900">
              {proposals.length > 0 ? Math.round((proposals.filter(p => ["accepted", "won"].includes(p.status)).length / proposals.length) * 100) : 0}%
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg></div>
        </div>
      </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Successfully updated proposals styling');
