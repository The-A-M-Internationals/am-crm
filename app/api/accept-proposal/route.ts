import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, writeBatch, collection, query, where } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { proposalId, clientSignatureName, clientSignatureTitle, clientSignatureImage } = await req.json();

    if (!proposalId || !clientSignatureName || !clientSignatureTitle) {
      return NextResponse.json(
        { error: "Missing required fields: proposalId, clientSignatureName, or clientSignatureTitle" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const proposalRef = doc(db, "proposals", proposalId);
    const proposalSnap = await getDoc(proposalRef);
    if (!proposalSnap.exists()) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const proposal = proposalSnap.data() as any;
    const batch = writeBatch(db);

    // 1. Update the proposal status and signature details
    batch.update(proposalRef, {
      status: "accepted",
      clientSignatureName,
      clientSignatureTitle,
      clientSignatureImage: clientSignatureImage || null,
      signedAt: now,
      updatedAt: now,
    });

    // 2. Fetch Lead Context
    let leadContext = null;
    if (proposal.fromLeadId) {
      const leadRef = doc(db, "leads", proposal.fromLeadId);
      const leadSnap = await getDoc(leadRef);
      if (leadSnap.exists()) {
        leadContext = leadSnap.data();
        batch.update(leadRef, {
          stage: "won",
          active: true,
          updatedAt: now,
        });
      }
    }

    // 3. Smart Client Creation / Update
    const clientEmail = proposal.clientEmail || proposal.email || leadContext?.email || "";
    if (clientEmail) {
      const clientQuery = query(collection(db, "clients"), where("email", "==", clientEmail));
      const clientSnap = await getDocs(clientQuery);

      if (!clientSnap.empty) {
        // Update existing client
        const existingClient = clientSnap.docs[0];
        batch.update(existingClient.ref, {
          updatedAt: now,
          status: "active",
          proposalContext: proposalId,
          company: proposal.company || existingClient.data().company,
        });
      } else {
        // Create new client idempotently
        const newClientRef = doc(collection(db, "clients"));
        batch.set(newClientRef, {
          name: clientSignatureName || proposal.clientName || leadContext?.name || "",
          company: proposal.company || leadContext?.company || "",
          email: clientEmail,
          phone: leadContext?.phone || "",
          services: proposal.service ? [proposal.service] : [],
          status: "active",
          address: leadContext?.address || "",
          website: leadContext?.website || "",
          notes: `Converted from accepted proposal ${proposalId}.`,
          currency: "AED",
          budget: proposal.total?.toString() || "",
          due: proposal.total?.toString() || "",
          paid: "0",
          remaining: proposal.total?.toString() || "",
          createdAt: now,
          updatedAt: now,
          sourceLeadId: proposal.fromLeadId || null,
          acceptedProposalId: proposalId,
          blueprintContext: proposal.executiveSummary || ""
        });
      }
    }

    await batch.commit();
    return NextResponse.json({ success: true, message: "Proposal accepted successfully and client converted." });
  } catch (error: any) {
    console.error("Error accepting proposal:", error);
    return NextResponse.json({ error: error.message || "Failed to accept proposal" }, { status: 500 });
  }
}
