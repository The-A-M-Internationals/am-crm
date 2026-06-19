import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { proposalId, clientSignatureName, clientSignatureTitle } = await req.json();

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

    // 3. Sync Client status
    const email = proposal.clientEmail.toLowerCase().trim();
    const clientsSnap = await adminDb.collection("clients").where("email", "==", email).get();

    if (clientsSnap.empty) {
      const clientRef = adminDb.collection("clients").doc();
      batch.set(clientRef, {
        name: proposal.clientName || "Unknown",
        company: proposal.company || proposal.clientName || "Unknown",
        email: email,
        phone: proposal.phone || "",
        services: proposal.service ? [proposal.service] : [],
        status: "active",
        active: true,
        currency: proposal.currency || "AED",
        fromLeadId: proposal.fromLeadId || "",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      clientsSnap.forEach((docSnap) => {
        const clientData = docSnap.data();
        const currentServices = clientData.services || [];
        const services = proposal.service && !currentServices.includes(proposal.service)
          ? [...currentServices, proposal.service]
          : currentServices;

        batch.update(docSnap.ref, {
          status: "active",
          active: true,
          services: services,
          currency: proposal.currency || clientData.currency || "AED",
          updatedAt: now,
        });
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, message: "Proposal accepted successfully" });
  } catch (error: any) {
    console.error("Error accepting proposal:", error);
    return NextResponse.json({ error: error.message || "Failed to accept proposal" }, { status: 500 });
  }
}
