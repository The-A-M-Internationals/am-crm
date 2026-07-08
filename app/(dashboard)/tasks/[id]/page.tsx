"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function TaskOperationalSheet({ params }: { params: { id: string } }) {
  const { id } = params;
  const { crmUser } = useAuth();
  const router = useRouter();
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [localProgress, setLocalProgress] = useState(0);
  const [localDesc, setLocalDesc] = useState("");

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "tasks", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTask({ id: docSnap.id, ...data });
        setLocalProgress(data.progress || 0);
      } else {
        router.push("/tasks");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id, router]);

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-bold animate-pulse">Loading Operational Sheet...</div>;
  }

  if (!task || !crmUser) return null;

  const isLeadOrAdmin = crmUser.role === "admin" || crmUser.role === "lead";
  const isAssignedEmployee = crmUser.uid === task.assignedTo;

  // Security Barrier
  if (crmUser.role === "employee" && !isAssignedEmployee) {
    return (
      <div className="p-10 text-center flex flex-col items-center">
        <h2 className="text-2xl font-black text-red-500 mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-6">This task belongs to another team member.</p>
        <button onClick={() => router.push("/tasks")} className="px-6 py-2 bg-[#0D1B3E] text-white rounded-lg font-bold">Return to Dashboard</button>
      </div>
    );
  }

  const summary = task.projectSummary || "No master brief provided by Admin.";
  const instructions = task.taskInstructions || task.description || "No specific instructions provided by Lead.";

  const handleUpdateLog = async () => {
    if (!localDesc.trim()) return;
    try {
      const newLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        progressPoint: localProgress,
        logText: localDesc,
        authorName: crmUser?.name || "Team Member",
        authorUid: crmUser?.uid || ""
      };
      await updateDoc(doc(db, "tasks", task.id), { 
        activityLogs: arrayUnion(newLog)
      });
      setLocalDesc("");
    } catch (err) {
      console.error(err);
      alert("Failed to commit log.");
    }
  };

  const handleProgressClick = async (newProgress: number) => {
    setLocalProgress(newProgress);
    await updateDoc(doc(db, "tasks", task.id), { progress: newProgress });
    
    // Aggregated real-time project statistics update
    if (task.relatedType === "project" && task.relatedTo) {
      import("firebase/firestore").then(async ({ getDocs, collection, query, where, doc: firestoreDoc, updateDoc: firestoreUpdate }) => {
        const q = query(collection(db, "tasks"), where("relatedTo", "==", task.relatedTo));
        const snap = await getDocs(q);
        let total = 0; let count = 0;
        snap.forEach(d => {
           total += d.id === task.id ? newProgress : (d.data().progress || 0);
           count++;
        });
        const projProgress = count === 0 ? 0 : Math.round(total / count);
        await firestoreUpdate(firestoreDoc(db, "projects", task.relatedTo), { 
          progress: projProgress, 
          updatedAt: new Date().toISOString() 
        });
      });
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 p-8 max-w-[1400px] mx-auto">
        
        {/* A. Main Header Strip (Span 12 Columns) */}
        <div className="xl:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <button onClick={() => router.push("/tasks")} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors font-black shadow-inner">
              ←
            </button>
            <div>
              <h1 className="text-3xl font-black text-[#0D1B3E] tracking-tight">{task.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                {task.clientName && (
                  <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">
                    🏢 {task.clientName}
                  </span>
                )}
                <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100 shadow-sm flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center text-[8px] text-blue-700">
                    {task.assignedToName ? task.assignedToName.charAt(0) : "?"}
                  </div>
                  {task.assignedToName || "Unassigned"}
                </span>
                {task.dueDate && (
                  <span className="text-[11px] font-black uppercase px-3 py-1 rounded tracking-widest shadow-sm border bg-amber-50 text-amber-600 border-amber-200">
                    🎯 Target: {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
             <span className="badge px-4 py-2 text-xs font-black shadow-sm" style={{ background: "#f3f4f6", color: "#4b5563" }}>
               STATUS: {task.status.toUpperCase()}
             </span>
          </div>
        </div>

        {/* B. Left Operational Block: Strategy Scope (Span 5 Columns) */}
        <div className="xl:col-span-5 space-y-6">
          {/* Master Blueprint Container */}
          <div className="crm-card bg-[#0D1B3E] p-6 rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C9A84C] to-yellow-200" />
            <h4 className="text-xs font-black text-[#C9A84C] uppercase tracking-widest mb-4 flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              Master Blueprint
            </h4>
            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700/50 shadow-inner">
              <p className="text-[13px] text-slate-300 leading-loose whitespace-pre-line font-medium font-mono">
                {summary}
              </p>
            </div>
          </div>

          {/* Lead Directions Card */}
          <div className="crm-card bg-white p-6 rounded-2xl border border-blue-200 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500" />
            <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Lead Directions & Scope
            </h4>
            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-inner">
              <p className="text-[13px] text-slate-600 leading-loose whitespace-pre-line font-medium">
                {instructions}
              </p>
            </div>
          </div>
        </div>

        {/* C. Right Operational Block: Production Execution (Span 7 Columns) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          {/* Expanded Milestone Pipeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
               Operational Pipeline
            </h4>
            <div className="relative h-20 w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner flex items-center justify-between px-8">
              {/* Background Track Line */}
              <div className="absolute left-10 right-10 h-2 bg-slate-200 top-1/2 -translate-y-1/2 rounded-full" />
              
              {/* Physics-based Sliding Fill Line */}
              <div 
                className="absolute left-10 h-2 bg-gradient-to-r from-blue-400 to-blue-600 top-1/2 -translate-y-1/2 rounded-full transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                style={{ width: `calc(${localProgress}% - ${localProgress === 100 ? 5 : localProgress === 0 ? 0 : 2.5}rem)` }}
              />

              {[
                { val: 0, label: "Start" },
                { val: 25, label: "Dev" },
                { val: 50, label: "Test" },
                { val: 75, label: "Review" },
                { val: 100, label: "Done" }
              ].map((step) => {
                const isCompleted = localProgress >= step.val;
                const isCurrent = localProgress === step.val;
                return (
                  <button
                    key={step.val}
                    onClick={() => handleProgressClick(step.val)}
                    className="relative group z-10 flex flex-col items-center justify-center focus:outline-none"
                    title={step.label}
                  >
                    <div 
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[13px] font-black transition-all duration-500 ease-out shadow-md ${
                        isCompleted 
                          ? "bg-[#0D1B3E] text-[#C9A84C] border border-[#C9A84C] shadow-[0_0_20px_rgba(201,168,76,0.5)] scale-110" 
                          : "bg-white backdrop-blur-md text-slate-400 border-2 border-slate-200 hover:bg-slate-50 hover:border-blue-300 hover:scale-105"
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute -top-8 text-[12px] font-black text-blue-600 animate-bounce bg-blue-50 px-2.5 py-1 rounded-md shadow-sm border border-blue-100">
                          {step.val}%
                        </span>
                      )}
                      {step.val === 100 && isCompleted ? "✓" : step.val === 0 ? "🚀" : `${step.val}`}
                    </div>
                    <span className={`absolute -bottom-6 text-[10px] font-black uppercase tracking-wider transition-colors ${isCompleted ? "text-blue-600" : "text-slate-400"}`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* The Input Terminal Console (Hidden for Leads/Admins) */}
          {crmUser.role === "employee" && (
            <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-800 flex-1 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#C9A84C]" />
              <label className="text-xs font-black text-[#C9A84C] uppercase tracking-widest block mb-4 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                Terminal Console
              </label>
              
              <div className="relative flex-1 flex flex-col">
                <textarea 
                  value={localDesc}
                  onChange={(e) => setLocalDesc(e.target.value)}
                  placeholder="> System active. Describe engineering actions, blockers, or milestone deliveries..."
                  className="w-full flex-1 min-h-[150px] resize-none text-[13px] p-5 pb-16 bg-slate-950 text-emerald-400 placeholder-emerald-900/50 font-mono border border-slate-800 rounded-xl outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                  style={{ lineHeight: "1.8" }}
                />
                <button 
                  onClick={handleUpdateLog}
                  disabled={!localDesc.trim()}
                  className="absolute bottom-4 right-4 px-6 py-2.5 bg-[#C9A84C] text-[#0D1B3E] rounded-lg text-xs font-black shadow-[0_0_15px_rgba(201,168,76,0.4)] hover:shadow-[0_0_25px_rgba(201,168,76,0.6)] transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0"
                >
                  Commit to Log Sheet
                </button>
              </div>
            </div>
          )}
          
          {/* Filler for leads/admins if console is hidden */}
          {isLeadOrAdmin && (
             <div className="bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex-1 flex items-center justify-center min-h-[250px] opacity-70">
                <div className="text-center">
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-slate-400 mb-3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Input Console Locked</p>
                   <p className="text-[10px] text-slate-400 mt-1">Only the assigned employee can commit execution logs.</p>
                </div>
             </div>
          )}
        </div>

        {/* D. Bottom Span Module: Chronological Activity Sheet (Span 12 Columns) */}
        <div className="xl:col-span-12 mt-4">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
               Chronological Activity Matrix
             </h4>
             
             {isLeadOrAdmin ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <AnimatePresence>
                   {(!task.activityLogs || task.activityLogs.length === 0) ? (
                     <div className="col-span-full py-16 text-center text-slate-400 italic font-medium">
                        No operational actions recorded in matrix.
                     </div>
                   ) : (
                     task.activityLogs.slice().reverse().map((log: any) => (
                       <motion.div 
                         key={log.id} 
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all hover:bg-white"
                       >
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                         <div className="flex justify-between items-start mb-3 pl-2">
                           <div>
                             <span className="block text-[11px] font-black text-[#0D1B3E] uppercase tracking-widest">{log.authorName}</span>
                             <span className="block text-[10px] text-slate-400 font-bold mt-1">
                               {new Date(log.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {new Date(log.timestamp).toLocaleTimeString("en-US", { hour: '2-digit', minute:'2-digit' })}
                             </span>
                           </div>
                           <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md shadow-sm border border-blue-100 flex items-center gap-1.5">
                             <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"></circle></svg>
                             [ {log.progressPoint}% ]
                           </span>
                         </div>
                         <p className="text-[12px] text-slate-600 leading-relaxed font-medium pl-2 whitespace-pre-line">{log.logText}</p>
                       </motion.div>
                     ))
                   )}
                 </AnimatePresence>
               </div>
             ) : (
               <div className="py-20 text-center bg-slate-50 rounded-xl border border-slate-100">
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-slate-300 mb-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                 <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">Matrix Locked</h4>
                 <p className="text-xs text-slate-400 font-medium">Historical audit logs are classified for management only.</p>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
