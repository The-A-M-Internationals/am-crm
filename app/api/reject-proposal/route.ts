import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { proposalId } = await req.json();

    if (!proposalId) {
      return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const proposalRef = doc(db, "proposals", proposalId);
    const proposalSnap = await getDoc(proposalRef);
    if (!proposalSnap.exists()) { return NextResponse.json({ error: "Proposal not found" }, { status: 404 }); }

    const proposal = proposalSnap.data() as any;
    const batch = writeBatch(db);

    batch.update(proposalRef, { status: "rejected", updatedAt: now });

    if (proposal.fromLeadId) {
      batch.update(doc(db, "leads", proposal.fromLeadId), { stage: "lost", active: false, updatedAt: now });
    }

    const email = proposal.clientEmail.toLowerCase().trim();
    const clientsSnap = await getDocs(query(collection(db, "clients"), where("email", "==", email)));
    clientsSnap.forEach(docSnap => {
      batch.update(doc(db, "clients", docSnap.id), { status: "inactive", active: false, updatedAt: now });
    });

    await batch.commit();
    return NextResponse.json({ success: true, message: "Proposal rejected successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to reject proposal" }, { status: 500 });
  }
}
