import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  SimpleGrid,
  useComputedColorScheme,
  Text,
} from '@mantine/core';
import {
  IconBrandWhatsapp,
  IconMail,
  IconActivity,
  IconUser,
  IconPhone,
  IconBuilding,
  IconCalendar,
} from '@tabler/icons-react';
import { ActivityLogItem, ActivityLogSection } from '../../../types/callLog';
import { Contact } from '../../../types/contact';
import { useEmployee } from '../../../context/EmployeeContext';
import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';
import { MeetingTimePicker } from '../../meetings/components/MeetingTimePicker';

interface ActivityLogModalProps {
  section: ActivityLogSection;
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ActivityLogItem>) => Promise<void>;
  submitting: boolean;
  contacts: Contact[];
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  section,
  opened,
  onClose,
  onSubmit,
  submitting,
  contacts,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { employees } = useEmployee();

  const [contactId, setContactId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [performedById, setPerformedById] = useState<string | null>(null);
  const [channelType, setChannelType] = useState('Outgoing');
  const [status, setStatus] = useState('Msg Sent');
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activityTime, setActivityTime] = useState('10:00 AM');
  const [nextFollowDate, setNextFollowDate] = useState('');
  const [description, setDescription] = useState('');

  // Reset / init defaults whenever modal opens or section changes
  useEffect(() => {
    if (opened) {
      setContactId(null);
      setLeadId(null);
      setContactName('');
      setCustomerName('');
      setPhone('');
      setEmail('');
      setDescription('');
      setNextFollowDate('');
      setActivityDate(new Date().toISOString().slice(0, 10));
      setActivityTime('10:00 AM');
      const defaultEmp = employees.length > 0 ? employees[0] : null;
      setPerformedBy(defaultEmp ? defaultEmp.name : 'Staff');
      setPerformedById(defaultEmp ? defaultEmp.id : null);

      if (section === 'whatsapp') {
        setChannelType('Outgoing');
        setStatus('Msg Sent');
      } else if (section === 'email') {
        setChannelType('Outgoing');
        setStatus('Mail Sent');
      } else {
        setChannelType('Direct Visit');
        setStatus('Interested');
      }
    }
  }, [opened, section]);

  const handleSelectContact = (val: string | null) => {
    if (!val) return;
    const found = contacts.find((c) => c.name === val || c.id === val);
    if (found) {
      setContactId(found.id);
      setLeadId(found.internalReference || (found as any).leadId || null);
      setContactName(found.name);
      setCustomerName(found.companyName || '');
      setPhone(found.phone || '');
      setEmail(found.email || '');
      if (found.assignedToName) {
        setPerformedBy(found.assignedToName);
        if (found.assignedTo) setPerformedById(found.assignedTo);
      }
    } else {
      setContactName(val);
      setContactId(null);
      setLeadId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;

    await onSubmit({
      contactId: contactId || undefined,
      leadId: leadId || undefined,
      contactName: contactName.trim(),
      customerName: customerName.trim() || undefined,
      performedBy: performedBy || undefined,
      performedById: performedById || undefined,
      phone: phone.trim() || undefined,
      phoneNumber: phone.trim() || undefined,
      email: email.trim() || undefined,
      messageType: section === 'whatsapp' ? channelType : undefined,
      emailType: section === 'email' ? channelType : undefined,
      activityType: section === 'others' ? channelType : undefined,
      status,
      activityDate,
      activityTime,
      nextFollowDate: status.toLowerCase().includes('follow') ? nextFollowDate : undefined,
      description: description.trim() || undefined,
    });
  };

  const getTitle = () => {
    if (section === 'whatsapp') return 'Log WhatsApp Message';
    if (section === 'email') return 'Log Email Communication';
    return 'Log Interaction Activity';
  };

  const getIcon = () => {
    if (section === 'whatsapp') return <IconBrandWhatsapp size={20} color="#22C55E" />;
    if (section === 'email') return <IconMail size={20} color="#3B82F6" />;
    return <IconActivity size={20} color="#F59E0B" />;
  };

  const contactOptions = contacts.map((c) => ({
    value: c.name,
    label: `${c.name} ${c.companyName ? `(${c.companyName})` : ''}`,
  }));

  const inputStyles = {
    input: {
      backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
      borderColor: isDark ? '#374151' : '#E2E8F0',
      color: isDark ? '#F1F5F9' : '#0F172A',
      fontSize: 13,
    },
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          {getIcon()}
          <Text fw={700} size="md">
            {getTitle()}
          </Text>
        </Group>
      }
      size="lg"
      radius="lg"
      styles={{
        content: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md" mt="xs">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Contact Person"
              placeholder="Search or enter contact"
              data={contactOptions}
              searchable
              searchValue={contactName}
              onSearchChange={setContactName}
              onChange={handleSelectContact}
              required
              styles={inputStyles}
              leftSection={<IconUser size={16} stroke={1.5} />}
            />

            <TextInput
              label="Company Name"
              placeholder="Client / Company"
              value={customerName}
              onChange={(e) => setCustomerName(e.currentTarget.value)}
              styles={inputStyles}
              leftSection={<IconBuilding size={16} stroke={1.5} />}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {section === 'email' ? (
              <TextInput
                label="Email Address"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                styles={inputStyles}
                leftSection={<IconMail size={16} stroke={1.5} />}
              />
            ) : (
              <TextInput
                label={section === 'whatsapp' ? 'WhatsApp Number' : 'Phone Number'}
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value)}
                styles={inputStyles}
                leftSection={<IconPhone size={16} stroke={1.5} />}
              />
            )}

            {section === 'whatsapp' && (
              <Select
                label="Message Type"
                data={[
                  { value: 'Outgoing', label: 'Outgoing' },
                  { value: 'Incoming', label: 'Incoming' },
                  { value: 'Template Message', label: 'Template Message' },
                  { value: 'Direct Message', label: 'Direct Message' },
                ]}
                value={channelType}
                onChange={(val) => setChannelType(val || 'Outgoing')}
                styles={inputStyles}
              />
            )}

            {section === 'email' && (
              <Select
                label="Email Type"
                data={[
                  { value: 'Outgoing', label: 'Outgoing' },
                  { value: 'Incoming', label: 'Incoming' },
                  { value: 'Proposal', label: 'Proposal' },
                  { value: 'Follow-up Email', label: 'Follow-up Email' },
                  { value: 'Introduction', label: 'Introduction' },
                ]}
                value={channelType}
                onChange={(val) => setChannelType(val || 'Outgoing')}
                styles={inputStyles}
              />
            )}

            {section === 'others' && (
              <Select
                label="Activity Type"
                data={[
                  { value: 'Meeting', label: 'Client Meeting / Discussion' },
                  { value: 'Direct Visit', label: 'Direct Visit' },
                  { value: 'SMS', label: 'SMS' },
                  { value: 'Social Media', label: 'Social Media' },
                  { value: 'Referral', label: 'Referral' },
                  { value: 'Event / Exhibition', label: 'Event / Exhibition' },
                  { value: 'Other', label: 'Other' },
                ]}
                value={channelType}
                onChange={(val) => setChannelType(val || 'Direct Visit')}
                styles={inputStyles}
              />
            )}
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Status"
              data={
                section === 'whatsapp'
                  ? [
                      { value: 'Msg Sent', label: 'Msg Sent' },
                      { value: 'Replied', label: 'Replied' },
                      { value: 'Failed', label: 'Failed' },
                      { value: 'Interested', label: 'Interested' },
                      { value: 'Follow up', label: 'Follow up' },
                      { value: 'Not Interested', label: 'Not Interested' },
                    ]
                  : section === 'email'
                  ? [
                      { value: 'Draft', label: 'Draft' },
                      { value: 'Mail Sent', label: 'Mail Sent' },
                      { value: 'Replied', label: 'Replied' },
                      { value: 'Failed', label: 'Failed' },
                      { value: 'Interested', label: 'Interested' },
                      { value: 'Follow up', label: 'Follow up' },
                      { value: 'Not Interested', label: 'Not Interested' },
                    ]
                  : [
                      { value: 'Interested', label: 'Interested' },
                      { value: 'Follow up', label: 'Follow up' },
                      { value: 'Not Interested', label: 'Not Interested' },
                    ]
              }
              value={status}
              onChange={(val) => setStatus(val || 'Msg Sent')}
              styles={inputStyles}
            />

            {status.toLowerCase().includes('follow') ? (
              <MeetingDatePicker
                label="Next Follow-up Date"
                placeholder="DD-MM-YYYY"
                value={nextFollowDate}
                onChange={(val) => setNextFollowDate(val)}
                styles={inputStyles}
                zIndex={3000}
                leftSection={<IconCalendar size={16} stroke={1.5} />}
              />
            ) : (
              <MeetingDatePicker
                label="Activity Date"
                placeholder="DD-MM-YYYY"
                value={activityDate}
                onChange={(val) => setActivityDate(val)}
                styles={inputStyles}
                zIndex={3000}
                leftSection={<IconCalendar size={16} stroke={1.5} />}
              />
            )}
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <MeetingTimePicker
              label="Activity Time"
              placeholder="e.g. 10:00 AM"
              value={activityTime}
              onChange={(val) => setActivityTime(val)}
              styles={inputStyles}
              zIndex={3000}
              hideQuickSelect
            />
            <Select
              label="Logged By / Assigned Employee"
              placeholder="Select employee"
              data={employees.map((e) => ({
                value: e.id,
                label: e.name ? `${e.name} (${e.designation || e.role || 'Staff'})` : e.id,
              }))}
              value={performedById}
              onChange={(val) => {
                setPerformedById(val);
                const emp = employees.find((e) => e.id === val);
                if (emp) setPerformedBy(emp.name);
              }}
              styles={inputStyles}
              leftSection={<IconUser size={16} stroke={1.5} />}
            />
          </SimpleGrid>

          <Textarea
            label="Notes / Description"
            placeholder="Record interaction notes, client response or summary..."
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            minRows={3}
            styles={inputStyles}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" radius="md" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              radius="md"
              loading={submitting}
              style={{
                background:
                  section === 'whatsapp'
                    ? 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)'
                    : section === 'email'
                    ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                    : 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                color: '#FFFFFF',
              }}
            >
              Save Activity
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

