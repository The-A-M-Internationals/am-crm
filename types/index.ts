export type UserRole = "admin" | "manager" | "sales" | "designer" | "executive";

export type ServiceTag = "digital-marketing" | "ui-ux" | "web-development" | "seo" | "social-media" | "branding" | "other";

export type LeadStage = "lead" | "meeting" | "proposal" | "won" | "lost";

export type ProjectStatus = "not-started" | "in-progress" | "review" | "completed" | "on-hold";

export type TaskPriority = "low" | "medium" | "high";

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected" | "proposal" | "won" | "lost";

export interface CRMUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  service: ServiceTag;
  stage: LeadStage;
  assignedTo: string;
  followUpDate?: string;
  notes?: string;
  source?: string;
  nextAction?: string;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  services: ServiceTag[];
  status: "active" | "inactive";
  active?: boolean;
  address?: string;
  website?: string;
  notes?: string;
  currency?: string;
  contractDuration?: string;
  contractStart?: string;
  contractEnd?: string;
  createdAt: string;
  fromLeadId?: string;
}

export interface PaymentLog {
  id: string;
  amount: number;
  date: string;
  method: string;
  notes?: string;
  loggedBy: string;
}

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  service: ServiceTag;
  status: ProjectStatus;
  deadline?: string;
  assignedTo: string[];
  description?: string;
  budget?: number;
  balance?: number;
  due?: number;
  currency?: string;
  tasks?: ProjectTask[];
  payments?: PaymentLog[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "done";
  assignedTo?: string;
}

export interface ProposalItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface ProposalPackage {
  name: string;
  bestFor: string;
  activeCampaigns: string;
  adCreatives: string;
  optimisation: string;
  abTesting: string;
  recommendedSpend: number;
  managementFee: number;
  reviewCall: string;
  reporting: string;
  estimatedLeads: string;
  estimatedCostPerLead: string;
  recommended?: boolean;
}

export interface ProposalTimelinePhase {
  phase: string;
  activity: string;
  duration: string;
}

export interface ProposalTerm {
  term: string;
  description: string;
}

export interface Proposal {
  id: string;
  leadId?: string;
  clientId?: string;
  fromLeadId?: string;
  clientName: string;
  clientEmail: string;
  company?: string;
  phone?: string;
  service: ServiceTag;
  
  // Rich Document Fields
  isRichDocument?: boolean;
  introduction?: string;
  understanding?: string[];
  objectives?: string[];
  approachTitle?: string;
  approachDescription?: string;
  approachFeatures?: string[];
  packages?: ProposalPackage[];
  addons?: { name: string; deliverables: string; cost: number; period: string }[];
  timeline?: ProposalTimelinePhase[];
  exclusions?: string[];
  terms?: ProposalTerm[];
  
  // Standard/Legacy Fields
  items: ProposalItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency?: string;
  status: ProposalStatus;
  notes?: string;
  validUntil?: string;
  createdBy: string;
  sentAt?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedToName?: string;
  assignedBy: string;
  clientId?: string;
  clientName?: string;
  relatedTo?: string;
  relatedType?: "lead" | "client" | "project";
  dueDate?: string;
  priority: TaskPriority;
  status: string;
  done: boolean;
  createdAt: string;
}
