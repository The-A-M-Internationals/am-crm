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

    const action = data.action || "accept";
    let updateData: any = { updatedAt: now };

    if (action === "accept") {
      updateData = {
        ...updateData,
        status: "accepted",
        clientSignatureName: data.signingName,
        clientSignatureTitle: data.signingTitle,
        clientSignatureImage: data.signatureData || null,
        signedAt: now,
      };

      if (data.selectedPackageName) {
        const subtotal = Number(data.selectedPackagePrice) || 0;
        const taxPct = docSnap.data()?.taxPercentage !== undefined ? docSnap.data()?.taxPercentage : 5;
        const tax = subtotal * (taxPct / 100);
        const total = subtotal + tax;
        updateData.selectedPackageName = data.selectedPackageName;
        updateData.selectedPackagePrice = subtotal;
        updateData.subtotal = subtotal;
        updateData.tax = tax;
        updateData.total = total;
      }
    } else if (action === "reject") {
      updateData = {
        ...updateData,
        status: "rejected",
      };
    } else if (action === "view") {
      if (docSnap.data()?.viewedAt) {
        return NextResponse.json({ success: true, alreadyViewed: true });
      }
      updateData = {
        ...updateData,
        viewedAt: now,
      };
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await proposalRef.update(updateData);

    const proposalData = docSnap.data();
    if (proposalData) {
      console.log(`[API] Processing proposal: ${id}. action: ${action}`);
      
      if (action !== "view" && proposalData.fromLeadId) {
        console.log(`[API] Upgrading lead ${proposalData.fromLeadId} to ${action === "accept" ? "won" : "lost"}`);
        const leadRef = adminDb.collection("leads").doc(proposalData.fromLeadId);
        await leadRef.update({
          stage: action === "accept" ? "won" : "lost",
          active: action === "accept" ? true : false,
          updatedAt: now,
        });
      }

      const normEmail = (proposalData.clientEmail || "").trim().toLowerCase();
      
      if (action === "accept") {
        if (normEmail) {
          const clientsRef = adminDb.collection("clients");
          let clientId = "";
          
          await adminDb.runTransaction(async (t) => {
            const existingClients = await t.get(clientsRef.where("email", "==", normEmail));
            
              const finalTotal = updateData.total || proposalData.total || 0;
              
              if (existingClients.empty) {
                const newClientRef = clientsRef.doc();
                t.set(newClientRef, {
                  name: proposalData.clientName || "Unknown",
                  company: proposalData.company || proposalData.clientName || "Unknown",
                  email: normEmail,
                  phone: proposalData.phone || "",
                  services: proposalData.service ? [proposalData.service] : [],
                  status: "active",
                  active: true,
                  currency: proposalData.currency || "AED",
                  budget: finalTotal,
                  due: finalTotal,
                  paid: 0,
                  remaining: finalTotal,
                  balance: finalTotal,
                  fromLeadId: proposalData.fromLeadId || "",
                  createdAt: now,
                  updatedAt: now
                });
                clientId = newClientRef.id;
              } else {
                const existingClient = existingClients.docs[0];
                const cData = existingClient.data();
                const services = new Set(cData.services || []);
                if (proposalData.service) services.add(proposalData.service);
                
                // Add the new proposal amount to the existing client's ledger
                const newBudget = (Number(cData.budget) || 0) + finalTotal;
                const newDue = (Number(cData.due) || 0) + finalTotal;
                const newRemaining = (Number(cData.remaining) || 0) + finalTotal;
                const newBalance = (Number(cData.balance) || 0) + finalTotal;

                t.update(existingClient.ref, {
                  active: true,
                  status: "active",
                  services: Array.from(services),
                  budget: newBudget,
                  due: newDue,
                  remaining: newRemaining,
                  balance: newBalance,
                  updatedAt: now
                });
                clientId = existingClient.id;
              }
            
            // Attach the clientId to the proposal so the handoff works
            t.update(proposalRef, { clientId });
          });
        }
      } else if (action === "reject") {
        // Do not cascade-deactivate clients on proposal rejection.
        // A client might have other active proposals or be a direct client.
      }
    }

    return NextResponse.json({ success: true, updated: updateData });
  } catch (error: any) {
    console.error("Error updating proposal:", error);
    return NextResponse.json({ error: error.message || "Failed to update proposal" }, { status: 500 });
  }
}

