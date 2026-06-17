import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  writeBatch, 
  updateDoc, 
  addDoc 
} from "firebase/firestore";
import { db } from "./firebase";
import { Lead, LeadStage, ServiceTag } from "@/types";
import { getMasterTemplate } from "./proposal-templates";

/**
 * Normalizes email for consistent lookups
 */
const normalizeEmail = (email?: string) => (email || "").trim().toLowerCase();

/**
 * Centralized pipeline logic to ensure atomic updates across Leads, Clients, and Proposals.
 */
export const PipelineService = {
  
  /**
   * Syncs Lead profile details to Client Profile (e.g. if phone or name is updated)
   */
  async syncLeadToClient(lead: Lead) {
    const batch = writeBatch(db);
    const email = normalizeEmail(lead.email);

    // Update Client if it exists
    const clientQ = query(collection(db, "clients"), where("email", "==", email));
    const clientSnap = await getDocs(clientQ);
    
    clientSnap.forEach(d => {
      const currentServices = d.data().services || [];
      const services = lead.service && !currentServices.includes(lead.service) 
        ? [...currentServices, lead.service] 
        : currentServices;

      batch.update(doc(db, "clients", d.id), {
        name: lead.name,
        company: lead.company,
        phone: lead.phone || "",
        services: services,
        updatedAt: new Date().toISOString()
      });
    });

    await batch.commit();
  },

  /**
   * Handles the "Won" flow for a Lead:
   * 1. Updates Lead status to "won".
   * 2. Ensures Lead stays visible (active: true).
   * Note: Leads DO NOT become Clients here. Only accepted proposals create clients.
   * If a client record somehow exists for this email, it will be deactivated to ensure state consistency.
   */
  async markAsWon(lead: Lead) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const email = normalizeEmail(lead.email);

    // Update Lead to 'won' stage but keep them as a lead (not a client)
    batch.update(doc(db, "leads", lead.id), { 
      stage: "won", 
      active: true, 
      updatedAt: now 
    });

  // Inactivate client and hide if exists
    const clientQ = query(collection(db, "clients"), where("email", "==", email));
    const clientSnap = await getDocs(clientQ);
    clientSnap.forEach(d => {
      batch.update(doc(db, "clients", d.id), { status: "inactive", active: false });
    });

    await batch.commit();
  },

  /**
   * Automates the proposal acceptance pipeline explicitly via a single transactional hook.
   * 1. Updates proposal to 'accepted'
   * 2. Updates linked lead to 'won'
   * 3. Automatically creates an 'active' client document populated with lead's contact details.
   */
  async acceptProposal(proposalId: string, leadId: string) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    const propRef = doc(db, "proposals", proposalId);
    const propDoc = await getDoc(propRef);
    if (!propDoc.exists()) throw new Error("Proposal not found");
    const proposalData = propDoc.data();

    const leadRef = doc(db, "leads", leadId);
    const leadDoc = await getDoc(leadRef);
    let leadData: any = {};
    if (leadDoc.exists()) {
      leadData = leadDoc.data();
      // 2. Update linked lead to 'won'
      batch.update(leadRef, {
        stage: "won",
        active: true,
        updatedAt: now
      });
    }

    // 1. Update proposal to 'accepted'
    batch.update(propRef, {
      status: "accepted",
      updatedAt: now
    });

    const email = normalizeEmail(proposalData.clientEmail || leadData.email);

    // 3. Create a brand new active client document (or activate existing if matches email perfectly to avoid dupes)
    if (email) {
      const clientQ = query(collection(db, "clients"), where("email", "==", email));
      const clientSnap = await getDocs(clientQ);

      if (clientSnap.empty) {
        const newClientRef = doc(collection(db, "clients"));
        batch.set(newClientRef, {
          name: proposalData.clientName || leadData.name || "Unknown",
          company: proposalData.company || leadData.company || "Unknown",
          email: email,
          phone: proposalData.phone || leadData.phone || "",
          services: proposalData.service ? [proposalData.service] : [],
          status: "active",
          active: true,
          currency: proposalData.currency || "AED",
          fromLeadId: leadId,
          createdAt: now,
          updatedAt: now
        });
      } else {
        clientSnap.forEach(d => {
          const currentServices = d.data().services || [];
          const services = proposalData.service && !currentServices.includes(proposalData.service) 
            ? [...currentServices, proposalData.service] 
            : currentServices;

          batch.update(doc(db, "clients", d.id), { 
            status: "active", 
            active: true,
            services: services,
            currency: proposalData.currency || d.data().currency || "AED",
            updatedAt: now
          });
        });
      }
    }

    await batch.commit();
  },

  /**
   * Reverts an accepted proposal retrospectively via a single transactional hook.
   * 1. Reverts proposal to 'draft'
   * 2. Resets linked lead to targetStage (e.g., 'meeting' or 'draft')
   * 3. Automatically locates and deactivates the associated client record.
   */
  async withdrawProposal(proposalId: string, leadId: string, targetStage: 'draft' | 'meeting' | 'lead' | 'proposal') {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    const propRef = doc(db, "proposals", proposalId);
    const propDoc = await getDoc(propRef);
    let email = "";
    if (propDoc.exists()) {
      email = normalizeEmail(propDoc.data().clientEmail);
      // 1. Revert proposal to 'draft'
      batch.update(propRef, {
        status: "draft",
        updatedAt: now
      });
    }

    const leadRef = doc(db, "leads", leadId);
    const leadDoc = await getDoc(leadRef);
    if (leadDoc.exists()) {
      if (!email) email = normalizeEmail(leadDoc.data().email);
      // 2. Reset linked lead to the requested stage
      batch.update(leadRef, {
        stage: targetStage,
        active: true,
        updatedAt: now
      });
    }

    // 3. Locate client and set status to inactive
    if (email) {
      const clientQ = query(collection(db, "clients"), where("email", "==", email));
      const clientSnap = await getDocs(clientQ);
      clientSnap.forEach(d => {
        batch.update(doc(db, "clients", d.id), {
          status: "inactive",
          active: false,
          updatedAt: now
        });
      });
    }

    await batch.commit();
  },

  /**
   * Syncs Client and Lead status when a Proposal's status changes.
   * Ensures data integrity across the pipeline.
   */
  async handleProposalStatusChange(proposal: any, newStatus: string) {
    const batch = writeBatch(db);
    const email = normalizeEmail(proposal.clientEmail);
    const now = new Date().toISOString();

    // Map proposal statuses to lead stages for syncing
    // draft, sent, and proposal statuses keep the lead in 'proposal' stage
    let leadStage = "proposal";
    if (newStatus === "accepted" || newStatus === "won") leadStage = "won";
    else if (newStatus === "rejected" || newStatus === "lost") leadStage = "lost";
    else if (newStatus === "lead") leadStage = "lead";
    else if (newStatus === "meeting") leadStage = "meeting";

    // 1. Update the proposal
    batch.update(doc(db, "proposals", proposal.id), { status: newStatus, updatedAt: now });

    // 2. Determine Client State
    const propQ = query(collection(db, "proposals"), where("clientEmail", "==", email));
    const propSnap = await getDocs(propQ);
    
    // Calculate state based on what it WILL be after this update
    const otherProposals = propSnap.docs.filter(d => d.id !== proposal.id);
    const hasOtherAccepted = otherProposals.some(d => d.data().status === "accepted" || d.data().status === "won");
    const isNowAccepted = newStatus === "accepted" || newStatus === "won";
    const shouldBeActive = isNowAccepted || hasOtherAccepted;

    const clientQ = query(collection(db, "clients"), where("email", "==", email));
    const clientSnap = await getDocs(clientQ);

    if (shouldBeActive) {
      if (clientSnap.empty) {
        // Create new client if accepted and doesn't exist
        const clientRef = doc(collection(db, "clients"));
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
          updatedAt: now
        });
      } else {
        clientSnap.forEach(d => {
          const currentServices = d.data().services || [];
          const services = isNowAccepted && proposal.service && !currentServices.includes(proposal.service) 
            ? [...currentServices, proposal.service] 
            : currentServices;

          batch.update(doc(db, "clients", d.id), { 
            status: "active", 
            active: true,
            services: services,
            currency: proposal.currency || d.data().currency || "AED",
            updatedAt: now
          });
        });
      }
    } else {
      // Deactivate client if no proposals are accepted
      clientSnap.forEach(d => {
        batch.update(doc(db, "clients", d.id), { 
          status: "inactive", 
          active: false,
          updatedAt: now 
        });
      });
    }

    // 3. Update Lead Stage if applicable
    if (proposal.fromLeadId) {
      const leadRef = doc(db, "leads", proposal.fromLeadId);
      const leadDoc = await getDoc(leadRef);
      
      if (leadDoc.exists()) {
        let leadActive = true;
        if (leadStage === "lost") leadActive = false;

        batch.update(leadRef, { 
          stage: leadStage, 
          active: leadActive,
          updatedAt: now 
        });
      }
    }

    await batch.commit();
  },

  /**
   * Deletes a proposal and syncs the Client/Lead status.
   */
  async deleteProposal(proposal: any) {
    const batch = writeBatch(db);
    const email = normalizeEmail(proposal.clientEmail);
    const now = new Date().toISOString();

    // 1. Delete the proposal
    batch.delete(doc(db, "proposals", proposal.id));

    // 2. Determine Client State
    const propQ = query(collection(db, "proposals"), where("clientEmail", "==", email));
    const propSnap = await getDocs(propQ);
    
    // Check other proposals (excluding the one being deleted)
    const otherAccepted = propSnap.docs
      .filter(d => d.id !== proposal.id)
      .some(d => d.data().status === "accepted" || d.data().status === "won");

    const clientQ = query(collection(db, "clients"), where("email", "==", email));
    const clientSnap = await getDocs(clientQ);

    if (!otherAccepted) {
      // Inactivate client if no other accepted proposals remain
      clientSnap.forEach(d => {
        batch.update(doc(db, "clients", d.id), { status: "inactive", active: false });
      });
    }

    // 3. Revert lead stage if applicable
    if (proposal.fromLeadId && !otherAccepted) {
      const leadRef = doc(db, "leads", proposal.fromLeadId);
      const leadDoc = await getDoc(leadRef);
      
      if (leadDoc.exists()) {
        batch.update(leadRef, { 
          stage: "lead", // Revert to lead if proposal is deleted
          active: true,
          updatedAt: now 
        });
      }
    }

    await batch.commit();
  },

  /**
   * Handles the "Lost" flow:
   * 1. Hides Lead from active view (active: false).
   * 2. Hides associated Client from active view (active: false).
   * 3. Updates associated proposal to 'lost'.
   */
  async markAsLost(id: string, email: string, type: "lead" | "client") {
    const batch = writeBatch(db);
    const normEmail = normalizeEmail(email);
    const now = new Date().toISOString();

    if (type === "lead") {
      const leadRef = doc(db, "leads", id);
      const leadDoc = await getDoc(leadRef);
      
      if (leadDoc.exists()) {
        batch.update(leadRef, { stage: "lost", active: false });
        
        // Update associated proposal to 'lost'
        const propQ = query(collection(db, "proposals"), where("fromLeadId", "==", id));
        const propSnap = await getDocs(propQ);
        propSnap.forEach(d => {
          batch.update(doc(db, "proposals", d.id), { status: "lost", updatedAt: now });
        });
      }
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
   * 2. Sets proposal status to 'proposal'.
   * 3. Sets client to "inactive" if it exists.
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

    // Check for existing proposal using fromLeadId
    const propQ = query(collection(db, "proposals"), where("fromLeadId", "==", lead.id));
    const propSnap = await getDocs(propQ);

    if (propSnap.empty) {
      const propRef = doc(collection(db, "proposals"));
      const template = getMasterTemplate(lead.service, lead.company || lead.name || "Unknown");
      batch.set(propRef, {
        clientName: lead.name || "Unknown",
        company: lead.company || "",
        clientEmail: email,
        phone: lead.phone || "",
        service: lead.service,
        status: "proposal", // Match the single source of truth 'Proposal'
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: lead.notes || "",
        fromLeadId: lead.id,
        createdBy: userId,
        createdAt: now,
        ...template
      });
    } else {
      // If it exists, ensure status is set to 'proposal' so it appears in the view
      propSnap.forEach(d => {
        batch.update(doc(db, "proposals", d.id), { status: "proposal", updatedAt: now });
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
  async updateStage(lead: Lead, stage: string) {
    const batch = writeBatch(db);
    const email = normalizeEmail(lead.email);
    const now = new Date().toISOString();

    batch.update(doc(db, "leads", lead.id), { 
      stage, 
      active: true, 
      updatedAt: now 
    });

    // Sync any associated proposal to the same status (e.g. 'meeting' or 'lead')
    // This will remove it from the Proposals page if it was there
    const propQ = query(collection(db, "proposals"), where("fromLeadId", "==", lead.id));
    const propSnap = await getDocs(propQ);
    propSnap.forEach(d => {
      batch.update(doc(db, "proposals", d.id), { status: stage, updatedAt: now });
    });

    // Inactivate client and hide if exists
    const clientQ = query(collection(db, "clients"), where("email", "==", email));
    const clientSnap = await getDocs(clientQ);
    clientSnap.forEach(d => {
      batch.update(doc(db, "clients", d.id), { status: "inactive", active: false });
    });

    await batch.commit();
  },

  /**
   * Project status updates.
   * Handles bi-directional sync: if moving back to in-progress, reactivate tasks.
   */
  async updateProjectStatus(projectId: string, status: string, userId: string) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    batch.update(doc(db, "projects", projectId), { 
      status, 
      updatedAt: now 
    });

    // CASCADE: If moving back from completed to in-progress/review, reset tasks
    if (status === "in-progress" || status === "review" || status === "on-hold") {
      const tasksQ = query(collection(db, "tasks"), where("relatedTo", "==", projectId), where("status", "==", "completed"));
      const tasksSnap = await getDocs(tasksQ);
      tasksSnap.forEach(d => {
        batch.update(doc(db, "tasks", d.id), { status: "in-progress", done: false, updatedAt: now });
      });
    }

    // CASCADE: If manually completing project, complete all tasks
    if (status === "completed") {
      const tasksQ = query(collection(db, "tasks"), where("relatedTo", "==", projectId));
      const tasksSnap = await getDocs(tasksQ);
      tasksSnap.forEach(d => {
        batch.update(doc(db, "tasks", d.id), { status: "completed", done: true, updatedAt: now });
      });
      
      // Also trigger invoice drafting if manually completed
      await this.draftInvoiceForProject(projectId, userId, batch);
    }

    await batch.commit();
  },

  /**
   * Task completion handoff to Project & Invoice Staging.
   * Implementation: Absolute Bi-directional Reactivity.
   */
  async handleTaskCompletion(task: any, userId: string) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // 1. Mark task as completed
    batch.update(doc(db, "tasks", task.id), { 
      status: "completed", 
      done: true,
      updatedAt: now
    });

    // 2. Check for Project Completion
    if (task.relatedType === "project" && task.relatedTo) {
      const tasksQ = query(collection(db, "tasks"), where("relatedTo", "==", task.relatedTo));
      const tasksSnap = await getDocs(tasksQ);
      
      const allOtherTasksCompleted = tasksSnap.docs
        .filter(d => d.id !== task.id)
        .every(d => d.data().status === "completed");

      if (allOtherTasksCompleted) {
        // ALL TASKS DONE -> Auto-Complete Project
        batch.update(doc(db, "projects", task.relatedTo), { 
          status: "completed",
          updatedAt: now
        });

        // 3. Trigger Invoice Data Fusion
        await this.draftInvoiceForProject(task.relatedTo, userId, batch);
      }
    }

    await batch.commit();
  },

  /**
   * Internal helper to draft an invoice based on project/proposal financials.
   */
  async draftInvoiceForProject(projectId: string, userId: string, batch: any) {
    try {
      const projRef = doc(db, "projects", projectId);
      const projSnap = await getDoc(projRef);
      if (!projSnap.exists()) return;
      const projectData = projSnap.data();

      // Ensure we have complete client details
      let clientEmail = projectData.clientEmail;
      let clientPhone = projectData.clientPhone;
      let clientAddress = projectData.clientAddress;

      if (!clientEmail && projectData.clientId) {
        const clientSnap = await getDoc(doc(db, "clients", projectData.clientId));
        if (clientSnap.exists()) {
          const c = clientSnap.data();
          clientEmail = c.email || "";
          clientPhone = c.phone || "";
          clientAddress = c.address || "";
        }
      }

      // Trace back to accepted proposal
      let propQ = null as any;
      if (projectData.fromLeadId) {
        propQ = query(collection(db, "proposals"), where("fromLeadId", "==", projectData.fromLeadId), where("status", "in", ["accepted", "won"]));
      } else if (clientEmail) {
        propQ = query(collection(db, "proposals"), where("clientEmail", "==", clientEmail), where("status", "in", ["accepted", "won"]));
      }

      let proposal: any = null;
      let propId = "";
      if (propQ) {
        const pSnap = await getDocs(propQ);
        if (!pSnap.empty) {
          proposal = pSnap.docs[0].data();
          propId = pSnap.docs[0].id;
        }
      }

      // Prevent duplicate draft invoices
      const existingInvQ = query(collection(db, "invoices"), where("projectId", "==", projectId), where("status", "==", "unpaid"));
      const existingInvSnap = await getDocs(existingInvQ);
      if (!existingInvSnap.empty) return;

      const invRef = doc(collection(db, "invoices"));
      const invoiceNumber = `AM-INV-${Math.floor(Math.random() * 90000) + 10000}`;
      
      const currency = proposal?.currency || projectData.currency || "AED";
      
      // Data Fusion: Use proposal items, OR fallback to Project Budget, OR fallback to empty item.
      let items = [];
      if (proposal?.items && proposal.items.length > 0) {
        items = proposal.items;
      } else {
        items = [{
          description: `Project Execution: ${projectData.title}`,
          qty: 1,
          rate: projectData.budget || 0,
          amount: projectData.budget || 0
        }];
      }

      const subtotal = items.reduce((s: number, i: any) => s + (i.amount || 0), 0);
      const tax = subtotal * 0.05;
      const total = subtotal + tax;

      batch.set(invRef, {
        clientId: projectData.clientId || "",
        clientName: projectData.clientName || proposal?.clientName || "Unknown Client",
        clientEmail: clientEmail || "",
        clientPhone: clientPhone || "",
        clientAddress: clientAddress || "",
        projectId: projectId || "",
        projectTitle: projectData.title || "Untitled Project",
        proposalId: propId || "",
        service: proposal?.service || projectData.service || "other",
        items: items || [],
        subtotal: subtotal || 0,
        tax: tax || 0,
        total: total || 0,
        currency: currency || "AED",
        status: "unpaid",
        invoiceNumber: invoiceNumber || "",
        notes: propId 
          ? `Auto-generated on project completion. Sync ref: Proposal #${propId.slice(-6).toUpperCase()}` 
          : `Auto-generated on project completion. Pricing based on project budget.`,
        createdBy: userId || "system",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Invoice Drafting Error:", err);
    }
  }
};
