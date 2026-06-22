"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
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

const EMPTY_FORM = { title: "", type: "post", date: "", assignedTo: "", assignedToName: "", platform: "", notes: "" };

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

  async function fetchAll() {
    const [evSnap, memSnap] = await Promise.all([
      getDocs(query(collection(db, "calendar_events"), orderBy("date", "asc"))),
      getDocs(collection(db, "users")),
    ]);
    setEvents(evSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setMembers(memSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  function openAdd(date?: string) {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: date ?? "", assignedTo: crmUser?.uid ?? "" });
    setShowModal(true);
  }

  function openEdit(ev: any) {
    setEditing(ev);
    setForm({ title: ev.title, type: ev.type, date: ev.date, assignedTo: ev.assignedTo ?? "", assignedToName: ev.assignedToName ?? "", platform: ev.platform ?? "", notes: ev.notes ?? "" });
    setShowModal(true);
  }

  async function sendReminder(ev: any, memberEmail: string, memberName: string) {
    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: memberEmail,
          subject: `📅 Reminder: "${ev.title}" is due tomorrow`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fc;padding:20px;border-radius:12px;">
              <div style="background:linear-gradient(135deg,#0D1B3E,#1a3070);padding:24px;border-radius:10px 10px 0 0;text-align:center;">
                <h1 style="color:#C9A84C;margin:0;font-size:20px;">A&M CRM</h1>
                <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:12px;">Calendar Reminder</p>
              </div>
              <div style="background:white;padding:24px;border-radius:0 0 10px 10px;">
                <p>Hi <strong>${memberName}</strong>,</p>
                <p style="color:#6b7280;">This is a reminder that the following is scheduled for <strong style="color:#0D1B3E;">tomorrow</strong>:</p>
                <div style="background:#f8f9fc;border-left:4px solid #C9A84C;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;">
                  <h3 style="color:#0D1B3E;margin:0 0 6px;">${ev.title}</h3>
                  <p style="color:#6b7280;font-size:13px;margin:0;">Type: ${ev.type} · Date: ${new Date(ev.date).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p>
                  ${ev.platform?`<p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Platform: ${ev.platform}</p>`:""}
                </div>
                <p style="color:#9ca3af;font-size:11px;text-align:center;">The A&M Internationals FZC · Elevating the World, Elegantly</p>
              </div>
            </div>
          `,
        }),
      });
    } catch {}
  }

  async function handleSave() {
    if (!form.title || !form.date) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const member = members.find(m => m.uid === form.assignedTo);
      const payload = { ...form, assignedToName: member?.name ?? form.assignedToName };

      if (editing) {
        await updateDoc(doc(db, "calendar_events", editing.id), payload);
      } else {
        await addDoc(collection(db, "calendar_events"), { ...payload, createdBy: crmUser?.uid, createdAt: now });
      }

      // Check if tomorrow — send reminder
      if (form.date && member?.email) {
        const eventDate = new Date(form.date);
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        if (eventDate.toDateString() === tomorrow.toDateString()) {
          await sendReminder({ ...form }, member.email, member.name);
        }
      }

      setShowModal(false); fetchAll();
    } finally { setSaving(false); }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await deleteDoc(doc(db, "calendar_events", id)); fetchAll();
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Content Calendar</h1>
          <p className="page-subtitle">Schedule posts, reels, meetings & deadlines</p>
        </div>
        <button onClick={() => openAdd()} className="btn-primary"><span className="text-base">+</span> Add Event</button>
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
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#6b7280" }}>‹</button>
            <h2 className="text-base font-bold" style={{ color: "#0D1B3E" }}>{MONTHS_FULL[currentMonth]} {currentYear}</h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#6b7280" }}>›</button>
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
                              <span className="badge" style={{ background: t.bg, color: t.color, fontSize: "10px" }}>{t.label}</span>
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
                        <span className="badge" style={{ background: t.bg, color: t.color, fontSize: "10px" }}>{t.label}</span>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                    {EVENT_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
              </div>
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
              {form.date && (() => { const d=new Date(form.date); const t=new Date(); t.setDate(t.getDate()+1); return d.toDateString()===t.toDateString(); })() && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{background:"#fef3c7",color:"#92400e",border:"1px solid #fde68a"}}>
                  ⚡ This is tomorrow — assignee will get an email reminder!
                </div>
              )}
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
