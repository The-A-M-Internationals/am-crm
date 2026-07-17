import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    
    let link: string;
    try {
      // Generate the password reset link using Firebase Admin
      link = await adminAuth.generatePasswordResetLink(email);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // Return success even if user doesn't exist (Email Enumeration Protection)
        return NextResponse.json({ success: true });
      }
      throw err;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === "re_placeholder_key") {
      throw new Error("Resend API Key is missing or invalid.");
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "A&M CRM <crm@theaminternational.com>",
      to: email,
      subject: "Reset your A&M CRM Password",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0D1B3E;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:#C9A84C;margin:0;font-size:26px;font-family:Georgia,serif;">A&M CRM</h1>
            <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;letter-spacing:2px;">PASSWORD RESET</p>
          </div>
          <div style="background:white;padding:32px;border:1px solid #e8e8f0;border-top:none;border-radius:0 0 12px 12px;">
            <p style="color:#6b7280;">Hello,</p>
            <p style="color:#6b7280;">We received a request to reset your password for the A&M CRM. Click the button below to securely set a new password.</p>
            <div style="text-align:center;margin:30px 0;">
              <a href="${link}" style="display:inline-block;background:#C9A84C;color:#0D1B3E;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px;font-size:14px;">RESET PASSWORD</a>
            </div>
            <p style="color:#9ca3af;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
            <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:20px;">The A&M Internationals FZC · Ajman Free Zone, UAE</p>
          </div>
        </div>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Forgot Password API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
