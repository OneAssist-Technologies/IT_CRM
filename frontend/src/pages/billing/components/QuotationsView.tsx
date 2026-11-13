import React, { useState, useEffect } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  Button,
  TextInput,
  Select,
  Table,
  ActionIcon,
  Tooltip,
  LoadingOverlay,
  Box,
  Center,
  Badge,
  Menu,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconPrinter,
  IconEdit,
  IconArrowRightCircle,
  IconRefresh,
  IconCheck,
  IconCalculator,
  IconChevronDown,
  IconChevronRight,
  IconSend,
  IconGitBranch,
  IconDotsVertical,
  IconX,
  IconArrowRight,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Quotation } from '../../../types/billing';
import { billingService } from '../../../services/billingService';
import { QuotationModal } from './QuotationModal';
import { QuotationPrintModal } from './QuotationPrintModal';

interface QuotationsViewProps {
  onAddNew?: () => void;
  onNavigateSection?: (section: any) => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({ onAddNew, onNavigateSection }) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Modals state
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [isRevisionModal, setIsRevisionModal] = useState(false);
  const [revisionBaseQuote, setRevisionBaseQuote] = useState<Quotation | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [printingQuotation, setPrintingQuotation] = useState<Quotation | null>(null);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const data = await billingService.getQuotations({
        search: search.trim() || undefined,
        status: statusFilter,
      });
      setQuotations(data || []);
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to load quotations' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchQuotations();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenCreateNew = () => {
    setIsRevisionModal(false);
    setRevisionBaseQuote(null);
    setEditingQuotation(null);
    if (onAddNew) {
      onAddNew();
    } else {
      setCreateModalOpened(true);
    }
  };

  const handleCreateRevision = (quote: Quotation) => {
    setRevisionBaseQuote(quote);
    setIsRevisionModal(true);
    setEditingQuotation(null);
    setCreateModalOpened(true);
  };

  const handleSendRevision = async (quote: Quotation) => {
    try {
      setLoading(true);
      await billingService.updateQuotationStatus(quote.id, 'Sent');
      notifications.show({
        color: 'teal',
        icon: <IconCheck size={16} />,
        title: 'Quotation Sent',
        message: `Revision ${quote.revisionName || quote.quotationNumber} marked as Sent. Historical active versions marked as Superseded.`,
      });
      fetchQuotations();
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to send revision' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (quoteId: string, newStatus: string) => {
    try {
      setLoading(true);
      await billingService.updateQuotationStatus(quoteId, newStatus);
      notifications.show({
        color: 'teal',
        title: 'Status Updated',
        message: `Quotation status updated to ${newStatus}`,
      });
      fetchQuotations();
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to update quotation status' });
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToOrder = async (quote: Quotation) => {
    try {
      setLoading(true);
      const order = await billingService.convertQuotationToOrder(quote.id, {
        billingMethod: 'Milestone',
      });
      notifications.show({
        color: 'green',
        title: 'Quotation Converted',
        message: `Successfully converted revision ${quote.revisionName || quote.quotationNumber} into Sales Order ${order.orderNumber}`,
      });
      fetchQuotations();
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to convert quotation' });
    } finally {
      setLoading(false);
    }
  };

  // Status Badge matching existing CRM modules (Meetings, Calls, Contacts)
  const renderStatusBadge = (status: string) => {
    const sLow = (status || 'Draft').toLowerCase();
    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#1D4ED8';
    let border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';

    if (sLow === 'accepted') {
      bg = isDark ? 'rgba(16, 185, 129, 0.16)' : '#ECFDF5';
      color = isDark ? '#6EE7B7' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
    } else if (sLow === 'sent') {
      bg = isDark ? 'rgba(79, 70, 229, 0.16)' : '#EEF2FF';
      color = isDark ? '#818CF8' : '#4F46E5';
      border = isDark ? 'rgba(79, 70, 229, 0.35)' : '#C7D2FE';
    } else if (sLow === 'draft') {
      bg = isDark ? 'rgba(148, 163, 184, 0.16)' : '#F1F5F9';
      color = isDark ? '#CBD5E1' : '#475569';
      border = isDark ? 'rgba(148, 163, 184, 0.35)' : '#E2E8F0';
    } else if (sLow === 'rejected') {
      bg = isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2';
      color = isDark ? '#FCA5A5' : '#B91C1C';
      border = isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
    } else if (sLow === 'expired') {
      bg = isDark ? 'rgba(249, 115, 22, 0.16)' : '#FFF7ED';
      color = isDark ? '#FB923C' : '#C2410C';
      border = isDark ? 'rgba(249, 115, 22, 0.35)' : '#FFEDD5';
    } else if (sLow.includes('changes') || sLow.includes('required')) {
      bg = isDark ? 'rgba(249, 115, 22, 0.16)' : '#FFF7ED';
      color = isDark ? '#FB923C' : '#EA580C';
      border = isDark ? 'rgba(249, 115, 22, 0.35)' : '#FED7AA';
    } else if (sLow === 'superseded') {
      bg = isDark ? 'rgba(100, 116, 139, 0.18)' : '#F1F5F9';
      color = isDark ? '#94A3B8' : '#64748B';
      border = isDark ? 'rgba(100, 116, 139, 0.35)' : '#CBD5E1';
    }

    return (
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 10px',
          borderRadius: 100,
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        {status || 'Draft'}
      </Box>
    );
  };

  return (
    <Stack gap="md">
      {/* 1. Filter Toolbar matching CallLogs / Contacts */}
      <Paper
        p="sm"
        radius="lg"
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="xs" wrap="wrap" style={{ flex: 1 }}>
            <TextInput
              placeholder="Search by quote #, client, project, notes..."
              leftSection={<IconSearch size={15} color={isDark ? '#94A3B8' : '#64748B'} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              onKeyDown={handleSearchKeyDown}
              size="sm"
              radius="md"
              style={{ minWidth: 260 }}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              }}
            />
            <Select
              placeholder="All Statuses"
              data={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent' },
                { value: 'Changes Required', label: 'Changes Required' },
                { value: 'Accepted', label: 'Accepted' },
                { value: 'Rejected', label: 'Rejected' },
                { value: 'Superseded', label: 'Superseded' },
                { value: 'Expired', label: 'Expired' },
              ]}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v || 'All')}
              size="sm"
              radius="md"
              style={{ width: 170 }}
              styles={{
                input: {
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              }}
            />
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="md"
              onClick={fetchQuotations}
              title="Refresh Quotations"
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Group>

          <Button
            leftSection={<IconPlus size={16} stroke={2.5} />}
            radius="md"
            size="sm"
            onClick={handleOpenCreateNew}
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: 13,
              height: 36,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              border: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Create Quotation
          </Button>
        </Group>
      </Paper>

      {/* 2. Main Quotation List Table */}
      <Paper
        radius="lg"
        style={{
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
          position: 'relative',
        }}
      >
        <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />

        {quotations.length === 0 && !loading ? (
          <Center p="3.5rem">
            <Stack align="center" gap="sm">
              <Box
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: isDark ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDark ? '#818CF8' : '#4F46E5',
                }}
              >
                <IconCalculator size={32} stroke={1.8} />
              </Box>
              <Text fw={700} size="lg" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                No Quotations Found
              </Text>
              <Text size="sm" c="dimmed" style={{ maxWidth: 420, textAlign: 'center' }}>
                No quotation records match your filter criteria. Click below to create a new quotation.
              </Text>
              <Button
                mt="xs"
                radius="md"
                leftSection={<IconCalculator size={16} />}
                onClick={handleOpenCreateNew}
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                }}
              >
                + Create Quotation
              </Button>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={950}>
            <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover>
              <Table.Thead
                style={{
                  background: isDark ? '#0F172A' : '#FBFBFC',
                  borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
                }}
              >
                <Table.Tr>
                  <Table.Th style={{ width: 44, padding: '10px 8px' }} />
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                    QUOTATION #
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                    CLIENT / COMPANY
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                    PROJECT NAME
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                    LATEST VERSION
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                    LATEST AMOUNT
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                    STATUS
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                    CREATED DATE
                  </Table.Th>
                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textAlign: 'right' }}>
                    ACTIONS
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {quotations.map((q) => {
                  const isExpanded = Boolean(expandedRows[q.id]);
                  const allRevs = q.allRevisions || [q];
                  const hasMultipleRevs = allRevs.length > 1;
                  const initialLetter = (q.contactName || 'C').charAt(0).toUpperCase();
                  const latestRev = allRevs[allRevs.length - 1] || q;

                  return (
                    <React.Fragment key={q.id}>
                      {/* Top-Level Quotation Row */}
                      <Table.Tr
                        style={{
                          background: isExpanded
                            ? isDark
                              ? 'rgba(79, 70, 229, 0.08)'
                              : '#F8FAFC'
                            : undefined,
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* Expand / View Revisions Toggle Button */}
                        <Table.Td style={{ width: 44, padding: '10px 8px' }}>
                          <Tooltip label={isExpanded ? 'Hide revisions' : `View ${allRevs.length} revision${allRevs.length === 1 ? '' : 's'}`}>
                            <ActionIcon
                              variant={isExpanded ? 'filled' : 'subtle'}
                              color="indigo"
                              size="sm"
                              radius="md"
                              onClick={() => toggleExpand(q.id)}
                            >
                              {isExpanded ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
                            </ActionIcon>
                          </Tooltip>
                        </Table.Td>

                        {/* Quotation Number */}
                        <Table.Td>
                          <Group gap={6} align="center" wrap="nowrap">
                            <Text
                              fw={700}
                              size="sm"
                              style={{
                                color: isDark ? '#818CF8' : '#4F46E5',
                                cursor: 'pointer',
                              }}
                              onClick={() => setPrintingQuotation(latestRev)}
                            >
                              {q.originalQuotationNumber || q.quotationNumber}
                            </Text>
                            {hasMultipleRevs && (
                              <Badge
                                size="xs"
                                variant="light"
                                color="indigo"
                                radius="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => toggleExpand(q.id)}
                              >
                                {allRevs.length} Revs
                              </Badge>
                            )}
                          </Group>
                        </Table.Td>

                        {/* Client / Company with Avatar Box */}
                        <Table.Td>
                          <Group gap="sm" wrap="nowrap">
                            <Box
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: isDark ? '#1E293B' : '#EEF2FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center',
                                justifyContent: 'center',
                                color: isDark ? '#818CF8' : '#4F46E5',
                                fontWeight: 700,
                                fontSize: 13,
                                flexShrink: 0,
                              }}
                            >
                              {initialLetter}
                            </Box>
                            <div>
                              <Text fw={700} size="sm" style={{ color: isDark ? '#F9FAFB' : '#0F172A' }}>
                                {q.contactName}
                              </Text>
                              {q.companyName && (
                                <Text size="xs" c="dimmed">
                                  {q.companyName}
                                </Text>
                              )}
                            </div>
                          </Group>
                        </Table.Td>

                        {/* Project Name */}
                        <Table.Td>
                          <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                            {q.projectName || latestRev.projectName || '—'}
                          </Text>
                        </Table.Td>

                        {/* Latest Version Badge */}
                        <Table.Td>
                          <Badge
                            size="sm"
                            variant="filled"
                            color="indigo"
                            radius="sm"
                            style={{ fontWeight: 700, textTransform: 'none' }}
                          >
                            {q.latestRevisionName || `V${q.latestVersion || latestRev.version || 1}`}
                          </Badge>
                        </Table.Td>

                        {/* Latest Quotation Amount */}
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text fw={700} size="sm" style={{ color: isDark ? '#10B981' : '#047857' }}>
                            ₹{Number(q.latestGrandTotal || latestRev.grandTotal || q.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>
                        </Table.Td>

                        {/* Status (Latest Revision's Status) */}
                        <Table.Td>{renderStatusBadge(q.latestStatus || latestRev.status || q.status)}</Table.Td>

                        {/* Created Date */}
                        <Table.Td>
                          <Text size="xs" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                            {new Date(q.createdAt || q.quotationDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Text>
                        </Table.Td>

                        {/* Actions */}
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Group gap={6} justify="flex-end" wrap="nowrap">
                            <Tooltip label="View all revisions under this quotation">
                              <Button
                                size="xs"
                                variant="subtle"
                                color="indigo"
                                radius="md"
                                leftSection={<IconGitBranch size={13} />}
                                onClick={() => toggleExpand(q.id)}
                                style={{ fontWeight: 600, padding: '0 8px', height: 28 }}
                              >
                                {isExpanded ? 'Collapse' : `Revisions (${allRevs.length})`}
                              </Button>
                            </Tooltip>

                            <Tooltip label="Create Revision from latest version">
                              <ActionIcon
                                variant="light"
                                color="indigo"
                                radius="md"
                                size="sm"
                                onClick={() => handleCreateRevision(latestRev)}
                              >
                                <IconPlus size={15} />
                              </ActionIcon>
                            </Tooltip>

                            <Tooltip label="Preview / Print Latest Version">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                radius="md"
                                size="sm"
                                onClick={() => setPrintingQuotation(latestRev)}
                              >
                                <IconPrinter size={16} />
                              </ActionIcon>
                            </Tooltip>

                            {/* Conversion to Order (if accepted and not converted) */}
                            {latestRev.status === 'Accepted' && !latestRev.convertedToOrderId && (
                              <Tooltip label="Convert to Sales Order">
                                <ActionIcon
                                  variant="subtle"
                                  color="teal"
                                  radius="md"
                                  size="sm"
                                  onClick={() => handleConvertToOrder(latestRev)}
                                >
                                  <IconArrowRightCircle size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}

                            <Menu position="bottom-end" shadow="md" withinPortal>
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray" size="sm" radius="md">
                                  <IconDotsVertical size={15} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  leftSection={<IconPlus size={14} color="#4F46E5" />}
                                  onClick={() => handleCreateRevision(latestRev)}
                                >
                                  Create Revision
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<IconPrinter size={14} />}
                                  onClick={() => setPrintingQuotation(latestRev)}
                                >
                                  View / Print
                                </Menu.Item>
                                {latestRev.status === 'Draft' && (
                                  <Menu.Item
                                    leftSection={<IconSend size={14} color="#2563EB" />}
                                    onClick={() => handleSendRevision(latestRev)}
                                  >
                                    Mark as Sent to Client
                                  </Menu.Item>
                                )}
                                {latestRev.status !== 'Accepted' && latestRev.status !== 'Superseded' && (
                                  <Menu.Item
                                    leftSection={<IconCheck size={14} color="#059669" />}
                                    onClick={() => handleStatusUpdate(latestRev.id, 'Accepted')}
                                  >
                                    Mark as Accepted
                                  </Menu.Item>
                                )}
                                {latestRev.status !== 'Changes Required' && latestRev.status !== 'Superseded' && (
                                  <Menu.Item
                                    leftSection={<IconEdit size={14} color="#EA580C" />}
                                    onClick={() => handleStatusUpdate(latestRev.id, 'Changes Required')}
                                  >
                                    Mark as Changes Required
                                  </Menu.Item>
                                )}
                                {latestRev.status !== 'Rejected' && latestRev.status !== 'Superseded' && (
                                  <Menu.Item
                                    leftSection={<IconX size={14} color="#DC2626" />}
                                    onClick={() => handleStatusUpdate(latestRev.id, 'Rejected')}
                                  >
                                    Mark as Rejected
                                  </Menu.Item>
                                )}
                                {onNavigateSection && latestRev.status === 'Accepted' && (
                                  <Menu.Item
                                    leftSection={<IconArrowRight size={14} color="#059669" />}
                                    onClick={() => onNavigateSection('contracts')}
                                  >
                                    Proceed to Contract
                                  </Menu.Item>
                                )}
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>

                      {/* Expanded Sub-Table: All Linked Revisions (V1, V2, V3...) */}
                      {isExpanded && (
                        <Table.Tr
                          style={{
                            background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#F8FAFC',
                          }}
                        >
                          <Table.Td colSpan={9} style={{ padding: '16px 20px 20px 48px' }}>
                            <Paper
                              p="md"
                              radius="md"
                              style={{
                                background: isDark ? '#1E293B' : '#FFFFFF',
                                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
                                boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                              }}
                            >
                              <Group justify="space-between" align="center" mb="xs">
                                <Group gap="xs">
                                  <IconGitBranch size={16} color={isDark ? '#818CF8' : '#4F46E5'} />
                                  <Text fw={700} size="xs" tt="uppercase" style={{ letterSpacing: '0.06em', color: isDark ? '#818CF8' : '#4F46E5' }}>
                                    Revision History — {q.originalQuotationNumber || q.quotationNumber} ({allRevs.length} Version{allRevs.length === 1 ? '' : 's'})
                                  </Text>
                                </Group>
                                <Button
                                  size="xs"
                                  variant="light"
                                  color="indigo"
                                  leftSection={<IconPlus size={13} />}
                                  onClick={() => handleCreateRevision(latestRev)}
                                  style={{ fontWeight: 600, height: 26 }}
                                >
                                  Create Next Revision (V{allRevs.length + 1})
                                </Button>
                              </Group>

                              <Table verticalSpacing="sm" horizontalSpacing="md">
                                <Table.Thead
                                  style={{
                                    borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
                                  }}
                                >
                                  <Table.Tr>
                                    <Table.Th style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', fontWeight: 700 }}>
                                      VERSION
                                    </Table.Th>
                                    <Table.Th style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', fontWeight: 700 }}>
                                      REVISION CODE
                                    </Table.Th>
                                    <Table.Th style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', fontWeight: 700, textAlign: 'right' }}>
                                      AMOUNT
                                    </Table.Th>
                                    <Table.Th style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', fontWeight: 700 }}>
                                      STATUS
                                    </Table.Th>
                                    <Table.Th style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', fontWeight: 700 }}>
                                      DATE / SENT
                                    </Table.Th>
                                    <Table.Th style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', fontWeight: 700 }}>
                                      CHANGE NOTES
                                    </Table.Th>
                                    <Table.Th style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', fontWeight: 700, textAlign: 'right' }}>
                                      REVISION ACTIONS
                                    </Table.Th>
                                  </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                  {allRevs.map((rev, revIdx) => {
                                    const isRevLatest = rev.id === (q.latestQuotationId || latestRev.id);
                                    const revVer = rev.revisionName || `V${rev.version || revIdx + 1}`;

                                    return (
                                      <Table.Tr
                                        key={rev.id}
                                        style={{
                                          background: isRevLatest
                                            ? isDark
                                              ? 'rgba(79, 70, 229, 0.12)'
                                              : 'rgba(79, 70, 229, 0.04)'
                                            : undefined,
                                        }}
                                      >
                                        {/* Version Badge */}
                                        <Table.Td>
                                          <Group gap={6} align="center">
                                            <Badge
                                              size="sm"
                                              variant={isRevLatest ? 'filled' : 'light'}
                                              color="indigo"
                                              radius="sm"
                                            >
                                              {revVer}
                                            </Badge>
                                            {isRevLatest && (
                                              <Badge size="xs" variant="outline" color="teal" radius="sm">
                                                Active / Latest
                                              </Badge>
                                            )}
                                          </Group>
                                        </Table.Td>

                                        {/* Revision Code */}
                                        <Table.Td>
                                          <Text
                                            size="xs"
                                            fw={700}
                                            style={{
                                              color: isDark ? '#A5B4FC' : '#4F46E5',
                                              cursor: 'pointer',
                                            }}
                                            onClick={() => setPrintingQuotation(rev)}
                                          >
                                            {rev.quotationNumber}
                                          </Text>
                                        </Table.Td>

                                        {/* Amount */}
                                        <Table.Td style={{ textAlign: 'right' }}>
                                          <Text size="xs" fw={700} style={{ color: isDark ? '#34D399' : '#059669' }}>
                                            ₹{Number(rev.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                          </Text>
                                        </Table.Td>

                                        {/* Status */}
                                        <Table.Td>{renderStatusBadge(rev.status)}</Table.Td>

                                        {/* Date / Sent */}
                                        <Table.Td>
                                          <Text size="xs" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                                            {rev.quotationDate ? new Date(rev.quotationDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                          </Text>
                                          {rev.sentAt && (
                                            <Text size="10px" c="dimmed">
                                              Sent: {new Date(rev.sentAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                            </Text>
                                          )}
                                        </Table.Td>

                                        {/* Change Notes */}
                                        <Table.Td style={{ maxWidth: 220 }}>
                                          <Text size="xs" c="dimmed" truncate="end" title={rev.revisionNotes || rev.notes || ''}>
                                            {rev.revisionNotes || rev.notes || 'Original issue'}
                                          </Text>
                                        </Table.Td>

                                        {/* Revision Actions */}
                                        <Table.Td style={{ textAlign: 'right' }}>
                                          <Group gap={6} justify="flex-end" wrap="nowrap">
                                            <Tooltip label="Print / Download PDF">
                                              <ActionIcon
                                                size="sm"
                                                variant="subtle"
                                                color="blue"
                                                radius="md"
                                                onClick={() => setPrintingQuotation(rev)}
                                              >
                                                <IconPrinter size={15} />
                                              </ActionIcon>
                                            </Tooltip>

                                            {rev.status !== 'Superseded' && rev.status !== 'Accepted' && (
                                              <Tooltip label="Send this revision to client">
                                                <ActionIcon
                                                  size="sm"
                                                  variant="subtle"
                                                  color="indigo"
                                                  radius="md"
                                                  onClick={() => handleSendRevision(rev)}
                                                >
                                                  <IconSend size={15} />
                                                </ActionIcon>
                                              </Tooltip>
                                            )}

                                            <Tooltip label="Create revision from this version">
                                              <ActionIcon
                                                size="sm"
                                                variant="subtle"
                                                color="teal"
                                                radius="md"
                                                onClick={() => handleCreateRevision(rev)}
                                              >
                                                <IconPlus size={15} />
                                              </ActionIcon>
                                            </Tooltip>

                                            {/* Sub-menu for status operations */}
                                            <Menu position="bottom-end" shadow="md" withinPortal>
                                              <Menu.Target>
                                                <ActionIcon variant="subtle" color="gray" size="sm" radius="md">
                                                  <IconDotsVertical size={14} />
                                                </ActionIcon>
                                              </Menu.Target>
                                              <Menu.Dropdown>
                                                <Menu.Item
                                                  leftSection={<IconPrinter size={14} />}
                                                  onClick={() => setPrintingQuotation(rev)}
                                                >
                                                  View / Print {revVer}
                                                </Menu.Item>
                                                <Menu.Item
                                                  leftSection={<IconPlus size={14} color="#4F46E5" />}
                                                  onClick={() => handleCreateRevision(rev)}
                                                >
                                                  Create Revision from {revVer}
                                                </Menu.Item>
                                                {rev.status !== 'Superseded' && (
                                                  <>
                                                    <Menu.Item
                                                      leftSection={<IconSend size={14} color="#2563EB" />}
                                                      onClick={() => handleSendRevision(rev)}
                                                    >
                                                      Send to Client
                                                    </Menu.Item>
                                                    <Menu.Item
                                                      leftSection={<IconCheck size={14} color="#059669" />}
                                                      onClick={() => handleStatusUpdate(rev.id, 'Accepted')}
                                                    >
                                                      Mark as Accepted
                                                    </Menu.Item>
                                                    <Menu.Item
                                                      leftSection={<IconEdit size={14} color="#EA580C" />}
                                                      onClick={() => handleStatusUpdate(rev.id, 'Changes Required')}
                                                    >
                                                      Mark as Changes Required
                                                    </Menu.Item>
                                                    <Menu.Item
                                                      leftSection={<IconX size={14} color="#DC2626" />}
                                                      onClick={() => handleStatusUpdate(rev.id, 'Rejected')}
                                                    >
                                                      Mark as Rejected
                                                    </Menu.Item>
                                                  </>
                                                )}
                                                {rev.status === 'Accepted' && !rev.convertedToOrderId && (
                                                  <Menu.Item
                                                    leftSection={<IconArrowRightCircle size={14} color="#059669" />}
                                                    onClick={() => handleConvertToOrder(rev)}
                                                  >
                                                    Convert to Sales Order
                                                  </Menu.Item>
                                                )}
                                              </Menu.Dropdown>
                                            </Menu>
                                          </Group>
                                        </Table.Td>
                                      </Table.Tr>
                                    );
                                  })}
                                </Table.Tbody>
                              </Table>
                            </Paper>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* Modals */}
      <QuotationModal
        opened={createModalOpened}
        onClose={() => {
          setCreateModalOpened(false);
          setIsRevisionModal(false);
          setRevisionBaseQuote(null);
          setEditingQuotation(null);
        }}
        isRevision={isRevisionModal}
        baseQuotation={revisionBaseQuote}
        quotation={editingQuotation}
        onSuccess={() => {
          fetchQuotations();
          setCreateModalOpened(false);
          setIsRevisionModal(false);
          setRevisionBaseQuote(null);
          setEditingQuotation(null);
        }}
        onNavigateSection={onNavigateSection}
      />

      <QuotationPrintModal
        opened={Boolean(printingQuotation)}
        onClose={() => setPrintingQuotation(null)}
        quotation={printingQuotation}
      />
    </Stack>
  );
};
