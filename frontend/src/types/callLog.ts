export type CallType = 'Incoming' | 'Outgoing';

export type CallStatus = 'Completed' | 'Follow-up' | 'Interested' | 'Missed' | 'Busy' | 'No Answer' | 'Not Interested';

export type ActivityLogSection = 'calls' | 'whatsapp' | 'email' | 'others';

export interface CallLog {
  id: string;
  callId: string;
  callType: CallType;
  employeeId?: string | null;
  employeeName: string;
  contactId?: string | null;
  contactName: string;
  companyName?: string | null;
  phoneNumber: string;
  leadId?: string | null;
  leadCode?: string | null;
  duration: string;
  status: CallStatus;
  callDate: string;
  callTime: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLogItem {
  id: string;
  activityNumber: string;
  type: string;
  title: string;
  description?: string | null;
  leadId?: string | null;
  leadName?: string | null;
  leadCode?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  companyName?: string | null;
  contactId?: string | null;
  contactName: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  messageType?: string;
  emailType?: string;
  activityType?: string;
  status: string;
  activityDate: string;
  activityTime: string;
  performedBy: string;
  performedById?: string | null;
  nextFollowDate?: string | null;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface CallLogStats {
  total: number;
  incoming: number;
  outgoing: number;
  completed: number;
  missed: number;
  busy: number;
  noAnswer: number;
  notInterested?: number;
  followUp?: number;
}

export interface WhatsAppStats {
  total: number;
  sent: number;
  replied: number;
  interested: number;
  followUp: number;
  failed: number;
  notInterested: number;
}

export interface EmailStats {
  total: number;
  sent: number;
  replied: number;
  draft: number;
  interested: number;
  followUp: number;
  failed: number;
  notInterested: number;
}

export interface OthersStats {
  total: number;
  interested: number;
  followUp: number;
  notInterested: number;
  directVisit: number;
  sms: number;
}

export interface CallLogFilters {
  callType?: string;
  status?: string;
  search?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  contactId?: string;
  leadId?: string;
}
