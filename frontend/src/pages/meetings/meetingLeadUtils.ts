import { ScheduledMeeting } from '../../types/meeting';
import { Lead } from '../../types/lead';

/**
 * Checks if a scheduled meeting belongs to a specific lead.
 * Matches strictly by lead IDs first (UUID, leadDbId, leadCode, contactId).
 * Then matches by phone/email, and finally falls back to matching by clientName.
 */
export const isMeetingForLead = (m: ScheduledMeeting, lead: Lead): boolean => {
  if (!lead || !m) return false;

  // 1. Strict ID matching
  if (m.leadId && String(m.leadId) === String(lead.id)) return true;
  if (m.leadDbId && String(m.leadDbId) === String(lead.id)) return true;
  if (m.contactId && String(m.contactId) === String(lead.id)) return true;
  if (m.leadCode && lead.leadId && String(m.leadCode) === String(lead.leadId)) return true;
  if (m.contactId && lead.leadId && String(m.contactId) === String(lead.leadId)) return true;
  if (m.leadId && lead.leadId && String(m.leadId) === String(lead.leadId)) return true;
  if (m.contactId && (lead as any).contactId && String(m.contactId) === String((lead as any).contactId)) return true;
  if (m.contactId && (lead as any).internalReference && String(m.contactId) === String((lead as any).internalReference)) return true;
  if ((m as any).customerId && (String((m as any).customerId) === String(lead.id) || String((m as any).customerId) === String(lead.leadId))) return true;

  // 2. Direct Phone or Email Match (for converted Contact -> Lead synchronization)
  const cleanLeadPhone = lead.phone ? lead.phone.replace(/\D/g, '') : '';
  const cleanMeetingPhone = (m.leadPhone || (m as any).phone) ? String(m.leadPhone || (m as any).phone).replace(/\D/g, '') : '';
  if (cleanLeadPhone && cleanMeetingPhone && cleanLeadPhone === cleanMeetingPhone) return true;

  const cleanLeadEmail = lead.email ? lead.email.toLowerCase().trim() : '';
  const cleanMeetingEmail = (m.leadEmail || (m as any).email) ? String(m.leadEmail || (m as any).email).toLowerCase().trim() : '';
  if (cleanLeadEmail && cleanMeetingEmail && cleanLeadEmail === cleanMeetingEmail) return true;

  // 3. Company match (e.g. for Support Ticket customers or corporate clients)
  const rawLeadCo = (lead.companyName || '').trim().toLowerCase();
  const rawMeetingCo = (m.companyName || '').trim().toLowerCase();
  if (rawLeadCo && rawMeetingCo && rawLeadCo === rawMeetingCo) return true;

  // 4. Name matching fallback
  const rawClientName = (m.clientName || m.leadName || '').trim().toLowerCase();
  const rawLeadName = (lead.name || '').trim().toLowerCase();
  if (!rawClientName) return false;

  if (rawLeadName && (rawClientName === rawLeadName || rawClientName.startsWith(rawLeadName))) return true;

  // In case clientName is stored with company: e.g. "john (JJ industries)"
  const clientNameWithoutCompany = rawClientName.split('(')[0].trim();
  if (rawLeadName && (clientNameWithoutCompany === rawLeadName || rawLeadName === clientNameWithoutCompany)) return true;

  const companyInParens = rawClientName.includes('(')
    ? rawClientName.split('(')[1].replace(')', '').trim()
    : '';
  if (companyInParens) {
    if (rawLeadCo && companyInParens === rawLeadCo) return true;
    if (rawLeadName && companyInParens === rawLeadName) return true;
  }

  return false;
};

/**
 * Finds the matching lead for a scheduled meeting from a list of leads.
 * Uses strict ID matching first. Then phone/email, and finally matches by company and clientName.
 */
export const findLeadForMeeting = (m: ScheduledMeeting, leads: Lead[]): Lead | undefined => {
  if (!m || !leads || leads.length === 0) return undefined;

  // 1. Strict ID matching first
  const matchedById = leads.find((lead) => {
    if (m.leadId && String(m.leadId) === String(lead.id)) return true;
    if (m.leadDbId && String(m.leadDbId) === String(lead.id)) return true;
    if (m.contactId && String(m.contactId) === String(lead.id)) return true;
    if (m.leadCode && lead.leadId && String(m.leadCode) === String(lead.leadId)) return true;
    if (m.contactId && lead.leadId && String(m.contactId) === String(lead.leadId)) return true;
    if (m.leadId && lead.leadId && String(m.leadId) === String(lead.leadId)) return true;
    if (m.contactId && (lead as any).contactId && String(m.contactId) === String((lead as any).contactId)) return true;
    if (m.contactId && (lead as any).internalReference && String(m.contactId) === String((lead as any).internalReference)) return true;
    if ((m as any).customerId && (String((m as any).customerId) === String(lead.id) || String((m as any).customerId) === String(lead.leadId))) return true;
    return false;
  });
  if (matchedById) return matchedById;

  // 2. Direct Phone or Email Match
  const cleanMeetingPhone = (m.leadPhone || (m as any).phone) ? String(m.leadPhone || (m as any).phone).replace(/\D/g, '') : '';
  const cleanMeetingEmail = (m.leadEmail || (m as any).email) ? String(m.leadEmail || (m as any).email).toLowerCase().trim() : '';

  if (cleanMeetingPhone || cleanMeetingEmail) {
    const matchedByContactInfo = leads.find((lead) => {
      if (cleanMeetingPhone && lead.phone && lead.phone.replace(/\D/g, '') === cleanMeetingPhone) return true;
      if (cleanMeetingEmail && lead.email && lead.email.toLowerCase().trim() === cleanMeetingEmail) return true;
      return false;
    });
    if (matchedByContactInfo) return matchedByContactInfo;
  }

  // 3. Company match
  const rawMeetingCo = (m.companyName || '').trim().toLowerCase();
  const rawClientName = (m.clientName || m.leadName || '').trim().toLowerCase();
  const companyInParens = rawClientName.includes('(')
    ? rawClientName.split('(')[1].replace(')', '').trim()
    : '';

  if (rawMeetingCo || companyInParens) {
    const matchedByCompany = leads.find((lead) => {
      const rawLeadCo = (lead.companyName || '').trim().toLowerCase();
      const rawLeadName = (lead.name || '').trim().toLowerCase();
      if (rawMeetingCo && rawLeadCo && rawLeadCo === rawMeetingCo) return true;
      if (companyInParens && rawLeadCo && rawLeadCo === companyInParens) return true;
      if (companyInParens && rawLeadName && rawLeadName === companyInParens) return true;
      return false;
    });
    if (matchedByCompany) return matchedByCompany;
  }

  // 4. Name matching fallback
  if (!rawClientName) return undefined;
  const clientNameWithoutCompany = rawClientName.split('(')[0].trim();

  return leads.find((lead) => {
    const rawLeadName = (lead.name || '').trim().toLowerCase();
    if (!rawLeadName) return false;
    return (
      rawLeadName === rawClientName ||
      rawLeadName === clientNameWithoutCompany ||
      rawClientName.startsWith(rawLeadName)
    );
  });
};
