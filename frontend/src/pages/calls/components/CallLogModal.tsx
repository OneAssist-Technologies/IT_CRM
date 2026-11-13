import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Stack,
  SimpleGrid,
  Select,
  TextInput,
  Textarea,
  Button,
  Group,
  Text,
  ActionIcon,
  ThemeIcon,
  Box,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconPhoneCall,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconClock,
  IconCalendar,
  IconUser,
  IconPhone,
  IconBuilding,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { CallLog, CallType, CallStatus } from '../../../types/callLog';
import { Employee } from '../../../types/employee';
import { Contact } from '../../../types/contact';
import { Lead } from '../../../types/lead';
import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';
import { MeetingTimePicker } from '../../meetings/components/MeetingTimePicker';
import { CallDurationPicker } from './CallDurationPicker';

interface CallLogModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (callData: Partial<CallLog>) => Promise<void>;
  editingCall?: CallLog | null;
  employees: Employee[];
  contacts: Contact[];
  leads?: Lead[];
  submitting?: boolean;
  initialLead?: {
    id?: string | null;
    leadId?: string | null;
    name?: string | null;
    phone?: string | null;
    companyName?: string | null;
    assignedEmployeeName?: string | null;
  } | null;
}

export const CallLogModal: React.FC<CallLogModalProps> = ({
  opened,
  onClose,
  onSave,
  editingCall,
  employees,
  contacts,
  leads = [],
  submitting = false,
  initialLead = null,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  // Form State
  const [callType, setCallType] = useState<CallType>('Outgoing');
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [duration, setDuration] = useState<string>('02:30');
  const [status, setStatus] = useState<CallStatus>('Completed');
  const [callDate, setCallDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [callTime, setCallTime] = useState<string>('10:00 AM');
  const [description, setDescription] = useState<string>('');

  // Helper to format/normalize duration input string (e.g. "02:30", "2:30", "2m 30s", "2 min")
  const formatDurationInput = (str: string): string => {
    if (!str) return '02:30';
    const trimmed = str.trim();

    // If already mm:ss or m:ss
    const colonMatch = trimmed.match(/^(\d{1,3}):(\d{1,2})$/);
    if (colonMatch) {
      const min = parseInt(colonMatch[1], 10);
      const sec = parseInt(colonMatch[2], 10);
      return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    // If min and sec with letters (e.g. "2m 30s", "2 min", "45s")
    const mMatch = trimmed.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i);
    const sMatch = trimmed.match(/(\d+)\s*(?:s|sec|secs|second|seconds)/i);
    if (mMatch || sMatch) {
      const min = mMatch ? parseInt(mMatch[1], 10) : 0;
      const sec = sMatch ? parseInt(sMatch[1], 10) : 0;
      const totalSec = min * 60 + sec;
      const finalMin = Math.floor(totalSec / 60);
      const finalSec = totalSec % 60;
      return `${String(finalMin).padStart(2, '0')}:${String(finalSec).padStart(2, '0')}`;
    }

    // If pure number: <= 10 means minutes (e.g. 2 -> 02:00, 5 -> 05:00)
    const numMatch = trimmed.match(/^(\d+)$/);
    if (numMatch) {
      const val = parseInt(numMatch[1], 10);
      if (val <= 10) {
        return `${String(val).padStart(2, '0')}:00`;
      }
    }

    return trimmed;
  };

  const contactOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];

    // 1. CRM Contacts
    contacts.forEach((c) => {
      list.push({
        value: c.id,
        label: c.companyName ? `${c.name} (${c.companyName})` : c.name,
      });
    });

    // 2. Leads (if any)
    leads.forEach((l) => {
      const already = list.some(
        (item) => item.value === l.id || item.label.toLowerCase() === l.name.toLowerCase()
      );
      if (!already) {
        list.push({
          value: `lead_${l.id}`,
          label: l.companyName ? `${l.name} (${l.companyName}) [Lead]` : `${l.name} [Lead]`,
        });
      }
    });

    // 3. If initialLead is passed and not in list
    if (initialLead && initialLead.id) {
      const already = list.some(
        (item) => item.value === initialLead.id || item.value === `lead_${initialLead.id}`
      );
      if (!already) {
        list.unshift({
          value: `lead_${initialLead.id}`,
          label: initialLead.companyName
            ? `${initialLead.name} (${initialLead.companyName})`
            : `${initialLead.name}`,
        });
      }
    }

    return list;
  }, [contacts, leads, initialLead]);

  useEffect(() => {
    if (opened) {
      if (editingCall) {
        setCallType(editingCall.callType || 'Outgoing');
        setEmployeeId(editingCall.employeeId || null);
        setEmployeeName(editingCall.employeeName || '');
        setContactId(editingCall.contactId || null);
        setLeadId(editingCall.leadId || null);
        setContactName(editingCall.contactName || '');
        setCompanyName(editingCall.companyName || '');
        setPhoneNumber(editingCall.phoneNumber || '');
        setDuration(editingCall.duration || '02:30');
        const rawSt = (editingCall.status || 'Completed').trim();
        const normSt = rawSt.toLowerCase().includes('follow') ? 'Follow-up' : (rawSt as CallStatus);
        setStatus(normSt);
        setCallDate(editingCall.callDate || new Date().toISOString().split('T')[0]);
        setCallTime(editingCall.callTime || '10:00 AM');
        setDescription(editingCall.description || '');
      } else if (initialLead) {
        // Pre-fill from active lead (e.g. from Activity Pipeline)
        setCallType('Outgoing');
        setLeadId(initialLead.id || initialLead.leadId || null);

        // Pre-select employee if assigned
        if (initialLead.assignedEmployeeName) {
          const emp = employees.find(
            (e) => e.name.toLowerCase() === initialLead.assignedEmployeeName?.toLowerCase()
          );
          if (emp) {
            setEmployeeId(emp.id || emp.empCode);
            setEmployeeName(emp.name);
          } else {
            setEmployeeId(employees.length > 0 ? (employees[0].id || employees[0].empCode) : null);
            setEmployeeName(employees.length > 0 ? employees[0].name : initialLead.assignedEmployeeName);
          }
        } else {
          const defaultEmp = employees.length > 0 ? employees[0] : null;
          setEmployeeId(defaultEmp ? defaultEmp.id || defaultEmp.empCode : null);
          setEmployeeName(defaultEmp ? defaultEmp.name : '');
        }

        // Check if there's a matching contact in contacts list
        const matchC = contacts.find(
          (c) =>
            (c.name && initialLead.name && c.name.toLowerCase() === initialLead.name.toLowerCase()) ||
            (c.phone && initialLead.phone && c.phone === initialLead.phone)
        );
        if (matchC) {
          setContactId(matchC.id);
          setContactName(matchC.name);
          setPhoneNumber(matchC.phone || initialLead.phone || '');
        } else {
          setContactId(initialLead.id ? `lead_${initialLead.id}` : null);
          setContactName(initialLead.name || '');
          setPhoneNumber(initialLead.phone || '');
        }

        setDuration('02:30');
        setStatus('Completed');
        setCallDate(new Date().toISOString().split('T')[0]);

        const now = new Date();
        const hrs = now.getHours();
        const mins = Math.floor(now.getMinutes() / 5) * 5;
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const displayH = (hrs % 12) || 12;
        const displayM = mins.toString().padStart(2, '0');
        setCallTime(`${displayH}:${displayM} ${ampm}`);
        setDescription('');
      } else {
        // Defaults for new call
        setCallType('Outgoing');
        setLeadId(null);
        const defaultEmp = employees.length > 0 ? employees[0] : null;
        setEmployeeId(defaultEmp ? defaultEmp.id || defaultEmp.empCode : null);
        setEmployeeName(defaultEmp ? defaultEmp.name : '');
        setContactId(null);
        setContactName('');
        setPhoneNumber('');
        setDuration('02:30');
        setStatus('Completed');
        setCallDate(new Date().toISOString().split('T')[0]);

        // Current time rounded to 5 mins
        const now = new Date();
        const hrs = now.getHours();
        const mins = Math.floor(now.getMinutes() / 5) * 5;
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const displayH = (hrs % 12) || 12;
        const displayM = mins.toString().padStart(2, '0');
        setCallTime(`${displayH}:${displayM} ${ampm}`);
        setDescription('');
      }
    }
  }, [opened, editingCall, initialLead, employees, contacts]);

  const employeeOptions = useMemo(() => {
    return employees.map((e) => ({
      value: e.id || e.empCode,
      label: e.name,
    }));
  }, [employees]);

  // When contact is selected: auto-fill contactName AND phone number!
  const handleContactSelect = (val: string | null) => {
    setContactId(val);
    if (!val) {
      setContactName('');
      setCompanyName('');
      setPhoneNumber('');
      setLeadId(null);
      return;
    }

    // Check if initialLead
    if (initialLead && (val === initialLead.id || val === `lead_${initialLead.id}`)) {
      setContactName(initialLead.name || '');
      setCompanyName(initialLead.companyName || '');
      setPhoneNumber(initialLead.phone || '');
      setLeadId(initialLead.id || null);
      return;
    }

    // Check if lead from list
    if (val.startsWith('lead_')) {
      const actualLeadId = val.replace('lead_', '');
      const foundLead = leads.find((l) => l.id === actualLeadId || l.leadId === actualLeadId);
      if (foundLead) {
        setContactName(foundLead.name);
        setCompanyName(foundLead.companyName || '');
        setPhoneNumber(foundLead.phone || '');
        setLeadId(foundLead.id);
        return;
      }
    }

    // Check if contact from contacts
    const found = contacts.find((c) => c.id === val || c.contactId === val);
    if (found) {
      setContactName(found.name);
      setCompanyName(found.companyName || '');
      if (found.phone) {
        setPhoneNumber(found.phone);
      }
      const matchingLead = leads.find(
        (l) =>
          (l.name && found.name && l.name.toLowerCase() === found.name.toLowerCase()) ||
          (l.phone && found.phone && l.phone === found.phone)
      );
      setLeadId(matchingLead ? matchingLead.id : null);
    }
  };

  // When employee is selected
  const handleEmployeeSelect = (val: string | null) => {
    setEmployeeId(val);
    if (!val) {
      setEmployeeName('');
      return;
    }
    const found = employees.find((e) => (e.id || e.empCode) === val);
    if (found) {
      setEmployeeName(found.name);
    }
  };

  const handleSubmit = async () => {
    let resolvedEmpName = employeeName?.trim() || editingCall?.employeeName || '';
    let resolvedEmpId = employeeId || editingCall?.employeeId || null;

    if (!resolvedEmpName) {
      try {
        const stored = localStorage.getItem('user') || localStorage.getItem('crm_user');
        if (stored) {
          const u = JSON.parse(stored);
          resolvedEmpName = u.name || u.username || 'Staff';
          resolvedEmpId = resolvedEmpId || u.id || u.empCode || null;
        }
      } catch (_) {}
    }
    if (!resolvedEmpName) {
      resolvedEmpName = employees[0]?.name || 'Staff';
      resolvedEmpId = resolvedEmpId || employees[0]?.id || employees[0]?.empCode || null;
    }

    if (!contactName.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select or enter a contact name.',
        color: 'red',
      });
      return;
    }

    if (!phoneNumber.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please enter a valid phone number.',
        color: 'red',
      });
      return;
    }

    if (!duration.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please enter call duration.',
        color: 'red',
      });
      return;
    }

    if (!callDate.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a call date.',
        color: 'red',
      });
      return;
    }

    const formattedDuration = formatDurationInput(duration);

    // Normalize callDate to YYYY-MM-DD in case of manual entry
    let normalizedCallDate = callDate.trim();
    const dateParts = normalizedCallDate.split(/[-/. ]+/);
    if (dateParts.length === 3) {
      if (dateParts[0].length === 2 && dateParts[2].length === 4) {
        // DD-MM-YYYY -> YYYY-MM-DD
        normalizedCallDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
      } else if (dateParts[0].length === 4) {
        normalizedCallDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
      }
    }

    const payload: Partial<CallLog> = {
      callType,
      employeeId: resolvedEmpId,
      employeeName: resolvedEmpName,
      contactId: contactId && !contactId.startsWith('lead_') ? contactId : null,
      contactName: contactName.trim(),
      companyName: companyName.trim() || undefined,
      phoneNumber: phoneNumber.trim(),
      leadId: leadId || editingCall?.leadId || (initialLead?.id ?? null),
      duration: formattedDuration,
      status,
      callDate: normalizedCallDate,
      callTime: callTime.trim() || '10:00 AM',
      description: description.trim() || null,
    };

    await onSave(payload);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      centered
      withCloseButton={false}
      radius="lg"
      styles={{
        content: {
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.18)',
        },
        body: {
          padding: 24,
        },
      }}
      closeOnClickOutside={!submitting}
    >
      {/* Header matching Contact design */}
      <Group justify="space-between" align="flex-start" mb="lg">
        <Group gap="md">
          <Box
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#818CF8' : '#4F46E5',
            }}
          >
            <IconPhoneCall size={22} stroke={1.8} />
          </Box>
          <div>
            <Text fw={800} size="19px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
              {editingCall ? 'Edit Call Record' : 'Log Call'}
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              Enter call log details
            </Text>
          </div>
        </Group>

        <ActionIcon
          variant="subtle"
          color="gray"
          size="md"
          radius="100px"
          onClick={onClose}
        >
          <IconX size={18} />
        </ActionIcon>
      </Group>

      <Stack gap="md">
        {/* Row 1: Call Type & Assigned Employee */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select
            label="Call Type"
            placeholder="Select Call Type"
            data={[
              { value: 'Outgoing', label: 'Outgoing' },
              { value: 'Incoming', label: 'Incoming' },
            ]}
            value={callType}
            onChange={(val) => setCallType((val as CallType) || 'Outgoing')}
            required
            allowDeselect={false}
            radius="md"
          />

          <Select
            label="Assigned Employee"
            placeholder="Select Employee"
            data={employeeOptions}
            value={employeeId}
            onChange={handleEmployeeSelect}
            searchable
            clearable
            radius="md"
          />
        </SimpleGrid>

        {/* Row 2: Contact Name & Phone Number */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select
            label="Contact Name"
            placeholder="Select Contact from CRM"
            data={contactOptions}
            value={contactId}
            onChange={handleContactSelect}
            searchable
            clearable
            required
            radius="md"
          />

          <TextInput
            label="Phone Number"
            placeholder="e.g. +91 98765 43210"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.currentTarget.value)}
            required
            radius="md"
          />
        </SimpleGrid>

        {/* Row 3: Duration & Status */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <CallDurationPicker
            label="Duration"
            placeholder="MM:SS"
            value={duration}
            onChange={(val) => setDuration(val)}
            required
          />

          <Select
            label="Status"
            placeholder="Select Status"
            data={[
              { value: 'Completed', label: 'Completed' },
              { value: 'Follow-up', label: 'Follow-up' },
              { value: 'Interested', label: 'Interested' },
              { value: 'Missed', label: 'Missed' },
              { value: 'Busy', label: 'Busy' },
              { value: 'No Answer', label: 'No Answer' },
              { value: 'Not Interested', label: 'Not Interested' },
            ]}
            value={status}
            onChange={(val) => setStatus((val as CallStatus) || 'Completed')}
            required
            allowDeselect={false}
            radius="md"
          />
        </SimpleGrid>

        {/* Row 4: Call Date and Time */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <MeetingDatePicker
            label="Call Date"
            placeholder="DD-MM-YYYY"
            value={callDate}
            onChange={(val) => setCallDate(val)}
            required
          />

          <MeetingTimePicker
            label="Call Time"
            placeholder="10:00 AM"
            value={callTime}
            onChange={(val) => setCallTime(val)}
            required
          />
        </SimpleGrid>

        {/* 6. Description / Notes */}
        <Textarea
          label="Description / Notes"
          placeholder="Brief discussion summary, client response, action items..."
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={3}
          radius="md"
        />

        {/* Action Buttons matching Contact design */}
        <Group justify="flex-end" gap="sm" mt="md">
          <Button
            variant="default"
            radius="md"
            onClick={onClose}
            disabled={submitting}
            style={{
              fontWeight: 600,
              minWidth: 90,
            }}
          >
            Cancel
          </Button>
          <Button
            radius="md"
            loading={submitting}
            onClick={handleSubmit}
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
              color: '#FFFFFF',
              fontWeight: 600,
              minWidth: 120,
              border: 'none',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
            }}
          >
            {editingCall ? 'Update Call' : 'Save Call'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
