import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json();

    console.log(`[Email] Sending via Resend to: ${to} | Subject: ${subject}`);
    
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === "re_placeholder_key") {
      console.log("Email skipped — no RESEND_API_KEY configured in .env.local");
      return NextResponse.json({ success: true, skipped: true, reason: "No API Key" });
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "A&M CRM <crm@theaminternationals.com>", 
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
