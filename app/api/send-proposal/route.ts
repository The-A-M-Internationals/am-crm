import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { proposalId, clientEmail, proposalData } = await req.json();

    console.log(`[Proposal] Sending to: ${clientEmail} | Proposal ID: ${proposalId}`);

    if (!process.env.RESEND_API_KEY) {
      console.error("[Proposal] Fatal: RESEND_API_KEY is not configured");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    if (!proposalId || !clientEmail) {
      return NextResponse.json({ error: "Missing proposalId or clientEmail" }, { status: 400 });
    }

    const productionDomain = "crm.theaminternational.com";
    const host = req.headers.get("host") || productionDomain;
    const protoHeader = req.headers.get("x-forwarded-proto");
    const protocol = protoHeader || (host.includes("localhost") || host.includes("127.0.0.1") || host.includes("::1") || host.includes(":") ? "http" : "https");
    
    let origin = `${protocol}://${host}`;
    if (process.env.NEXT_PUBLIC_APP_URL) {
      origin = process.env.NEXT_PUBLIC_APP_URL;
    }

    let proposal = proposalData;
    if (!proposal) {
      const docRef = doc(db, "proposals", proposalId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
      }

      proposal = docSnap.data() as any;
    }
    const currency = proposal.currency || "AED";

    let htmlBody = "";
    // ... (rest of the template construction logic)
    
    // For now, I am assuming the template construction logic (that was here) is unchanged.
    // I need to provide the full content for the file.

    if (proposal.isRichDocument) {
      // ---------------------------------------------------------
      // HIGH-FIDELITY RICH EMAIL TEMPLATE (Agency Pitch Deck)
      // ---------------------------------------------------------
      htmlBody = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #1a1a2e; line-height: 1.6;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0D1B3E, #1a3070); padding: 40px; border-radius: 20px 20px 0 0; text-align: center;">
            <h1 style="color: #C9A84C; margin: 0; font-size: 28px; font-family: Georgia, serif; letter-spacing: 1px;">A&M CRM</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 11px; letter-spacing: 3px; font-weight: bold; text-transform: uppercase;">The A&M Internationals FZC</p>
          </div>
          
          <div style="background: white; padding: 40px; border: 1px solid #e8e8f0; border-top: none; border-radius: 0 0 20px 20px;">
            <div style="margin-bottom: 30px;">
              <h2 style="font-size: 28px; font-weight: 900; margin: 0 0 10px; color: #0D1B3E;">Hello, ${proposal.clientName}!</h2>
              <p style="color: #64748b; font-size: 15px; margin: 0;">We are pleased to provide you with the professional quotation for <strong>${proposal.service.replace(/-/g, ' ').toUpperCase()}</strong>.</p>
            </div>

            <!-- Quote Overview -->
            <div style="background: #f8fafc; border-radius: 15px; padding: 25px; margin-bottom: 40px; border: 1px solid #f1f5f9;">
              <h3 style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px;">Quote Overview</h3>
              <table style="width: 100%; font-size: 14px; color: #334155;">
                <tr>
                  <td style="padding: 4px 0;"><strong>Reference:</strong></td>
                  <td style="text-align: right;">#${proposalId.slice(-8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Client:</strong></td>
                  <td style="text-align: right;">${proposal.company || proposal.clientName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Valid Until:</strong></td>
                  <td style="text-align: right;">${proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString("en-GB") : "Indefinite"}</td>
                </tr>
              </table>
            </div>

            <!-- 1. Introduction -->
            ${proposal.introduction ? `
              <div style="margin-bottom: 40px;">
                <h3 style="color: #0D1B3E; font-size: 18px; border-bottom: 2px solid #0D1B3E; padding-bottom: 8px;">1. About The A&M Internationals</h3>
                <p style="color: #475569; font-size: 14px;">${proposal.introduction}</p>
              </div>
            ` : ''}

            <!-- 4. Approach -->
            ${proposal.approachTitle ? `
              <div style="margin-bottom: 40px;">
                <h3 style="color: #0D1B3E; font-size: 18px; border-bottom: 2px solid #0D1B3E; padding-bottom: 8px;">Our Approach</h3>
                <p style="color: #475569; font-size: 14px;">${proposal.approachDescription}</p>
              </div>
            ` : ''}

            <!-- 5. Packages Table -->
            ${proposal.packages && proposal.packages.length > 0 ? `
              <div style="margin-bottom: 40px;">
                <h3 style="color: #0D1B3E; font-size: 18px; border-bottom: 2px solid #0D1B3E; padding-bottom: 8px;">Packages — Pick What Fits</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; border: 1px solid #e2e8f0;">
                  <thead>
                    <tr style="background: #0D1B3E; color: white;">
                      <th style="padding: 12px; text-align: left; border-right: 1px solid rgba(255,255,255,0.2);">Component</th>
                      ${proposal.packages.map((pkg: any) => `
                        <th style="padding: 12px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2); ${pkg.recommended ? 'background: #C9A84C;' : ''}">
                          ${pkg.name} ${pkg.recommended ? '★' : ''}
                        </th>
                      `).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    <!-- Management Fee Row -->
                    <tr>
                      <td style="padding: 12px; font-weight: bold; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">A&M Management Fee</td>
                      ${proposal.packages.map((pkg: any) => `
                        <td style="padding: 12px; text-align: center; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">${currency} ${pkg.managementFee.toLocaleString()}</td>
                      `).join('')}
                    </tr>
                    <!-- Ad Spend Row -->
                    <tr style="background: #f8fafc;">
                      <td style="padding: 12px; font-weight: bold; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">Recommended Ad Spend</td>
                      ${proposal.packages.map((pkg: any) => `
                        <td style="padding: 12px; text-align: center; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">${currency} ${pkg.recommendedSpend.toLocaleString()}</td>
                      `).join('')}
                    </tr>
                    <!-- Total Row -->
                    <tr style="background: #0D1B3E; color: white;">
                      <td style="padding: 12px; font-weight: bold; border-right: 1px solid rgba(255,255,255,0.2);">TOTAL MONTHLY</td>
                      ${proposal.packages.map((pkg: any) => `
                        <td style="padding: 12px; text-align: center; font-weight: bold; border-right: 1px solid rgba(255,255,255,0.2); ${pkg.recommended ? 'background: #C9A84C;' : ''}">
                          ${currency} ${(pkg.managementFee + pkg.recommendedSpend).toLocaleString()}
                        </td>
                      `).join('')}
                    </tr>
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- CTA -->
            <div style="text-align: center; margin-top: 40px; margin-bottom: 40px;">
              <a href="${origin}/proposals/${proposalId}?view=client" 
                 style="background: #0D1B3E; color: #C9A84C; padding: 18px 36px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 10px 20px rgba(13,27,62,0.15);">
                Review & Sign Proposal Document
              </a>
              <p style="color: #64748b; font-size: 12px; margin-top: 15px;">Click the button above to view the full detailed proposal, select your packages, and sign the agreement securely online.</p>
            </div>

            <!-- Footer -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; line-height: 1.8; text-align: center;">
              <p>The A&M Internationals FZC · Ajman Free Zone, UAE<br/>Elevating the World, Elegantly</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // ---------------------------------------------------------
      // STANDARD / LEGACY EMAIL TEMPLATE
      // ---------------------------------------------------------
      htmlBody = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #0D1B3E, #1a3070); padding: 40px; border-radius: 20px 20px 0 0; text-align: center;">
            <h1 style="color: #C9A84C; margin: 0; font-size: 28px; font-family: Georgia, serif; letter-spacing: 1px;">A&M CRM</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 11px; letter-spacing: 3px; font-weight: bold; text-transform: uppercase;">The A&M Internationals FZC</p>
          </div>
          
          <div style="background: white; padding: 40px; border: 1px solid #e8e8f0; border-top: none; border-radius: 0 0 20px 20px;">
            <div style="margin-bottom: 30px;">
              <h2 style="font-size: 24px; font-weight: 900; margin: 0 0 10px; color: #0D1B3E;">Hello, ${proposal.clientName}!</h2>
              <p style="color: #64748b; font-size: 15px; margin: 0;">We are pleased to provide you with the professional quotation for <strong>${proposal.service}</strong> as discussed.</p>
            </div>

            <div style="background: #f8fafc; border-radius: 15px; padding: 25px; margin-bottom: 30px; border: 1px solid #f1f5f9;">
              <h3 style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px;">Quote Overview</h3>
              <table style="width: 100%; font-size: 14px; color: #334155;">
                <tr>
                  <td style="padding: 4px 0;"><strong>Reference:</strong></td>
                  <td style="text-align: right;">#${proposalId.slice(-8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Client:</strong></td>
                  <td style="text-align: right;">${proposal.company || proposal.clientName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Total Investment:</strong></td>
                  <td style="text-align: right; color: #0D1B3E; font-weight: 900; font-size: 18px;">${currency} ${proposal.total.toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="border-bottom: 2px solid #0D1B3E;">
                  <th style="text-align: left; font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding: 10px 0;">Description</th>
                  <th style="text-align: right; font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding: 10px 0;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(proposal.items || []).map((item: any) => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 15px 0;">
                      <div style="font-weight: bold; color: #1e293b; font-size: 14px;">${item.description}</div>
                      <div style="color: #94a3b8; font-size: 12px;">Professional Service Execution</div>
                    </td>
                    <td style="text-align: right; font-weight: bold; color: #1e293b; font-size: 14px;">${currency} ${item.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="text-align: center; margin-top: 40px;">
              <a href="${origin}/proposals/${proposalId}?view=client" 
                 style="background: #0D1B3E; color: #C9A84C; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 10px 20px rgba(13,27,62,0.15);">
                Review & Sign Proposal
              </a>
            </div>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; line-height: 1.8;">
              <p><strong>Note:</strong> This quotation is valid for 15 days. All services are governed by the A&M standard service agreement. Total amount includes applicable VAT/Taxes.</p>
              <p style="text-align: center; margin-top: 20px;">
                The A&M Internationals FZC · Ajman Free Zone, UAE<br/>
                Elevating the World, Elegantly
              </p>
            </div>
          </div>
        </div>
      `;
    }

    const { data, error } = await resend.emails.send({
      from: "A&M CRM <crm@theaminternational.com>",
      to: [clientEmail],
      subject: `Quotation from The A&M Internationals — Ref: #${proposalId.slice(-8).toUpperCase()}`,
      html: htmlBody,
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Proposal API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
