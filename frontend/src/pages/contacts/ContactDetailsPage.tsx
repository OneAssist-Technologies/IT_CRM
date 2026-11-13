import React, { useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Group,
  Text,
  Badge,
  Avatar,
  Button,
  SimpleGrid,
  Divider,
  ActionIcon,
  Breadcrumbs,
  Anchor,
  useComputedColorScheme,
  Grid,
  CopyButton,
  Tooltip,
  Select,
  Modal,
  ThemeIcon,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconMail,
  IconPhone,
  IconBuilding,
  IconUser,
  IconCalendar,
  IconTargetArrow,
  IconIdBadge,
  IconFolders,
  IconFileText,
  IconCheck,
  IconCopy,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { Contact } from '../../types/contact';
import { useCRM } from '../../context/CRMContext';
import { useContact } from '../../context/ContactContext';
import { ContactModal } from './components/ContactModal';

interface ContactDetailsPageProps {
  contact: Contact;
  onBack: () => void;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
}

export const ContactDetailsPage: React.FC<ContactDetailsPageProps> = ({
  contact: initialContact,
  onBack,
  onEdit,
  onDelete,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { setActiveNav, currentUser } = useCRM();
  const { contacts, updateContact, deleteContact, metadata, assignContact } = useContact();
  const roleUpper = (currentUser?.role || '').toUpperCase();
  const isAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN';

  // Find updated contact from context if available
  const contact = contacts.find((c) => c.id === initialContact.id) || initialContact;

  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const getInitials = (name?: string) => {
    if (!name) return 'CT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      if (onDelete) {
        onDelete(contact);
      } else {
        await deleteContact(contact.id);
        onBack();
      }
    } finally {
      setDeleteLoading(false);
      setDeleteModalOpened(false);
    }
  };

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0';
  const headingColor = isDark ? '#F8FAFC' : '#0F172A';
  const labelColor = isDark ? '#94A3B8' : '#64748B';
  const valueColor = isDark ? '#F8FAFC' : '#0F172A';

  const assignedOwnerName =
    contact.assignedToName ||
    metadata?.employees?.find((e) => e.id === contact.assignedTo || e.empCode === contact.assignedTo)?.name ||
    'Unassigned';

  return (
    <Box p={{ base: 'xs', sm: 'sm', md: 'md' }} style={{ width: '100%', maxWidth: '100%' }}>
      {/* Top Breadcrumb & Action Header */}
      <Group justify="space-between" align="center" mb="lg" wrap="wrap" gap="md">
        <div>
          <Breadcrumbs separator="→" mb={6}>
            <Anchor size="xs" c="dimmed" onClick={onBack} style={{ cursor: 'pointer', fontWeight: 600 }}>
              Contacts
            </Anchor>
            <Text size="xs" fw={700} style={{ color: isDark ? '#60A5FA' : '#2563EB' }}>
              {contact.contactId || 'Contact Profile'}
            </Text>
          </Breadcrumbs>
          <Group gap="sm" align="center">
            <ActionIcon
              variant="subtle"
              size="lg"
              radius="100px"
              onClick={onBack}
              style={{
                border: cardBorder,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              }}
            >
              <IconArrowLeft size={18} />
            </ActionIcon>
            <div>
              <Group gap="xs" align="center">
                <Text fw={800} size="24px" style={{ letterSpacing: '-0.02em', color: headingColor, lineHeight: 1.2 }}>
                  {contact.name}
                </Text>
                <Badge variant="light" color="blue" size="md">
                  {contact.contactId}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={2}>
                {contact.companyName || 'Independent'}
                {contact.contactPerson ? ` • Contact Person: ${contact.contactPerson}` : ''}
              </Text>
            </div>
          </Group>
        </div>

        {/* 4 Quick Action Buttons matching User Screenshot */}
        <Group gap="xs" wrap="wrap">
          <Button
            variant="filled"
            color="indigo"
            radius="md"
            leftSection={<IconFolders size={16} />}
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(
                  'crm_editing_project',
                  JSON.stringify({
                    contactId: contact.id,
                    clientName: contact.companyName || contact.name,
                    clientEmail: contact.email,
                    clientPhone: contact.phone,
                  })
                );
              }
              setActiveNav('add-project');
            }}
          >
            Create Project
          </Button>
          <Button
            variant="filled"
            color="blue"
            radius="md"
            leftSection={<IconTargetArrow size={16} />}
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              fontWeight: 600,
            }}
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('crm_qualifying_contact', JSON.stringify(contact));
              }
              setActiveNav('contact-qualification');
            }}
          >
            Qualify
          </Button>
          <Button
            variant="light"
            color="blue"
            radius="md"
            leftSection={<IconEdit size={16} />}
            onClick={() => {
              if (onEdit) {
                onEdit(contact);
              } else {
                setEditModalOpened(true);
              }
            }}
          >
            Edit
          </Button>
          <Button
            color="red"
            variant="light"
            radius="md"
            leftSection={<IconTrash size={16} />}
            onClick={() => setDeleteModalOpened(true)}
          >
            Delete
          </Button>
        </Group>
      </Group>

      {/* Main Grid Layout */}
      <Grid gutter="lg">
        {/* Left Column (4 cols on desktop): Profile Summary & Quick Assign */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="lg">
            {/* 1. Profile Avatar & Identity Card */}
            <Paper p="xl" radius="20px" style={{ background: cardBg, border: cardBorder }}>
              <Stack align="center" gap="xs" mb="md">
                <Avatar
                  size={84}
                  radius="20px"
                  color="blue"
                  style={{
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
                    border: `3px solid ${isDark ? '#1E293B' : '#EFF6FF'}`,
                    fontWeight: 800,
                    fontSize: 28,
                  }}
                >
                  {getInitials(contact.name)}
                </Avatar>

                <Text fw={800} size="xl" style={{ color: headingColor, textAlign: 'center', lineHeight: 1.2 }}>
                  {contact.name}
                </Text>

                <Text size="sm" c="dimmed" style={{ textAlign: 'center' }}>
                  {contact.companyName || 'Independent'}
                </Text>

                <Group gap="xs" mt={4}>
                  <Badge
                    size="sm"
                    variant="light"
                    color={
                      contact.qualificationStatus === 'Qualified'
                        ? 'teal'
                        : contact.qualificationStatus === 'Unqualified'
                        ? 'red'
                        : 'orange'
                    }
                  >
                    {contact.qualificationStatus || 'Pending'}
                  </Badge>
                  <Badge size="sm" variant="outline" color="blue">
                    {contact.priority || 'Medium'} Priority
                  </Badge>
                </Group>
              </Stack>

              <Divider color={isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'} my="md" />

              {/* Quick Details List */}
              <Stack gap="xs">
                {contact.phone && (
                  <Group justify="space-between" align="center">
                    <Text size="xs" fw={600} style={{ color: labelColor }}>
                      Phone
                    </Text>
                    <Group gap={4}>
                      <IconPhone size={13} color="#10B981" />
                      <Text size="xs" fw={600} style={{ color: headingColor }}>
                        {contact.phone}
                      </Text>
                    </Group>
                  </Group>
                )}

                {contact.email && (
                  <Group justify="space-between" align="center">
                    <Text size="xs" fw={600} style={{ color: labelColor }}>
                      Email
                    </Text>
                    <Group gap={4}>
                      <Text size="xs" fw={600} style={{ color: '#2563EB' }}>
                        {contact.email}
                      </Text>
                      <CopyButton value={contact.email} timeout={2000}>
                        {({ copied, copy }) => (
                          <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                            {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
                          </ActionIcon>
                        )}
                      </CopyButton>
                    </Group>
                  </Group>
                )}

                {contact.estimatedValue && (
                  <Group justify="space-between" align="center">
                    <Text size="xs" fw={600} style={{ color: labelColor }}>
                      Est. Value
                    </Text>
                    <Text size="xs" fw={700} style={{ color: headingColor }}>
                      {contact.estimatedValue.startsWith('₹') ? contact.estimatedValue : `₹ ${contact.estimatedValue}`}
                    </Text>
                  </Group>
                )}

                {contact.expectedCloseDate && (
                  <Group justify="space-between" align="center">
                    <Text size="xs" fw={600} style={{ color: labelColor }}>
                      Close Date
                    </Text>
                    <Text size="xs" fw={600} style={{ color: headingColor }}>
                      {contact.expectedCloseDate}
                    </Text>
                  </Group>
                )}
              </Stack>

              <Divider color={isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'} my="md" />

              {/* Quick Assign Owner (Admin Only) or Static Owner Name */}
              {isAdmin ? (
                <Box>
                  <Text size="11.5px" fw={600} style={{ color: labelColor }} mb={4}>
                    Change Assigned Owner
                  </Text>
                  <Select
                    placeholder="Assign owner"
                    data={(() => {
                      const list = [
                        { value: 'none', label: '— Unassigned —' },
                        ...(metadata?.employees?.map((emp) => ({ value: emp.id, label: `${emp.name} (${emp.empCode})` })) || []),
                      ];
                      const seen = new Set<string>();
                      return list.filter((opt) => {
                        if (!opt.value || seen.has(opt.value)) return false;
                        seen.add(opt.value);
                        return true;
                      });
                    })()}
                    value={contact.assignedTo || 'none'}
                    onChange={async (val) => {
                      await assignContact(contact.id, val === 'none' ? null : val);
                    }}
                    radius="md"
                    size="sm"
                  />
                </Box>
              ) : (
                <Box>
                  <Text size="11.5px" fw={600} style={{ color: labelColor }} mb={4}>
                    Assigned Owner
                  </Text>
                  <Text size="13px" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                    {contact.assignedToName || 'Unassigned'}
                  </Text>
                </Box>
              )}

              <Divider color={isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'} my="md" />

              <Stack gap={3}>
                <Text size="11px" c="dimmed">
                  Created: {formatDateTime(contact.createdAt)}
                </Text>
                <Text size="11px" c="dimmed">
                  Updated: {formatDateTime(contact.updatedAt)}
                </Text>
              </Stack>
            </Paper>

            {/* 2. Description Card */}
            <Paper p="xl" radius="20px" style={{ background: cardBg, border: cardBorder }}>
              <Group gap="xs" mb="xs">
                <IconFileText size={16} color={isDark ? '#A78BFA' : '#7C3AED'} />
                <Text fw={700} size="xs" tt="uppercase" style={{ color: isDark ? '#A78BFA' : '#7C3AED', letterSpacing: '0.05em' }}>
                  Description / Notes
                </Text>
              </Group>
              <Text
                size="sm"
                style={{
                  color: valueColor,
                  whiteSpace: 'pre-wrap',
                  background: isDark ? '#1F2937' : '#F8FAFC',
                  padding: '12px 14px',
                  borderRadius: 12,
                  minHeight: 80,
                  border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F1F5F9',
                  lineHeight: 1.5,
                }}
              >
                {contact.description || contact.notes || 'No notes or description provided.'}
              </Text>
            </Paper>
          </Stack>
        </Grid.Col>

        {/* Right Column (8 cols on desktop): Essential Details, Dark Status Card & Qualification Checks */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="lg">
            {/* 1. Essential Details Card (Matching 9 Fields) */}
            <Paper p="xl" radius="20px" style={{ background: cardBg, border: cardBorder }}>
              <Group justify="space-between" align="center" mb="md">
                <Group gap="xs">
                  <IconUser size={18} color={isDark ? '#60A5FA' : '#2563EB'} />
                  <Text fw={800} size="md" style={{ color: headingColor, letterSpacing: '-0.01em' }}>
                    Essential Contact Details
                  </Text>
                </Group>
                <Button
                  size="xs"
                  variant="subtle"
                  color="blue"
                  leftSection={<IconEdit size={14} />}
                  onClick={() => setEditModalOpened(true)}
                >
                  Edit Details
                </Button>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                {/* Name */}
                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    Name
                  </Text>
                  <Text size="sm" fw={700} style={{ color: valueColor }} mt={3}>
                    {contact.name}
                  </Text>
                </div>

                {/* Company Name */}
                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    Company
                  </Text>
                  <Text size="sm" fw={700} style={{ color: valueColor }} mt={3}>
                    {contact.companyName || '—'}
                  </Text>
                </div>

                {/* Contact Person */}
                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    Contact Person
                  </Text>
                  <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                    {contact.contactPerson || '—'}
                  </Text>
                </div>

                {/* Email */}
                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    Email Address
                  </Text>
                  {contact.email ? (
                    <Group gap="xs" mt={3}>
                      <Text size="sm" fw={600} style={{ color: '#2563EB' }}>
                        {contact.email}
                      </Text>
                      <CopyButton value={contact.email} timeout={2000}>
                        {({ copied, copy }) => (
                          <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                          </ActionIcon>
                        )}
                      </CopyButton>
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed" mt={3}>
                      —
                    </Text>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    Phone Number
                  </Text>
                  <Text size="sm" fw={700} style={{ color: valueColor }} mt={3}>
                    {contact.phone || '—'}
                  </Text>
                </div>

                {/* Assigned Owner */}
                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    Assigned Owner
                  </Text>
                  <Box mt={3}>
                    <Badge variant="light" color={assignedOwnerName === 'Unassigned' ? 'gray' : 'blue'} size="md">
                      👤 {assignedOwnerName}
                    </Badge>
                  </Box>
                </div>

                {/* Estimated Value (if present) */}
                {contact.estimatedValue && (
                  <div>
                    <Text size="12px" fw={600} style={{ color: labelColor }}>
                      Estimated Value
                    </Text>
                    <Text size="sm" fw={700} style={{ color: valueColor }} mt={3}>
                      {!isNaN(Number(contact.estimatedValue))
                        ? `₹ ${Number(contact.estimatedValue).toLocaleString('en-IN')}`
                        : contact.estimatedValue}
                    </Text>
                  </div>
                )}

                {/* Expected Close Date (if present) */}
                {contact.expectedCloseDate && (
                  <div>
                    <Text size="12px" fw={600} style={{ color: labelColor }}>
                      Expected Close Date
                    </Text>
                    <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                      {contact.expectedCloseDate}
                    </Text>
                  </div>
                )}
              </SimpleGrid>
            </Paper>


            {/* 3. Detailed Qualification Assessment (The 10 Checks) */}
            <Paper p="xl" radius="20px" style={{ background: cardBg, border: cardBorder }}>
              <Group justify="space-between" align="center" mb="md">
                <Group gap="xs">
                  <IconTargetArrow size={18} color="#10B981" />
                  <Text fw={800} size="md" style={{ color: headingColor }}>
                    Qualification Assessment Details
                  </Text>
                </Group>
                <Badge
                  size="md"
                  variant="light"
                  color={
                    contact.qualificationStatus === 'Qualified'
                      ? 'teal'
                      : contact.qualificationStatus === 'Unqualified'
                      ? 'red'
                      : 'orange'
                  }
                >
                  {contact.qualificationStatus || 'Pending'}
                </Badge>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    1. Business Need
                  </Text>
                  <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                    {contact.businessNeed || '—'}
                  </Text>
                </div>

                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    2. Budget Range
                  </Text>
                  <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                    {contact.budgetRange || '—'}
                  </Text>
                </div>

                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    3. Decision Maker
                  </Text>
                  <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                    {contact.decisionMaker || '—'}
                  </Text>
                </div>

                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    4. Purchase Timeline
                  </Text>
                  <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                    {contact.purchaseTimeline || '—'}
                  </Text>
                </div>

                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    5. Interested Service
                  </Text>
                  <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                    {contact.interestedService || '—'}
                  </Text>
                </div>

                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    6. Priority
                  </Text>
                  <Box mt={3}>
                    <Badge size="sm" variant="light" color={contact.priority === 'High' ? 'red' : contact.priority === 'Medium' ? 'orange' : 'teal'}>
                      {contact.priority || 'Medium'}
                    </Badge>
                  </Box>
                </div>

                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    7. Qualified By
                  </Text>
                  <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                    {contact.qualifiedBy || '—'}
                  </Text>
                </div>

                <div>
                  <Text size="12px" fw={600} style={{ color: labelColor }}>
                    8. Qualification Date
                  </Text>
                  <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                    {contact.qualificationDate || '—'}
                  </Text>
                </div>

                {contact.address && (
                  <div>
                    <Text size="12px" fw={600} style={{ color: labelColor }}>
                      9. Address
                    </Text>
                    <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                      {contact.address}
                    </Text>
                  </div>
                )}

                {contact.gstNumber && (
                  <div>
                    <Text size="12px" fw={600} style={{ color: labelColor }}>
                      10. GST Number
                    </Text>
                    <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                      {contact.gstNumber}
                    </Text>
                  </div>
                )}

                {contact.companyPan && (
                  <div>
                    <Text size="12px" fw={600} style={{ color: labelColor }}>
                      11. PAN Number
                    </Text>
                    <Text size="sm" fw={600} style={{ color: valueColor }} mt={3}>
                      {contact.companyPan}
                    </Text>
                  </div>
                )}
              </SimpleGrid>

              {contact.unqualifiedReason && (
                <Box mt="md" p="md" style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', borderRadius: 12 }}>
                  <Text size="xs" fw={700} c="red">
                    Unqualified Reason:
                  </Text>
                  <Text size="sm" c="red" mt={2}>
                    {contact.unqualifiedReason}
                  </Text>
                </Box>
              )}
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Edit Contact Modal */}
      <ContactModal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        contact={contact}
      />

      {/* Modern Delete Confirmation Dialog */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        centered
        radius="lg"
        padding="lg"
        withCloseButton={false}
        styles={{
          content: {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
            boxShadow: isDark
              ? '0 20px 45px -10px rgba(0, 0, 0, 0.6)'
              : '0 20px 45px -10px rgba(0, 0, 0, 0.12)',
            borderRadius: 16,
          },
        }}
      >
        <Stack gap="md">
          <Group align="flex-start" wrap="nowrap" gap="md">
            <ThemeIcon
              size={44}
              radius="xl"
              style={{
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                color: '#EF4444',
                flexShrink: 0,
              }}
            >
              <IconAlertTriangle size={22} stroke={2} />
            </ThemeIcon>

            <Box style={{ flex: 1 }}>
              <Text fw={700} size="md" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.3 }}>
                Delete Contact
              </Text>
              <Text size="sm" mt={4} style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Are you sure you want to delete {contact.name}? This action cannot be undone.
              </Text>
            </Box>
          </Group>

          <Group justify="flex-end" gap="sm" mt="xs">
            <Button
              variant="default"
              radius="md"
              size="sm"
              onClick={() => setDeleteModalOpened(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              color="red"
              radius="md"
              size="sm"
              loading={deleteLoading}
              onClick={handleDeleteConfirm}
              leftSection={<IconTrash size={15} stroke={2} />}
            >
              Confirm Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default ContactDetailsPage;
