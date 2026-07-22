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

    // Do not automatically mark leads as lost or clients as inactive here.
    // A rejection of one proposal does not mean the entire relationship is dead.

    await batch.commit();
    return NextResponse.json({ success: true, message: "Proposal rejected successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to reject proposal" }, { status: 500 });
  }
}
