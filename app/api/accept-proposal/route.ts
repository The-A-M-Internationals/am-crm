import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { proposalId, clientSignatureName, clientSignatureTitle, clientSignatureImage } = await req.json();

    if (!proposalId || !clientSignatureName || !clientSignatureTitle) {
      return NextResponse.json(
        { error: "Missing required fields: proposalId, clientSignatureName, or clientSignatureTitle" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const now = new Date().toISOString();

    const proposalRef = adminDb.collection("proposals").doc(proposalId);
    const proposalSnap = await proposalRef.get();
    if (!proposalSnap.exists) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const proposal = proposalSnap.data() as any;

    const batch = adminDb.batch();

    // 1. Update the proposal status and signature details
    batch.update(proposalRef, {
      status: "accepted",
      clientSignatureName,
      clientSignatureTitle,
      clientSignatureImage: clientSignatureImage || null,
      signedAt: now,
      updatedAt: now,
    });

    // 2. Sync Lead stage if fromLeadId exists
    if (proposal.fromLeadId) {
      const leadRef = adminDb.collection("leads").doc(proposal.fromLeadId);
      batch.update(leadRef, {
        stage: "won",
        active: true,
        updatedAt: now,
      });
    }

    // Client sync is strictly handled by the reactive Global Pipeline Sync listener.

    await batch.commit();

    return NextResponse.json({ success: true, message: "Proposal accepted successfully" });
  } catch (error: any) {
    console.error("Error accepting proposal:", error);
    return NextResponse.json({ error: error.message || "Failed to accept proposal" }, { status: 500 });
  }
}
