import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Box,
  ActionIcon,
  Tooltip,
  FileInput,
  Divider,
  Avatar,
  useComputedColorScheme,
  Modal,
  ThemeIcon,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconUserCheck,
  IconClock,
  IconCheck,
  IconRotateClockwise,
  IconPaperclip,
  IconDownload,
  IconBuilding,
  IconFolders,
  IconFileText,
  IconAlertTriangle,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import { SupportTicket } from '../../types/supportTicket';
import { useSupportTicket } from '../../context/SupportTicketContext';
import { TicketConversation } from './components/TicketConversation';
import { TicketInvestigation } from './components/TicketInvestigation';
import { TicketHistoryTimeline } from './components/TicketHistoryTimeline';
import { TicketAssignmentModal } from './components/TicketAssignmentModal';
import { TicketStatusModal } from './components/TicketStatusModal';
import { CreateTicketModal } from './CreateTicketModal';

interface TicketDetailsPageProps {
  ticketId: string;
  onBack: () => void;
  onNavigateToCustomer?: (customerId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}

export const TicketDetailsPage: React.FC<TicketDetailsPageProps> = ({
  ticketId,
  onBack,
  onNavigateToCustomer,
  onNavigateToProject,
}) => {
  const { fetchTicketById, selectedTicket, uploadAttachments, deleteTicket } = useSupportTicket();
  const computedColorScheme = useComputedColorScheme('light');
  const isDark = computedColorScheme === 'dark';

  const [loading, setLoading] = useState<boolean>(true);
  const [editModalOpened, setEditModalOpened] = useState<boolean>(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [assignModalOpened, setAssignModalOpened] = useState<boolean>(false);
  const [statusModalOpened, setStatusModalOpened] = useState<boolean>(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTicketById(ticketId)
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [ticketId]);

  const ticket = selectedTicket;

  const handleUploadFiles = async (files: File[]) => {
    if (!files || files.length === 0 || !ticket) return;
    setUploading(true);
    try {
      await uploadAttachments(ticket.id, files);
      setUploadFiles([]);
    } finally {
      setUploading(false);
    }
  };

  if (loading || !ticket) {
    return (
      <Container size="xl" py="lg">
        <Paper p="xl" radius="md" withBorder>
          <Text c="dimmed">Loading ticket details...</Text>
        </Paper>
      </Container>
    );
  }

  const isOverdue = ticket.isOverdue;

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        {/* Top Navigation & Action Bar */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="sm">
              <Tooltip label="Back to ticket list">
                <ActionIcon variant="subtle" size="lg" onClick={onBack}>
                  <IconArrowLeft size={20} />
                </ActionIcon>
              </Tooltip>

              <Box>
                <Group gap="xs" align="center">
                  <Badge color="blue" size="md" variant="filled" style={{ fontFamily: 'monospace' }}>
                    {ticket.ticketNumber}
                  </Badge>
                  <Badge
                    color={
                      ticket.priority === 'Critical'
                        ? 'red'
                        : ticket.priority === 'High'
                        ? 'orange'
                        : ticket.priority === 'Medium'
                        ? 'blue'
                        : 'gray'
                    }
                    size="sm"
                    variant="light"
                  >
                    {ticket.priority} Priority
                  </Badge>
                  <Badge color="cyan" variant="dot" size="sm">
                    {ticket.issueType}
                  </Badge>
                  <Badge color="indigo" variant="light" size="sm">
                    {ticket.status}
                  </Badge>
                  {isOverdue && (
                    <Badge color="red" variant="filled" size="sm" leftSection={<IconAlertTriangle size={12} />}>
                      SLA Overdue
                    </Badge>
                  )}
                </Group>
                <Text fw={700} size="lg" mt={4}>
                  {ticket.subject}
                </Text>
              </Box>
            </Group>

            <Group gap="xs">
              <Button
                variant="light"
                color="indigo"
                size="sm"
                leftSection={<IconEdit size={16} />}
                onClick={() => setEditModalOpened(true)}
              >
                Edit Ticket
              </Button>
              <Button
                variant="light"
                color="blue"
                size="sm"
                leftSection={<IconUserCheck size={16} />}
                onClick={() => setAssignModalOpened(true)}
              >
                Assign / Reassign
              </Button>
              <Button
                variant="light"
                color="blue"
                size="sm"
                leftSection={<IconClock size={16} />}
                onClick={() => setStatusModalOpened(true)}
              >
                Change Status
              </Button>
              {ticket.status === 'Resolved' && (
                <Button
                  color="grape"
                  size="sm"
                  leftSection={<IconRotateClockwise size={16} />}
                  onClick={() => setStatusModalOpened(true)}
                >
                  Reopen Ticket
                </Button>
              )}
              <Button
                variant="light"
                color="red"
                size="sm"
                leftSection={<IconTrash size={16} />}
                onClick={() => setDeleteModalOpened(true)}
              >
                Delete
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* 2-Column Responsive Workspace */}
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {/* LEFT 2/3 COLUMN */}
          <Box style={{ gridColumn: 'span 2' }}>
            <Stack gap="lg">
              {/* Ticket Overview & Description Card */}
              <Paper
                withBorder
                radius="md"
                p="md"
                style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
              >
                <Stack gap="md">
                  <Text fw={700} size="md">
                    Ticket Overview
                  </Text>

                  <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {ticket.description}
                  </Text>

                  <Divider />

                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Box>
                      <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                        Customer
                      </Text>
                      <Group gap={6} mt={2}>
                        <IconBuilding size={14} color="#3B82F6" />
                        <Text
                          size="xs"
                          fw={600}
                          style={{
                            cursor: ticket.customerId && onNavigateToCustomer ? 'pointer' : 'default',
                            color: ticket.customerId && onNavigateToCustomer ? '#2563EB' : undefined,
                          }}
                          onClick={() => {
                            if (ticket.customerId && onNavigateToCustomer) {
                              onNavigateToCustomer(ticket.customerId);
                            }
                          }}
                        >
                          {ticket.customerName || '—'}
                        </Text>
                      </Group>
                    </Box>

                    <Box>
                      <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                        Contact Person
                      </Text>
                      <Text size="xs" fw={500} mt={2}>
                        {ticket.contactName || '—'} {ticket.contactPhone ? `(${ticket.contactPhone})` : ''}
                      </Text>
                    </Box>

                    <Box>
                      <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                        Linked Project
                      </Text>
                      <Group gap={6} mt={2}>
                        <IconFolders size={14} color="#10B981" />
                        <Text
                          size="xs"
                          fw={600}
                          style={{
                            cursor: ticket.projectId && onNavigateToProject ? 'pointer' : 'default',
                            color: ticket.projectId && onNavigateToProject ? '#2563EB' : undefined,
                          }}
                          onClick={() => {
                            if (ticket.projectId && onNavigateToProject) {
                              onNavigateToProject(ticket.projectId);
                            }
                          }}
                        >
                          {ticket.projectName || '—'}
                        </Text>
                      </Group>
                    </Box>

                    <Box>
                      <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                        Handover ID
                      </Text>
                      <Text size="xs" fw={500} mt={2}>
                        {ticket.handoverId || '—'}
                      </Text>
                    </Box>

                    <Box>
                      <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                        Support Contract
                      </Text>
                      <Group gap={6} mt={2}>
                        <IconFileText size={14} color="#F59E0B" />
                        <Text size="xs" fw={500}>
                          {ticket.contractTitle || '—'}
                        </Text>
                      </Group>
                    </Box>

                    <Box>
                      <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                        Source & Affected Screen
                      </Text>
                      <Text size="xs" fw={500} mt={2}>
                        {ticket.source} {ticket.affectedModule ? `• ${ticket.affectedModule}` : ''}
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Stack>
              </Paper>

              {/* Technical Diagnostics & Investigation Details */}
              <TicketInvestigation ticket={ticket} />

              {/* Public Reply vs Internal Note Conversation Hub */}
              <TicketConversation ticketId={ticket.id} comments={ticket.comments || []} />
            </Stack>
          </Box>

          {/* RIGHT 1/3 COLUMN */}
          <Box>
            <Stack gap="lg">
              {/* Assignment Information Card */}
              <Paper
                withBorder
                radius="md"
                p="md"
                style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <Text fw={700} size="md">
                      Assignment Info
                    </Text>
                    <ActionIcon
                      variant="light"
                      color="blue"
                      size="sm"
                      onClick={() => setAssignModalOpened(true)}
                    >
                      <IconUserCheck size={16} />
                    </ActionIcon>
                  </Group>

                  <Box>
                    <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                      Responsible Team
                    </Text>
                    <Text size="xs" fw={600} mt={2}>
                      {ticket.assignedTeam || 'Unassigned Team'}
                    </Text>
                  </Box>

                  <Box>
                    <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                      Assigned Agent / Developer
                    </Text>
                    {ticket.assignedToName ? (
                      <Group gap={8} mt={4}>
                        <Avatar size={26} radius="xl" color="blue">
                          {ticket.assignedToName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Text size="xs" fw={700}>
                            {ticket.assignedToName}
                          </Text>
                          {ticket.assignedToEmail && (
                            <Text size="10px" c="dimmed">
                              {ticket.assignedToEmail}
                            </Text>
                          )}
                        </Box>
                      </Group>
                    ) : (
                      <Badge color="yellow" variant="light" size="xs" mt={2}>
                        Unassigned
                      </Badge>
                    )}
                  </Box>

                  <Box>
                    <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                      Team Lead
                    </Text>
                    <Text size="xs" fw={500} mt={2}>
                      {ticket.teamLeadName || 'Not Assigned'}
                    </Text>
                  </Box>

                  <Box>
                    <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                      QA Assigned To
                    </Text>
                    <Text size="xs" fw={500} mt={2}>
                      {ticket.qaAssignedToName || 'Not Assigned'}
                    </Text>
                  </Box>
                </Stack>
              </Paper>

              {/* SLA & Timeline Tracking Card */}
              <Paper
                withBorder
                radius="md"
                p="md"
                style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
              >
                <Stack gap="sm">
                  <Text fw={700} size="md">
                    SLA & Timeline
                  </Text>

                  <Box>
                    <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                      Reported Date & Reporter
                    </Text>
                    <Text size="xs" fw={500} mt={2}>
                      {new Date(ticket.reportedAt).toLocaleString('en-GB')}
                    </Text>
                    <Text size="10px" c="dimmed">
                      Reported by {ticket.reportedBy}
                    </Text>
                  </Box>

                  <Box>
                    <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                      First Response SLA
                    </Text>
                    <Text size="xs" fw={500} mt={2}>
                      {ticket.firstResponseAt
                        ? `Responded on ${new Date(ticket.firstResponseAt).toLocaleDateString('en-GB')}`
                        : ticket.firstResponseDueAt
                        ? `Target: ${new Date(ticket.firstResponseDueAt).toLocaleString('en-GB')}`
                        : '—'}
                    </Text>
                  </Box>

                  <Box>
                    <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                      Resolution Due Target
                    </Text>
                    <Text size="xs" fw={isOverdue ? 700 : 500} c={isOverdue ? 'red' : undefined} mt={2}>
                      {ticket.resolutionDueAt
                        ? new Date(ticket.resolutionDueAt).toLocaleString('en-GB')
                        : '—'}
                    </Text>
                  </Box>

                  {ticket.resolvedAt && (
                    <Box>
                      <Text size="11px" c="dimmed" fw={600} tt="uppercase">
                        Resolved Timestamp
                      </Text>
                      <Text size="xs" fw={600} c="teal" mt={2}>
                        {new Date(ticket.resolvedAt).toLocaleString('en-GB')}
                      </Text>
                    </Box>
                  )}
                </Stack>
              </Paper>

              {/* Attachments Card */}
              <Paper
                withBorder
                radius="md"
                p="md"
                style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="center">
                    <Text fw={700} size="md">
                      Attachments ({ticket.attachments?.length || 0})
                    </Text>
                    <IconPaperclip size={16} color="#64748B" />
                  </Group>

                  {/* Upload new attachment */}
                  <FileInput
                    placeholder="Attach file..."
                    size="xs"
                    leftSection={<IconPaperclip size={14} />}
                    multiple
                    value={uploadFiles}
                    onChange={(val) => {
                      if (val && val.length > 0) {
                        handleUploadFiles(val);
                      }
                    }}
                    disabled={uploading}
                  />

                  {ticket.attachments && ticket.attachments.length > 0 ? (
                    <Stack gap="xs" mt={4}>
                      {ticket.attachments.map((att) => (
                        <Paper
                          key={att.id}
                          p="xs"
                          radius="sm"
                          withBorder
                          style={{
                            background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#F8FAFC',
                          }}
                        >
                          <Group justify="space-between" align="center" wrap="nowrap">
                            <Box style={{ overflow: 'hidden' }}>
                              <Text size="xs" fw={600} truncate>
                                {att.fileName}
                              </Text>
                              <Text size="10px" c="dimmed">
                                {att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : ''} • By {att.uploadedBy}
                              </Text>
                            </Box>
                            <Tooltip label="Download file">
                              <ActionIcon
                                component="a"
                                href={`http://localhost:5000/${att.filePath}`}
                                target="_blank"
                                rel="noreferrer"
                                size="sm"
                                variant="light"
                                color="blue"
                              >
                                <IconDownload size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Text size="xs" c="dimmed">
                      No attachments uploaded.
                    </Text>
                  )}
                </Stack>
              </Paper>

              {/* Audit Timeline */}
              <TicketHistoryTimeline history={ticket.history || []} />
            </Stack>
          </Box>
        </SimpleGrid>
      </Stack>

      {/* Assignment Modal */}
      <TicketAssignmentModal
        opened={assignModalOpened}
        onClose={() => setAssignModalOpened(false)}
        ticket={ticket}
      />

      {/* Status Modal */}
      <TicketStatusModal
        opened={statusModalOpened}
        onClose={() => setStatusModalOpened(false)}
        ticket={ticket}
      />

      {/* Edit Ticket Modal */}
      <CreateTicketModal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        ticket={ticket}
        onSuccess={() => {
          setEditModalOpened(false);
          if (ticket?.id) {
            fetchTicketById(ticket.id);
          }
        }}
      />

      {/* Delete Ticket Confirmation Dialog */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => !deleteLoading && setDeleteModalOpened(false)}
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
          body: {
            padding: 24,
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
                Delete Support Ticket
              </Text>
              <Text size="sm" mt={4} style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Are you sure you want to delete this ticket? This action cannot be undone.
              </Text>
            </Box>
          </Group>

          <Paper
            p="sm"
            radius="md"
            style={{
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap">
              <Box style={{ minWidth: 0 }}>
                <Text fw={600} size="sm" truncate style={{ color: isDark ? '#F8FAFC' : '#1E293B' }}>
                  {ticket.subject}
                </Text>
                {ticket.customerName && (
                  <Text size="xs" truncate style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    {ticket.customerName}
                  </Text>
                )}
              </Box>
              <Badge
                variant="filled"
                color="blue"
                radius="sm"
                size="sm"
                style={{ fontWeight: 600, flexShrink: 0, fontFamily: 'monospace' }}
              >
                {ticket.ticketNumber}
              </Badge>
            </Group>
          </Paper>

          <Group justify="flex-end" gap="sm" mt="xs">
            <Button
              variant="default"
              radius="md"
              size="sm"
              onClick={() => setDeleteModalOpened(false)}
              disabled={deleteLoading}
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1',
                color: isDark ? '#CBD5E1' : '#475569',
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              radius="md"
              size="sm"
              loading={deleteLoading}
              onClick={async () => {
                setDeleteLoading(true);
                try {
                  await deleteTicket(ticket.id);
                  setDeleteModalOpened(false);
                  onBack();
                } catch {
                  // notification handled in context
                } finally {
                  setDeleteLoading(false);
                }
              }}
              leftSection={<IconTrash size={15} stroke={2} />}
              style={{
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                fontWeight: 600,
              }}
            >
              Confirm Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default TicketDetailsPage;

