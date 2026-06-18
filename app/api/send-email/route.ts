import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json();

    console.log(`[Email] Sending via Resend to: ${to} | Subject: ${subject}`);
    
    if (!process.env.RESEND_API_KEY) {
      console.log("Email skipped — no RESEND_API_KEY configured in .env.local");
      return NextResponse.json({ success: true, skipped: true, reason: "No API Key" });
    }

    // Using Resend for high reliability
    const { data, error } = await resend.emails.send({
      from: "A&M CRM <crm@theaminternational.com>", 
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("[Resend Error]:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    console.log(`[Email] Successfully delivered via Resend! ID: ${data?.id}`);
    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error(`[Email] Fatal Error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
