"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const EVENT_TYPES = [
  { key: "post",     label: "Post",      color: "#1d4ed8", bg: "#dbeafe" },
  { key: "reel",     label: "Reel",      color: "#7c3aed", bg: "#ede9fe" },
  { key: "story",    label: "Story",     color: "#db2777", bg: "#fce7f3" },
  { key: "meeting",  label: "Meeting",   color: "#059669", bg: "#d1fae5" },
  { key: "deadline", label: "Deadline",  color: "#dc2626", bg: "#fee2e2" },
  { key: "campaign", label: "Campaign",  color: "#d97706", bg: "#fef3c7" },
  { key: "other",    label: "Other",     color: "#6b7280", bg: "#f3f4f6" },
];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const EMPTY_FORM = { title: "", type: "post", date: "", time: "09:00", assignedTo: "", assignedToName: "", platform: "", notes: "", customType: "" };

export default function CalendarPage() {
  const { crmUser } = useAuth();
  const [events, setEvents]   = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]    = useState<any | null>(null);
  const [form, setForm]          = useState({ ...EMPTY_FORM });
  const [saving, setSaving]      = useState(false);
  const [today] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear]   = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay]   = useState<number | null>(null);

  useEffect(() => {
    const unsubEvents = onSnapshot(query(collection(db, "calendar_events"), orderBy("date", "asc")), snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubUsers = onSnapshot(collection(db, "users"), snap => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubEvents();
      unsubUsers();
    };
  }, []);

  function openAdd(date?: string) {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: date ?? "", assignedTo: crmUser?.uid ?? "" });
    setShowModal(true);
  }

  function openEdit(ev: any) {
    setEditing(ev);
    setForm({ 
      title: ev.title, 
      type: ev.type, 
      date: ev.date, 
      time: ev.time ?? "09:00",
      assignedTo: ev.assignedTo ?? "", 
      assignedToName: ev.assignedToName ?? "", 
      platform: ev.platform ?? "", 
      notes: ev.notes ?? "",
      customType: ev.customType ?? ""
    });
    setShowModal(true);
  }

  // We are removing the legacy `sendReminder` function because the new Cron Job API will handle multi-interval reminders automatically.


  async function handleSave() {
    if (!form.title || !form.date) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const member = members.find(m => m.uid === form.assignedTo);
      const payload = { ...form, assignedToName: member?.name ?? form.assignedToName };

      let eventId = editing?.id;
      if (editing) {
        await updateDoc(doc(db, "calendar_events", editing.id), payload);
      } else {
        const docRef = await addDoc(collection(db, "calendar_events"), { ...payload, createdBy: crmUser?.uid, createdAt: now });
        eventId = docRef.id;
      }

      // Instant Notification Trigger
      if (member?.email) {
        try {
          const dueDateTime = `${form.date} at ${form.time || "09:00"}`;
          const typeLabel = EVENT_TYPES.find(t => t.key === form.type)?.label || form.type;
          
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: member.email,
              subject: `New CRM Task Assigned: ${form.title}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fc;padding:20px;border-radius:12px;">
                  <div style="background:linear-gradient(135deg,#0D1B3E,#1a3070);padding:24px;border-radius:10px 10px 0 0;text-align:center;">
                    <h1 style="color:#C9A84C;margin:0;font-size:20px;">A&M CRM</h1>
                    <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:12px;">New Assignment</p>
                  </div>
                  <div style="background:white;padding:24px;border-radius:0 0 10px 10px;">
                    <p>Hi <strong>${member.name}</strong>,</p>
                    <p style="color:#6b7280;"><strong>${crmUser?.name || "The Admin"}</strong> has assigned you a new event in the CRM Calendar.</p>
                    <div style="background:#f8f9fc;border-left:4px solid #C9A84C;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;">
                      <h3 style="color:#0D1B3E;margin:0 0 6px;">${form.title}</h3>
                      <p style="color:#6b7280;font-size:13px;margin:0;"><strong>Type:</strong> ${form.type === "other" ? form.customType : typeLabel}</p>
                      <p style="color:#6b7280;font-size:13px;margin:4px 0 0;"><strong>Platform:</strong> ${form.platform || "Not specified"}</p>
                      <p style="color:#6b7280;font-size:13px;margin:4px 0 0;"><strong>Due Date:</strong> ${dueDateTime}</p>
                      ${form.notes ? `<p style="color:#6b7280;font-size:13px;margin:8px 0 0;padding-top:8px;border-top:1px solid #e5e7eb;"><strong>Notes:</strong> ${form.notes}</p>` : ""}
                    </div>
                    <p style="color:#6b7280;font-size:13px;">Please log into the CRM dashboard to review the details.</p>
                    <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:30px;">The A&M Internationals FZC · Elevating the World, Elegantly</p>
                  </div>
                </div>
              `
            })
          });
        } catch (e) {
          console.error("Failed to send instant notification", e);
        }
      }

      setShowModal(false);
    } finally { setSaving(false); }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await deleteDoc(doc(db, "calendar_events", id));
  }

  // Calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1);
  while (cells.length % 7 !== 0) cells.push(null);

  function getEventsForDay(day: number) {
    const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return events.filter(e => e.date === dateStr);
  }

  function typeInfo(key: string) { return EVENT_TYPES.find(t => t.key === key) ?? EVENT_TYPES[6]; }

  function prevMonth() { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y=>y-1); } else setCurrentMonth(m=>m-1); }
  function nextMonth() { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y=>y+1); } else setCurrentMonth(m=>m+1); }

  const selectedDateStr = selectedDay ? `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}` : null;
  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  async function triggerCron() {
    setLoading(true);
    try {
      const res = await fetch("/api/cron/reminders");
      const data = await res.json();
      alert(`Engine Run Complete!\nEmails Sent: ${data.emailsSent}\nCheck your terminal for detailed logs.`);
    } catch (err) {
      alert("Failed to trigger engine.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Content Calendar</h1>
          <p className="page-subtitle">Schedule posts, reels, meetings & deadlines</p>
        </div>
        <div className="flex gap-3">
          <button onClick={triggerCron} className="btn-secondary text-xs" style={{ borderColor: "#C9A84C", color: "#C9A84C" }}>⚙️ Test Reminder Engine</button>
          <button onClick={() => openAdd()} className="btn-primary"><span className="text-base">+</span> Add Event</button>
        </div>
      </div>

      {/* Event type legend */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {EVENT_TYPES.map(t => (
          <span key={t.key} className="badge" style={{ background: t.bg, color: t.color }}>
            {t.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 crm-card p-0 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#f0f0f5" }}>
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-2xl font-bold" style={{ color: "#0D1B3E", lineHeight: 1, paddingBottom: "4px" }}>‹</button>
            <h2 className="text-base font-bold" style={{ color: "#0D1B3E" }}>{MONTHS_FULL[currentMonth]} {currentYear}</h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-2xl font-bold" style={{ color: "#0D1B3E", lineHeight: 1, paddingBottom: "4px" }}>›</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b" style={{ borderColor: "#f0f0f5" }}>
            {DAYS.map(d => (
              <div key={d} className="text-center py-2 text-xs font-bold uppercase tracking-wide" style={{ color: "#9ca3af" }}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} className="border-b border-r min-h-[80px]" style={{ borderColor: "#f8f8fc" }} />;
              const dayEvents = getEventsForDay(day);
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const isSelected = day === selectedDay;
              return (
                <div
                  key={idx}
                  className="border-b border-r min-h-[80px] p-1.5 cursor-pointer transition-colors"
                  style={{ borderColor: "#f8f8fc", background: isSelected ? "#f0f4ff" : "white" }}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${isToday ? "text-white" : ""}`}
                    style={{ background: isToday ? "#0D1B3E" : "transparent", color: isToday ? "white" : isSelected ? "#0D1B3E" : "#374151" }}>
                    {day}
                  </div>
                  {dayEvents.slice(0, 2).map(ev => {
                    const t = typeInfo(ev.type);
                    return (
                      <div key={ev.id} className="text-xs px-1.5 py-0.5 rounded-md mb-0.5 truncate font-medium" style={{ background: t.bg, color: t.color, fontSize: "10px" }}>
                        {ev.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && <div className="text-xs" style={{ color: "#9ca3af", fontSize: "10px" }}>+{dayEvents.length - 2} more</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div>
          {selectedDay ? (
            <div className="crm-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>
                  {selectedDay} {MONTHS_FULL[currentMonth]}
                </h3>
                <button onClick={() => openAdd(selectedDateStr!)} className="btn-primary" style={{ padding: "5px 10px", fontSize: "11px" }}>+ Add</button>
              </div>
              {selectedEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs" style={{ color: "#9ca3af" }}>No events. Click + Add!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(ev => {
                    const t = typeInfo(ev.type);
                    return (
                      <div key={ev.id} className="p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-shadow" style={{ borderColor: t.color + "33", background: t.bg + "55" }} onClick={() => openEdit(ev)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: "#1a1a2e" }}>{ev.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="badge" style={{ background: t.bg, color: t.color, fontSize: "10px" }}>
                                {ev.type === "other" && ev.customType ? ev.customType : t.label}
                              </span>
                              {ev.platform && <span className="text-xs" style={{ color: "#9ca3af" }}>{ev.platform}</span>}
                              {ev.assignedToName && <span className="text-xs" style={{ color: "#6b7280" }}>👤 {ev.assignedToName}</span>}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id); }} className="btn-danger" style={{ padding: "2px 6px", fontSize: "10px" }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="crm-card">
              <h3 className="text-sm font-bold mb-3" style={{ color: "#0D1B3E" }}>Upcoming Events</h3>
              {loading ? (
                <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-12 rounded-xl animate-pulse" style={{background:"#f0f2f8"}}/>)}</div>
              ) : (
                <div className="space-y-2">
                  {events.filter(e => new Date(e.date) >= new Date()).slice(0, 8).map(ev => {
                    const t = typeInfo(ev.type);
                    return (
                      <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => openEdit(ev)}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: t.bg, color: t.color }}>
                          {new Date(ev.date).getDate()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: "#1a1a2e" }}>{ev.title}</p>
                          <p className="text-xs" style={{ color: "#9ca3af" }}>{new Date(ev.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</p>
                        </div>
                        <span className="badge" style={{ background: t.bg, color: t.color, fontSize: "10px" }}>
                          {ev.type === "other" && ev.customType ? ev.customType : t.label}
                        </span>
                      </div>
                    );
                  })}
                  {events.filter(e => new Date(e.date) >= new Date()).length === 0 && (
                    <p className="text-xs text-center py-4" style={{ color: "#9ca3af" }}>No upcoming events</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="modal-title mb-0">{editing ? "Edit Event" : "Add Event"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="space-y-4">
              <div><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Instagram post, Client meeting..." /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                    {EVENT_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
                <div className="col-span-1"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
                <div className="col-span-1"><label className="form-label">Time *</label><input className="form-input" type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} /></div>
              </div>

              {form.type === "other" && (
                <div><label className="form-label">Category Name</label><input className="form-input" value={form.customType} onChange={e=>setForm({...form,customType:e.target.value})} placeholder="Event, Shoot, Trip..." /></div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Assign To</label>
                  <select className="form-input" value={form.assignedTo} onChange={e=>{ const m=members.find(x=>x.uid===e.target.value); setForm({...form,assignedTo:e.target.value,assignedToName:m?.name??""}); }}>
                    <option value="">Select member...</option>
                    {members.map(m=><option key={m.uid} value={m.uid}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Platform</label>
                  <select className="form-input" value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}>
                    <option value="">Select...</option>
                    {["Instagram","Facebook","LinkedIn","Twitter/X","YouTube","WhatsApp","Website","Other"].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="form-label">Notes</label><textarea className="form-input resize-none" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{background:"#eff6ff",color:"#1e40af",border:"1px solid #bfdbfe"}}>
                ⏱️ Reminders will be sent to the assignee automatically (24h, 4h, 2h, and 1h prior).
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setShowModal(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold" style={{borderColor:"#e5e7eb",color:"#6b7280"}}>Cancel</button>
              <button onClick={handleSave} disabled={saving||!form.title||!form.date} className="btn-primary flex-1 justify-center disabled:opacity-50">{saving?"Saving...":editing?"Update":"Add Event"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
