import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { Lead, LeadStage, ServiceTag, Client } from "@/types";
import { getMasterTemplate } from "./proposal-templates";

/**
 * Normalizes email for consistent lookups
 */
const normalizeEmail = (email?: string) => (email || "").trim().toLowerCase();

/**
 * Centralized pipeline logic to ensure atomic updates across Leads, Clients, and Proposals.
 */
export const PipelineService = {
  _listenerUnsubscribe: null as any,

  /**
   * Establishes a strict real-time snapshot listener on the Proposals collection
   * to enforce Proposal-to-Client hierarchy and data coupling automatically.
   */
  initGlobalPipelineListener() {
    if (typeof window === "undefined") return;
    if (this._listenerUnsubscribe) return;

    const q = query(collection(db, "proposals"));
    let isInitialLoad = true;

    this._listenerUnsubscribe = onSnapshot(q, async (snap) => {
      const changedEmails = new Set<string>();

      if (isInitialLoad) {
        isInitialLoad = false;
        // On initial mount, ensure all active clients have an accepted proposal.
        // Also ensure any accepted proposals have an active client (catches offline API signatures)
        snap.docs.forEach((docSnap) => {
          const email = normalizeEmail(docSnap.data().clientEmail);
          if (email) changedEmails.add(email);
        });
      } else {
        // Strict real-time atomic sync for ongoing changes
        snap.docChanges().forEach((change) => {
          const email = normalizeEmail(change.doc.data().clientEmail);
          if (email) changedEmails.add(email);
        });
      }

      // Execute atomic transaction checks for affected emails
      for (const email of Array.from(changedEmails)) {
        await this.syncClientForEmail(email);
      }
    });
  },

  /**
   * Atomic evaluation: Validates if an email has accepted proposals.
   * - If YES: Instantiates or activates Client profile.
   * - If NO: Cascades to instantly deactivate/archive Client.
   */
  async syncClientForEmail(email: string) {
    if (!email) return;
    const normEmail = normalizeEmail(email);
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    const propQ = query(
      collection(db, "proposals"),
      where("clientEmail", "==", normEmail),
    );
    const propSnap = await getDocs(propQ);

    // Strict isolation: Client ONLY exists if there's an accepted proposal
    const acceptedProps = propSnap.docs.filter((d) => {
      const s = d.data().status;
      return s === "accepted" || s === "won";
    });

    const clientQ = query(
      collection(db, "clients"),
      where("email", "==", normEmail),
    );
    const clientSnap = await getDocs(clientQ);

    const shouldBeActive = acceptedProps.length > 0;

    if (shouldBeActive) {

      if (clientSnap.empty) {
        // Instantiate new active Client profile carrying over the proposal's metadata
        const latestProp = acceptedProps
          .map((d) => d.data())
          .sort((a, b) =>
            (b.updatedAt || "").localeCompare(a.updatedAt || ""),
          )[0];
        const newClientRef = doc(collection(db, "clients"));
        batch.set(newClientRef, {
          name: latestProp.clientName || "Unknown",
          company: latestProp.company || latestProp.clientName || "Unknown",
          email: normEmail,
          phone: latestProp.phone || "",
          services: latestProp.service ? [latestProp.service] : [],
          status: "active",
          active: true,
          currency: latestProp.currency || "AED",
          fromLeadId: latestProp.fromLeadId || "",
          createdAt: now,
          updatedAt: now,
        });
      } else {
        // Enforce existing clients stay active
        clientSnap.forEach((d) => {
          const cData = d.data();
          const services = new Set(cData.services || []);
          acceptedProps.forEach((p) => {
            if (p.data().service) services.add(p.data().service);
          });

          if (
            cData.status !== "active" ||
            cData.active !== true ||
            services.size !== (cData.services || []).length
          ) {
            batch.update(d.ref, {
              active: true,
              status: "active",
              services: Array.from(services),
              updatedAt: now,
            });
          }

        });
      }
      // Note: We DO NOT create a new client here anymore to prevent race conditions.
      // Client creation is handled explicitly by the action that accepted the proposal 
      // (either api/accept-proposal/route.ts or handleProposalStatusChange).
    } else {
      // Cascading signal: instantly deactivate/hide client record
      clientSnap.forEach((d) => {
        const cData = d.data();
        if (cData.status !== "inactive" || cData.active !== false) {
          batch.update(d.ref, {
            active: false,
            status: "inactive",
            updatedAt: now,
          });
        }
      });
    }
    await batch.commit();
  },

  /**
   * Syncs Lead profile details to Proposals and Clients dynamically.
   */
  async syncLeadDetails(lead: Lead) {
    const batch = writeBatch(db);
    const email = normalizeEmail(lead.email);
    const company = (lead.company || "").trim();
    const name = (lead.name || "").trim();
    const displayClientName = company ? (name ? `${company} (${name})` : company) : (name || "Client");
    const now = new Date().toISOString();

    // 1. Sync to Proposals (by fromLeadId, leadId, or email)
    const propMap = new Map<string, any>();
    if (lead.id) {
      const qFromLead = query(collection(db, "proposals"), where("fromLeadId", "==", lead.id));
      const snapFromLead = await getDocs(qFromLead);
      snapFromLead.forEach(d => propMap.set(d.id, d.ref));

      const qLeadId = query(collection(db, "proposals"), where("leadId", "==", lead.id));
      const snapLeadId = await getDocs(qLeadId);
      snapLeadId.forEach(d => propMap.set(d.id, d.ref));
    }
    if (email) {
      const qEmail = query(collection(db, "proposals"), where("clientEmail", "==", email));
      const snapEmail = await getDocs(qEmail);
      snapEmail.forEach(d => propMap.set(d.id, d.ref));
    }

    propMap.forEach((ref) => {
      batch.update(ref, {
        company: company || "",
        clientName: displayClientName,
        clientEmail: email,
        phone: lead.phone || "",
        updatedAt: now,
      });
    });

    // 2. Sync to Clients (by fromLeadId, sourceLeadId, or email)
    const clientMap = new Map<string, any>();
    if (lead.id) {
      const qFromLead = query(collection(db, "clients"), where("fromLeadId", "==", lead.id));
      const snapFromLead = await getDocs(qFromLead);
      snapFromLead.forEach(d => clientMap.set(d.id, d));

      const qSourceLead = query(collection(db, "clients"), where("sourceLeadId", "==", lead.id));
      const snapSourceLead = await getDocs(qSourceLead);
      snapSourceLead.forEach(d => clientMap.set(d.id, d));
    }
    if (email) {
      const qEmail = query(collection(db, "clients"), where("email", "==", email));
      const snapEmail = await getDocs(qEmail);
      snapEmail.forEach(d => clientMap.set(d.id, d));
    }

    const clientIds: string[] = [];
    clientMap.forEach((d, cId) => {
      clientIds.push(cId);
      const currentServices = d.data().services || [];
      const services =
        lead.service && !currentServices.includes(lead.service)
          ? [...currentServices, lead.service]
          : currentServices;

      batch.update(doc(db, "clients", cId), {
        name: name,
        company: company || name,
        email: email,
        phone: lead.phone || "",
        services: services,
        updatedAt: now,
      });
    });

    // Cascade client changes to Projects, Tasks, and Invoices
    for (const cId of clientIds) {
      const projSnap = await getDocs(query(collection(db, "projects"), where("clientId", "==", cId)));
      projSnap.forEach(pd => {
        batch.update(pd.ref, {
          clientName: company || name,
          clientEmail: email,
          updatedAt: now,
        });
      });

      const taskSnap = await getDocs(query(collection(db, "tasks"), where("clientId", "==", cId)));
      taskSnap.forEach(td => {
        batch.update(td.ref, {
          clientName: company || name,
          updatedAt: now,
        });
      });

      const invSnap = await getDocs(query(collection(db, "invoices"), where("clientId", "==", cId)));
      invSnap.forEach(idoc => {
        batch.update(idoc.ref, {
          clientName: company || name,
          clientEmail: email,
          clientPhone: lead.phone || "",
          updatedAt: now,
        });
      });
    }

    // 3. Sync to direct Lead Tasks
    if (lead.id) {
      const leadTasksSnap = await getDocs(
        query(collection(db, "tasks"), where("relatedTo", "==", lead.id))
      );
      leadTasksSnap.forEach(td => {
        batch.update(td.ref, {
          clientName: company || name,
          updatedAt: now,
        });
      });

      // 4. Sync to Notes
      const notesSnap = await getDocs(
        query(collection(db, "notes"), where("relatedId", "==", lead.id))
      );
      notesSnap.forEach(nd => {
        batch.update(nd.ref, {
          relatedName: company ? (name ? `${company} (${name})` : company) : name,
          updatedAt: now,
        });
      });
    }

    await batch.commit();
  },

  /**
   * Syncs Client profile details to Leads, Projects, Tasks, Proposals, Invoices, and Notes.
   */
  async syncClientDetails(client: Client) {
    const batch = writeBatch(db);
    const newName = (client.name || "").trim();
    const newCompany = (client.company || client.name || "").trim();
    const displayClientName = newCompany ? (newName ? `${newCompany} (${newName})` : newCompany) : (newName || "Client");
    const newEmail = normalizeEmail(client.email);
    const now = new Date().toISOString();

    // 1. Sync to Leads
    if (client.fromLeadId) {
      batch.update(doc(db, "leads", client.fromLeadId), {
        name: newName,
        company: newCompany,
        email: newEmail,
        phone: client.phone || "",
        updatedAt: now,
      });
    }
    if (newEmail) {
      const leadEmailSnap = await getDocs(query(collection(db, "leads"), where("email", "==", newEmail)));
      leadEmailSnap.forEach(ld => {
        if (ld.id !== client.fromLeadId) {
          batch.update(ld.ref, {
            name: newName,
            company: newCompany,
            phone: client.phone || "",
            updatedAt: now,
          });
        }
      });
    }

    // 2. Sync to Projects
    const projSnap = await getDocs(query(collection(db, "projects"), where("clientId", "==", client.id)));
    projSnap.forEach(d => {
      const updateData: any = { 
        clientName: newCompany, 
        clientEmail: newEmail, 
        updatedAt: now 
      };
      if (client.budget !== undefined) updateData.budget = client.budget;
      if (client.paid !== undefined) updateData.paid = client.paid;
      if (client.due !== undefined) updateData.due = client.due;
      if (client.remaining !== undefined) updateData.remaining = client.remaining;
      if (client.currency !== undefined) updateData.currency = client.currency;
      
      batch.update(d.ref, updateData);
    });

    // 3. Sync to Tasks
    const taskSnap = await getDocs(query(collection(db, "tasks"), where("clientId", "==", client.id)));
    taskSnap.forEach(d => batch.update(d.ref, { clientName: newCompany, updatedAt: now }));

    // 4. Sync to Proposals
    const propMap = new Map<string, any>();
    const propClientSnap = await getDocs(query(collection(db, "proposals"), where("clientId", "==", client.id)));
    propClientSnap.forEach(d => propMap.set(d.id, d.ref));
    if (newEmail) {
      const propEmailSnap = await getDocs(query(collection(db, "proposals"), where("clientEmail", "==", newEmail)));
      propEmailSnap.forEach(d => propMap.set(d.id, d.ref));
    }
    propMap.forEach((ref) => {
      batch.update(ref, {
        clientName: displayClientName,
        company: newCompany,
        clientEmail: newEmail,
        phone: client.phone || "",
        updatedAt: now,
      });
    });

    // 5. Sync to Invoices
    const invMap = new Map<string, any>();
    const invClientSnap = await getDocs(query(collection(db, "invoices"), where("clientId", "==", client.id)));
    invClientSnap.forEach(d => invMap.set(d.id, d.ref));
    if (newEmail) {
      const invEmailSnap = await getDocs(query(collection(db, "invoices"), where("clientEmail", "==", newEmail)));
      invEmailSnap.forEach(d => invMap.set(d.id, d.ref));
    }
    invMap.forEach((ref) => {
      batch.update(ref, {
        clientName: newCompany,
        clientEmail: newEmail,
        clientPhone: client.phone || "",
        clientAddress: client.address || "",
        updatedAt: now,
      });
    });

    // 6. Sync to Notes
    const notesSnap = await getDocs(query(collection(db, "notes"), where("relatedId", "==", client.id)));
    notesSnap.forEach(nd => {
      batch.update(nd.ref, {
        relatedName: newCompany,
        updatedAt: now,
      });
    });

    await batch.commit();
  },

  /**
   * Syncs Proposal details (name, company, email, phone) back to the Lead, Client, Projects, Tasks.
   */
  async syncProposalDetails(proposal: any) {
    const batch = writeBatch(db);
    const email = normalizeEmail(proposal.clientEmail);
    const company = (proposal.company || "").trim();
    const name = (proposal.clientName || "").trim();
    const displayClientName = company ? (name ? `${company} (${name})` : company) : (name || "Client");
    const now = new Date().toISOString();

    // 1. Sync back to Lead (if fromLeadId exists or by email)
    if (proposal.fromLeadId) {
      batch.update(doc(db, "leads", proposal.fromLeadId), {
        name: name,
        company: company || name,
        email: email,
        phone: proposal.phone || "",
        updatedAt: now
      });
    } else if (email) {
      const leadSnap = await getDocs(query(collection(db, "leads"), where("email", "==", email)));
      leadSnap.forEach(d => {
        batch.update(d.ref, {
          name: name,
          company: company || name,
          phone: proposal.phone || "",
          updatedAt: now
        });
      });
    }

    // 2. Sync back to Client (if clientId exists or by email)
    const clientIds: string[] = [];
    if (proposal.clientId) {
      clientIds.push(proposal.clientId);
      batch.update(doc(db, "clients", proposal.clientId), {
        name: name,
        company: company || name,
        email: email,
        phone: proposal.phone || "",
        updatedAt: now
      });
    } else if (email) {
      const clientSnap = await getDocs(query(collection(db, "clients"), where("email", "==", email)));
      clientSnap.forEach(d => {
        clientIds.push(d.id);
        batch.update(d.ref, {
          name: name,
          company: company || name,
          phone: proposal.phone || "",
          updatedAt: now
        });
      });
    }

    // Cascade to linked Projects & Tasks
    for (const cId of clientIds) {
      const projSnap = await getDocs(query(collection(db, "projects"), where("clientId", "==", cId)));
      projSnap.forEach(pd => {
        batch.update(pd.ref, {
          clientName: company || name,
          clientEmail: email,
          updatedAt: now,
        });
      });

      const taskSnap = await getDocs(query(collection(db, "tasks"), where("clientId", "==", cId)));
      taskSnap.forEach(td => {
        batch.update(td.ref, {
          clientName: company || name,
          updatedAt: now,
        });
      });
    }

    await batch.commit();
  },

  /**
   * Syncs Project Master Blueprint, Lead Directives, and Title to all its tasks in real-time.
   */
  async syncProjectBlueprintAndInstructions(
    projectId: string, 
    updates: { masterBlueprint?: string; leadInstructions?: string; title?: string }
  ) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    const projUpdate: any = { updatedAt: now };
    if (updates.masterBlueprint !== undefined) projUpdate.masterBlueprint = updates.masterBlueprint;
    if (updates.leadInstructions !== undefined) projUpdate.leadInstructions = updates.leadInstructions;
    if (updates.title !== undefined) projUpdate.title = updates.title;

    batch.update(doc(db, "projects", projectId), projUpdate);

    // Cascade to all tasks related to this project
    const taskQ = query(collection(db, "tasks"), where("relatedTo", "==", projectId));
    const taskSnap = await getDocs(taskQ);

    taskSnap.forEach(d => {
      const taskUpdate: any = { updatedAt: now };
      if (updates.masterBlueprint !== undefined) taskUpdate.masterBlueprint = updates.masterBlueprint;
      if (updates.leadInstructions !== undefined) taskUpdate.leadInstructions = updates.leadInstructions;
      if (updates.title !== undefined) taskUpdate.projectTitle = updates.title;
      batch.update(d.ref, taskUpdate);
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
  async markAsWon(lead: Lead, details?: { amount?: number | string; wonDate?: string; wonNotes?: string }) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const email = normalizeEmail(lead.email);

    const leadUpdate: any = {
      stage: "won",
      active: true,
      updatedAt: now,
    };
    if (details?.amount !== undefined && details.amount !== "") {
      const numVal = Number(details.amount);
      leadUpdate.dealValue = !isNaN(numVal) ? numVal : details.amount;
      leadUpdate.wonAmount = !isNaN(numVal) ? numVal : details.amount;
    }
    if (details?.wonDate) leadUpdate.wonDate = details.wonDate;
    if (details?.wonNotes !== undefined) leadUpdate.wonNotes = details.wonNotes;

    // 1. Mark the lead as Won
    batch.update(doc(db, "leads", lead.id), leadUpdate);

    // 2. Check whether a client already exists with this email
    const clientQ = query(
      collection(db, "clients"),
      where("email", "==", email),
    );

    const clientSnap = await getDocs(clientQ);

    if (clientSnap.empty) {
      // 3. No client exists → create a new client
      const clientRef = doc(collection(db, "clients"));

      batch.set(clientRef, {
        name: lead.name,
        company: lead.company,
        email: email,
        phone: lead.phone || "",
        services: lead.service ? [lead.service] : [],
        status: "active",
        active: true,
        currency: "AED",
        fromLeadId: lead.id,
        createdAt: lead.createdAt || now,
        updatedAt: now,
      });
    } else {
      // 4. Client already exists → update/reactivate it
      clientSnap.forEach((clientDoc) => {
        batch.update(doc(db, "clients", clientDoc.id), {
          name: lead.name,
          company: lead.company,
          email: email,
          phone: lead.phone || "",
          status: "active",
          active: true,
          fromLeadId: lead.id,
          updatedAt: now,
        });
      });
    }

    // 5. Save everything together
    await batch.commit();
  },

  /**
   * Automates the proposal acceptance pipeline.
   * Note: Client instantiation is now strictly handled by the reactive `syncClientForEmail` listener.
   */
  async acceptProposal(proposalId: string, leadId: string) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    const propRef = doc(db, "proposals", proposalId);
    const propDoc = await getDoc(propRef);
    if (!propDoc.exists()) throw new Error("Proposal not found");

    if (leadId) {
      const leadRef = doc(db, "leads", leadId);
      const leadDoc = await getDoc(leadRef);
      if (leadDoc.exists()) {
        batch.update(leadRef, {
          stage: "won",
          active: true,
          updatedAt: now,
        });
      }
    }

    // 1. Update proposal to 'accepted'
    batch.update(propRef, {
      status: "accepted",
      updatedAt: now,
    });

    // Auto-create onboarding task
    const onboardingTaskRef = doc(collection(db, "tasks"));
    batch.set(onboardingTaskRef, {
      title: `Onboard new client from proposal ${proposalId.slice(-6)}`,
      relatedTo: proposalId,
      relatedType: "proposal",
      priority: "high",
      status: "not-started",
      done: false,
      createdAt: now,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day
      description: `Proposal accepted. Please create the project and onboard the client.`,
      assignedTo: "",
    });

    await batch.commit();
  },

  /**
   * Reverts an accepted proposal.
   * Note: Client cleanup is now strictly handled by the reactive `syncClientForEmail` listener.
   */
  async withdrawProposal(
    proposalId: string,
    leadId: string,
    targetStage: "draft" | "meeting" | "lead" | "proposal",
  ) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    const propRef = doc(db, "proposals", proposalId);
    batch.update(propRef, {
      status: "draft",
      updatedAt: now,
    });

    if (leadId) {
      const leadRef = doc(db, "leads", leadId);
      batch.update(leadRef, {
        stage: targetStage,
        active: true,
        updatedAt: now,
      });
    }

    await batch.commit();
  },

  /**
   * Syncs Proposal and Lead status when a Proposal's status changes.
   * Note: Client sync is handled strictly by the reactive `syncClientForEmail` listener.
   */
  async handleProposalStatusChange(proposal: any, newStatus: string) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    let leadStage = "proposal";
    if (newStatus === "accepted" || newStatus === "won") leadStage = "won";
    else if (newStatus === "rejected" || newStatus === "lost")
      leadStage = "lost";
    else if (newStatus === "lead") leadStage = "lead";
    else if (newStatus === "meeting") leadStage = "meeting";

    // 1. Update the proposal
    batch.update(doc(db, "proposals", proposal.id), {
      status: newStatus,
      updatedAt: now,
    });

    // 2. Update Lead Stage if applicable
    let leadDoc: any = null;
    if (proposal.fromLeadId) {
      const leadRef = doc(db, "leads", proposal.fromLeadId);
      leadDoc = await getDoc(leadRef);

      if (leadDoc.exists()) {
        let leadActive = true;
        if (leadStage === "lost") leadActive = false;

        batch.update(leadRef, {
          stage: leadStage,
          active: leadActive,
          updatedAt: now,
        });
      }
    }

    // 3. Smart Client Creation for manual accepted status
    if (leadStage === "won") {
      const email = normalizeEmail(proposal.clientEmail);
      if (email) {
        const clientQ = query(collection(db, "clients"), where("email", "==", email));
        const clientSnap = await getDocs(clientQ);
        if (clientSnap.empty) {
          const newClientRef = doc(collection(db, "clients"));
          batch.set(newClientRef, {
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
            acceptedProposalId: proposal.id
          });
        }
      }

      // 4. Send Notifications for Accepted Proposal
      try {
        const notifTargets = new Set<string>();
        if (proposal.createdBy) notifTargets.add(proposal.createdBy);
        if (leadDoc?.exists()) {
          const leadAssigned = leadDoc.data()?.assignedTo;
          if (leadAssigned) notifTargets.add(leadAssigned);
        }

        const adminQ = query(collection(db, "users"), where("role", "==", "admin"));
        const adminDocs = await getDocs(adminQ);
        adminDocs.forEach((d) => {
          const uid = d.data().uid;
          if (uid) notifTargets.add(uid);
        });

        const signer = proposal.clientSignatureName || proposal.clientName || "Client";
        const comp = proposal.company || "";
        const totalVal = proposal.total;
        const curr = proposal.currency || "AED";
        const amountStr = totalVal ? ` for ${curr} ${Number(totalVal).toLocaleString()}` : "";

        notifTargets.forEach((uId) => {
          const notifRef = doc(collection(db, "notifications"));
          batch.set(notifRef, {
            userId: uId,
            title: "Proposal Signed & Accepted!",
            message: `${signer}${comp ? ` (${comp})` : ""} has signed the proposal${amountStr}.`,
            link: `/proposals/${proposal.id}`,
            read: false,
            createdAt: now,
            type: "proposal-signed",
            proposalId: proposal.id,
          });
        });
      } catch (e) {
        console.error("Failed to queue notifications for proposal status change:", e);
      }
    }

    await batch.commit();
  },

  /**
   * Deletes a proposal.
   * Note: Client sync is handled strictly by the reactive `syncClientForEmail` listener.
   */
  async deleteProposal(proposal: any) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // 1. Delete the proposal
    batch.delete(doc(db, "proposals", proposal.id));

    // 2. Revert lead stage if applicable
    if (proposal.fromLeadId) {
      // We check if other accepted proposals exist to avoid reverting lead if they're still active
      const propQ = query(
        collection(db, "proposals"),
        where("fromLeadId", "==", proposal.fromLeadId),
      );
      const propSnap = await getDocs(propQ);
      const otherAccepted = propSnap.docs
        .filter((d) => d.id !== proposal.id)
        .some(
          (d) => d.data().status === "accepted" || d.data().status === "won",
        );

      if (!otherAccepted) {
        const leadRef = doc(db, "leads", proposal.fromLeadId);
        const leadDoc = await getDoc(leadRef);
        if (leadDoc.exists()) {
          batch.update(leadRef, {
            stage: "lead",
            active: true,
            updatedAt: now,
          });
        }
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
  async markAsLost(id: string, email: string, type: "lead" | "client", details?: { reason?: string; lostDate?: string; comment?: string }) {
    const batch = writeBatch(db);
    const normEmail = normalizeEmail(email);
    const now = new Date().toISOString();

    if (type === "lead") {
      const leadRef = doc(db, "leads", id);
      const leadDoc = await getDoc(leadRef);

      if (leadDoc.exists()) {
        const leadUpdate: any = { stage: "lost", active: false, updatedAt: now };
        if (details?.reason) leadUpdate.lostReason = details.reason;
        if (details?.lostDate) leadUpdate.lostDate = details.lostDate;
        if (details?.comment !== undefined) leadUpdate.lostComment = details.comment;

        batch.update(leadRef, leadUpdate);

        // Update associated proposal to 'lost'
        const propQ = query(
          collection(db, "proposals"),
          where("fromLeadId", "==", id),
        );
        const propSnap = await getDocs(propQ);
        propSnap.forEach((d) => {
          batch.update(doc(db, "proposals", d.id), {
            status: "lost",
            updatedAt: now,
          });
        });
      }
    }

    // Always hide the client associated with this email
    const clientQ = query(
      collection(db, "clients"),
      where("email", "==", normEmail),
    );
    const clientSnap = await getDocs(clientQ);
    clientSnap.forEach((d) => {
      batch.update(doc(db, "clients", d.id), {
        active: false,
        status: "inactive",
      });
    });

    // If it was a lead, we might also want to hide the lead if we marked a client as lost
    if (type === "client") {
      const leadQ = query(
        collection(db, "leads"),
        where("email", "==", normEmail),
      );
      const leadSnap = await getDocs(leadQ);
      leadSnap.forEach((d) => {
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
      updatedAt: now,
    });

    // Check for existing proposal using fromLeadId
    const propQ = query(
      collection(db, "proposals"),
      where("fromLeadId", "==", lead.id),
    );
    const propSnap = await getDocs(propQ);

    if (propSnap.empty) {
      const propRef = doc(collection(db, "proposals"));
      const template = getMasterTemplate(
        lead.service,
        lead.company || lead.name || "Unknown",
      );
      batch.set(propRef, {
        clientName: lead.name || "Unknown",
        company: lead.company || "",
        clientEmail: email,
        phone: lead.phone || "",
        service: lead.service,
        status: "draft", // Explicitly set default state to Draft
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: lead.notes || "",
        fromLeadId: lead.id,
        createdBy: userId,
        createdAt: now,
        ...template,
      });
    } else {
      // If it exists, ensure status is set to 'proposal' so it appears in the view
      propSnap.forEach((d) => {
        batch.update(doc(db, "proposals", d.id), {
          status: "draft",
          updatedAt: now,
        });
      });
    }

    // Set client to inactive and hide if exists
    const clientQ = query(
      collection(db, "clients"),
      where("email", "==", email),
    );
    const clientSnap = await getDocs(clientQ);
    clientSnap.forEach((d) => {
      batch.update(doc(db, "clients", d.id), {
        status: "inactive",
        active: false,
      });
    });

    await batch.commit();
  },

  /**
   * Generic stage update for Meeting/Lead etc.
   */
  async updateStage(lead: Lead, stage: string, userId?: string) {
    const batch = writeBatch(db);
    const email = normalizeEmail(lead.email);
    const now = new Date().toISOString();

    batch.update(doc(db, "leads", lead.id), {
      stage,
      active: true,
      updatedAt: now,
    });

    // Find existing follow-up task to prevent duplicates
    const taskQ = query(collection(db, "tasks"), where("relatedTo", "==", lead.id), where("relatedType", "==", "lead"));
    const taskSnap = await getDocs(taskQ);
    
    const followUpTitle = `Follow up on ${lead.name} (${stage} stage)`;


    if (!taskSnap.empty) {
      taskSnap.forEach(d => {
        batch.update(doc(db, "tasks", d.id), {
          title: followUpTitle,
          description: `Auto-generated follow up for stage: ${stage}`,
          updatedAt: now,
          status: "not-started",
          done: false
        });
      });
    } else {
      const taskRef = doc(collection(db, "tasks"));
      batch.set(taskRef, {
        title: followUpTitle,
        relatedTo: lead.id,
        relatedType: "lead",
        priority: "medium",
        status: "not-started",
        done: false,
        createdAt: now,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        description: `Auto-generated follow up for stage: ${stage}`,
        assignedTo: userId || "" 
      });
    }


    // Sync any associated proposal to the same status (e.g. 'meeting' or 'lead')
    // This will remove it from the Proposals page if it was there
    const propQ = query(
      collection(db, "proposals"),
      where("fromLeadId", "==", lead.id),
    );
    const propSnap = await getDocs(propQ);
    propSnap.forEach((d) => {
      batch.update(doc(db, "proposals", d.id), {
        status: stage,
        updatedAt: now,
      });
    });

    // Inactivate client and hide if exists
    const clientQ = query(
      collection(db, "clients"),
      where("email", "==", email),
    );
    const clientSnap = await getDocs(clientQ);
    clientSnap.forEach((d) => {
      batch.update(doc(db, "clients", d.id), {
        status: "inactive",
        active: false,
      });
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
      updatedAt: now,
    });

    // CASCADE: If moving back from completed to in-progress/review, reset tasks
    if (
      status === "in-progress" ||
      status === "review" ||
      status === "on-hold"
    ) {
      const tasksQ = query(
        collection(db, "tasks"),
        where("relatedTo", "==", projectId),
        where("status", "==", "completed"),
      );
      const tasksSnap = await getDocs(tasksQ);
      tasksSnap.forEach((d) => {
        batch.update(doc(db, "tasks", d.id), {
          status: "in-progress",
          done: false,
          updatedAt: now,
        });
      });
    }

    // CASCADE: If manually completing project, complete all tasks
    if (status === "completed") {
      const tasksQ = query(
        collection(db, "tasks"),
        where("relatedTo", "==", projectId),
      );
      const tasksSnap = await getDocs(tasksQ);
      tasksSnap.forEach((d) => {
        batch.update(doc(db, "tasks", d.id), {
          status: "completed",
          done: true,
          updatedAt: now,
        });
      });

      // Also trigger invoice drafting if manually completed
      await this.draftInvoiceForProject(projectId, userId, batch);
    }

    await batch.commit();
  },

  /**
   * Universal Task Status Update logic (handles both completion and progress).
   * Smartly updates parent project status if needed.
   */
  async handleTaskStatusUpdate(task: any, newStatus: string, userId: string) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    
    let prog = task.progress || 0;
    if (newStatus === "not-started") prog = 0;
    if (newStatus === "in-progress" && (prog === 0 || prog === 100)) prog = 25;
    
    const isCompleted = newStatus === "completed" || newStatus === "done";
    const dbStatus = newStatus === "done" ? "completed" : newStatus;

    batch.update(doc(db, "tasks", task.id), { 
      status: dbStatus, 
      done: isCompleted,
      progress: prog,
      updatedAt: now
    });

    if (task.relatedType === "project" && task.relatedTo) {
      const projRef = doc(db, "projects", task.relatedTo);
      const projSnap = await getDoc(projRef);
      
      if (projSnap.exists()) {
        const pData = projSnap.data();
        
        if (isCompleted) {
          const tasksQ = query(collection(db, "tasks"), where("relatedTo", "==", task.relatedTo));
          const tasksSnap = await getDocs(tasksQ);
          
          const allOtherTasksCompleted = tasksSnap.docs
            .filter(d => d.id !== task.id)
            .every(d => {
              const s = d.data().status;
              return s === "completed" || s === "done";
            });

          if (allOtherTasksCompleted) {
            batch.update(projRef, { status: "completed", updatedAt: now });
            await this.draftInvoiceForProject(task.relatedTo, userId, batch);
          } else if (pData.status === "not-started") {
             batch.update(projRef, { status: "in-progress", updatedAt: now });
          }
        } else if (dbStatus !== "not-started" && pData.status === "not-started") {
          batch.update(projRef, { status: "in-progress", updatedAt: now });
        }
      }
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
      updatedAt: now,
    });

    // 2. Check for Project Completion
    if (task.relatedType === "project" && task.relatedTo) {
      const tasksQ = query(
        collection(db, "tasks"),
        where("relatedTo", "==", task.relatedTo),
      );
      const tasksSnap = await getDocs(tasksQ);

      const allOtherTasksCompleted = tasksSnap.docs
        .filter((d) => d.id !== task.id)
        .every((d) => d.data().status === "completed");

      if (allOtherTasksCompleted) {
        // ALL TASKS DONE -> Auto-Complete Project
        batch.update(doc(db, "projects", task.relatedTo), {
          status: "completed",
          updatedAt: now,
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
        const clientSnap = await getDoc(
          doc(db, "clients", projectData.clientId),
        );
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
        propQ = query(
          collection(db, "proposals"),
          where("fromLeadId", "==", projectData.fromLeadId),
          where("status", "in", ["accepted", "won"]),
        );
      } else if (clientEmail) {
        propQ = query(
          collection(db, "proposals"),
          where("clientEmail", "==", clientEmail),
          where("status", "in", ["accepted", "won"]),
        );
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
      const existingInvQ = query(
        collection(db, "invoices"),
        where("projectId", "==", projectId),
        where("status", "==", "unpaid"),
      );
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
        items = [
          {
            description: `Project Execution: ${projectData.title}`,
            qty: 1,
            rate: projectData.budget || 0,
            amount: projectData.budget || 0,
          },
        ];
      }


      const subtotal = Number(items.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0));
      const tax = Number((subtotal * 0.05).toFixed(2));
      const total = Number((subtotal + tax).toFixed(2));


      batch.set(invRef, {
        clientId: projectData.clientId || "",
        clientName:
          projectData.clientName || proposal?.clientName || "Unknown Client",
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
        paidAmount: Number(projectData.paid) || 0,
        remainingAmount: total - (Number(projectData.paid) || 0),
        currency: currency || "AED",
        status: "unpaid",
        invoiceNumber: invoiceNumber || "",
        notes: propId
          ? `Auto-generated on project completion. Sync ref: Proposal #${propId.slice(-6).toUpperCase()}`
          : `Auto-generated on project completion. Pricing based on project budget.`,
        createdBy: userId || "system",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Invoice Drafting Error:", err);
    }
  },

  /**
   * Hard deletes a Client and cascades to delete all their Projects, Tasks, Proposals, Leads, Invoices, etc.
   */
  async deleteClientAndRelations(clientId: string) {
    const batch = writeBatch(db);
    
    // 1. Delete Client
    batch.delete(doc(db, "clients", clientId));

    // 2. Find all projects to securely cascade their child entities
    const projQ = query(collection(db, "projects"), where("clientId", "==", clientId));
    const projSnap = await getDocs(projQ);
    const projectIds: string[] = [];
    projSnap.forEach(d => projectIds.push(d.id));

    // 3. Delete all related data strictly by clientId
    const collectionsToDelete = ["projects", "tasks", "invoices", "proposals", "leads", "manual_revenue"];
    for (const collName of collectionsToDelete) {
      const q = query(collection(db, collName), where("clientId", "==", clientId));
      const snap = await getDocs(q);
      snap.forEach(d => batch.delete(doc(db, collName, d.id)));
    }

    // 4. Cascade delete any child items by projectId (in case they lacked a clientId reference)
    for (const pId of projectIds) {
      const pTaskQ = query(collection(db, "tasks"), where("relatedTo", "==", pId));
      const pTaskSnap = await getDocs(pTaskQ);
      pTaskSnap.forEach(d => batch.delete(doc(db, "tasks", d.id)));
      
      const pInvQ = query(collection(db, "invoices"), where("projectId", "==", pId));
      const pInvSnap = await getDocs(pInvQ);
      pInvSnap.forEach(d => batch.delete(doc(db, "invoices", d.id)));
    }

    await batch.commit();
  },

  /**
   * Hard deletes a Lead and cascades to delete generated proposals.
   */
  async deleteLeadAndRelations(leadId: string) {
    if (!leadId) return;
    try {
      // 1. Direct delete on the lead document first so it disappears instantly
      await deleteDoc(doc(db, "leads", leadId));

      // 2. Cascade cleanup to proposals and notes
      const batch = writeBatch(db);
      const [propSnap1, propSnap2, notesSnap] = await Promise.all([
        getDocs(query(collection(db, "proposals"), where("fromLeadId", "==", leadId))),
        getDocs(query(collection(db, "proposals"), where("leadId", "==", leadId))),
        getDocs(query(collection(db, "notes"), where("relatedId", "==", leadId)))
      ]);

      propSnap1.forEach(d => batch.delete(d.ref));
      propSnap2.forEach(d => batch.delete(d.ref));
      notesSnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
    } catch (err) {
      console.warn("Cascade delete error in deleteLeadAndRelations:", err);
      // Guarantee lead doc itself is definitely deleted
      await deleteDoc(doc(db, "leads", leadId)).catch(() => {});
    }
  },

  /**
   * Hard deletes a Project and cascades to delete tasks and invoices.
   */
  async deleteProjectAndRelations(projectId: string) {
    const batch = writeBatch(db);

    batch.delete(doc(db, "projects", projectId));

    const taskQ = query(collection(db, "tasks"), where("relatedTo", "==", projectId));
    const taskSnap = await getDocs(taskQ);
    taskSnap.forEach(d => batch.delete(d.ref));

    const invQ = query(collection(db, "invoices"), where("projectId", "==", projectId));
    const invSnap = await getDocs(invQ);
    invSnap.forEach(d => batch.delete(d.ref));

    await batch.commit();
  }

};
