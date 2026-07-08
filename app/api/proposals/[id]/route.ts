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
    const docRef = adminDb.collection("proposals").doc(id);
    const docSnap = await docRef.get();

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

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing proposal ID" }, { status: 400 });

    const data = await req.json();
    const adminDb = getAdminDb();
    const now = new Date().toISOString();

    const proposalRef = adminDb.collection("proposals").doc(id);
    const docSnap = await proposalRef.get();
    
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const updateData = {
      status: "accepted",
      clientSignatureName: data.signingName,
      clientSignatureTitle: data.signingTitle,
      clientSignatureImage: data.signatureData || null,
      signedAt: now,
      updatedAt: now,
    };

    await proposalRef.update(updateData);

    const proposalData = docSnap.data();
    if (proposalData) {
      console.log(`[API] Processing proposal: ${id}. fromLeadId: ${proposalData.fromLeadId}, clientEmail: ${proposalData.clientEmail}`);
      
      if (proposalData.fromLeadId) {
        console.log(`[API] Upgrading lead ${proposalData.fromLeadId} to won`);
        const leadRef = adminDb.collection("leads").doc(proposalData.fromLeadId);
        await leadRef.update({
          stage: "won",
          active: true,
          updatedAt: now,
        });
      }

      // 3. Client Creation / Synchronization
      const normEmail = (proposalData.clientEmail || "").trim().toLowerCase();
      console.log(`[API] Normalized email: '${normEmail}'`);
      
      if (normEmail) {
        const clientsRef = adminDb.collection("clients");
        const existingClients = await clientsRef.where("email", "==", normEmail).get();
        console.log(`[API] Found ${existingClients.size} existing clients for email: ${normEmail}`);
        
        if (existingClients.empty) {
          console.log(`[API] Creating new client seamlessly`);
          await clientsRef.add({
            name: proposalData.clientName || "Unknown",
            company: proposalData.company || proposalData.clientName || "Unknown",
            email: normEmail,
            phone: proposalData.phone || "",
            services: proposalData.service ? [proposalData.service] : [],
            status: "active",
            active: true,
            currency: proposalData.currency || "AED",
            fromLeadId: proposalData.fromLeadId || "",
            createdAt: now,
            updatedAt: now
          });
          console.log(`[API] Client creation successful`);
        } else {
          console.log(`[API] Updating existing client`);
          const existingClient = existingClients.docs[0];
          const cData = existingClient.data();
          const services = new Set(cData.services || []);
          if (proposalData.service) services.add(proposalData.service);
          
          await existingClient.ref.update({
            active: true,
            status: "active",
            services: Array.from(services),
            updatedAt: now
          });
          console.log(`[API] Client update successful`);
        }
      } else {
        console.warn(`[API] WARNING: No clientEmail found on proposal ${id}! Cannot create client.`);
      }
    }

    return NextResponse.json({ success: true, updated: updateData });
  } catch (error: any) {
    console.error("Error signing proposal:", error);
    return NextResponse.json({ error: error.message || "Failed to sign proposal" }, { status: 500 });
  }
}

