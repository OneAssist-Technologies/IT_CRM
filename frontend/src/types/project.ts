export type ProjectStatus =
  | 'Planning'
  | 'In Progress'
  | 'In Review'
  | 'On Hold'
  | 'Completed'
  | 'Cancelled';

export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ProjectType =
  | 'Fixed Price'
  | 'Time & Material'
  | 'Retainer'
  | 'Dedicated Team';

export interface ProjectTeamMember {
  id: string;
  name: string;
  empCode: string;
  designation?: string | null;
  department?: string | null;
  email?: string | null;
}

export interface ProjectModuleItem {
  id: string;
  name: string;
  description?: string;
  assignedTo?: string; // Developer Name
  deadline?: string;   // DD-MM-YYYY
  progress: number;    // 0 to 100
  status: 'Not Started' | 'In Progress' | 'In Review' | 'Completed';
  price?: number | string;
  createdAt?: string;
  updatedAt?: string;
  ticketId?: string;
  ticketNumber?: string;
  taskRefNumber?: string;
  taskId?: string;
}

export interface Project {
  id: string;
  projectId: string; // e.g. PRJ-1001
  name: string;
  description?: string | null;

  // Client Details
  contactId?: string | null;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  contactDetails?: {
    id?: string;
    contactId?: string;
    name?: string;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;

  // Classification
  projectType: ProjectType | string;
  category: string;

  // Ownership & Team
  projectManagerId?: string | null;
  projectManagerName?: string | null;
  teamMembers: string[];
  teamDetails?: ProjectTeamMember[];

  // Modules & End-to-End Tracking
  modules?: ProjectModuleItem[];

  // Lifecycle & Metrics
  status: ProjectStatus | string;
  priority: ProjectPriority | string;
  progress: number; // 0 to 100
  progressPercent?: string;
  isOverdue?: boolean;

  // Budget & Timeline
  estimatedBudget?: number | null;
  actualCost?: number | null;
  startDate?: string | null;
  targetEndDate?: string | null;
  actualEndDate?: string | null;

  // Deliverables & URLs
  figmaUrl?: string | null;
  githubUrl?: string | null;
  liveUrl?: string | null;

  // Metadata
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFormData {
  id?: string;
  projectId?: string;
  name: string;
  description?: string;
  contactId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  projectType?: string;
  category?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  teamMembers?: string[];
  status?: string;
  priority?: string;
  progress?: number;
  estimatedBudget?: number | string;
  actualCost?: number | string;
  startDate?: string;
  targetEndDate?: string;
  actualEndDate?: string;
  figmaUrl?: string;
  githubUrl?: string;
  liveUrl?: string;
  modules?: ProjectModuleItem[];
}

export interface ProjectFilter {
  search?: string;
  status?: string;
  priority?: string;
  projectType?: string;
  category?: string;
  projectManagerId?: string;
  client?: string;
  manager?: string;
  contactId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProjectTask {
  id: string;
  taskId: string; // e.g. TSK-101
  projectId: string;
  projectName?: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Completed';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assignedTo?: string;
  assignedAvatar?: string;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string[];
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  dueDate: string;
  completed: boolean;
  progress: number;
}

export interface ProjectStats {
  total: number;
  inProgress: number;
  planning: number;
  inReview: number;
  completed: number;
  onHold: number;
  active: number;
  totalBudget: number;
  totalCost: number;
}

export interface ProjectMetadata {
  employees: Array<{ id: string; name: string; empCode: string; department?: string; designation?: string }>;
  contacts: Array<{ id: string; contactId: string; name: string; companyName?: string; email?: string; phone?: string }>;
  statuses: string[];
  priorities: string[];
  projectTypes: string[];
  categories: string[];
}

