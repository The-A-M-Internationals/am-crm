import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json();

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === "re_placeholder_key") {
      console.log("Email skipped — no Resend API key configured");
      return NextResponse.json({ success: true, skipped: true });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: "A&M CRM <crm@theaminternational.com>",
      to,
      subject,
      html,
    });

    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
