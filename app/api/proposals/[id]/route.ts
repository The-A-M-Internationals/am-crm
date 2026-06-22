import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Missing proposal ID" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const docSnap = await adminDb.collection("proposals").doc(id).get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const proposal = { id: docSnap.id, ...docSnap.data() };

    return NextResponse.json(proposal);
  } catch (error: any) {
    console.error("Error fetching proposal:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch proposal" }, { status: 500 });
  }
}
