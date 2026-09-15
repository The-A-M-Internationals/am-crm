const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/tasks/page.tsx', 'utf-8');

// 1. EMPTY_FORM
content = content.replace(
  'assignedTo: "", assignedToName: "",',
  'assignedTo: [] as string[], assignedToName: [] as string[],'
);

// 2. Loading logic in openEdit
content = content.replace(
  'assignedTo: t.assignedTo ?? "",',
  'assignedTo: Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []), \n      assignedToName: Array.isArray(t.assignedToName) ? t.assignedToName : (t.assignedToName ? [t.assignedToName] : []),'
);
content = content.replace(
  'assignedToName: t.assignedToName ?? "", clientId: t.clientId ?? "", clientName: t.clientName ?? "",',
  'clientId: t.clientId ?? "", clientName: t.clientName ?? "",'
);

// 3. quickAddFromProject
content = content.replace(
  'assignedTo: form.assignedTo ? [form.assignedTo] : []',
  'assignedTo: form.assignedTo || []'
);

// 4. handleSave
const startPattern = '// Create a notification for the assignee';
const endPattern = 'setShowModal(false);';

const startIndex = content.indexOf(startPattern);
const endIndex = content.indexOf(endPattern, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newBlock = `// Create notifications and send emails for all assignees
        for (const assigneeUid of form.assignedTo) {
          const member = members.find((m) => m.uid === assigneeUid);
          if (!member) continue;

          // Notification
          if (assigneeUid !== crmUser?.uid) {
            await addDoc(collection(db, "notifications"), {
              userId: assigneeUid,
              title: "New Task Assigned",
              message: \`You have been assigned a new task: \${form.title}\`,
              link: \`/tasks/\${newTaskRef.id}?tab=blueprints\`,
              read: false,
              createdAt: now,
              type: "task-assigned"
            });
          }

          // Email
          if (member.email) {
            try {
              const projectName = form.relatedTo
                ? projects.find((p) => p.id === form.relatedTo)?.title || ""
                : "";

              const emailResponse = await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: [member.email],
                  subject: \`CRM Task Assigned: \${form.title}\`,
                  html: \`<div style="padding:40px 20px;font-family:Arial,sans-serif;background:#f8f9fc;"><div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.05);"><h2 style="color:#0D1B3E;">New Task Assigned</h2><p>Hi \${member.name},</p><p>You have been assigned the task: <strong>\${form.title}</strong></p><p>Priority: \${form.priority.toUpperCase()}</p>\${projectName ? \`<p>Project: \${projectName}</p>\` : ''}</div></div>\`
                }),
              });
            } catch (e) {
              console.error("Task assignment email error:", e);
            }

            // Check if due date is tomorrow — send reminder
            if (form.dueDate) {
              const due = new Date(form.dueDate);
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);

              if (due.toDateString() === tomorrow.toDateString()) {
                await sendReminderEmail({ ...form }, member.email, member.name);
              }
            }
          }
        }
      } // Close the 'else' block
      `;

  content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
  
  // Also replace member lookup at start of handleSave
  content = content.replace(
    'const member = members.find((m) => m.uid === form.assignedTo);\n      const payload = { ...form, assignedToName: member?.name ?? form.assignedToName, assignedBy: crmUser?.uid ?? "" };',
    'const assignedNames = form.assignedTo.map((uid) => members.find(m => m.uid === uid)?.name || "").filter(Boolean);\n      const payload = { ...form, assignedToName: assignedNames, assignedBy: crmUser?.uid ?? "" };'
  );
  
  // 5. Array fixes for checking assignedTo
  content = content.replace(/task\.assignedTo !== crmUser\?\.uid/g, "!(Array.isArray(task.assignedTo) ? task.assignedTo.includes(crmUser?.uid) : task.assignedTo === crmUser?.uid)");
  content = content.replace(/t\.assignedTo === crmUser\?\.uid/g, "(Array.isArray(t.assignedTo) ? t.assignedTo.includes(crmUser?.uid) : t.assignedTo === crmUser?.uid)");
  
  // 6. UI replacement for avatar display
  const uiRegex = /<div className="flex items-center gap-1\\\.5" title=\{task\.assignedToName\}>([\s\S]*?)<\/div>/;
  const newUi = `<div className="flex items-center gap-1">
                              {Array.isArray(task.assignedToName) ? (
                                task.assignedToName.map((name, i) => (
                                  <div key={i} className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black border border-indigo-200" title={name}>
                                    {name ? name.charAt(0) : "?"}
                                  </div>
                                ))
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black border border-indigo-200" title={task.assignedToName}>
                                  {task.assignedToName ? String(task.assignedToName).charAt(0) : "?"}
                                </div>
                              )}
                            </div>`;
  content = content.replace(uiRegex, newUi);
  
  // 7. Owner multi-select UI
  const oldSelect = `<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Owner</label>
                  <select disabled={crmUser?.role === "employee"} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-[#C9A84C] transition-colors disabled:bg-slate-50 disabled:text-slate-500" value={form.assignedTo} onChange={e => { const m = members.find(x => x.uid === e.target.value); setForm({ ...form, assignedTo: e.target.value, assignedToName: m?.name ?? "" }); }}>
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                  </select>`;
  const newSelect = `<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Owners (Multiple)</label>
                  <select 
                    disabled={crmUser?.role === "employee"} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 outline-none focus:border-[#C9A84C] transition-colors disabled:bg-slate-50 disabled:text-slate-500" 
                    onChange={e => { 
                      const uid = e.target.value;
                      if (!uid) return;
                      const arr = Array.isArray(form.assignedTo) ? form.assignedTo : (form.assignedTo ? [form.assignedTo] : []);
                      if (!arr.includes(uid)) {
                        setForm({ ...form, assignedTo: [...arr, uid] });
                      }
                      e.target.value = ""; 
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select employees...</option>
                    {members.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                  </select>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Array.isArray(form.assignedTo) && form.assignedTo.map((uid) => {
                      const m = members.find(x => x.uid === uid);
                      return (
                        <div key={uid} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold border border-indigo-100">
                          {m?.name || "Unknown"}
                          {crmUser?.role !== "employee" && (
                            <button type="button" onClick={() => setForm({ ...form, assignedTo: form.assignedTo.filter((u) => u !== uid) })} className="hover:text-indigo-900">&times;</button>
                          )}
                        </div>
                      )
                    })}
                  </div>`;
  content = content.replace(oldSelect, newSelect);

  fs.writeFileSync('app/(dashboard)/tasks/page.tsx', content);
  console.log('Done');
} else {
  console.log('Could not find boundaries.');
}
