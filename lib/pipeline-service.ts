import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  writeBatch, 
  updateDoc, 
  addDoc 
} from "firebase/firestore";
import { db } from "./firebase";
import { Lead, LeadStage, ServiceTag } from "@/types";

/**
 * Normalizes email for consistent lookups
 */
const normalizeEmail = (email?: string) => (email || "").trim().toLowerCase();

/**
 * Centralized pipeline logic to ensure atomic updates across Leads, Clients, and Proposals.
 */
export const PipelineService = {
  
  /**
   * Handles the "Won" flow:
   * 1. Updates Lead status to "won".
   * 2. Ensures Lead stays visible (active: true).
   * 3. Creates/Activates a Client record.
   * 4. Marks any related Proposals as "accepted".
   */
  async markAsWon(lead: Lead) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const email = normalizeEmail(lead.email);

    // 1 & 2: Update Lead
    batch.update(doc(db, "leads", lead.id), { 
      stage: "won", 
      active: true, 
      updatedAt: now 
    });

    // 3: Create/Update Client
    const clientQ = query(collection(db, "clients"), where("email", "==", email));
    const clientSnap = await getDocs(clientQ);

    if (clientSnap.empty) {
      const clientRef = doc(collection(db, "clients"));
      batch.set(clientRef, {
        name: lead.name || "Unknown",
        company: lead.company || "Unknown",
        email: email,
        phone: lead.phone || "",
        services: lead.service ? [lead.service] : [],
        status: "active",
        active: true,
        fromLeadId: lead.id,
        createdAt: now
      });
    } else {
      clientSnap.forEach(d => {
        batch.update(doc(db, "clients", d.id), { 
          status: "active", 
          active: true 
        });
      });
    }

    // 4: Update Proposals
    const propQ = query(collection(db, "proposals"), where("clientEmail", "==", email));
    const propSnap = await getDocs(propQ);
    propSnap.forEach(d => {
      batch.update(doc(db, "proposals", d.id), { status: "accepted" });
    });

    await batch.commit();
  },

  /**
   * Handles the "Lost" flow:
   * 1. Hides Lead from active view (active: false).
   * 2. Hides associated Client from active view (active: false).
   */
  async markAsLost(id: string, email: string, type: "lead" | "client") {
    const batch = writeBatch(db);
    const normEmail = normalizeEmail(email);

    if (type === "lead") {
      batch.update(doc(db, "leads", id), { stage: "lost", active: false });
    }

    // Always hide the client associated with this email
    const clientQ = query(collection(db, "clients"), where("email", "==", normEmail));
    const clientSnap = await getDocs(clientQ);
    clientSnap.forEach(d => {
      batch.update(doc(db, "clients", d.id), { active: false, status: "inactive" });
    });

    // If it was a lead, we might also want to hide the lead if we marked a client as lost
    if (type === "client") {
      const leadQ = query(collection(db, "leads"), where("email", "==", normEmail));
      const leadSnap = await getDocs(leadQ);
      leadSnap.forEach(d => {
        batch.update(doc(db, "leads", d.id), { active: false, stage: "lost" });
      });
    }

    await batch.commit();
  },

  /**
   * Handles transitioning to "Proposal" stage:
   * 1. Creates a draft proposal card if missing.
   * 2. Sets client to "inactive" if it exists.
   */
  async transitionToProposal(lead: Lead, userId: string) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const email = normalizeEmail(lead.email);

    batch.update(doc(db, "leads", lead.id), { 
      stage: "proposal", 
      active: true, 
      updatedAt: now 
    });

    // Check for existing proposal using fromLeadId to be 100% accurate
    const propQ = query(collection(db, "proposals"), where("fromLeadId", "==", lead.id));
    const propSnap = await getDocs(propQ);

    if (propSnap.empty) {
      const propRef = doc(collection(db, "proposals"));
      batch.set(propRef, {
        clientName: lead.name || "Unknown",
        company: lead.company || "",
        clientEmail: email,
        phone: lead.phone || "",
        service: lead.service,
        status: "draft",
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: lead.notes || "",
        fromLeadId: lead.id,
        createdBy: userId,
        createdAt: now
      });
    }

    // Set client to inactive and hide if exists
    const clientQ = query(collection(db, "clients"), where("email", "==", email));
    const clientSnap = await getDocs(clientQ);
    clientSnap.forEach(d => {
      batch.update(doc(db, "clients", d.id), { status: "inactive", active: false });
    });

    await batch.commit();
  },

  /**
   * Generic stage update for Meeting/Lead etc.
   */
  async updateStage(lead: Lead, stage: LeadStage) {
    const batch = writeBatch(db);
    const email = normalizeEmail(lead.email);

    batch.update(doc(db, "leads", lead.id), { 
      stage, 
      active: true, 
      updatedAt: new Date().toISOString() 
    });

    // Inactivate client and hide if exists
    const clientQ = query(collection(db, "clients"), where("email", "==", email));
    const clientSnap = await getDocs(clientQ);
    clientSnap.forEach(d => {
      batch.update(doc(db, "clients", d.id), { status: "inactive", active: false });
    });

    await batch.commit();
  }
};
