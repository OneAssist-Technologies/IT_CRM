import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Stack,
  SimpleGrid,
  TextInput,
  Button,
  Group,
  Text,
  ActionIcon,
  Box,
  Textarea,
  Select,
  Autocomplete,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconX,
  IconUser,
  IconBuilding,
  IconId,
  IconMail,
  IconPhone,
  IconWorld,
  IconShare,
  IconMapPin,
  IconPhoneCall,
  IconPhoneOutgoing,
  IconClock,
  IconCheck,
  IconCalendar,
  IconBrandWhatsapp,
  IconSend,
  IconActivity,
  IconCalendarEvent,
  IconLink,
  IconTag,
  IconBriefcase,
} from '@tabler/icons-react';
import { Contact, ContactFormData } from '../../../types/contact';
import { useContact } from '../../../context/ContactContext';
import { useCRM } from '../../../context/CRMContext';
import { leadService } from '../../../services/leadService';
import { createMeetingApi } from '../../../services/meetingService';
import { createCallLogApi, createSectionActivityApi } from '../../../services/callLogService';
import { MeetingTimePicker } from '../../meetings/components/MeetingTimePicker';
import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';

interface ContactModalProps {
  opened: boolean;
  onClose: () => void;
  contact?: Contact | null;
  onSuccess?: (activityData?: any) => void;
  title?: string;
  showContactMode?: boolean;
}


const isLeadIdentifier = (idStr: any): boolean => {
  if (!idStr || typeof idStr !== 'string') return false;
  const s = idStr.trim();
  if (
    s.startsWith('BLK-') ||
    s.startsWith('CNT-') ||
    s.startsWith('EMP-') ||
    s.startsWith('PRJ-') ||
    s.startsWith('INV-') ||
    s.startsWith('PAY-') ||
    s.startsWith('QTN-') ||
    s.startsWith('PRP-')
  ) {
    return false;
  }
  if (
    s.startsWith('LED-') ||
    s.startsWith('LDN-') ||
    s.startsWith('LD-') ||
    s.startsWith('LEAD-') ||
    s.startsWith('lead-')
  ) {
    return true;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
  return false;
};

const mapStatusToLeadStatus = (statusStr: string): string => {
  const s = (statusStr || '').toLowerCase();
  if (s.includes('not interested') || s.includes('not-interested') || s.includes('disqual') || s.includes('lost') || s.includes('cancel')) {
    return 'Lost';
  }
  if (s.includes('won') || s.includes('complete')) {
    return 'Completed';
  }
  if (s.includes('qualif') || s.includes('new') || s.includes('init')) {
    return 'New';
  }
  return 'In Progress';
};

const parseTimeToMinutes = (timeStr: string): { minutes: number; isAM: boolean; isPM: boolean; rawHours: number } | null => {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();

  // Match 12-hour: e.g. "10:05 AM", "10:05:00 AM", "10:05am", "2:30 pm"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12) {
    const rawHours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[4].toUpperCase();

    let h = rawHours;
    if (h === 12) {
      h = meridiem === 'PM' ? 12 : 0;
    } else if (meridiem === 'PM') {
      h += 12;
    }

    return {
      minutes: h * 60 + minutes,
      isAM: meridiem === 'AM',
      isPM: meridiem === 'PM',
      rawHours,
    };
  }

  // Match 24-hour: e.g. "10:05", "14:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);

    return {
      minutes: hours * 60 + minutes,
      isAM: hours < 12,
      isPM: hours >= 12,
      rawHours: hours,
    };
  }

  return null;
};

const calculateCallDuration = (from: string, to: string): string => {
  const fromParsed = parseTimeToMinutes(from);
  const toParsed = parseTimeToMinutes(to);

  if (!fromParsed || !toParsed) return '';

  let fromMin = fromParsed.minutes;
  let toMin = toParsed.minutes;

  // Handle standard human clock logic when user enters "12:00 AM" after morning hours:
  // E.g., From: 10:00 AM (or 11:00 AM) and To: 12:00 AM (intending 12:00 noon, +1 or +2 hours)
  if (toParsed.rawHours === 12 && toParsed.isAM && fromParsed.isAM && fromMin >= 360) {
    toMin = 720; // 12:00 noon = 720 minutes
  }

  let diffMinutes = toMin - fromMin;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Cross midnight
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = Math.floor(diffMinutes % 60);

  // Return standard H:MM format (e.g. "1:00", "2:00", "0:45", "1:30")
  return `${hours}:${String(minutes).padStart(2, '0')}`;
};

const getTodayDateStr = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getCurrentTimeStr = (): string => {
  const d = new Date();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};

export const ContactModal: React.FC<ContactModalProps> = ({
  opened,
  onClose,
  contact,
  onSuccess,
  title,
  showContactMode,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { createContact, updateContact, loading, metadata } = useContact();
  const { currentUser } = useCRM();
  const isEditing = Boolean(contact);

  const initialFormState: ContactFormData = {
    name: '',
    companyName: '',
    contactPerson: '',
    designation: '',
    email: '',
    phone: '',
    website: '',
    contactMode: '',
    source: '',
    location: '',
    assignedTo: '',
    estimatedValue: '',
    expectedCloseDate: '',
    description: '',
  };

  const [formData, setFormData] = useState<ContactFormData>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagPriority, setTagPriority] = useState<string>('Medium');

  const priorityOptions = useMemo(() => {
    const base = ['Low', 'Medium', 'High'];
    const custom = new Set<string>();
    if (contact?.priority && !base.some((b) => b.toLowerCase() === contact.priority?.toLowerCase())) {
      custom.add(contact.priority.trim());
    }
    if ((contact as any)?.tagPriority && !base.some((b) => b.toLowerCase() === String((contact as any).tagPriority)?.toLowerCase())) {
      custom.add(String((contact as any).tagPriority).trim());
    }
    if (tagPriority && !base.some((b) => b.toLowerCase() === tagPriority.toLowerCase())) {
      custom.add(tagPriority.trim());
    }
    return [...base, ...Array.from(custom)];
  }, [contact, tagPriority]);

  const sourceOptions = useMemo(() => {
    const defaultSources = [
      'Bulk Import',
      'Website',
      'Referral',
      'Social Media',
      'LinkedIn',
      'Cold Call',
      'Email Campaign',
      'Direct Visit',
      'Other',
    ];
    const combined = [
      ...defaultSources,
      ...(metadata?.sources || []).filter((s) => !defaultSources.includes(s)),
    ];
    if (formData.source && !combined.includes(formData.source)) {
      combined.push(formData.source);
    }
    return combined.map((s) => ({ value: s, label: s }));
  }, [metadata?.sources, formData.source]);

  // Dynamic Call Fields State
  const [callType, setCallType] = useState<string>('Outgoing');
  const [callDate, setCallDate] = useState<string>(getTodayDateStr());
  const [callFromTime, setCallFromTime] = useState<string>('');
  const [callToTime, setCallToTime] = useState<string>('');
  const [callDuration, setCallDuration] = useState<string>('');
  const [callStatus, setCallStatus] = useState<string>('Follow-up');
  const [generalStatus, setGeneralStatus] = useState<string>('Not Connected');
  const [nextFollowDate, setNextFollowDate] = useState<string>('');

  // Dynamic WhatsApp Fields State
  const [whatsappMessageType, setWhatsappMessageType] = useState<string>('Outgoing');
  const [whatsappStatus, setWhatsappStatus] = useState<string>('Msg Sent');
  const [whatsappDate, setWhatsappDate] = useState<string>(getTodayDateStr());
  const [whatsappTime, setWhatsappTime] = useState<string>(getCurrentTimeStr());

  // Dynamic Email Fields State
  const [emailType, setEmailType] = useState<string>('Outgoing');
  const [emailStatus, setEmailStatus] = useState<string>('Mail Sent');
  const [emailDate, setEmailDate] = useState<string>(getTodayDateStr());
  const [emailTime, setEmailTime] = useState<string>(getCurrentTimeStr());

  // Dynamic Other Activity Fields State
  const [otherActivityType, setOtherActivityType] = useState<string>('Direct Visit');
  const [otherStatus, setOtherStatus] = useState<string>('Follow up');
  const [otherActivityDate, setOtherActivityDate] = useState<string>(getTodayDateStr());
  const [otherActivityTime, setOtherActivityTime] = useState<string>(getCurrentTimeStr());

  // Dynamic Meeting Fields State
  const [meetingTitle, setMeetingTitle] = useState<string>('');
  const [meetingPurpose, setMeetingPurpose] = useState<string>('');
  const [meetingHostId, setMeetingHostId] = useState<string>('');
  const [meetingHostName, setMeetingHostName] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState<string>(getTodayDateStr());
  const [meetingFromTime, setMeetingFromTime] = useState<string>('');
  const [meetingToTime, setMeetingToTime] = useState<string>('');
  const [meetingDuration, setMeetingDuration] = useState<string>('');
  const [meetingType, setMeetingType] = useState<string>('');
  const [meetingLocation, setMeetingLocation] = useState<string>('');
  const [meetingStatus, setMeetingStatus] = useState<string>('');
  const [rescheduleDate, setRescheduleDate] = useState<string>(getTodayDateStr());
  const [rescheduleTime, setRescheduleTime] = useState<string>('');

  useEffect(() => {
    if (contact) {
      setFormData({
        id: contact.id,
        contactId: contact.contactId,
        name: contact.name || '',
        companyName: contact.companyName || '',
        contactPerson: contact.contactPerson || contact.name || '',
        designation: (contact as any).designation || (contact as any).profession || '',
        email: contact.email || '',
        phone: contact.phone || '',
        website: (contact as any).website || (contact as any).companyWebsite || '',
        contactMode: (contact as any).contactMode || '',
        source: contact.source || '',
        location: (contact as any).location || (contact as any).city || contact.address || (contact as any).street || '',
        assignedTo: contact.assignedTo || '',
        estimatedValue: contact.estimatedValue || '',
        expectedCloseDate: contact.expectedCloseDate || '',
        description: contact.description || contact.remarks || contact.notes || '',
      });
      setTagPriority(contact.priority || (contact as any).tagPriority || 'Medium');
      setCallType((contact as any).callType || 'Outgoing');
      setCallDate((contact as any).callDate || getTodayDateStr());
      setCallFromTime((contact as any).callFromTime || (contact as any).fromTime || '');
      setCallToTime((contact as any).callToTime || (contact as any).toTime || '');
      setCallDuration((contact as any).callDuration || (contact as any).duration || '');
      const existingStatus = (contact as any).callStatus || (contact as any).status || 'Not Connected';
      setGeneralStatus(existingStatus);
      setCallStatus(existingStatus && existingStatus !== 'Completed' ? existingStatus : 'Follow-up');
      setNextFollowDate((contact as any).nextFollowDate || '');

      setWhatsappMessageType((contact as any).whatsappMessageType || 'Outgoing');
      setWhatsappStatus((contact as any).whatsappStatus || (contact as any).status || 'Msg Sent');
      setWhatsappDate((contact as any).whatsappDate || getTodayDateStr());
      setWhatsappTime((contact as any).whatsappTime || getCurrentTimeStr());

      setEmailType((contact as any).emailType || 'Outgoing');
      setEmailStatus((contact as any).emailStatus || (contact as any).status || 'Mail Sent');
      setEmailDate((contact as any).emailDate || getTodayDateStr());
      setEmailTime((contact as any).emailTime || getCurrentTimeStr());

      setOtherActivityType((contact as any).activityType || (contact as any).otherActivityType || 'Direct Visit');
      setOtherStatus((contact as any).activityStatus || (contact as any).otherStatus || (contact as any).status || 'Follow up');
      setOtherActivityDate((contact as any).activityDate || (contact as any).otherActivityDate || getTodayDateStr());
      setOtherActivityTime((contact as any).activityTime || (contact as any).otherActivityTime || getCurrentTimeStr());

      setMeetingTitle((contact as any).meetingTitle || '');
      setMeetingPurpose((contact as any).meetingPurpose || '');
      setMeetingHostId((contact as any).meetingHostId || '');
      setMeetingHostName((contact as any).meetingHostName || '');
      setMeetingDate((contact as any).meetingDate || getTodayDateStr());
      setMeetingFromTime((contact as any).meetingFromTime || '');
      setMeetingToTime((contact as any).meetingToTime || '');
      setMeetingDuration((contact as any).meetingDuration || '');
      setMeetingType((contact as any).meetingType || '');
      setMeetingLocation((contact as any).meetingLocation || '');
      setMeetingStatus((contact as any).meetingStatus || '');
      setRescheduleDate((contact as any).rescheduleDate || (contact as any).rescheduledDate || getTodayDateStr());
      setRescheduleTime((contact as any).rescheduleTime || (contact as any).rescheduledTime || '');
    } else {
      setFormData(initialFormState);
      setCallType('Outgoing');
      setCallDate(getTodayDateStr());
      setCallFromTime('');
      setCallToTime('');
      setCallDuration('');
      setCallStatus('Follow-up');
      setNextFollowDate('');

      setWhatsappMessageType('Outgoing');
      setWhatsappStatus('Msg Sent');
      setWhatsappDate(getTodayDateStr());
      setWhatsappTime(getCurrentTimeStr());

      setEmailType('Outgoing');
      setEmailStatus('Mail Sent');
      setEmailDate(getTodayDateStr());
      setEmailTime(getCurrentTimeStr());

      setOtherActivityType('Direct Visit');
      setOtherStatus('Follow up');
      setOtherActivityDate(getTodayDateStr());
      setOtherActivityTime(getCurrentTimeStr());

      setMeetingTitle('');
      setMeetingPurpose('');
      setMeetingHostId('');
      setMeetingHostName('');
      setMeetingDate(getTodayDateStr());
      setMeetingFromTime('');
      setMeetingToTime('');
      setMeetingDuration('');
      setMeetingType('');
      setMeetingLocation('');
      setMeetingStatus('');
      setRescheduleDate(getTodayDateStr());
      setRescheduleTime('');
      setTagPriority('Medium');
    }
    setErrors({});
  }, [contact, opened]);

  const calculateMeetingDurationStr = (from: string, to: string): string => {
    const fromParsed = parseTimeToMinutes(from);
    const toParsed = parseTimeToMinutes(to);
    if (!fromParsed || !toParsed) return '';

    let fromMin = fromParsed.minutes;
    let toMin = toParsed.minutes;
    if (toParsed.rawHours === 12 && toParsed.isAM && fromParsed.isAM && fromMin >= 360) {
      toMin = 720;
    }
    let diffMinutes = toMin - fromMin;
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    if (diffMinutes === 0) return '0 Minutes';

    const h = Math.floor(diffMinutes / 60);
    const m = Math.floor(diffMinutes % 60);
    if (h > 0 && m > 0) return `${h} Hour ${m} Minutes`;
    if (h > 0 && m === 0) return `${h} ${h === 1 ? 'Hour' : 'Hours'}`;
    return `${m} Minutes`;
  };

  const handleFromTimeChange = (val: string) => {
    setCallFromTime(val);
    if (val && callToTime) {
      const dur = calculateCallDuration(val, callToTime);
      if (dur) setCallDuration(dur);
    }
  };

  const handleToTimeChange = (val: string) => {
    setCallToTime(val);
    if (callFromTime && val) {
      const dur = calculateCallDuration(callFromTime, val);
      if (dur) setCallDuration(dur);
    }
  };

  const handleMeetingFromTimeChange = (val: string) => {
    setMeetingFromTime(val);
    if (val && meetingToTime) {
      const dur = calculateMeetingDurationStr(val, meetingToTime);
      if (dur) setMeetingDuration(dur);
    }
  };

  const handleMeetingToTimeChange = (val: string) => {
    setMeetingToTime(val);
    if (meetingFromTime && val) {
      const dur = calculateMeetingDurationStr(meetingFromTime, val);
      if (dur) setMeetingDuration(dur);
    }
  };

  const handleFieldChange = (field: keyof ContactFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'contactMode' && value === 'Call') {
      if (callFromTime && callToTime && !callDuration) {
        const dur = calculateCallDuration(callFromTime, callToTime);
        if (dur) setCallDuration(dur);
      }
    }

    if (field === 'contactMode' && value === 'Meeting') {
      if (meetingFromTime && meetingToTime && !meetingDuration) {
        const dur = calculateMeetingDurationStr(meetingFromTime, meetingToTime);
        if (dur) setMeetingDuration(dur);
      }
    }

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Email validation (only if filled)
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Invalid email address format';
      }
    }

    // 2. Phone validation (only if filled)
    if (formData.phone && formData.phone.trim()) {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length > 0 && digits.length !== 10) {
        newErrors.phone = 'Phone number must be exactly 10 digits';
      }
    }

    // 3. Mandatory meeting status validation if contact mode is Meeting
    if (formData.contactMode === 'Meeting') {
      if (!meetingStatus || !meetingStatus.trim()) {
        newErrors.meetingStatus = 'Meeting status is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      let finalStatus = generalStatus || contact?.status || 'Not Connected';
      let finalFollowDate: string | null = null;

      if (formData.contactMode === 'Call') {
        finalStatus = callStatus === 'Follow-up' ? 'Follow-up Required' : callStatus;
        if (callStatus === 'Follow-up') finalFollowDate = nextFollowDate?.trim() || null;
      } else if (formData.contactMode === 'WhatsApp') {
        finalStatus = whatsappStatus === 'Follow up' ? 'Follow-up Required' : (whatsappStatus === 'Interested' ? 'Interested' : (whatsappStatus === 'Not Interested' ? 'Not Interested' : whatsappStatus));
        if (whatsappStatus === 'Follow up') finalFollowDate = nextFollowDate?.trim() || null;
      } else if (formData.contactMode === 'Email') {
        finalStatus = emailStatus === 'Follow up' ? 'Follow-up Required' : (emailStatus === 'Interested' ? 'Interested' : (emailStatus === 'Not Interested' ? 'Not Interested' : emailStatus));
        if (emailStatus === 'Follow up') finalFollowDate = nextFollowDate?.trim() || null;
      } else if (formData.contactMode === 'Other' || formData.contactMode === 'Others') {
        finalStatus = otherStatus === 'Follow up' ? 'Follow-up Required' : (otherStatus === 'Interested' ? 'Interested' : (otherStatus === 'Not Interested' ? 'Not Interested' : otherStatus));
        if (otherStatus === 'Follow up') finalFollowDate = nextFollowDate?.trim() || null;
      } else if (formData.contactMode === 'Meeting') {
        finalStatus = meetingStatus === 'Completed'
          ? 'Qualified'
          : (meetingStatus === 'Cancelled' ? 'Disqualified' : (meetingStatus === 'Follow-up' ? 'Follow-up Required' : 'In Progress'));
        if (meetingStatus === 'Follow-up') finalFollowDate = nextFollowDate?.trim() || null;
      } else {
        if (finalStatus === 'Follow-up Required' || finalStatus.toLowerCase().includes('follow')) {
          finalFollowDate = nextFollowDate?.trim() || null;
        }
      }

      const resolvedName = formData.contactPerson?.trim() || formData.companyName?.trim() || formData.name?.trim() || contact?.name || 'Contact';

      const payload: ContactFormData = {
        name: resolvedName,
        companyName: formData.companyName?.trim() || undefined,
        contactPerson: formData.contactPerson?.trim() || undefined,
        designation: formData.designation?.trim() || undefined,
        profession: formData.designation?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone ? formData.phone.replace(/\D/g, '') : '',
        website: formData.website?.trim() || undefined,
        companyWebsite: formData.website?.trim() || undefined,
        contactMode: formData.contactMode?.trim() || undefined,
        source: formData.source?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        city: formData.location?.trim() || undefined,
        address: formData.location?.trim() || undefined,
        assignedTo: formData.assignedTo && formData.assignedTo !== 'none' ? formData.assignedTo : undefined,
        estimatedValue: formData.estimatedValue?.trim() || undefined,
        expectedCloseDate: formData.expectedCloseDate?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        remarks: formData.description?.trim() || undefined,
        notes: formData.description?.trim() || undefined,
        priority: tagPriority?.trim() || 'Medium',
        tagPriority: tagPriority?.trim() || 'Medium',
        status: finalStatus,
        stage: (finalStatus === 'Not Interested' || finalStatus === 'Not-Interested')
          ? 'Initialization'
          : ((finalStatus === 'Qualified' || finalStatus === 'Follow-up Required' || finalStatus === 'Pending' || formData.contactMode === 'Meeting') ? 'Qualification' : (contact?.stage || 'Initialization')),
        assignmentStatus: (finalStatus === 'Qualified' || finalStatus === 'Follow-up Required' || finalStatus === 'Pending' || formData.contactMode === 'Meeting' || formData.assignedTo) ? 'Assigned' : (contact?.assignmentStatus || 'Unassigned'),
        qualificationStatus: (finalStatus === 'Not Interested' || finalStatus === 'Not-Interested')
          ? 'New'
          : (finalStatus === 'Qualified' ? 'Qualified' : (finalStatus === 'Follow-up Required' ? 'Follow-up Required' : (finalStatus === 'Disqualified' ? 'Disqualified' : (finalStatus === 'Interested' ? 'New' : (contact?.qualificationStatus || 'New'))))),
        // Dynamic Call
        callType: formData.contactMode === 'Call' ? callType : undefined,
        callDate: formData.contactMode === 'Call' ? callDate : undefined,
        callFromTime: formData.contactMode === 'Call' ? callFromTime : undefined,
        callToTime: formData.contactMode === 'Call' ? callToTime : undefined,
        callDuration: formData.contactMode === 'Call' ? callDuration : undefined,
        callStatus: formData.contactMode === 'Call' ? callStatus : undefined,
        // Dynamic WhatsApp
        whatsappMessageType: formData.contactMode === 'WhatsApp' ? whatsappMessageType : undefined,
        whatsappStatus: formData.contactMode === 'WhatsApp' ? whatsappStatus : undefined,
        whatsappDate: formData.contactMode === 'WhatsApp' ? whatsappDate : undefined,
        whatsappTime: formData.contactMode === 'WhatsApp' ? whatsappTime : undefined,
        // Dynamic Email
        emailType: formData.contactMode === 'Email' ? emailType : undefined,
        emailStatus: formData.contactMode === 'Email' ? emailStatus : undefined,
        emailDate: formData.contactMode === 'Email' ? emailDate : undefined,
        emailTime: formData.contactMode === 'Email' ? emailTime : undefined,
        // Dynamic Other
        activityType: (formData.contactMode === 'Other' || formData.contactMode === 'Others') ? otherActivityType : undefined,
        activityStatus: (formData.contactMode === 'Other' || formData.contactMode === 'Others') ? otherStatus : undefined,
        activityDate: (formData.contactMode === 'Other' || formData.contactMode === 'Others') ? otherActivityDate : undefined,
        activityTime: (formData.contactMode === 'Other' || formData.contactMode === 'Others') ? otherActivityTime : undefined,
        // Dynamic Meeting
        meetingTitle: formData.contactMode === 'Meeting' ? meetingTitle : undefined,
        meetingPurpose: formData.contactMode === 'Meeting' ? meetingPurpose : undefined,
        meetingHostId: formData.contactMode === 'Meeting' ? meetingHostId : undefined,
        meetingHostName: formData.contactMode === 'Meeting' ? meetingHostName : undefined,
        meetingDate: formData.contactMode === 'Meeting' ? meetingDate : undefined,
        meetingFromTime: formData.contactMode === 'Meeting' ? meetingFromTime : undefined,
        meetingToTime: (formData.contactMode === 'Meeting' && (meetingStatus === 'Completed' || meetingStatus === 'Follow-up')) ? meetingToTime : undefined,
        meetingDuration: (formData.contactMode === 'Meeting' && (meetingStatus === 'Completed' || meetingStatus === 'Follow-up')) ? meetingDuration : undefined,
        meetingType: formData.contactMode === 'Meeting' ? meetingType : undefined,
        meetingLocation: formData.contactMode === 'Meeting' ? meetingLocation : undefined,
        meetingStatus: formData.contactMode === 'Meeting' ? meetingStatus : undefined,
        rescheduleDate: (formData.contactMode === 'Meeting' && meetingStatus === 'Rescheduled') ? rescheduleDate : undefined,
        rescheduleTime: (formData.contactMode === 'Meeting' && meetingStatus === 'Rescheduled') ? rescheduleTime : undefined,
        nextFollowDate: finalFollowDate,
        leadId: (contact as any)?.leadId || undefined,
        leadCode: (contact as any)?.leadCode || undefined,
      };

      let res;
      if (isEditing && contact?.id) {
        res = await updateContact(contact.id, payload, { silent: true });
        if (!res?.success) {
          res = await createContact(payload);
        }
      } else {
        res = await createContact(payload);
      }

      let leadUpdatedDirectly = false;
      const rawLeadId =
        (contact as any)?.leadId ||
        (contact as any)?.lead_id ||
        (contact?.id && String(contact.id).startsWith('lead-') ? contact.id : undefined);
      const explicitLeadId = isLeadIdentifier(rawLeadId) ? String(rawLeadId) : undefined;
      if (explicitLeadId) {
        try {
          const leadMapped = mapStatusToLeadStatus(finalStatus);
          await leadService.updateLead(explicitLeadId, {
            status: leadMapped,
            stage: payload.stage || (leadMapped === 'New' ? 'Initialization' : (leadMapped === 'Lost' ? 'Lost' : undefined)),
            notes: formData.description?.trim() || undefined,
            priority: tagPriority?.trim() || 'Medium',
            assignedTo: formData.assignedTo && formData.assignedTo !== 'none' ? formData.assignedTo : undefined,
          });
          leadUpdatedDirectly = true;
        } catch (leadErr) {
          console.warn('Failed to update lead directly in ContactModal:', leadErr);
        }
      }

      const contactIdentifier = res?.data?.id || res?.data?.contactId || contact?.id || contact?.contactId;
      const contactDisplayName = formData.contactPerson?.trim() || formData.companyName?.trim() || formData.name || contact?.name || 'Contact';
      const contactCompany = formData.companyName || contact?.companyName || '';
      const clientDisplayName = contactCompany
        ? `${contactDisplayName} (${contactCompany})`
        : contactDisplayName;
      const contactPhone = (formData.phone ? formData.phone.replace(/\D/g, '') : '') || contact?.phone || '';
      const foundEmp = (metadata?.employees || []).find(
        (e: any) => e.id === formData.assignedTo || e.empCode === formData.assignedTo || e.name === formData.assignedTo
      );
      const assignedEmployeeName =
        (contact as any)?.assignedToName ||
        foundEmp?.name ||
        (formData.assignedTo && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(formData.assignedTo) ? formData.assignedTo : '') ||
        currentUser?.name ||
        'Sandy';
      const assignedEmployeeId = foundEmp?.id || (contact as any)?.assignedTo || currentUser?.id || undefined;
      const targetLeadId = isLeadIdentifier((contact as any)?.leadId || (contact as any)?.lead_id)
        ? (contact as any)?.leadId || (contact as any)?.lead_id
        : undefined;
      const targetLeadCode = isLeadIdentifier((contact as any)?.leadCode)
        ? (contact as any)?.leadCode
        : targetLeadId;

      // 1. If contact mode is Call, always auto-log call activity to Activity Logs module
      if (formData.contactMode === 'Call') {
        try {
          await createCallLogApi({
            callType: (callType as any) || 'Outgoing',
            employeeId: currentUser?.id || assignedEmployeeId,
            employeeName: currentUser?.name || assignedEmployeeName,
            contactId: contactIdentifier,
            contactName: contactDisplayName,
            companyName: contactCompany || undefined,
            phoneNumber: contactPhone || '0000000000',
            leadId: targetLeadId,
            leadCode: targetLeadCode,
            duration: callDuration?.trim() || '01:00',
            status: (callStatus as any) || 'Completed',
            callDate: callDate || getTodayDateStr(),
            callTime: callFromTime || getCurrentTimeStr(),
            description: formData.description?.trim() || undefined,
            nextFollowDate: callStatus.toLowerCase().includes('follow') ? nextFollowDate : undefined,
          } as any);
          window.dispatchEvent(new CustomEvent('crm_call_logs_updated'));
          window.dispatchEvent(new CustomEvent('crm_activities_updated'));
        } catch (callErr) {
          console.error('Error auto-logging call activity:', callErr);
        }
      }

      // 2. If contact mode is WhatsApp, auto-log WhatsApp activity to Activity Logs module
      else if (formData.contactMode === 'WhatsApp') {
        try {
          await createSectionActivityApi('whatsapp', {
            contactId: contactIdentifier,
            contactName: contactDisplayName,
            leadId: targetLeadId,
            leadCode: targetLeadCode,
            leadName: contactDisplayName,
            customerName: contactCompany || undefined,
            companyName: contactCompany || undefined,
            phoneNumber: contactPhone,
            phone: contactPhone,
            messageType: whatsappMessageType || 'Outgoing',
            status: whatsappStatus || 'Msg Sent',
            activityDate: whatsappDate || getTodayDateStr(),
            activityTime: whatsappTime || getCurrentTimeStr(),
            nextFollowDate: whatsappStatus.toLowerCase().includes('follow') ? nextFollowDate : undefined,
            description: formData.description?.trim() || undefined,
            performedBy: currentUser?.name || assignedEmployeeName,
            performedById: currentUser?.id ? String(currentUser.id) : (assignedEmployeeId ? String(assignedEmployeeId) : undefined),
          });
          window.dispatchEvent(new CustomEvent('crm_activities_updated'));
        } catch (waErr) {
          console.error('Error auto-logging WhatsApp activity:', waErr);
        }
      }

      // 3. If contact mode is Email, auto-log Email activity to Activity Logs module
      else if (formData.contactMode === 'Email') {
        try {
          await createSectionActivityApi('email', {
            contactId: contactIdentifier,
            contactName: contactDisplayName,
            leadId: targetLeadId,
            leadCode: targetLeadCode,
            leadName: contactDisplayName,
            customerName: contactCompany || undefined,
            companyName: contactCompany || undefined,
            email: formData.email?.trim() || contact?.email || undefined,
            emailType: emailType || 'Outgoing',
            status: emailStatus || 'Mail Sent',
            activityDate: emailDate || getTodayDateStr(),
            activityTime: emailTime || getCurrentTimeStr(),
            nextFollowDate: emailStatus.toLowerCase().includes('follow') ? nextFollowDate : undefined,
            description: formData.description?.trim() || undefined,
            performedBy: currentUser?.name || assignedEmployeeName,
            performedById: currentUser?.id ? String(currentUser.id) : (assignedEmployeeId ? String(assignedEmployeeId) : undefined),
          });
          window.dispatchEvent(new CustomEvent('crm_activities_updated'));
        } catch (emailErr) {
          console.error('Error auto-logging Email activity:', emailErr);
        }
      }

      // 4. If contact mode is Other or Others, auto-log interaction to Activity Logs module
      else if (formData.contactMode === 'Other' || formData.contactMode === 'Others') {
        try {
          await createSectionActivityApi('others', {
            contactId: contactIdentifier,
            contactName: contactDisplayName,
            leadId: targetLeadId,
            leadCode: targetLeadCode,
            leadName: contactDisplayName,
            customerName: contactCompany || undefined,
            companyName: contactCompany || undefined,
            activityType: otherActivityType || 'Direct Visit',
            status: otherStatus || 'Follow up',
            activityDate: otherActivityDate || getTodayDateStr(),
            activityTime: otherActivityTime || getCurrentTimeStr(),
            nextFollowDate: otherStatus.toLowerCase().includes('follow') ? nextFollowDate : undefined,
            description: formData.description?.trim() || undefined,
            performedBy: currentUser?.name || assignedEmployeeName,
            performedById: currentUser?.id ? String(currentUser.id) : (assignedEmployeeId ? String(assignedEmployeeId) : undefined),
          });
          window.dispatchEvent(new CustomEvent('crm_activities_updated'));
        } catch (otherErr) {
          console.error('Error auto-logging other activity:', otherErr);
        }
      }

      let createdMeetingResult: any = null;
      // 5. If contact mode is Meeting, automatically update/log the meeting in Scheduled Meetings module
      if (formData.contactMode === 'Meeting') {
        try {
          const isCompletedOrFollowUp = meetingStatus === 'Completed' || meetingStatus === 'Follow-up';
          const isRescheduled = meetingStatus === 'Rescheduled';
          const targetLeadId = (contact as any)?.leadId || contact?.internalReference || contactIdentifier;

          createdMeetingResult = await createMeetingApi({
            contactId: contactIdentifier,
            leadId: targetLeadId,
            clientName: clientDisplayName,
            title: meetingTitle.trim() || `Meeting with ${contactDisplayName}`,
            purpose: meetingPurpose.trim() || meetingTitle.trim() || 'Client Meeting',
            meetingDate: isRescheduled && rescheduleDate ? rescheduleDate : (meetingDate || getTodayDateStr()),
            startTime: isRescheduled && rescheduleTime ? rescheduleTime : (meetingFromTime || '10:00 AM'),
            endTime: isCompletedOrFollowUp ? meetingToTime : undefined,
            meetingTime: isRescheduled && rescheduleTime ? rescheduleTime : (meetingFromTime || '10:00 AM'),
            duration: isCompletedOrFollowUp ? meetingDuration : undefined,
            meetingType: meetingType,
            location: meetingLocation.trim(),
            meetingLocation: meetingLocation.trim(),
            meetingLink: meetingLocation.trim(),
            employeeId: meetingHostId || assignedEmployeeId || undefined,
            employeeName: meetingHostName || assignedEmployeeName,
            notes: isRescheduled
              ? `Rescheduled from ${meetingDate} ${meetingFromTime || ''} to ${rescheduleDate} ${rescheduleTime || ''}.${formData.description ? ` Note: ${formData.description}` : ''}`
              : (formData.description?.trim() || undefined),
            status: meetingStatus,
            meetingStatus: meetingStatus,
            nextFollowDate: meetingStatus.toLowerCase().includes('follow') ? nextFollowDate : undefined,
          } as any);

          window.dispatchEvent(new CustomEvent('crm_meetings_updated'));
        } catch (meetingErr) {
          console.error('Error logging scheduled meeting:', meetingErr);
        }
      }

      // Notify Activity Logs and Contacts to refresh multi-channel records
      try {
        window.dispatchEvent(new CustomEvent('crm_call_logs_updated'));
        window.dispatchEvent(new CustomEvent('crm_activities_updated'));
        window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
        window.dispatchEvent(new CustomEvent('crm_meetings_updated'));
      } catch (_) {}

      const isRescheduled = meetingStatus === 'Rescheduled';
      const isCompletedOrFollowUp = meetingStatus === 'Completed' || meetingStatus === 'Follow-up';

      const loggedInfo = {
        contactMode: formData.contactMode || 'Call',
        type: formData.contactMode === 'Meeting'
          ? 'Meeting'
          : formData.contactMode === 'WhatsApp'
          ? 'WhatsApp'
          : formData.contactMode === 'Email'
          ? 'Email'
          : 'Call',
        title: formData.contactMode === 'Meeting'
          ? (meetingTitle.trim() || `Meeting with ${contactDisplayName}`)
          : formData.contactMode === 'WhatsApp'
          ? 'WhatsApp Interaction'
          : formData.contactMode === 'Email'
          ? (formData.description?.trim() || 'Email Communication')
          : `Call Log: ${callType || 'Follow-up'} with ${contactDisplayName}`,
        purpose: formData.contactMode === 'Meeting' ? meetingPurpose.trim() : undefined,
        meetingType: formData.contactMode === 'Meeting' ? meetingType : undefined,
        location: formData.contactMode === 'Meeting' ? meetingLocation.trim() : undefined,
        date: formData.contactMode === 'Meeting'
          ? (isRescheduled && rescheduleDate ? rescheduleDate : (meetingDate || getTodayDateStr()))
          : formData.contactMode === 'Call'
          ? (callDate || getTodayDateStr())
          : formData.contactMode === 'WhatsApp'
          ? (whatsappDate || getTodayDateStr())
          : formData.contactMode === 'Email'
          ? (emailDate || getTodayDateStr())
          : (otherActivityDate || getTodayDateStr()),
        time: formData.contactMode === 'Meeting'
          ? (isRescheduled && rescheduleTime ? rescheduleTime : (meetingFromTime || getCurrentTimeStr()))
          : formData.contactMode === 'Call'
          ? (callFromTime || getCurrentTimeStr())
          : formData.contactMode === 'WhatsApp'
          ? (whatsappTime || getCurrentTimeStr())
          : formData.contactMode === 'Email'
          ? (emailTime || getCurrentTimeStr())
          : (otherActivityTime || getCurrentTimeStr()),
        duration: formData.contactMode === 'Meeting'
          ? (isCompletedOrFollowUp ? meetingDuration : undefined)
          : (formData.contactMode === 'Call' ? callDuration : undefined),
        status: formData.contactMode === 'Meeting'
          ? (meetingStatus || 'Scheduled')
          : formData.contactMode === 'Call'
          ? (callStatus || finalStatus || 'Completed')
          : formData.contactMode === 'WhatsApp'
          ? (whatsappStatus || 'Delivered')
          : formData.contactMode === 'Email'
          ? (emailStatus || 'Sent')
          : (otherStatus || 'Completed'),
        description: formData.description?.trim() || undefined,
        assignee: formData.contactMode === 'Meeting'
          ? (meetingHostName || assignedEmployeeName)
          : assignedEmployeeName,
        customerName: contactCompany,
        contactPerson: contactDisplayName,
        meetingData: createdMeetingResult,
        meetingId: createdMeetingResult?.id,
      };

      if (res?.success || leadUpdatedDirectly || explicitLeadId || formData.contactMode === 'Meeting' || true) {
        const isNotInterested = finalStatus === 'Not Interested' || finalStatus === 'Not-Interested';
        if (!isNotInterested && (finalStatus === 'Qualified' || finalStatus === 'Follow-up Required' || finalStatus === 'Pending' || formData.contactMode === 'Meeting')) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('crm_contacts_tab', 'ASSIGNED');
            sessionStorage.setItem('crm_contacts_tab', 'ASSIGNED');
          }
        }
        window.dispatchEvent(new CustomEvent('crm_leads_updated'));
        onSuccess?.(loggedInfo);
        onClose();
      }
    } catch (err: any) {
      console.error('Error saving contact:', err);
    }
  };



  const inputStyles = {
    input: {
      height: 44,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      border: isDark ? '1.5px solid rgba(255, 255, 255, 0.16)' : '1.5px solid #CBD5E1',
      borderRadius: 10,
      color: isDark ? '#F8FAFC' : '#0F172A',
      fontSize: 14,
      fontWeight: 500,
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.04)',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
    },
    label: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 6,
      color: isDark ? '#E2E8F0' : '#1E293B',
      letterSpacing: '0.01em',
    },
    section: {
      color: isDark ? '#94A3B8' : '#64748B',
    },
  };

  const textareaStyles = {
    input: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      border: isDark ? '1.5px solid rgba(255, 255, 255, 0.16)' : '1.5px solid #CBD5E1',
      borderRadius: 10,
      color: isDark ? '#F8FAFC' : '#0F172A',
      fontSize: 14,
      fontWeight: 500,
      padding: '12px 14px',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.04)',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    },
    label: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 6,
      color: isDark ? '#E2E8F0' : '#1E293B',
      letterSpacing: '0.01em',
    },
  };

  const isInPersonMeeting = meetingType?.toLowerCase().replace(/[^a-z]/g, '') === 'inperson';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      size="720px"
      radius="16px"
      padding="xl"
      centered
      styles={{
        header: {
          display: 'none',
        },
        content: {
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.18)',
        },
        body: {
          padding: '28px 32px 32px 32px',
        },
      }}
    >
      <style>{`
        .contact-form-field input:focus,
        .contact-form-field textarea:focus {
          border-color: #3B82F6 !important;
          box-shadow: 0 0 0 3.5px rgba(59, 130, 246, 0.18) !important;
        }
        .contact-form-field input:hover,
        .contact-form-field textarea:hover {
          border-color: ${isDark ? 'rgba(255, 255, 255, 0.3)' : '#94A3B8'} !important;
        }
      `}</style>

      {/* Header */}
      <Group justify="space-between" align="flex-start" mb="xl">
        <Box>
          <Text fw={700} size="22px" style={{ color: isDark ? '#F8FAFC' : '#111827', lineHeight: 1.2 }}>
            {title || (isEditing ? 'Update contact' : 'Create contact')}
          </Text>
          <Text size="13.5px" c="dimmed" mt={4}>
            Add the essential details. You can complete the record later.
          </Text>
        </Box>

        <ActionIcon
          variant="subtle"
          color="gray"
          size="md"
          radius="100px"
          onClick={onClose}
          style={{ color: isDark ? '#94A3B8' : '#64748B' }}
        >
          <IconX size={20} />
        </ActionIcon>
      </Group>

      {/* Main Form */}
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {/* Row 1: Contact person | Designation */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <TextInput
              className="contact-form-field"
              label="Contact person"
              placeholder="e.g. Alex Morgan"
              leftSection={<IconId size={18} stroke={1.6} />}
              value={formData.contactPerson || ''}
              onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
              styles={inputStyles}
            />

            <TextInput
              className="contact-form-field"
              label="Designation"
              placeholder="e.g. Project Manager, Director"
              leftSection={<IconBriefcase size={18} stroke={1.6} />}
              value={formData.designation || ''}
              onChange={(e) => handleFieldChange('designation', e.target.value)}
              styles={inputStyles}
            />
          </SimpleGrid>

          {/* Row 2: Company | Website */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <TextInput
              className="contact-form-field"
              label="Company"
              placeholder="e.g. TechCorp Solutions"
              leftSection={<IconBuilding size={18} stroke={1.6} />}
              value={formData.companyName || ''}
              onChange={(e) => handleFieldChange('companyName', e.target.value)}
              error={errors.companyName}
              styles={inputStyles}
            />

            <TextInput
              className="contact-form-field"
              label="Website"
              placeholder="e.g. https://www.techcorp.com"
              leftSection={<IconWorld size={18} stroke={1.6} />}
              value={formData.website || ''}
              onChange={(e) => handleFieldChange('website', e.target.value)}
              styles={inputStyles}
            />
          </SimpleGrid>

          {/* Row 3: Email | Phone number */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <TextInput
              className="contact-form-field"
              label="Email"
              placeholder="e.g. alex@techcorp.com"
              type="email"
              leftSection={<IconMail size={18} stroke={1.6} />}
              value={formData.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              error={errors.email}
              styles={inputStyles}
            />

            <TextInput
              className="contact-form-field"
              label="Phone number"
              placeholder="e.g. 9876543210"
              maxLength={10}
              leftSection={<IconPhone size={18} stroke={1.6} />}
              value={formData.phone || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                handleFieldChange('phone', val);
              }}
              error={errors.phone}
              styles={inputStyles}
            />
          </SimpleGrid>

          {/* Row 4: Source | Location */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <Select
              className="contact-form-field"
              label="Source"
              placeholder="Select source (e.g. Bulk Import, Website)"
              leftSection={<IconShare size={18} stroke={1.6} />}
              data={sourceOptions}
              value={formData.source || null}
              onChange={(val) => handleFieldChange('source', val || '')}
              searchable
              clearable
              styles={inputStyles}
            />

            <TextInput
              className="contact-form-field"
              label="Location"
              placeholder="e.g. Chennai, Tamil Nadu, India"
              leftSection={<IconMapPin size={18} stroke={1.6} />}
              value={formData.location || ''}
              onChange={(e) => handleFieldChange('location', e.target.value)}
              styles={inputStyles}
            />
          </SimpleGrid>

          {/* Row 5: Tag | Contact mode */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <Autocomplete
              className="contact-form-field"
              label="Tag"
              placeholder="Select tag (Low, Medium, High) or type custom..."
              leftSection={<IconTag size={18} stroke={1.6} />}
              data={priorityOptions}
              value={tagPriority}
              onChange={(val) => setTagPriority(val)}
              clearable
              styles={inputStyles}
            />

            <Select
              className="contact-form-field"
              label="Contact mode"
              placeholder="Select contact mode (e.g. Call, WhatsApp)"
              data={[
                { value: 'Call', label: 'Call' },
                { value: 'WhatsApp', label: 'WhatsApp' },
                { value: 'Email', label: 'Email' },
                { value: 'Meeting', label: 'Meeting' },
                { value: 'Other', label: 'Other' },
              ]}
              leftSection={<IconPhoneCall size={18} stroke={1.6} />}
              value={formData.contactMode || null}
              onChange={(val) => handleFieldChange('contactMode', val || '')}
              clearable
              styles={inputStyles}
            />
          </SimpleGrid>

          {!formData.contactMode && (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Select
                className="contact-form-field"
                label="Status"
                placeholder="Select Status"
                data={[
                  { value: 'Not Connected', label: 'Not Connected' },
                  { value: 'Interested', label: 'Interested' },
                  { value: 'Follow-up Required', label: 'Follow-up Required' },
                  { value: 'Busy', label: 'Busy' },
                  { value: 'No Answer', label: 'No Answer' },
                  { value: 'Not Interested', label: 'Not Interested' },
                  { value: 'Unqualified', label: 'Unqualified' },
                ]}
                leftSection={<IconCheck size={18} stroke={1.6} />}
                value={generalStatus}
                onChange={(val) => setGeneralStatus(val || 'Not Connected')}
                styles={inputStyles}
              />
            </SimpleGrid>
          )}

          {/* Dynamic Call Fields (when Contact mode is Call) */}
          {formData.contactMode === 'Call' && (
            <Box
              p="md"
              style={{
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.45)' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                  <Group gap={8}>
                    <IconPhoneCall size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
                    <Text size="xs" fw={700} style={{ color: isDark ? '#93C5FD' : '#1D4ED8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Call Details
                    </Text>
                  </Group>
                  <Text size="11px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Auto-logs call in Activity Logs
                  </Text>
                </Group>

                {/* Call Type | Call Date */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <Select
                    className="contact-form-field"
                    label="Call type"
                    placeholder="Select Call Type"
                    data={[
                      { value: 'Outgoing', label: 'Outgoing' },
                      { value: 'Incoming', label: 'Incoming' },
                    ]}
                    leftSection={<IconPhoneOutgoing size={18} stroke={1.6} />}
                    value={callType}
                    onChange={(val) => setCallType(val || 'Outgoing')}
                    allowDeselect={false}
                    styles={inputStyles}
                  />

                  <MeetingDatePicker
                    label="Call date"
                    placeholder="DD-MM-YYYY"
                    value={callDate}
                    onChange={(val) => setCallDate(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    leftSection={<IconCalendar size={18} stroke={1.6} />}
                  />
                </SimpleGrid>

                {/* From time | To time */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <MeetingTimePicker
                    label="From time"
                    placeholder="e.g. 10:00 AM"
                    value={callFromTime}
                    onChange={handleFromTimeChange}
                    styles={inputStyles}
                    zIndex={3000}
                    hideQuickSelect
                  />

                  <MeetingTimePicker
                    label="To time"
                    placeholder="e.g. 10:05 AM"
                    value={callToTime}
                    onChange={handleToTimeChange}
                    styles={inputStyles}
                    zIndex={3000}
                    hideQuickSelect
                  />
                </SimpleGrid>

                {/* Duration | Status */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <TextInput
                    className="contact-form-field"
                    label="Duration"
                    placeholder="1:00 (Auto-calculated)"
                    leftSection={<IconClock size={18} stroke={1.6} />}
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                    styles={inputStyles}
                  />

                  <Select
                    className="contact-form-field"
                    label="Status"
                    placeholder="Select Status"
                    data={[
                      { value: 'Interested', label: 'Interested' },
                      { value: 'Follow-up', label: 'Follow-up' },
                      { value: 'Missed', label: 'Missed' },
                      { value: 'Busy', label: 'Busy' },
                      { value: 'No Answer', label: 'No Answer' },
                      { value: 'Not Interested', label: 'Not Interested' },
                    ]}
                    leftSection={<IconCheck size={18} stroke={1.6} />}
                    value={callStatus}
                    onChange={(val) => setCallStatus(val || 'Follow-up')}
                    allowDeselect={false}
                    styles={inputStyles}
                  />
                </SimpleGrid>

                {/* Dynamic Next Follow-up Date (shown when Follow-up is selected) */}
                {callStatus === 'Follow-up' && (
                  <MeetingDatePicker
                    label="Next follow-up date"
                    placeholder="DD-MM-YYYY"
                    value={nextFollowDate}
                    onChange={(val) => setNextFollowDate(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    leftSection={<IconCalendar size={18} stroke={1.6} />}
                  />
                )}
              </Stack>
            </Box>
          )}

          {/* Dynamic WhatsApp Fields (when Contact mode is WhatsApp) */}
          {formData.contactMode === 'WhatsApp' && (
            <Box
              p="md"
              style={{
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(20, 83, 45, 0.25)' : '#F0FDF4',
                border: isDark ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid #BBF7D0',
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Group gap={8}>
                    <IconBrandWhatsapp size={16} color={isDark ? '#4ADE80' : '#16A34A'} />
                    <Text size="xs" fw={700} style={{ color: isDark ? '#86EFAC' : '#15803D', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      WhatsApp Details
                    </Text>
                  </Group>
                  <Text size="11px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Auto-logs WhatsApp activity
                  </Text>
                </Group>

                {/* Message type | Status */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <Select
                    className="contact-form-field"
                    label="Message type"
                    placeholder="Select Message Type"
                    data={[
                      { value: 'Outgoing', label: 'Outgoing' },
                      { value: 'Incoming', label: 'Incoming' },
                      { value: 'Template Message', label: 'Template Message' },
                      { value: 'Direct Message', label: 'Direct Message' },
                    ]}
                    leftSection={<IconSend size={18} stroke={1.6} />}
                    value={whatsappMessageType}
                    onChange={(val) => setWhatsappMessageType(val || 'Outgoing')}
                    allowDeselect={false}
                    styles={inputStyles}
                  />

                  <Select
                    className="contact-form-field"
                    label="Status"
                    placeholder="Select Status"
                    data={[
                      { value: 'Msg Sent', label: 'Msg Sent' },
                      { value: 'Replied', label: 'Replied' },
                      { value: 'Failed', label: 'Failed' },
                      { value: 'Interested', label: 'Interested' },
                      { value: 'Follow up', label: 'Follow up' },
                      { value: 'Not Interested', label: 'Not Interested' },
                    ]}
                    leftSection={<IconCheck size={18} stroke={1.6} />}
                    value={whatsappStatus}
                    onChange={(val) => setWhatsappStatus(val || 'Msg Sent')}
                    allowDeselect={false}
                    styles={inputStyles}
                  />
                </SimpleGrid>

                {/* Message activity date | Message activity time */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <MeetingDatePicker
                    label="Message activity date"
                    placeholder="DD-MM-YYYY"
                    value={whatsappDate}
                    onChange={(val) => setWhatsappDate(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    leftSection={<IconCalendar size={18} stroke={1.6} />}
                  />

                  <MeetingTimePicker
                    label="Message activity time"
                    placeholder="e.g. 10:00 AM"
                    value={whatsappTime}
                    onChange={(val) => setWhatsappTime(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    hideQuickSelect
                  />
                </SimpleGrid>

                {/* Dynamic Next Follow-up Date (shown when Follow up is selected) */}
                {whatsappStatus === 'Follow up' && (
                  <MeetingDatePicker
                    label="Next follow-up date"
                    placeholder="DD-MM-YYYY"
                    value={nextFollowDate}
                    onChange={(val) => setNextFollowDate(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    leftSection={<IconCalendar size={18} stroke={1.6} />}
                  />
                )}
              </Stack>
            </Box>
          )}

          {/* Dynamic Email Fields (when Contact mode is Email) */}
          {formData.contactMode === 'Email' && (
            <Box
              p="md"
              style={{
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(67, 56, 202, 0.2)' : '#EEF2FF',
                border: isDark ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid #C7D2FE',
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Group gap={8}>
                    <IconMail size={16} color={isDark ? '#818CF8' : '#4F46E5'} />
                    <Text size="xs" fw={700} style={{ color: isDark ? '#A5B4FC' : '#4338CA', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Email Details
                    </Text>
                  </Group>
                  <Text size="11px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Auto-logs email activity
                  </Text>
                </Group>

                {/* Email type | Status */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <Select
                    className="contact-form-field"
                    label="Email type"
                    placeholder="Select Email Type"
                    data={[
                      { value: 'Outgoing', label: 'Outgoing' },
                      { value: 'Incoming', label: 'Incoming' },
                      { value: 'Proposal', label: 'Proposal' },
                      { value: 'Follow-up Email', label: 'Follow-up Email' },
                      { value: 'Introduction', label: 'Introduction' },
                    ]}
                    leftSection={<IconMail size={18} stroke={1.6} />}
                    value={emailType}
                    onChange={(val) => setEmailType(val || 'Outgoing')}
                    allowDeselect={false}
                    styles={inputStyles}
                  />

                  <Select
                    className="contact-form-field"
                    label="Status"
                    placeholder="Select Status"
                    data={[
                      { value: 'Draft', label: 'Draft' },
                      { value: 'Mail Sent', label: 'Mail Sent' },
                      { value: 'Replied', label: 'Replied' },
                      { value: 'Failed', label: 'Failed' },
                      { value: 'Interested', label: 'Interested' },
                      { value: 'Follow up', label: 'Follow up' },
                      { value: 'Not Interested', label: 'Not Interested' },
                    ]}
                    leftSection={<IconCheck size={18} stroke={1.6} />}
                    value={emailStatus}
                    onChange={(val) => setEmailStatus(val || 'Mail Sent')}
                    allowDeselect={false}
                    styles={inputStyles}
                  />
                </SimpleGrid>

                {/* Email activity date | Email activity time */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <MeetingDatePicker
                    label="Email activity date"
                    placeholder="DD-MM-YYYY"
                    value={emailDate}
                    onChange={(val) => setEmailDate(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    leftSection={<IconCalendar size={18} stroke={1.6} />}
                  />

                  <MeetingTimePicker
                    label="Email activity time"
                    placeholder="e.g. 10:00 AM"
                    value={emailTime}
                    onChange={(val) => setEmailTime(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    hideQuickSelect
                  />
                </SimpleGrid>

                {/* Dynamic Next Follow-up Date (shown when Follow up is selected) */}
                {emailStatus === 'Follow up' && (
                  <MeetingDatePicker
                    label="Next follow-up date"
                    placeholder="DD-MM-YYYY"
                    value={nextFollowDate}
                    onChange={(val) => setNextFollowDate(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    leftSection={<IconCalendar size={18} stroke={1.6} />}
                  />
                )}
              </Stack>
            </Box>
          )}

          {/* Dynamic Other Activity Fields (when Contact mode is Other / Others) */}
          {(formData.contactMode === 'Other' || formData.contactMode === 'Others') && (
            <Box
              p="md"
              style={{
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(180, 83, 9, 0.2)' : '#FFFBEB',
                border: isDark ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid #FDE68A',
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Group gap={8}>
                    <IconActivity size={16} color={isDark ? '#FBBF24' : '#D97706'} />
                    <Text size="xs" fw={700} style={{ color: isDark ? '#FDE68A' : '#B45309', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Activity Details
                    </Text>
                  </Group>
                  <Text size="11px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Auto-logs interaction activity
                  </Text>
                </Group>

                {/* Activity type | Status */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <Select
                    className="contact-form-field"
                    label="Activity type"
                    placeholder="Select Activity Type"
                    data={[
                      { value: 'Direct Visit', label: 'Direct Visit' },
                      { value: 'SMS', label: 'SMS' },
                      { value: 'Social Media', label: 'Social Media' },
                      { value: 'Referral', label: 'Referral' },
                      { value: 'Event / Exhibition', label: 'Event / Exhibition' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    leftSection={<IconActivity size={18} stroke={1.6} />}
                    value={otherActivityType}
                    onChange={(val) => setOtherActivityType(val || 'Direct Visit')}
                    allowDeselect={false}
                    styles={inputStyles}
                  />

                  <Select
                    className="contact-form-field"
                    label="Status"
                    placeholder="Select Status"
                    data={[
                      { value: 'Interested', label: 'Interested' },
                      { value: 'Not Interested', label: 'Not Interested' },
                      { value: 'Follow up', label: 'Follow up' },
                    ]}
                    leftSection={<IconCheck size={18} stroke={1.6} />}
                    value={otherStatus}
                    onChange={(val) => setOtherStatus(val || 'Follow up')}
                    allowDeselect={false}
                    styles={inputStyles}
                  />
                </SimpleGrid>

                {/* Activity date | Activity time */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <MeetingDatePicker
                    label="Activity date"
                    placeholder="DD-MM-YYYY"
                    value={otherActivityDate}
                    onChange={(val) => setOtherActivityDate(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    leftSection={<IconCalendar size={18} stroke={1.6} />}
                  />

                  <MeetingTimePicker
                    label="Activity time"
                    placeholder="e.g. 10:00 AM"
                    value={otherActivityTime}
                    onChange={(val) => setOtherActivityTime(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    hideQuickSelect
                  />
                </SimpleGrid>

                {/* Dynamic Next Follow-up Date (shown when Follow up is selected) */}
                {otherStatus === 'Follow up' && (
                  <MeetingDatePicker
                    label="Next follow-up date"
                    placeholder="DD-MM-YYYY"
                    value={nextFollowDate}
                    onChange={(val) => setNextFollowDate(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    leftSection={<IconCalendar size={18} stroke={1.6} />}
                  />
                )}
              </Stack>
            </Box>
          )}

          {/* Dynamic Meeting Fields (when Contact mode is Meeting) */}
          {formData.contactMode === 'Meeting' && (
            <Box
              p="md"
              style={{
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                border: isDark ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid #BFDBFE',
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Group gap={8}>
                    <IconCalendarEvent size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
                    <Text size="xs" fw={700} style={{ color: isDark ? '#93C5FD' : '#1D4ED8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Meeting Details
                    </Text>
                  </Group>
                  <Text size="11px" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Auto-logs scheduled meeting
                  </Text>
                </Group>

                {/* Meeting Title | Purpose / Agenda */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <TextInput
                    className="contact-form-field"
                    label="Meeting Title"
                    placeholder={
                      formData.contactPerson || formData.companyName || formData.name || contact?.name
                        ? `e.g. Discovery Call & Demo with ${formData.contactPerson || formData.companyName || formData.name || contact?.name}`
                        : 'e.g. Discovery Call & Demo'
                    }
                    leftSection={<IconCalendarEvent size={18} stroke={1.6} />}
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    required
                    styles={inputStyles}
                  />

                  <TextInput
                    className="contact-form-field"
                    label="Purpose / Agenda"
                    placeholder="e.g. Requirement discussion & demo"
                    leftSection={<IconActivity size={18} stroke={1.6} />}
                    value={meetingPurpose}
                    onChange={(e) => setMeetingPurpose(e.target.value)}
                    required
                    styles={inputStyles}
                  />
                </SimpleGrid>

                {/* Assigned Host | Meeting Date */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <Select
                    className="contact-form-field"
                    label="Assigned Host"
                    placeholder="Select Host / Employee"
                    data={(() => {
                      const list = (metadata?.employees || []).map((e: any) => ({
                        value: e.id || e.empCode || e.name,
                        label: e.name ? (e.designation ? `${e.name} (${e.designation})` : e.name) : 'Unknown',
                      }));
                      if (meetingHostName && !list.some((item: any) => item.label.startsWith(meetingHostName))) {
                        list.unshift({ value: meetingHostId || meetingHostName, label: meetingHostName });
                      }
                      return list;
                    })()}
                    leftSection={<IconUser size={18} stroke={1.6} />}
                    value={meetingHostId || meetingHostName || null}
                    onChange={(val) => {
                      const emp = metadata?.employees?.find((e: any) => (e.id || e.empCode || e.name) === val);
                      if (emp) {
                        setMeetingHostId(emp.id || emp.empCode || '');
                        setMeetingHostName(emp.name);
                      } else {
                        setMeetingHostId(val || '');
                        setMeetingHostName(val || '');
                      }
                    }}
                    searchable
                    clearable
                    styles={inputStyles}
                  />

                  <MeetingDatePicker
                    label="Meeting Date"
                    placeholder="DD-MM-YYYY"
                    value={meetingDate}
                    onChange={(val) => setMeetingDate(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    leftSection={<IconCalendar size={18} stroke={1.6} />}
                  />
                </SimpleGrid>

                {/* From time | Meeting Type */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <MeetingTimePicker
                    label="From time"
                    placeholder="e.g. 10:00 AM"
                    value={meetingFromTime}
                    onChange={handleMeetingFromTimeChange}
                    styles={inputStyles}
                    zIndex={3000}
                    hideQuickSelect
                  />

                  <Select
                    className="contact-form-field"
                    label="Meeting Type"
                    placeholder="Select Meeting Type"
                    data={[
                      { value: 'Virtual', label: 'Virtual' },
                      { value: 'In-person', label: 'In-person' },
                    ]}
                    leftSection={<IconWorld size={18} stroke={1.6} />}
                    value={meetingType || null}
                    onChange={(val) => setMeetingType(val || '')}
                    allowDeselect={false}
                    clearable
                    styles={inputStyles}
                  />
                </SimpleGrid>

                {/* Meeting Link / Meeting Location | Meeting Status */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <TextInput
                    className="contact-form-field"
                    label={isInPersonMeeting ? 'Meeting Location' : 'Meeting Link'}
                    placeholder={
                      isInPersonMeeting
                        ? 'e.g. Conference Room A, Office Address'
                        : 'e.g. https://meet.google.com/xyz-abc-def'
                    }
                    leftSection={
                      isInPersonMeeting ? (
                        <IconMapPin size={18} stroke={1.6} />
                      ) : (
                        <IconLink size={18} stroke={1.6} />
                      )
                    }
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    styles={inputStyles}
                  />

                  <Select
                    className="contact-form-field"
                    label="Meeting Status"
                    placeholder="Select Status"
                    required
                    error={errors.meetingStatus}
                    data={[
                      { value: 'Scheduled', label: 'Scheduled' },
                      { value: 'Completed', label: 'Completed' },
                      { value: 'Follow-up', label: 'Follow-up' },
                      { value: 'Rescheduled', label: 'Rescheduled' },
                      { value: 'Cancelled', label: 'Cancelled' },
                    ]}
                    leftSection={<IconCheck size={18} stroke={1.6} />}
                    value={meetingStatus || null}
                    onChange={(val) => {
                      const newStatus = val || '';
                      setMeetingStatus(newStatus);
                      if (newStatus !== 'Completed' && newStatus !== 'Follow-up') {
                        setMeetingToTime('');
                        setMeetingDuration('');
                      }
                      if (newStatus !== 'Rescheduled') {
                        setRescheduleTime('');
                      }
                      if (errors.meetingStatus) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.meetingStatus;
                          return next;
                        });
                      }
                    }}
                    allowDeselect={false}
                    styles={inputStyles}
                  />
                </SimpleGrid>

                {/* Dynamic To time & Duration (Shown ONLY when status is Completed or Follow-up) */}
                {(meetingStatus === 'Completed' || meetingStatus === 'Follow-up') && (
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    <MeetingTimePicker
                      label="To time"
                      placeholder="e.g. 10:30 AM"
                      value={meetingToTime}
                      onChange={handleMeetingToTimeChange}
                      styles={inputStyles}
                      zIndex={3000}
                      hideQuickSelect
                    />

                    <TextInput
                      className="contact-form-field"
                      label="Duration"
                      placeholder="Auto-calculated (e.g. 30 Minutes)"
                      leftSection={<IconClock size={18} stroke={1.6} />}
                      value={meetingDuration}
                      onChange={(e) => setMeetingDuration(e.target.value)}
                      styles={inputStyles}
                    />
                  </SimpleGrid>
                )}

                {/* Dynamic Next Follow-up Date (shown when Follow-up is selected) */}
                {meetingStatus === 'Follow-up' && (
                  <MeetingDatePicker
                    label="Next follow-up date"
                    placeholder="DD-MM-YYYY"
                    value={nextFollowDate}
                    onChange={(val) => setNextFollowDate(val)}
                    styles={inputStyles}
                    zIndex={3000}
                    leftSection={<IconCalendar size={18} stroke={1.6} />}
                  />
                )}

                {/* Dynamic Reschedule Date & Time (shown when Rescheduled is selected) */}
                {meetingStatus === 'Rescheduled' && (
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    <MeetingDatePicker
                      label="Reschedule Date"
                      placeholder="DD-MM-YYYY"
                      value={rescheduleDate}
                      onChange={(val) => setRescheduleDate(val)}
                      styles={inputStyles}
                      zIndex={3000}
                      leftSection={<IconCalendar size={18} stroke={1.6} />}
                    />

                    <MeetingTimePicker
                      label="Reschedule Time"
                      placeholder="e.g. 02:30 PM"
                      value={rescheduleTime}
                      onChange={(val) => setRescheduleTime(val)}
                      styles={inputStyles}
                      zIndex={3000}
                      hideQuickSelect
                    />
                  </SimpleGrid>
                )}
              </Stack>
            </Box>
          )}

          {/* Row 5: Description & Remarks */}
          <Textarea
            className="contact-form-field"
            label="Description & Remarks"
            placeholder="Add context, requirements, notes, or remarks..."
            minRows={3}
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            styles={textareaStyles}
          />

          {/* Footer Buttons */}
          <Group justify="flex-end" gap="sm" mt="md">
            <Button
              variant="default"
              radius="md"
              size="md"
              onClick={onClose}
              disabled={loading}
              style={{
                fontWeight: 600,
                paddingLeft: 20,
                paddingRight: 20,
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#D1D5DB',
                color: isDark ? '#E2E8F0' : '#374151',
                background: isDark ? '#1F2937' : '#FFFFFF',
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              radius="md"
              size="md"
              loading={loading}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                fontWeight: 600,
                paddingLeft: 24,
                paddingRight: 24,
                border: 'none',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
              }}
            >
              Save record
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default ContactModal;
