import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Stack,
  Group,
  Avatar,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Paper,
  Box,
  Divider,
  TextInput,
  Textarea,
  Select,
  SegmentedControl,
  useComputedColorScheme,
  ActionIcon,
  Tooltip,
  Autocomplete,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';
import {
  IconTargetArrow,
  IconCheck,
  IconX,
  IconUser,
  IconBuilding,
  IconPhone,
  IconMail,
  IconCoin,
  IconCalendar,
  IconClock,
  IconBriefcase,
  IconAlertCircle,
  IconFileText,
  IconReceiptTax,
  IconCreditCard,
} from '@tabler/icons-react';
import { Contact, QualificationStatus, ContactPriority } from '../../../types/contact';
import { useContact } from '../../../context/ContactContext';
import { useLead } from '../../../context/LeadContext';
import { useCRM } from '../../../context/CRMContext';

interface ContactQualificationDrawerProps {
  contact: Contact | null;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ContactQualificationDrawer: React.FC<ContactQualificationDrawerProps> = ({
  contact,
  opened,
  onClose,
  onSuccess,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { currentUser } = useCRM();
  const { updateContact, metadata } = useContact();

  const drawerProductServiceOptions = useMemo(() => {
    const list = new Set<string>();
    (metadata?.catalogProducts || []).forEach((p) => p && list.add(p.trim()));
    (metadata?.productOptions || []).forEach((p) => p && list.add(p.trim()));
    (metadata?.catalogServices || []).forEach((s) => s && list.add(s.trim()));
    (metadata?.serviceOptions || []).forEach((s) => s && list.add(s.trim()));
    return Array.from(list).filter(Boolean);
  }, [metadata]);
  const { fetchLeads, fetchStats } = useLead();

  const todayStr = new Date().toISOString().split('T')[0];

  // The 10 Qualification Fields State
  const [businessNeed, setBusinessNeed] = useState<string>('');
  const [budgetRange, setBudgetRange] = useState<string>('');
  const [decisionMaker, setDecisionMaker] = useState<string>('');
  const [purchaseTimeline, setPurchaseTimeline] = useState<string>('');
  const [interestedService, setInterestedService] = useState<string>('');
  const [priority, setPriority] = useState<ContactPriority>('Medium');
  const [qualificationStatus, setQualificationStatus] = useState<QualificationStatus>('Pending');
  const [qualifiedBy, setQualifiedBy] = useState<string>('');
  const [qualificationDate, setQualificationDate] = useState<string>(todayStr);
  const [address, setAddress] = useState<string>('');
  const [gstNumber, setGstNumber] = useState<string>('');
  const [companyPan, setCompanyPan] = useState<string>('');
  const [unqualifiedReason, setUnqualifiedReason] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (contact) {
      setBusinessNeed(contact.businessNeed || contact.description || contact.notes || '');
      setBudgetRange(contact.budgetRange || (contact.estimatedValue ? `₹ ${contact.estimatedValue}` : ''));
      setDecisionMaker(contact.decisionMaker || (contact.contactPerson ? `${contact.contactPerson} (Director)` : contact.name || ''));
      setPurchaseTimeline(contact.purchaseTimeline || 'Within 1 month');
      setInterestedService(
        (contact.interestedService && contact.interestedService.trim() !== '')
          ? contact.interestedService.trim()
          : (contact.serviceList && contact.serviceList.length > 0 && contact.serviceList[0]?.trim() !== '')
          ? contact.serviceList[0].trim()
          : (contact.productList && contact.productList.length > 0 && contact.productList[0]?.trim() !== '')
          ? contact.productList[0].trim()
          : contact.customProduct || ''
      );
      setPriority((contact.priority as ContactPriority) || 'Medium');

      let initStatus: QualificationStatus = 'Pending';
      if (contact.qualificationStatus === 'Qualified' || contact.status === 'Qualified') {
        initStatus = 'Qualified';
      } else if (
        contact.qualificationStatus === 'Unqualified' ||
        contact.qualificationStatus === 'Disqualified' ||
        contact.status === 'Disqualified'
      ) {
        initStatus = 'Unqualified';
      }
      setQualificationStatus(initStatus);

      setQualifiedBy(
        contact.qualifiedBy ||
          contact.assignedToName ||
          currentUser?.name ||
          (metadata?.employees && metadata.employees[0]?.name) ||
          ''
      );
      setQualificationDate(contact.qualificationDate || todayStr);
      setAddress(contact.address || '');
      setGstNumber(contact.gstNumber || '');
      setCompanyPan(contact.companyPan || '');
      setUnqualifiedReason(contact.unqualifiedReason || contact.disqualificationReason || '');
    }
  }, [contact, opened]);

  if (!contact) return null;

  const handleSaveQualification = async () => {
    try {
      setSaving(true);

      const payload = {
        businessNeed: businessNeed.trim(),
        budgetRange: budgetRange.trim(),
        decisionMaker: decisionMaker.trim(),
        purchaseTimeline: purchaseTimeline.trim(),
        interestedService: interestedService.trim(),
        priority,
        qualificationStatus,
        qualifiedBy: qualifiedBy.trim(),
        qualificationDate: qualificationDate || todayStr,
        address: address.trim(),
        gstNumber: gstNumber.trim().toUpperCase() || '',
        companyPan: companyPan.trim().toUpperCase() || '',
        panNumber: companyPan.trim().toUpperCase() || '',
        unqualifiedReason: qualificationStatus === 'Unqualified' ? unqualifiedReason.trim() : '',
        disqualificationReason: qualificationStatus === 'Unqualified' ? unqualifiedReason.trim() : '',
        stage: 'Qualification',
        assignmentStatus: 'Assigned',
        assignedTo: contact.assignedTo || currentUser?.id || undefined,
        assignedToName: contact.assignedToName || currentUser?.name || undefined,
        status:
          qualificationStatus === 'Qualified'
            ? 'Qualified'
            : qualificationStatus === 'Unqualified'
            ? 'Disqualified'
            : 'In Progress',
      };

      const res = await updateContact(contact.id, payload, { silent: true });

      if (res?.success) {
        if (qualificationStatus === 'Qualified') {
          notifications.show({
            title: 'Contact Qualified Successfully!',
            message: `Contact '${contact.name}' has been qualified and synced to your Leads pipeline.`,
            color: 'teal',
            icon: <IconCheck size={16} />,
          });
          await fetchLeads();
          await fetchStats();
        } else {
          notifications.show({
            title: 'Qualification Saved',
            message: `Contact qualification status saved as '${qualificationStatus}'.`,
            color: 'blue',
            icon: <IconCheck size={16} />,
          });
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('crm_contacts_tab', 'ASSIGNED');
          sessionStorage.setItem('crm_contacts_tab', 'ASSIGNED');
        }
        window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      console.error('Error updating qualification:', err);
      notifications.show({
        title: 'Save Failed',
        message: err.message || 'Failed to save qualification details.',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'CT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0';
  const labelColor = isDark ? '#94A3B8' : '#475569';
  const headingColor = isDark ? '#F8FAFC' : '#0F172A';

  const employeeOptions = [
    ...(metadata?.employees?.map((emp) => ({
      value: emp.name,
      label: `${emp.name} (${emp.empCode || 'Emp'})`,
    })) || []),
    ...(contact.assignedToName ? [{ value: contact.assignedToName, label: `${contact.assignedToName} (Assigned)` }] : []),
    ...(currentUser?.name ? [{ value: currentUser.name, label: `${currentUser.name} (Current User)` }] : []),
  ];
  // Deduplicate
  const uniqueEmployeeOptions = Array.from(
    new Map(employeeOptions.map((item) => [item.value, item])).values()
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="700px"
      radius="18px"
      padding="xl"
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 4,
      }}
      title={
        <Group gap="xs">
          <Box
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
            }}
          >
            <IconTargetArrow size={20} stroke={2.2} />
          </Box>
          <Box>
            <Text fw={700} size="md" style={{ color: headingColor }}>
              Contact Qualification
            </Text>
            <Text size="xs" c="dimmed">
              Assess readiness & sync qualified leads
            </Text>
          </Box>
        </Group>
      }
      styles={{
        header: {
          background: isDark ? '#0F172A' : '#FFFFFF',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
          paddingBottom: 14,
        },
        content: {
          background: isDark ? '#0B0F17' : '#F8FAFC',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #E2E8F0',
          boxShadow: isDark
            ? '0 24px 60px -12px rgba(0, 0, 0, 0.7)'
            : '0 24px 60px -12px rgba(0, 0, 0, 0.15)',
        },
        body: {
          paddingTop: 18,
          maxHeight: 'calc(86vh - 80px)',
          overflowY: 'auto',
        },
      }}
    >
      <Stack gap="lg">
        {/* Contact Summary Header Card */}
        <Paper
          p="md"
          radius="14px"
          style={{
            background: cardBg,
            border: cardBorder,
            boxShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
          }}
        >
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <Avatar size={48} radius="12px" color="blue">
                {getInitials(contact.name)}
              </Avatar>
              <Box style={{ minWidth: 0 }}>
                <Text fw={700} size="md" truncate style={{ color: headingColor }}>
                  {contact.name}
                </Text>
                <Text size="xs" c="dimmed" truncate mt={1}>
                  {contact.companyName || 'Independent'}
                  {contact.contactPerson ? ` • Contact: ${contact.contactPerson}` : ''}
                </Text>
                <Group gap="xs" mt={4} wrap="wrap">
                  {contact.phone && (
                    <Text size="11.5px" fw={600} style={{ color: isDark ? '#93C5FD' : '#2563EB' }}>
                      📞 {contact.phone}
                    </Text>
                  )}
                  {contact.email && (
                    <Text size="11.5px" c="dimmed">
                      ✉️ {contact.email}
                    </Text>
                  )}
                </Group>
              </Box>
            </Group>

            {contact.assignedToName && (
              <Badge variant="light" color="blue" size="md" radius="md">
                👤 {contact.assignedToName}
              </Badge>
            )}
          </Group>
        </Paper>

        {/* 10 Qualification Fields Form */}
        <Paper
          p="lg"
          radius="16px"
          style={{
            background: cardBg,
            border: cardBorder,
            boxShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
          }}
        >
          <Stack gap="md">
            {/* 1. Business Need */}
            <Box>
              <Text fw={600} size="13px" style={{ color: labelColor }}>
                Business Need
              </Text>
              <Text size="11px" c="dimmed" mb={4}>
                Enna software / service thevai?
              </Text>
              <Textarea
                placeholder="e.g. Needs ERP system for inventory and billing, Custom CRM, etc."
                value={businessNeed}
                onChange={(e) => setBusinessNeed(e.currentTarget.value)}
                minRows={2}
                autosize
                radius="md"
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                    fontSize: 13,
                  },
                }}
              />
            </Box>

            {/* 2. Budget Range & 3. Purchase Timeline */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {/* Budget Range */}
              <Box>
                <Text fw={600} size="13px" style={{ color: labelColor }}>
                  Budget Range
                </Text>
                <Text size="11px" c="dimmed" mb={4}>
                  Customer budget evvalavu?
                </Text>
                <TextInput
                  placeholder="Enter budget (e.g. ₹50,000 or ₹1,00,000)"
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.currentTarget.value)}
                  radius="md"
                  styles={{
                    input: {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                      fontSize: 13,
                    },
                  }}
                />
              </Box>

              {/* Purchase Timeline */}
              <Box>
                <Text fw={600} size="13px" style={{ color: labelColor }}>
                  Purchase Timeline
                </Text>
                <Text size="11px" c="dimmed" mb={4}>
                  Eppo service vaanga plan?
                </Text>
                <Select
                  placeholder="Select timeline"
                  data={[
                    'Immediate (Within 1-2 weeks)',
                    'Within 1 month',
                    '1 - 3 months',
                    '3 - 6 months',
                    'Exploring / Future pipeline',
                  ]}
                  value={purchaseTimeline}
                  onChange={(val) => setPurchaseTimeline(val || '')}
                  searchable
                  clearable
                  radius="md"
                  styles={{
                    input: {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                      fontSize: 13,
                    },
                  }}
                />
              </Box>
            </SimpleGrid>

            {/* 4. Decision Maker & 5. Interested Service */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {/* Decision Maker */}
              <Box>
                <Text fw={600} size="13px" style={{ color: labelColor }}>
                  Decision Maker
                </Text>
                <Text size="11px" c="dimmed" mb={4}>
                  Purchase decision yaar eduppanga?
                </Text>
                <TextInput
                  placeholder="e.g. Santhosh C (Director)"
                  value={decisionMaker}
                  onChange={(e) => setDecisionMaker(e.currentTarget.value)}
                  radius="md"
                  styles={{
                    input: {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                      fontSize: 13,
                    },
                  }}
                />
              </Box>

              {/* Interested Service */}
              <Box>
                <Text fw={600} size="13px" style={{ color: labelColor }}>
                  Interested Service
                </Text>
                <Text size="11px" c="dimmed" mb={4}>
                  Web app, mobile app, ERP, CRM, etc.
                </Text>
                <Autocomplete
                  placeholder="Select or type custom service or product..."
                  data={drawerProductServiceOptions}
                  value={interestedService}
                  onChange={(val) => setInterestedService(val)}
                  filter={({ options, search }) => {
                    const q = (search || '').trim().toLowerCase();
                    const currentVal = (interestedService || '').trim().toLowerCase();
                    if (!q || q === currentVal) return options;
                    return options.filter((item: any) =>
                      (item.label || item.value || '').toLowerCase().includes(q)
                    );
                  }}
                  clearable
                  radius="md"
                  styles={{
                    input: {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                      fontSize: 13,
                    },
                  }}
                />
              </Box>
            </SimpleGrid>

            {/* 6. Priority */}
            <Box>
              <Text fw={600} size="13px" style={{ color: labelColor }}>
                Priority
              </Text>
              <Text size="11px" c="dimmed" mb={6}>
                Low / Medium / High
              </Text>
              <SegmentedControl
                value={priority}
                onChange={(val) => setPriority(val as ContactPriority)}
                data={[
                  { label: '🟢 Low', value: 'Low' },
                  { label: '🟡 Medium', value: 'Medium' },
                  { label: '🔴 High', value: 'High' },
                ]}
                fullWidth
                radius="md"
                size="sm"
                styles={{
                  root: {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  },
                }}
              />
            </Box>

            <Divider color={isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'} my={4} />

            {/* 7. Qualification Status */}
            <Box>
              <Text fw={600} size="13px" style={{ color: labelColor }}>
                Qualification Status
              </Text>
              <Text size="11px" c="dimmed" mb={6}>
                Qualified / Unqualified / Pending
              </Text>
              <SegmentedControl
                value={qualificationStatus}
                onChange={(val) => setQualificationStatus(val as QualificationStatus)}
                data={[
                  { label: '⏳ Pending', value: 'Pending' },
                  { label: '✅ Qualified', value: 'Qualified' },
                  { label: '❌ Unqualified', value: 'Unqualified' },
                ]}
                fullWidth
                radius="md"
                size="sm"
                color={
                  qualificationStatus === 'Qualified'
                    ? 'teal'
                    : qualificationStatus === 'Unqualified'
                    ? 'red'
                    : 'yellow'
                }
                styles={{
                  root: {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  },
                }}
              />
            </Box>

            {/* GST Number & PAN Number (Optional) */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Box>
                <Text fw={600} size="13px" style={{ color: labelColor }}>
                  GST Number (Optional)
                </Text>
                <Text size="11px" c="dimmed" mb={4}>
                  e.g. 33AAAAA0000A1Z5
                </Text>
                <TextInput
                  placeholder="Enter GST number..."
                  leftSection={<IconReceiptTax size={16} color="#7C3AED" stroke={1.8} />}
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.currentTarget.value.toUpperCase())}
                  radius="md"
                  styles={{
                    input: {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                      fontSize: 13,
                    },
                  }}
                />
              </Box>

              <Box>
                <Text fw={600} size="13px" style={{ color: labelColor }}>
                  PAN Number (Optional)
                </Text>
                <Text size="11px" c="dimmed" mb={4}>
                  e.g. AAAAA0000A
                </Text>
                <TextInput
                  placeholder="Enter PAN number..."
                  leftSection={<IconCreditCard size={16} color="#059669" stroke={1.8} />}
                  value={companyPan}
                  onChange={(e) => setCompanyPan(e.currentTarget.value.toUpperCase())}
                  radius="md"
                  styles={{
                    input: {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                      fontSize: 13,
                    },
                  }}
                />
              </Box>
            </SimpleGrid>

            {/* Address */}
            <Box>
              <Text fw={600} size="13px" style={{ color: labelColor }}>
                Address
              </Text>
              <Text size="11px" c="dimmed" mb={4}>
                Contact / Company office address
              </Text>
              <TextInput
                placeholder="Enter street, city, state, postal code..."
                value={address}
                onChange={(e) => setAddress(e.currentTarget.value)}
                radius="md"
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                    fontSize: 13,
                  },
                }}
              />
            </Box>

            {/* 8. Qualified By & 9. Qualification Date */}
            {/* Qualification Date */}
            <Box>
                <Text fw={600} size="13px" style={{ color: labelColor }}>
                  Qualification Date
                </Text>
                <Text size="11px" c="dimmed" mb={4}>
                  Eppo qualify pannanga?
                </Text>
                <MeetingDatePicker
                  value={qualificationDate}
                  placeholder="DD-MM-YYYY"
                  onChange={(val: string) => setQualificationDate(val)}
                  zIndex={3000}
                />
              </Box>

            {/* 10. Unqualified Reason (Shows when Unqualified) */}
            {qualificationStatus === 'Unqualified' && (
              <Box
                p="md"
                style={{
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
                  border: isDark ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #FECACA',
                  borderRadius: 10,
                }}
              >
                <Text fw={600} size="13px" style={{ color: '#EF4444' }}>
                  Unqualified Reason
                </Text>
                <Text size="11px" c="dimmed" mb={6}>
                  Budget illa, need illa, wrong contact, etc.
                </Text>
                <Select
                  placeholder="Select reason"
                  data={[
                    'Budget constraint / No budget',
                    'No immediate business need',
                    'Went with competitor',
                    'Wrong contact / Invalid number',
                    'Not reachable / Unresponsive',
                    'Other reason',
                  ]}
                  value={unqualifiedReason}
                  onChange={(val) => setUnqualifiedReason(val || '')}
                  mb="xs"
                  radius="md"
                  styles={{
                    input: {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                      fontSize: 13,
                    },
                  }}
                />
                <TextInput
                  placeholder="Additional details / explanation..."
                  value={unqualifiedReason}
                  onChange={(e) => setUnqualifiedReason(e.currentTarget.value)}
                  radius="md"
                  styles={{
                    input: {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                      fontSize: 13,
                    },
                  }}
                />
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Modal Action Buttons Footer */}
        <Group
          justify="flex-end"
          gap="sm"
          pt="md"
          style={{
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          }}
        >
          <Button variant="default" radius="md" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            radius="md"
            loading={saving}
            onClick={handleSaveQualification}
            leftSection={<IconCheck size={16} />}
            color="blue"
            style={{
              background:
                qualificationStatus === 'Unqualified'
                  ? '#EF4444'
                  : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              color: '#FFFFFF',
            }}
          >
            {qualificationStatus === 'Qualified' ? 'Qualify & Sync to Leads' : 'Save Qualification'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ContactQualificationDrawer;
