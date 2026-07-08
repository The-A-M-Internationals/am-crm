
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET() {
  const db = getAdminDb();
  
  const clientsSnap = await db.collection("clients").get();
  const clients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const leadsSnap = await db.collection("leads").get();
  const leads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const propsSnap = await db.collection("proposals").get();
  const proposals = propsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ clients, leads, proposals });
}

