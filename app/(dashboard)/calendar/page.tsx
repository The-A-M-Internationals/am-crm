"use client";

import { useEffect, useState, useRef } from "react";
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

const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "Twitter/X", "YouTube", "WhatsApp", "Website"];

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

  // Add a local flag for "Other" platform
  const [isCustomPlatform, setIsCustomPlatform] = useState(false);

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
    setIsCustomPlatform(false);
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
    setIsCustomPlatform(ev.platform && !PLATFORMS.includes(ev.platform));
    setShowModal(true);
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

      // Notification
      if (member?.email) {
        try {
          const typeLabel = EVENT_TYPES.find(t => t.key === form.type)?.label || form.type;
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: [member.email, "am@theaminternational.com"],
              subject: `CRM Task Assigned: ${form.title}`,
              html: `<b>Task:</b> ${form.title}<br><b>Type:</b> ${form.type === "other" ? form.customType : typeLabel}<br><b>Platform:</b> ${form.platform}<br><b>Due:</b> ${form.date} ${form.time}`
            })
          });
        } catch (e) { console.error(e); }
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
      alert(`Engine Run Complete! Emails Sent: ${data.emailsSent}`);
    } catch (err) { alert("Failed to trigger engine."); } finally { setLoading(false); }
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 crm-card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#f0f0f5" }}>
            <button onClick={prevMonth} className="text-2xl font-bold">‹</button>
            <h2 className="text-base font-bold">{MONTHS_FULL[currentMonth]} {currentYear}</h2>
            <button onClick={nextMonth} className="text-2xl font-bold">›</button>
          </div>
          <div className="grid grid-cols-7 border-b text-center py-2 text-xs font-bold uppercase" style={{ color: "#9ca3af" }}>
            {DAYS.map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} className="border-b border-r min-h-[80px]" style={{ borderColor: "#f8f8fc" }} />;
              const dayEvents = getEventsForDay(day);
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const isSelected = day === selectedDay;
              return (
                <div key={idx} className="border-b border-r min-h-[80px] p-1.5 cursor-pointer" style={{ background: isSelected ? "#f0f4ff" : "white" }} onClick={() => setSelectedDay(day === selectedDay ? null : day)}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${isToday ? "bg-[#0D1B3E] text-white" : ""}`}>{day}</div>
                  {dayEvents.slice(0, 2).map(ev => {
                    const t = typeInfo(ev.type);
                    return <div key={ev.id} className="text-[10px] px-1.5 py-0.5 rounded-md mb-0.5 truncate font-medium" style={{ background: t.bg, color: t.color }}>{ev.title}</div>;
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div>
          {selectedDay ? (
            <div className="crm-card">
              <h3 className="text-sm font-bold mb-4">{selectedDay} {MONTHS_FULL[currentMonth]}</h3>
              <div className="space-y-2">
                {selectedEvents.map(ev => {
                  const t = typeInfo(ev.type);
                  return (
                    <div key={ev.id} className="p-3 rounded-xl border cursor-pointer" style={{ borderColor: t.color + "33", background: t.bg + "55" }} onClick={() => openEdit(ev)}>
                      <p className="text-sm font-semibold">{ev.title}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="badge" style={{ background: t.bg, color: t.color, fontSize: "10px" }}>{ev.type === "other" && ev.customType ? ev.customType : t.label}</span>
                        {ev.platform && <span className="text-xs text-gray-400">{ev.platform}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="crm-card"><h3 className="text-sm font-bold mb-3">Upcoming</h3>
              <div className="space-y-2">
                {events.filter(e => new Date(e.date) >= new Date()).slice(0, 8).map(ev => {
                  const t = typeInfo(ev.type);
                  return (
                    <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-gray-50" onClick={() => openEdit(ev)}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: t.bg, color: t.color }}>{new Date(ev.date).getDate()}</div>
                      <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{ev.title}</p></div>
                      <span className="badge" style={{ background: t.bg, color: t.color, fontSize: "10px" }}>{ev.type === "other" && ev.customType ? ev.customType : t.label}</span>
                    </div>
                  );
                })}
              </div>
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
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="space-y-4">
              <div><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Event title" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                    {EVENT_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
                <div><label className="form-label">Time *</label><input className="form-input" type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} /></div>
              </div>

              {form.type === "other" && (
                <div><label className="form-label">Custom Category Name</label><input className="form-input" autoFocus value={form.customType} onChange={e=>setForm({...form,customType:e.target.value})} placeholder="Shoot, Trip, etc." /></div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Assign To</label>
                  <select className="form-input" value={form.assignedTo} onChange={e=>{ const m=members.find(x=>x.uid===e.target.value); setForm({...form,assignedTo:e.target.value,assignedToName:m?.name??""}); }}>
                    <option value="">Select...</option>
                    {members.map(m=><option key={m.uid} value={m.uid}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Platform</label>
                  <select className="form-input" 
                    value={isCustomPlatform ? "Other" : (PLATFORMS.includes(form.platform) ? form.platform : "")} 
                    onChange={e=>{
                      if (e.target.value === "Other") {
                        setIsCustomPlatform(true);
                        setForm({...form, platform: ""});
                      } else {
                        setIsCustomPlatform(false);
                        setForm({...form, platform: e.target.value});
                      }
                    }}>
                    <option value="">Select...</option>
                    {PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}
                    <option value="Other">Other...</option>
                  </select>
                </div>
              </div>

              {(form.type === "other" || isCustomPlatform) && (
                <div className="grid grid-cols-2 gap-3">
                  {form.type === "other" && (
                    <div><label className="form-label">Custom Category Name</label><input className="form-input" autoFocus value={form.customType} onChange={e=>setForm({...form,customType:e.target.value})} placeholder="Shoot, Trip, etc." /></div>
                  )}
                  {isCustomPlatform && (
                    <div><label className="form-label">Custom Platform Name</label><input className="form-input" autoFocus value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})} placeholder="TikTok, Threads, etc." /></div>
                  )}
                </div>
              )}

              <div><label className="form-label">Notes</label><textarea className="form-input resize-none" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setShowModal(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold">Cancel</button>
              <button onClick={handleSave} disabled={saving||!form.title||!form.date} className="btn-primary flex-1">{saving?"Saving...":"Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
