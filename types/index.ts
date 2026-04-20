export type UserRole = "admin" | "manager" | "sales" | "designer";

export type ServiceTag = "digital-marketing" | "ui-ux" | "web-development";

export type LeadStage = "lead" | "meeting" | "proposal" | "won" | "lost";

export type ProjectStatus = "not-started" | "in-progress" | "review" | "completed" | "on-hold";

export type TaskPriority = "low" | "medium" | "high";

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected";

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
  address?: string;
  website?: string;
  notes?: string;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface ProposalItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface Proposal {
  id: string;
  leadId?: string;
  clientId?: string;
  clientName: string;
  service: ServiceTag;
  items: ProposalItem[];
  subtotal: number;
  tax: number;
  total: number;
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
  assignedBy: string;
  relatedTo?: string;
  relatedType?: "lead" | "client" | "project";
  dueDate?: string;
  priority: TaskPriority;
  done: boolean;
  createdAt: string;
}
