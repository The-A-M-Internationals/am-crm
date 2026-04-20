import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json();

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
