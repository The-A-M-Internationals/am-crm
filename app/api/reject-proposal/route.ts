import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { proposalId } = await req.json();

    if (!proposalId) {
      return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const now = new Date().toISOString();
    const proposalRef = adminDb.collection("proposals").doc(proposalId);
    const proposalSnap = await proposalRef.get();
    if (!proposalSnap.exists) { return NextResponse.json({ error: "Proposal not found" }, { status: 404 }); }

    const proposal = proposalSnap.data() as any;
    const batch = adminDb.batch();

    batch.update(proposalRef, { status: "rejected", updatedAt: now });

    if (proposal.fromLeadId) {
      batch.update(adminDb.collection("leads").doc(proposal.fromLeadId), { stage: "lost", active: false, updatedAt: now });
    }

    const email = proposal.clientEmail.toLowerCase().trim();
    const clientsSnap = await adminDb.collection("clients").where("email", "==", email).get();
    clientsSnap.forEach(docSnap => {
      batch.update(docSnap.ref, { status: "inactive", active: false, updatedAt: now });
    });

    await batch.commit();
    return NextResponse.json({ success: true, message: "Proposal rejected successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to reject proposal" }, { status: 500 });
  }
}
