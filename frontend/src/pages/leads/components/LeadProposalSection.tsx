import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Text,
  Group,
  Stack,
  Button,
  Badge,
  Paper,
  Table,
  ActionIcon,
  Modal,
  Divider,
  SimpleGrid,
  ThemeIcon,
  Tooltip,
  TextInput,
  Textarea,
  Select,
  Menu,
} from '@mantine/core';
import {
  IconFileDescription,
  IconPlus,
  IconCheck,
  IconRefresh,
  IconSend,
  IconDownload,
  IconArrowRight,
  IconTrash,
  IconEdit,
  IconCalendar,
  IconEye,
  IconUser,
  IconBuilding,
  IconMail,
  IconPhone,
  IconMapPin,
  IconTarget,
  IconCalendarEvent,
  IconCurrencyRupee,
  IconPencil,
  IconReceipt,
  IconExternalLink,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Lead, LeadProposal } from '../../../types/lead';
import { ProposalModal } from './ProposalModal';
import { leadService } from '../../../services/leadService';

const PROPOSAL_STATUS_OPTIONS: Array<{
  value: LeadProposal['status'];
  label: string;
  color: string;
}> = [
  { value: 'Draft', label: 'Draft', color: 'gray' },
  { value: 'Sent', label: 'Sent', color: 'blue' },
  { value: 'Under Review', label: 'Under Review', color: 'yellow' },
  { value: 'Accepted', label: 'Accepted', color: 'teal' },
  { value: 'Rejected', label: 'Rejected', color: 'red' },
];

interface LeadProposalSectionProps {
  lead: Lead;
  isDark: boolean;
  proposals: LeadProposal[];
  onUpdateProposals: (proposals: LeadProposal[]) => void;
  onNavigateSection: (section: any) => void;
}

export const LeadProposalSection: React.FC<LeadProposalSectionProps> = ({
  lead,
  isDark,
  proposals,
  onUpdateProposals,
  onNavigateSection,
}) => {
  // Modal states
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<LeadProposal | null>(null);
  const [selectedEditProposal, setSelectedEditProposal] = useState<LeadProposal | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [rejectionModalOpened, setRejectionModalOpened] = useState(false);
  const [rejectionTargetId, setRejectionTargetId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; size?: string } | null>(null);

  const getSafeBlobUrl = (dataUrlOrUrl: string): string => {
    if (!dataUrlOrUrl || !dataUrlOrUrl.startsWith('data:')) return dataUrlOrUrl;
    try {
      const arr = dataUrlOrUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      return URL.createObjectURL(blob);
    } catch (err) {
      return dataUrlOrUrl;
    }
  };

  const isImageFile = (name: string, url: string) => {
    const n = (name || '').toLowerCase();
    return (
      n.endsWith('.png') ||
      n.endsWith('.jpg') ||
      n.endsWith('.jpeg') ||
      n.endsWith('.webp') ||
      n.endsWith('.gif') ||
      n.endsWith('.svg') ||
      url.startsWith('data:image/')
    );
  };

  const isPdfFile = (name: string, url: string) => {
    const n = (name || '').toLowerCase();
    return n.endsWith('.pdf') || url.startsWith('data:application/pdf');
  };

  const isTextFile = (name: string, url: string) => {
    const n = (name || '').toLowerCase();
    return (
      n.endsWith('.txt') ||
      n.endsWith('.csv') ||
      n.endsWith('.json') ||
      url.startsWith('data:text/')
    );
  };

  const onUpdateProposalsRef = useRef(onUpdateProposals);
  useEffect(() => {
    onUpdateProposalsRef.current = onUpdateProposals;
  }, [onUpdateProposals]);

  // Load proposals from database if available
  const fetchProposalsFromDb = useCallback(async () => {
    if (!lead?.id) return;
    try {
      const dbProposals = await leadService.getProposals({ leadId: lead.id });
      if (dbProposals && Array.isArray(dbProposals)) {
        onUpdateProposalsRef.current(dbProposals);
      }
    } catch (_) {}
  }, [lead?.id]);

  useEffect(() => {
    fetchProposalsFromDb();
  }, [fetchProposalsFromDb]);

  const handleOpenCreate = () => {
    setSelectedEditProposal(null);
    setModalOpened(true);
  };

  const handleOpenEdit = (prop: LeadProposal) => {
    setSelectedEditProposal(prop);
    setModalOpened(true);
  };

  const handleSaveProposal = (newOrUpdated: LeadProposal) => {
    if (selectedEditProposal) {
      const updated = proposals.map((p) =>
        p.id === selectedEditProposal.id ? { ...newOrUpdated, id: selectedEditProposal.id } : p
      );
      onUpdateProposals(updated);
      notifications.show({
        title: 'Proposal Updated',
        message: `${newOrUpdated.proposalNumber} has been updated.`,
        color: 'teal',
      });
    } else {
      onUpdateProposals([newOrUpdated, ...proposals]);
      notifications.show({
        title: 'Proposal Created & Saved',
        message: `${newOrUpdated.proposalNumber} has been recorded for ${lead.name}.`,
        color: 'teal',
      });
    }
    setModalOpened(false);
    setSelectedEditProposal(null);

    // Promptly sync state with backend database
    setTimeout(() => {
      fetchProposalsFromDb();
    }, 150);
  };

  const handleStatusChange = (propId: string, status: LeadProposal['status'], reason?: string) => {
    const targetProp = proposals.find((p) => p.id === propId);
    const finalReason = status === 'Rejected' ? (reason || targetProp?.rejectionReason || '') : targetProp?.rejectionReason;
    const updated = proposals.map((p) =>
      p.id === propId ? { ...p, status, rejectionReason: finalReason } : p
    );
    onUpdateProposals(updated);
    if (selectedProposal && selectedProposal.id === propId) {
      setSelectedProposal({ ...selectedProposal, status, rejectionReason: finalReason });
    }
    const idToUpdate = !propId.startsWith('prop-') ? propId : (targetProp?.proposalNumber || propId);
    if (idToUpdate) {
      const payload: any = { status };
      if (status === 'Rejected' && finalReason) {
        payload.rejectionReason = finalReason;
      }
      leadService.updateProposal(idToUpdate, payload).catch(() => {});
    }
    notifications.show({
      title: 'Proposal Status Updated',
      message: `Proposal marked as ${status}.`,
      color: status === 'Accepted' ? 'teal' : status === 'Rejected' ? 'red' : 'blue',
    });
  };

  const handleSelectStatus = (propId: string, status: LeadProposal['status']) => {
    if (status === 'Rejected') {
      const target = proposals.find((p) => p.id === propId);
      setRejectionTargetId(propId);
      setRejectionReasonText(target?.rejectionReason || '');
      setRejectionModalOpened(true);
      return;
    }
    handleStatusChange(propId, status);
  };

  const handleDeleteProposal = (propId: string) => {
    const updated = proposals.filter((p) => p.id !== propId);
    onUpdateProposals(updated);
    if (selectedProposal && selectedProposal.id === propId) {
      setSelectedProposal(null);
    }
    if (!propId.startsWith('prop-')) {
      leadService.deleteProposal(propId).catch(() => {});
    }
    notifications.show({
      title: 'Proposal Deleted',
      message: 'Proposal was removed.',
      color: 'gray',
    });
  };

  const handleDownloadPdf = (prop: LeadProposal) => {
    if (prop.documentUrl) {
      const link = document.createElement('a');
      link.href = prop.documentUrl;
      link.download = prop.documentName || `${prop.proposalNumber}-proposal`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notifications.show({
        title: 'Downloading Proposal Document',
        message: `Downloading ${prop.documentName || prop.proposalNumber}...`,
        color: 'indigo',
      });
      return;
    }

    notifications.show({
      title: 'Generating PDF',
      message: `Downloading proposal ${prop.proposalNumber} for ${lead.companyName || lead.name}...`,
      color: 'indigo',
    });
  };

  // Status Badge matching Meetings & Contacts styling
  const renderStatusBadge = (statusVal?: string | null) => {
    const st = (statusVal || 'Draft').trim();
    const sLow = st.toLowerCase();
    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#1D4ED8';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    if (sLow.includes('accept') || sLow.includes('won')) {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
      color = isDark ? '#6EE7B7' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
    } else if (sLow.includes('review') || sLow.includes('negotiat') || sLow.includes('hold')) {
      bg = isDark ? 'rgba(245, 158, 11, 0.14)' : '#FFFBEB';
      color = isDark ? '#FCD34D' : '#B45309';
      border = isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A';
    } else if (sLow.includes('sent')) {
      bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
      color = isDark ? '#93C5FD' : '#1D4ED8';
      border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';
    } else if (sLow.includes('reject') || sLow.includes('decline') || sLow.includes('lost')) {
      bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
      color = isDark ? '#FCA5A5' : '#B91C1C';
      border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
    } else {
      bg = isDark ? 'rgba(148, 163, 184, 0.15)' : '#F1F5F9';
      color = isDark ? '#CBD5E1' : '#475569';
      border = isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0';
    }

    return (
      <Badge
        size="sm"
        radius="sm"
        style={{
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          fontWeight: 700,
          textTransform: 'capitalize',
          fontSize: '11px',
          padding: '2px 8px',
        }}
      >
        {st}
      </Badge>
    );
  };

  return (
    <Box>
      {/* Top Section Summary & Actions */}
      <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md">
        <div>
          <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
            Proposals
          </Text>
          <Text size="xs" c="dimmed">
            Manage commercial proposals and pricing terms with {lead.name}.
          </Text>
        </div>

        <Group gap="sm">
          <Button
            size="sm"
            leftSection={<IconPlus size={14} />}
            onClick={handleOpenCreate}
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
              color: '#FFF',
              borderRadius: 10,
              fontWeight: 700,
            }}
          >
            Create Proposal
          </Button>

          <Button
            size="sm"
            variant="light"
            color="blue"
            rightSection={<IconArrowRight size={14} />}
            onClick={() => onNavigateSection('quotations')}
            style={{ borderRadius: 10, fontWeight: 700 }}
          >
            Proceed to Quotations
          </Button>
        </Group>
      </Group>

      {/* Main Table Content matching Meetings Table Design */}
      {proposals.length === 0 ? (
        <Paper
          radius="lg"
          p="3rem"
          style={{
            background: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          <ThemeIcon size={56} radius="xl" color="indigo" variant="light" mb="md" style={{ margin: '0 auto' }}>
            <IconFileDescription size={28} />
          </ThemeIcon>
          <Text fw={700} size="16px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
            No Proposals Found
          </Text>
          <Text size="sm" c="dimmed" mt={4} mb="lg">
            No commercial proposals have been created for {lead.name} yet.
          </Text>
          <Button
            size="sm"
            leftSection={<IconPlus size={15} />}
            onClick={handleOpenCreate}
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
              color: '#FFF',
              borderRadius: 10,
              fontWeight: 700,
            }}
          >
            Create First Proposal
          </Button>
        </Paper>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <Paper
            visibleFrom="sm"
            radius="lg"
            style={{
              background: isDark ? '#111827' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
              marginTop: 16,
            }}
          >
            <Table.ScrollContainer minWidth={850}>
              <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
                <Table.Thead
                  style={{
                    background: isDark ? '#0F172A' : '#FBFBFC',
                    borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
                  }}
                >
                  <Table.Tr>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                      PROPOSAL / TITLE
                    </Table.Th>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                      DATE & VALIDITY
                    </Table.Th>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                      VALUE / PRICING
                    </Table.Th>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                      STATUS
                    </Table.Th>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                      ACTIONS
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {proposals.map((prop) => (
                    <Table.Tr
                      key={prop.id}
                      style={{
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                      }}
                    >
                      {/* 1. PROPOSAL / TITLE */}
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Box
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: isDark ? 'rgba(79, 70, 229, 0.18)' : '#EEF2FF',
                              color: isDark ? '#A5B4FC' : '#4F46E5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 14,
                              flexShrink: 0,
                              border: isDark ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid #E0E7FF',
                            }}
                          >
                            <IconFileDescription size={19} stroke={1.8} />
                          </Box>
                          <div>
                            <Text
                              size="sm"
                              fw={700}
                              style={{
                                color: isDark ? '#F8FAFC' : '#0F172A',
                                cursor: 'pointer',
                              }}
                              onClick={() => setSelectedProposal(prop)}
                            >
                              {prop.title || 'Solution Proposal'}
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>

                      {/* 2. DATE & VALIDITY */}
                      <Table.Td>
                        <Stack gap={2}>
                          <Group gap={6} align="center">
                            <IconCalendar size={13} style={{ color: isDark ? '#94A3B8' : '#64748B' }} />
                            <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                              {prop.issueDate}
                            </Text>
                          </Group>
                          <Text size="11px" c="dimmed">
                            Valid till: {prop.validUntil}
                          </Text>
                        </Stack>
                      </Table.Td>

                      {/* 3. VALUE / PRICING */}
                      <Table.Td>
                        <Stack gap={2}>
                          <Text size="sm" fw={800} style={{ color: isDark ? '#38BDF8' : '#2563EB' }}>
                            ₹{prop.totalAmount?.toLocaleString('en-IN') || '0'}
                          </Text>
                          <Text size="11px" c="dimmed">
                            Subtotal: ₹{prop.subtotal?.toLocaleString('en-IN') || '0'}
                            {prop.discountPercent > 0 ? ` • Disc ${prop.discountPercent}%` : ''}
                          </Text>
                        </Stack>
                      </Table.Td>

                      {/* 4. STATUS */}
                      <Table.Td>
                        <Stack gap={4} align="flex-start">
                          <Stack gap={2} align="flex-end">
                    {renderStatusBadge(prop.status)}
                    {(prop.status || '').toLowerCase() === 'rejected' && (
                      <Text
                        size="10px"
                        fw={500}
                        style={{ color: isDark ? '#FCA5A5' : '#DC2626', maxWidth: 140, textAlign: 'right' }}
                        title={prop.rejectionReason || 'No reason specified'}
                      >
                        {prop.rejectionReason || '(No reason specified)'}
                      </Text>
                    )}
                  </Stack>
                          {(prop.status || '').toLowerCase() === 'rejected' && (
                            <Text
                              size="11px"
                              fw={500}
                              style={{
                                color: isDark ? '#FCA5A5' : '#DC2626',
                                maxWidth: 180,
                                wordBreak: 'break-word',
                                lineHeight: 1.3,
                              }}
                              title={prop.rejectionReason || 'No reason specified'}
                            >
                              {prop.rejectionReason ? prop.rejectionReason : '(No reason specified)'}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>

                      {/* 5. ACTIONS */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group justify="flex-end" gap={6} wrap="nowrap">
                          <Tooltip label="View Proposal Details" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              size="md"
                              radius="md"
                              onClick={() => setSelectedProposal(prop)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Download Proposal PDF" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="indigo"
                              size="md"
                              radius="md"
                              onClick={() => handleDownloadPdf(prop)}
                            >
                              <IconDownload size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Menu shadow="md" width={170} position="bottom-end" withinPortal radius="md">
                            <Menu.Target>
                              <Tooltip label="Update Status" withArrow>
                                <ActionIcon
                                  variant="subtle"
                                  color="teal"
                                  size="md"
                                  radius="md"
                                >
                                  <IconRefresh size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Label>Update Status</Menu.Label>
                              {PROPOSAL_STATUS_OPTIONS.map((opt) => {
                                const isSelected = prop.status === opt.value;
                                return (
                                  <Menu.Item
                                    key={opt.value}
                                    onClick={() => handleSelectStatus(prop.id, opt.value)}
                                    leftSection={
                                      <Box
                                        style={{
                                          width: 8,
                                          height: 8,
                                          borderRadius: '50%',
                                          backgroundColor:
                                            opt.color === 'teal'
                                              ? '#10B981'
                                              : opt.color === 'blue'
                                              ? '#3B82F6'
                                              : opt.color === 'yellow'
                                              ? '#F59E0B'
                                              : opt.color === 'red'
                                              ? '#EF4444'
                                              : '#94A3B8',
                                        }}
                                      />
                                    }
                                    rightSection={isSelected ? <IconCheck size={14} color="#10B981" /> : undefined}
                                    style={{
                                      fontWeight: isSelected ? 600 : 400,
                                      fontSize: 12,
                                    }}
                                  >
                                    {opt.label}
                                  </Menu.Item>
                                );
                              })}
                            </Menu.Dropdown>
                          </Menu>

                          <Tooltip label="Edit Proposal" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              size="md"
                              radius="md"
                              onClick={() => handleOpenEdit(prop)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Delete Proposal" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="md"
                              radius="md"
                              onClick={() => handleDeleteProposal(prop.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>

          {/* MOBILE CARDS VIEW */}
          <Stack gap="md" hiddenFrom="sm" mt="md">
            {proposals.map((prop) => (
              <Paper
                key={prop.id}
                p="md"
                radius="lg"
                style={{
                  background: isDark ? '#111827' : '#FFFFFF',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                  boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
                }}
              >
                <Group justify="space-between" align="flex-start" mb="xs">
                  <div>
                    <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      {prop.title || 'Solution Proposal'}
                    </Text>
                  </div>
                  <Stack gap={2} align="flex-end">
                    {renderStatusBadge(prop.status)}
                    {(prop.status || '').toLowerCase() === 'rejected' && (
                      <Text
                        size="10px"
                        fw={500}
                        style={{ color: isDark ? '#FCA5A5' : '#DC2626', maxWidth: 140, textAlign: 'right' }}
                        title={prop.rejectionReason || 'No reason specified'}
                      >
                        {prop.rejectionReason || '(No reason specified)'}
                      </Text>
                    )}
                  </Stack>
                </Group>

                <SimpleGrid cols={2} spacing="xs" my="xs">
                  <div>
                    <Text size="11px" c="dimmed">
                      Issue Date
                    </Text>
                    <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                      {prop.issueDate}
                    </Text>
                  </div>
                  <div>
                    <Text size="11px" c="dimmed">
                      Total Value
                    </Text>
                    <Text size="xs" fw={800} style={{ color: isDark ? '#38BDF8' : '#2563EB' }}>
                      ₹{prop.totalAmount?.toLocaleString('en-IN') || '0'}
                    </Text>
                  </div>
                </SimpleGrid>

                <Divider my="xs" />

                <Group justify="flex-end" gap={6}>
                  <Button
                    size="xs"
                    variant="light"
                    color="blue"
                    leftSection={<IconEye size={14} />}
                    onClick={() => setSelectedProposal(prop)}
                  >
                    View
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="indigo"
                    leftSection={<IconDownload size={14} />}
                    onClick={() => handleDownloadPdf(prop)}
                  >
                    PDF
                  </Button>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => handleDeleteProposal(prop.id)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {/* MODAL: VIEW PROPOSAL DETAILS (MATCHING MEETINGS DETAILS MODAL) */}
      <Modal
        opened={!!selectedProposal}
        onClose={() => setSelectedProposal(null)}
        size="860px"
        radius="lg"
        centered
        styles={{
          content: {
            maxHeight: '92vh',
          },
          body: {
            maxHeight: 'calc(92vh - 80px)',
            overflowY: 'auto',
            paddingBottom: 24,
          },
        }}
        title={
          <Group gap="xs" align="center">
            <ThemeIcon color="teal" variant="light" size="md" radius="md">
              <IconFileDescription size={18} />
            </ThemeIcon>
            <Text fw={700} size="md">
              Proposal Details: {selectedProposal?.proposalNumber}
            </Text>
          </Group>
        }
      >
        {selectedProposal && (
          <Stack gap="md" mt="xs">
            {/* SECTION 1: PROPOSAL DETAILS FORM FIELDS */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="Proposal Number"
                value={selectedProposal.proposalNumber}
                readOnly
                radius="md"
                leftSection={<IconFileDescription size={16} />}
              />
              <TextInput
                label="Proposal Title"
                value={selectedProposal.title}
                readOnly
                radius="md"
                leftSection={<IconTarget size={16} />}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="Client / Contact Name"
                value={lead.name}
                readOnly
                radius="md"
                leftSection={<IconUser size={16} />}
              />
              <TextInput
                label="Company Name"
                value={lead.companyName || lead.profession || 'N/A'}
                readOnly
                radius="md"
                leftSection={<IconBuilding size={16} />}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="Email Address"
                value={lead.email || 'N/A'}
                readOnly
                radius="md"
                leftSection={<IconMail size={16} />}
              />
              <TextInput
                label="Phone Number"
                value={lead.phone || 'N/A'}
                readOnly
                radius="md"
                leftSection={<IconPhone size={16} />}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="Proposed Value / Budget"
                value={`₹ ${(Number(selectedProposal.totalAmount) || 0).toLocaleString('en-IN')}`}
                readOnly
                radius="md"
                leftSection={<IconCurrencyRupee size={16} />}
              />
              <Box>
                <Group justify="space-between" align="center" mb={6}>
                  <Text fw={700} size="xs" style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                    Proposal Status
                  </Text>
                  {renderStatusBadge(selectedProposal.status)}
                </Group>
                <Select
                  value={selectedProposal.status}
                  onChange={(val) => val && handleSelectStatus(selectedProposal.id, val as any)}
                  data={[
                    { value: 'Draft', label: 'Draft' },
                    { value: 'Sent', label: 'Sent to Client' },
                    { value: 'Under Review', label: 'Under Review' },
                    { value: 'Accepted', label: 'Accepted' },
                    { value: 'Rejected', label: 'Rejected' },
                  ]}
                  radius="md"
                />
              </Box>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="Proposal Issue Date"
                value={selectedProposal.issueDate}
                readOnly
                radius="md"
                leftSection={<IconCalendarEvent size={16} />}
              />
              <TextInput
                label="Valid Until"
                value={selectedProposal.validUntil}
                readOnly
                radius="md"
                leftSection={<IconCalendarEvent size={16} />}
              />
            </SimpleGrid>

            {/* SECTION 2: PROPOSAL SCOPE / CLIENT REMARKS */}
            <Box>
              <Text fw={700} size="sm" mb={6} style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                Proposal Scope & Discussion Points
              </Text>
              <Textarea
                value={selectedProposal.notes || 'No specific remarks recorded for this proposal.'}
                readOnly
                minRows={2}
                maxRows={4}
                autosize
                radius="md"
                styles={{
                  input: {
                    borderRadius: 10,
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#D1D5DB',
                    fontSize: 13,
                  },
                }}
              />
            </Box>

            {/* SECTION 3: ATTACHED PROPOSAL DOCUMENT */}
            <Box>
              <Text fw={700} size="sm" mb={4} style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                Proposal Document / Attachment
              </Text>
              <Text size="xs" c="dimmed" mb={8}>
                Attached proposal specification and deliverables document.
              </Text>

              {selectedProposal.documentName ? (
                <Paper
                  p="sm"
                  radius="md"
                  style={{
                    background: isDark ? '#064E3B' : '#ECFDF5',
                    border: isDark ? '1px solid #059669' : '1px solid #A7F3D0',
                  }}
                >
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ overflow: 'hidden' }}>
                      <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                        <IconFileDescription size={20} />
                      </ThemeIcon>
                      <div style={{ overflow: 'hidden' }}>
                        <Text fw={600} size="sm" truncate style={{ color: isDark ? '#ECFDF5' : '#065F46' }}>
                          {selectedProposal.documentName}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {selectedProposal.documentSize || 'Proposal Document'} • Attached & Ready to view
                        </Text>
                      </div>
                    </Group>

                    <Group gap="xs" wrap="nowrap">
                      {selectedProposal.documentUrl && (
                        <Button
                          size="xs"
                          variant="filled"
                          color="teal"
                          radius="md"
                          leftSection={<IconEye size={14} />}
                          onClick={() => {
                            setPreviewFile({
                              name: selectedProposal.documentName || 'Proposal Document',
                              url: selectedProposal.documentUrl || '',
                              size: selectedProposal.documentSize || '',
                            });
                            setPreviewModalOpen(true);
                          }}
                        >
                          View Document
                        </Button>
                      )}

                      <Tooltip label="Open in New Tab" withArrow>
                        <ActionIcon
                          variant="light"
                          color="teal"
                          radius="md"
                          onClick={() => {
                            if (selectedProposal.documentUrl) {
                              const safeUrl = getSafeBlobUrl(selectedProposal.documentUrl);
                              window.open(safeUrl, '_blank');
                            }
                          }}
                        >
                          <IconExternalLink size={16} />
                        </ActionIcon>
                      </Tooltip>

                      <Tooltip label="Download File" withArrow>
                        <ActionIcon
                          variant="light"
                          color="teal"
                          radius="md"
                          onClick={() => handleDownloadPdf(selectedProposal)}
                        >
                          <IconDownload size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Paper>
              ) : (
                <Paper
                  p="md"
                  radius="md"
                  style={{
                    border: isDark ? '2px dashed #475569' : '2px dashed #CBD5E1',
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    textAlign: 'center',
                  }}
                >
                  <Text size="xs" c="dimmed">
                    No document was attached to this proposal.
                  </Text>
                </Paper>
              )}
            </Box>

            {/* SECTION 4: COMMERCIAL BREAKDOWN & TOTALS */}
            <Paper
              p="md"
              radius="md"
              style={{
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
              }}
            >
              <Group justify="space-between" align="center" wrap="wrap">
                <Group gap="xs">
                  <ThemeIcon color="teal" variant="light" size="md" radius="md">
                    <IconReceipt size={18} />
                  </ThemeIcon>
                  <div>
                    <Text fw={700} size="sm" style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                      Commercial Breakdown
                    </Text>
                    <Text size="xs" c="dimmed">
                      Subtotal, taxes, and final agreed proposal amount
                    </Text>
                  </div>
                </Group>

                <Group gap="xl" align="center">
                  <div>
                    <Text size="11px" c="dimmed">
                      Subtotal
                    </Text>
                    <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                      ₹{(Number(selectedProposal.subtotal) || 0).toLocaleString('en-IN')}
                    </Text>
                  </div>
                  {Number(selectedProposal.discountPercent) > 0 && (
                    <div>
                      <Text size="11px" c="dimmed">
                        Discount ({selectedProposal.discountPercent}%)
                      </Text>
                      <Text size="sm" fw={600} c="green">
                        -₹{Math.round(((Number(selectedProposal.subtotal) || 0) * (Number(selectedProposal.discountPercent) || 0)) / 100).toLocaleString('en-IN')}
                      </Text>
                    </div>
                  )}
                  <div>
                    <Text size="11px" c="dimmed">
                      GST / Taxes ({selectedProposal.taxPercent}%)
                    </Text>
                    <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                      +₹{Math.round((((Number(selectedProposal.subtotal) || 0) * (100 - (Number(selectedProposal.discountPercent) || 0))) / 100) * ((Number(selectedProposal.taxPercent) || 0) / 100)).toLocaleString('en-IN')}
                    </Text>
                  </div>
                  <Box
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                      border: isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #A7F3D0',
                    }}
                  >
                    <Text size="10px" fw={700} c="teal">
                      GRAND TOTAL
                    </Text>
                    <Text size="18px" fw={900} style={{ color: isDark ? '#6EE7B7' : '#059669' }}>
                      ₹{(Number(selectedProposal.totalAmount) || 0).toLocaleString('en-IN')}
                    </Text>
                  </Box>
                </Group>
              </Group>
            </Paper>

            {/* REJECTION REASON CARD */}
            {selectedProposal.status === 'Rejected' && (
              <Paper
                p="md"
                radius="md"
                style={{
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  border: isDark ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #FECACA',
                }}
              >
                <Group gap={6} mb={4}>
                  <ThemeIcon color="red" size="sm" variant="light" radius="xl">
                    <IconX size={12} />
                  </ThemeIcon>
                  <Text size="xs" fw={700} c="red">
                    Rejection Reason
                  </Text>
                </Group>
                <Text size="xs" style={{ color: isDark ? '#FCA5A5' : '#991B1B' }}>
                  {selectedProposal.rejectionReason || 'No specific reason provided.'}
                </Text>
              </Paper>
            )}

            {/* FOOTER ACTIONS */}
            <Group justify="space-between" mt="md">
              <Button
                variant="default"
                radius="md"
                leftSection={<IconDownload size={14} />}
                onClick={() => handleDownloadPdf(selectedProposal)}
              >
                Proposal PDF
              </Button>

              <Group gap="xs">
                <Button
                  variant="light"
                  color="indigo"
                  radius="md"
                  leftSection={<IconPencil size={14} />}
                  onClick={() => {
                    const toEdit = selectedProposal;
                    setSelectedProposal(null);
                    handleOpenEdit(toEdit);
                  }}
                >
                  Edit Proposal
                </Button>
                <Menu shadow="md" width={170} position="top-end" withinPortal radius="md">
                  <Menu.Target>
                    <Button
                      color="teal"
                      variant="light"
                      radius="md"
                      leftSection={<IconRefresh size={14} />}
                    >
                      Update Status
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Update Status</Menu.Label>
                    {PROPOSAL_STATUS_OPTIONS.map((opt) => {
                      const isSelected = selectedProposal.status === opt.value;
                      return (
                        <Menu.Item
                          key={opt.value}
                          onClick={() => handleSelectStatus(selectedProposal.id, opt.value)}
                          leftSection={
                            <Box
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor:
                                  opt.color === 'teal'
                                    ? '#10B981'
                                    : opt.color === 'blue'
                                    ? '#3B82F6'
                                    : opt.color === 'yellow'
                                    ? '#F59E0B'
                                    : opt.color === 'red'
                                    ? '#EF4444'
                                    : '#94A3B8',
                              }}
                            />
                          }
                          rightSection={isSelected ? <IconCheck size={14} color="#10B981" /> : undefined}
                          style={{
                            fontWeight: isSelected ? 600 : 400,
                            fontSize: 12,
                          }}
                        >
                          {opt.label}
                        </Menu.Item>
                      );
                    })}
                  </Menu.Dropdown>
                </Menu>
                {selectedProposal.status === 'Draft' && (
                  <Button
                    color="blue"
                    radius="md"
                    leftSection={<IconSend size={14} />}
                    onClick={() => handleStatusChange(selectedProposal.id, 'Sent')}
                  >
                    Send to Client
                  </Button>
                )}
                <Button variant="default" radius="md" onClick={() => setSelectedProposal(null)}>
                  Close
                </Button>
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* DOCUMENT PREVIEW MODAL (MATCHING MEETINGS DETAILS MODAL PREVIEW) */}
      <Modal
        opened={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setPreviewFile(null);
        }}
        size="95%"
        radius="lg"
        centered
        title={
          <Group justify="space-between" style={{ width: '100%', paddingRight: 32 }}>
            <Group gap="xs">
              <ThemeIcon color="teal" variant="light" size="md" radius="md">
                <IconFileDescription size={18} />
              </ThemeIcon>
              <div>
                <Text fw={700} size="sm" truncate style={{ maxWidth: 450 }}>
                  {previewFile?.name || 'Proposal Document Preview'}
                </Text>
                <Text size="xs" c="dimmed">
                  {previewFile?.size || 'Proposal Attachment'}
                </Text>
              </div>
            </Group>

            <Group gap="xs">
              {previewFile?.url && (
                <>
                  <Button
                    size="xs"
                    variant="light"
                    color="blue"
                    leftSection={<IconExternalLink size={14} />}
                    onClick={() => {
                      const safeUrl = getSafeBlobUrl(previewFile.url);
                      window.open(safeUrl, '_blank');
                    }}
                  >
                    Open in New Tab
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="teal"
                    component="a"
                    href={previewFile.url}
                    download={previewFile.name}
                    leftSection={<IconDownload size={14} />}
                  >
                    Download
                  </Button>
                </>
              )}
            </Group>
          </Group>
        }
        styles={{
          content: {
            maxHeight: '92vh',
          },
          body: {
            padding: 16,
            maxHeight: 'calc(92vh - 80px)',
            overflowY: 'auto',
          },
        }}
      >
        {previewFile?.url ? (
          isImageFile(previewFile.name, previewFile.url) ? (
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderRadius: 8,
                padding: 16,
                minHeight: '400px',
              }}
            >
              <img
                src={previewFile.url}
                alt={previewFile.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  borderRadius: 8,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  objectFit: 'contain',
                }}
              />
            </Box>
          ) : isPdfFile(previewFile.name, previewFile.url) || isTextFile(previewFile.name, previewFile.url) ? (
            <Box
              style={{
                width: '100%',
                height: '75vh',
                borderRadius: 8,
                overflow: 'hidden',
                border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
              }}
            >
              <iframe
                src={getSafeBlobUrl(previewFile.url)}
                title={previewFile.name}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            </Box>
          ) : (
            <Paper
              p="xl"
              radius="md"
              style={{
                textAlign: 'center',
                background: isDark ? '#1E293B' : '#F8FAFC',
                border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
              }}
            >
              <ThemeIcon size={56} radius="xl" color="blue" variant="light" mx="auto" mb="md">
                <IconFileDescription size={32} />
              </ThemeIcon>
              <Text fw={700} size="md">
                {previewFile.name}
              </Text>
              <Text size="sm" c="dimmed" mt={4} mb="lg">
                Direct in-browser preview is not supported for Word/Excel files. You can open in a new tab or download to view with your local application.
              </Text>
              <Group justify="center" gap="sm">
                <Button
                  component="a"
                  href={previewFile.url}
                  download={previewFile.name}
                  leftSection={<IconDownload size={16} />}
                  color="teal"
                  radius="md"
                >
                  Download Document
                </Button>
                <Button
                  variant="default"
                  leftSection={<IconExternalLink size={16} />}
                  onClick={() => {
                    const safeUrl = getSafeBlobUrl(previewFile.url);
                    window.open(safeUrl, '_blank');
                  }}
                  radius="md"
                >
                  Open in New Tab
                </Button>
              </Group>
            </Paper>
          )
        ) : null}
      </Modal>

      {/* SPECIFY REJECTION REASON MODAL */}
      <Modal
        opened={rejectionModalOpened}
        onClose={() => {
          setRejectionModalOpened(false);
          setRejectionTargetId(null);
          setRejectionReasonText('');
        }}
        title={
          <Group gap={8}>
            <ThemeIcon color="red" variant="light" size="md" radius="md">
              <IconX size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Specify Rejection Reason
            </Text>
          </Group>
        }
        centered
        radius="md"
      >
        <Stack gap="md">
          <Text size="xs" c="dimmed">
            Please provide the reason why this proposal was rejected by the client.
          </Text>
          <Textarea
            label="Rejection Reason"
            placeholder="e.g. Budget constraints, selected another vendor, project cancelled..."
            withAsterisk
            minRows={3}
            radius="md"
            value={rejectionReasonText}
            onChange={(e) => setRejectionReasonText(e.currentTarget.value)}
            required
            autoFocus
          />
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              size="xs"
              radius="md"
              onClick={() => {
                setRejectionModalOpened(false);
                setRejectionTargetId(null);
                setRejectionReasonText('');
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              size="xs"
              radius="md"
              disabled={!rejectionReasonText.trim()}
              onClick={() => {
                if (rejectionTargetId && rejectionReasonText.trim()) {
                  handleStatusChange(rejectionTargetId, 'Rejected', rejectionReasonText.trim());
                  setRejectionModalOpened(false);
                  setRejectionTargetId(null);
                  setRejectionReasonText('');
                }
              }}
            >
              Confirm Rejection
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* CREATE / EDIT PROPOSAL MODAL */}
      <ProposalModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setSelectedEditProposal(null);
        }}
        proposal={selectedEditProposal}
        lead={lead}
        onSave={handleSaveProposal}
      />
    </Box>
  );
};

export default LeadProposalSection;
