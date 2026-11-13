import React from 'react';
import {
  Drawer,
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
  ActionIcon,
  useComputedColorScheme,
  CopyButton,
  Select,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconMail,
  IconPhone,
  IconBuildingSkyscraper,
  IconUser,
  IconCheck,
  IconCopy,
  IconCalendar,
  IconFileText,
  IconFolders,
  IconCash,
  IconIdBadge,
  IconTargetArrow,
} from '@tabler/icons-react';
import { Contact } from '../../../types/contact';
import { useContact } from '../../../context/ContactContext';
import { useCRM } from '../../../context/CRMContext';

interface ContactDrawerProps {
  contact: Contact | null;
  opened: boolean;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export const ContactDrawer: React.FC<ContactDrawerProps> = ({
  contact,
  opened,
  onClose,
  onEdit,
  onDelete,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { metadata, assignContact } = useContact();
  const { setActiveNav, currentUser } = useCRM();
  const roleUpper = (currentUser?.role || '').toUpperCase();
  const isAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN';

  if (!contact) return null;

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

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0';
  const labelColor = isDark ? '#94A3B8' : '#64748B';
  const valueColor = isDark ? '#F8FAFC' : '#0F172A';

  const assignedOwnerName =
    contact.assignedToName ||
    metadata?.employees?.find((e) => e.id === contact.assignedTo || e.empCode === contact.assignedTo)?.name ||
    'Unassigned';

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="560px"
      padding="xl"
      title={
        <Group gap="xs">
          <Badge variant="filled" color="blue" radius="sm" size="sm">
            Contact
          </Badge>
          <Text fw={700} size="sm" c="dimmed">
            {contact.contactId}
          </Text>
        </Group>
      }
      styles={{
        header: {
          background: isDark ? '#0B0F17' : '#FFFFFF',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
        },
        body: {
          background: isDark ? '#0B0F17' : '#F8FAFC',
          paddingTop: 20,
        },
      }}
    >
      <Stack gap="lg">
        {/* Profile Header Card */}
        <Paper p="lg" radius="16px" style={{ background: cardBg, border: cardBorder }}>
          <Group align="center" gap="md">
            <Avatar size={60} radius="14px" color="blue">
              {getInitials(contact.name)}
            </Avatar>
            <Box style={{ flex: 1 }}>
              <Text fw={800} size="xl" style={{ color: valueColor, lineHeight: 1.2 }}>
                {contact.name}
              </Text>
              <Text size="sm" fw={600} c="dimmed" mt={3}>
                {contact.companyName || 'Independent'}
                {contact.contactPerson ? ` • Contact: ${contact.contactPerson}` : ''}
              </Text>
            </Box>
          </Group>
        </Paper>

        {/* Action Buttons */}
        <Group grow gap="xs">
          <Button
            radius="md"
            variant="filled"
            color="indigo"
            leftSection={<IconFolders size={15} />}
            onClick={() => {
              onClose();
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
            radius="md"
            variant="filled"
            color="blue"
            leftSection={<IconTargetArrow size={15} />}
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              fontWeight: 600,
            }}
            onClick={() => {
              onClose();
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('crm_qualifying_contact', JSON.stringify(contact));
              }
              setActiveNav('contact-qualification');
            }}
          >
            Qualify
          </Button>
          <Button
            radius="md"
            variant="light"
            color="blue"
            leftSection={<IconEdit size={15} />}
            onClick={() => onEdit(contact)}
          >
            Edit
          </Button>
          <Button
            radius="md"
            variant="light"
            color="red"
            leftSection={<IconTrash size={15} />}
            onClick={() => onDelete(contact)}
          >
            Delete
          </Button>
        </Group>

        {/* Essential Contact Details Card */}
        <Paper p="lg" radius="16px" style={{ background: cardBg, border: cardBorder }}>
          <Group gap="xs" mb="md">
            <IconUser size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
            <Text fw={700} size="xs" tt="uppercase" style={{ color: isDark ? '#60A5FA' : '#2563EB', letterSpacing: '0.05em' }}>
              Essential Details
            </Text>
          </Group>

          <SimpleGrid cols={2} spacing="md">
            {/* Name */}
            <div>
              <Text size="11.5px" fw={600} style={{ color: labelColor }}>
                Name
              </Text>
              <Text size="sm" fw={700} style={{ color: valueColor }} mt={2}>
                {contact.name}
              </Text>
            </div>

            {/* Company */}
            <div>
              <Text size="11.5px" fw={600} style={{ color: labelColor }}>
                Company
              </Text>
              <Text size="sm" fw={700} style={{ color: valueColor }} mt={2}>
                {contact.companyName || '—'}
              </Text>
            </div>

            {/* Contact person */}
            <div>
              <Text size="11.5px" fw={600} style={{ color: labelColor }}>
                Contact person
              </Text>
              <Text size="sm" fw={600} style={{ color: valueColor }} mt={2}>
                {contact.contactPerson || '—'}
              </Text>
            </div>

            {/* Email */}
            <div>
              <Text size="11.5px" fw={600} style={{ color: labelColor }}>
                Email
              </Text>
              {contact.email ? (
                <Group gap={4} mt={2}>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#93C5FD' : '#2563EB' }}>
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
                <Text size="sm" c="dimmed" mt={2}>
                  —
                </Text>
              )}
            </div>

            {/* Phone number */}
            <div>
              <Text size="11.5px" fw={600} style={{ color: labelColor }}>
                Phone number
              </Text>
              <Text size="sm" fw={700} style={{ color: valueColor }} mt={2}>
                {contact.phone || '—'}
              </Text>
            </div>

            {/* Assigned owner */}
            <div>
              <Text size="11.5px" fw={600} style={{ color: labelColor }}>
                Assigned owner
              </Text>
              <Badge variant="light" color={assignedOwnerName === 'Unassigned' ? 'gray' : 'blue'} size="sm" mt={4}>
                {assignedOwnerName}
              </Badge>
            </div>

            {/* Estimated value (if present) */}
            {contact.estimatedValue && (
              <div>
                <Text size="11.5px" fw={600} style={{ color: labelColor }}>
                  Estimated value
                </Text>
                <Text size="sm" fw={700} style={{ color: valueColor }} mt={2}>
                  {!isNaN(Number(contact.estimatedValue))
                    ? `₹ ${Number(contact.estimatedValue).toLocaleString('en-IN')}`
                    : contact.estimatedValue}
                </Text>
              </div>
            )}

            {/* Expected close date (if present) */}
            {contact.expectedCloseDate && (
              <div>
                <Text size="11.5px" fw={600} style={{ color: labelColor }}>
                  Expected close date
                </Text>
                <Text size="sm" fw={600} style={{ color: valueColor }} mt={2}>
                  {contact.expectedCloseDate}
                </Text>
              </div>
            )}
          </SimpleGrid>
        </Paper>


        {/* Description Card */}
        <Paper p="lg" radius="16px" style={{ background: cardBg, border: cardBorder }}>
          <Group gap="xs" mb="xs">
            <IconFileText size={16} color={isDark ? '#A78BFA' : '#7C3AED'} />
            <Text fw={700} size="xs" tt="uppercase" style={{ color: isDark ? '#A78BFA' : '#7C3AED', letterSpacing: '0.05em' }}>
              Description
            </Text>
          </Group>

          <Text
            size="sm"
            style={{
              color: valueColor,
              whiteSpace: 'pre-wrap',
              background: isDark ? '#1F2937' : '#F8FAFC',
              padding: '12px 14px',
              borderRadius: 10,
              minHeight: 60,
              border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F1F5F9',
            }}
          >
            {contact.description || contact.notes || 'No description provided.'}
          </Text>
        </Paper>

        {/* Quick Assign & System Metadata */}
        <Paper p="lg" radius="16px" style={{ background: cardBg, border: cardBorder }}>
          <Group gap="xs" mb="sm">
            <IconIdBadge size={16} color={isDark ? '#818CF8' : '#4F46E5'} />
            <Text fw={700} size="xs" tt="uppercase" style={{ color: isDark ? '#818CF8' : '#4F46E5', letterSpacing: '0.05em' }}>
              Quick Assign & Status
            </Text>
          </Group>

          <Stack gap="sm">
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

            <Divider my={4} color={isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9'} />

            <Group justify="space-between">
              <Text size="11px" c="dimmed">
                Created: {formatDateTime(contact.createdAt)}
              </Text>
              <Text size="11px" c="dimmed">
                Updated: {formatDateTime(contact.updatedAt)}
              </Text>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Drawer>
  );
};

export default ContactDrawer;
