import { NextResponse } from "next/server";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  console.log("[Cron] Reminder Engine Started");
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== "development") {
      console.log("[Cron] ❌ Unauthorized access attempt");
      return new Response('Unauthorized', { status: 401 });
    }

    // Authenticate as a service/admin user to bypass security rules
    try {
      const email = process.env.CRON_EMAIL;
      const password = process.env.CRON_PASSWORD;
      
      if (!email || !password) {
        throw new Error("Missing CRON_EMAIL or CRON_PASSWORD in environment variables");
      }

      await signInWithEmailAndPassword(auth, email, password);
      console.log("[Cron] Successfully authenticated with Firebase.");
    } catch (authErr) {
      console.warn("[Cron] Auth failed. Check your .env.local file. Error:", authErr);
      return NextResponse.json({ error: "Backend authentication failed" }, { status: 403 });
    }

    console.log("[Cron] Fetching users (via Client SDK)...");
    const usersSnap = await getDocs(collection(db, "users"));
    const users = usersSnap.docs.reduce((acc: any, d) => {
      acc[d.data().uid || d.id] = d.data();
      return acc;
    }, {});
    console.log(`[Cron] Fetched ${Object.keys(users).length} users`);

    console.log("[Cron] Fetching calendar events (via Client SDK)...");
    const eventsSnap = await getDocs(collection(db, "calendar_events"));
    const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    console.log(`[Cron] Fetched ${events.length} events`);

    const { origin } = new URL(request.url);
    const baseUrl = origin;
    const now = new Date();
    let emailsSent = 0;

    for (const ev of events) {
      if (!ev.date || !ev.assignedTo) continue;

      const member = users[ev.assignedTo];
      if (!member || !member.email) continue;
      
      const timeStr = ev.time || "09:00"; 
      const eventDateTime = new Date(`${ev.date}T${timeStr}:00`);
      
      const diffMs = eventDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      console.log(`[Cron] Checking event: "${ev.title}" | diffHours: ${diffHours.toFixed(2)}`);

      // Event is in the past, skip
      if (diffHours < 0) {
        console.log(`[Cron] Skipping "${ev.title}" - Event is in the past.`);
        continue;
      }

      const remindersSent = ev.remindersSent || [];
      let alertToSend: string | null = null;
      let subjectPrefix = "⏰ Reminder"; // Default
      // NO urgentText anymore
      
      // Logic: Send the most urgent reminder that hasn't been sent yet for the CURRENT time window.
      if (diffHours <= 1 && diffHours > 0 && !remindersSent.includes("1h")) {
        alertToSend = "1h";
        subjectPrefix = "🚨 Immediate Reminder";
      } else if (diffHours <= 2 && diffHours > 1 && !remindersSent.includes("2h")) {
        alertToSend = "2h";
        subjectPrefix = "⚠️ Urgent Reminder";
      } else if (diffHours <= 4 && diffHours > 2 && !remindersSent.includes("4h")) {
        alertToSend = "4h";
        subjectPrefix = "⚠️ Urgent Reminder";
      } else if (diffHours <= 24 && diffHours > 4 && !remindersSent.includes("24h")) {
        alertToSend = "24h";
        subjectPrefix = "⏰ Reminder";
      }

      if (alertToSend) {
        console.log(`[Cron] ⏳ Event "${ev.title}" is ${diffHours.toFixed(2)} hours away. Sending ${alertToSend} alert to ${member.email}.`);
        
        const timeRemainingText = alertToSend === "24h" ? "in 24 hours" : `in exactly ${alertToSend.replace("h", " hours")}`;

        const html = `
          <div style="background:#f8f9fc;padding:40px 20px;font-family:Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
              <div style="background:linear-gradient(135deg,#0D1B3E,#1a3070);padding:32px;text-align:center;">
                <h1 style="color:#C9A84C;margin:0;font-size:24px;letter-spacing:1px;">A&M CRM</h1>
                <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">Automated Calendar Alert</p>
              </div>
              <div style="padding:32px;">
                <p style="color:#1a1a2e;font-size:16px;margin-bottom:12px;">Hi <strong>${member.name}</strong>,</p>
                <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">This is an automated reminder that you have a task due <strong>${timeRemainingText}</strong>.</p>

                <div style="background:#f8f9fc;border-left:4px solid #C9A84C;padding:24px;border-radius:0 8px 8px 0;">
                  <h3 style="color:#0D1B3E;margin:0 0 8px;font-size:18px;">${ev.title}</h3>
                  <p style="color:#4b5563;font-size:13px;margin:4px 0;"><strong>Type:</strong> ${ev.type === "other" && ev.customType ? ev.customType : ev.type}</p>
                  <p style="color:#4b5563;font-size:13px;margin:4px 0;"><strong>Deadline:</strong> ${eventDateTime.toLocaleString("en-GB")}</p>
                  ${ev.platform ? `<p style="color:#4b5563;font-size:13px;margin:4px 0;"><strong>Platform:</strong> ${ev.platform}</p>` : ""}
                  ${ev.notes ? `<p style="color:#4b5563;font-size:13px;margin:12px 0 0;padding-top:12px;border-top:1px solid #e5e7eb;"><strong>Notes:</strong> ${ev.notes}</p>` : ""}
                </div>
                
                <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:40px;">The A&M Internationals FZC · Elevating the World, Elegantly</p>
              </div>
            </div>
          </div>
        `;

        try {
          // 1. Send to the assigned team member
          const res = await fetch(`${baseUrl}/api/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: member.email,
              subject: `${subjectPrefix}: ${timeRemainingText} left for [${ev.title}]`,
              html
            })
          });

          // 2. Send a copy to the central agency email (Admin)
          const resAdmin = await fetch(`${baseUrl}/api/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: "am@theaminternational.com",
              subject: `[Admin Copy] ${subjectPrefix}: ${ev.title}`,
              html: `<p><strong>Admin Notification:</strong> This reminder was also sent to <strong>${member.name}</strong> (${member.email}).</p><hr/>${html}`
            })
          });

          // Also keep Teams as a backup if configured
          if (process.env.TEAMS_WEBHOOK_URL) {
            await fetch(process.env.TEAMS_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: String(ev.title),
                message: `Reminder: ${timeRemainingText} left for ${ev.title}. Deadline: ${eventDateTime.toLocaleString("en-GB")}`,
                assignedTo: String(member.name)
              })
            }).catch(e => console.error("[Teams Backup Error]:", e));
          }

          if (res.ok) {
            const newReminders = [...remindersSent, alertToSend];
            await updateDoc(doc(db, "calendar_events", ev.id), { remindersSent: newReminders });
            emailsSent++;
            console.log(`[Cron] ✅ Successfully sent Resend alert for event ${ev.id}`);
          } else {
            console.error(`[Cron] ❌ Failed to send Resend alert:`, await res.text());
          }
        } catch (err) {
          console.error(`[Cron] ❌ Network error sending Resend reminder to ${member.email}`, err);
        }
      }
    }

    return NextResponse.json({ success: true, emailsSent, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("[Cron] 💥 Fatal Error in Reminder Engine:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
