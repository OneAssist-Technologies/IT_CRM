import React, { useState, useEffect } from 'react';
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
  IconCalculator,
  IconPlus,
  IconCheck,
  IconRefresh,
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
  IconCalendarEvent,
  IconCurrencyRupee,
  IconReceipt,
  IconPrinter,
  IconFileText,
  IconClock,
  IconTag,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Lead } from '../../../types/lead';
import { Quotation, QuotationItem } from '../../../types/billing';
import { billingService } from '../../../services/billingService';
import { QuotationModal } from '../../billing/components/QuotationModal';
import { QuotationPrintModal } from '../../billing/components/QuotationPrintModal';
import { printQuotationDirect } from '../../billing/utils/quotationPrint';

const QUOTATION_STATUS_OPTIONS: Array<{
  value: string;
  label: string;
  color: string;
}> = [
  { value: 'Draft', label: 'Draft', color: 'gray' },
  { value: 'Sent', label: 'Sent to Client', color: 'blue' },
  { value: 'Under Review', label: 'Under Review', color: 'yellow' },
  { value: 'Changes Required', label: 'Changes Required', color: 'orange' },
  { value: 'Accepted', label: 'Accepted', color: 'teal' },
  { value: 'Rejected', label: 'Rejected', color: 'red' },
  { value: 'Converted', label: 'Converted', color: 'green' },
];

interface LeadQuotationSectionProps {
  lead: Lead;
  isDark: boolean;
  quotations: Quotation[];
  onUpdateQuotations: (quotations: Quotation[]) => void;
  onNavigateSection: (section: any) => void;
}

export const LeadQuotationSection: React.FC<LeadQuotationSectionProps> = ({
  lead,
  isDark,
  quotations,
  onUpdateQuotations,
  onNavigateSection,
}) => {
  // Modal states
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [isRevisionModal, setIsRevisionModal] = useState(false);
  const [revisionBaseQuote, setRevisionBaseQuote] = useState<Quotation | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [printingQuotation, setPrintingQuotation] = useState<Quotation | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenCreate = () => {
    setIsRevisionModal(false);
    setRevisionBaseQuote(null);
    setEditingQuotation(null);
    setCreateModalOpened(true);
  };

  const handleCreateRevision = (quote: Quotation) => {
    setRevisionBaseQuote(quote);
    setIsRevisionModal(true);
    setEditingQuotation(null);
    setCreateModalOpened(true);
  };

  const handleOpenEdit = (quote: Quotation) => {
    setIsRevisionModal(false);
    setRevisionBaseQuote(null);
    setEditingQuotation(quote);
    setCreateModalOpened(true);
  };

  const handleStatusChange = async (quoteId: string, status: string) => {
    try {
      if (!quoteId.startsWith('quo-')) {
        await billingService.updateQuotationStatus(quoteId, status);
      }
      const updated = quotations.map((q) => {
        if (q.id === quoteId) {
          return { ...q, status: status as any };
        }
        if (q.allRevisions && q.allRevisions.length > 0) {
          return {
            ...q,
            allRevisions: q.allRevisions.map((rev) =>
              rev.id === quoteId ? { ...rev, status: status as any } : rev
            ),
          };
        }
        return q;
      });
      onUpdateQuotations(updated);
      if (selectedQuotation?.id === quoteId) {
        setSelectedQuotation({ ...selectedQuotation, status: status as any });
      }
      notifications.show({
        color: 'teal',
        icon: <IconCheck size={16} />,
        message: `Quotation status updated to ${status}`,
      });
    } catch (err: any) {
      notifications.show({
        color: 'red',
        message: err.message || `Failed to update status to ${status}`,
      });
    }
  };

  const handleDelete = async (quoteId: string) => {
    const updated = quotations
      .filter((q) => q.id !== quoteId)
      .map((q) => {
        if (q.allRevisions && q.allRevisions.length > 0) {
          return {
            ...q,
            allRevisions: q.allRevisions.filter((r) => r.id !== quoteId),
          };
        }
        return q;
      });
    onUpdateQuotations(updated);
    if (selectedQuotation?.id === quoteId) {
      setSelectedQuotation(null);
    }

    try {
      await billingService.deleteQuotation(quoteId);
      notifications.show({
        color: 'teal',
        icon: <IconTrash size={16} />,
        message: 'Quotation deleted successfully',
      });
    } catch (err: any) {
      console.warn('Backend delete quotation note:', err);
      notifications.show({
        color: 'teal',
        icon: <IconTrash size={16} />,
        message: 'Quotation removed',
      });
    }
  };

  const handleQuotationSaved = (saved?: Quotation) => {
    // 1. Fetch fresh list from CRM database with flat: true
    billingService
      .getQuotations({ leadId: lead.id, flat: true })
      .then((data) => {
        if (data && data.length > 0) {
          onUpdateQuotations(data);
          return;
        }
        if (saved) {
          handleLocalSync(saved);
        }
      })
      .catch(() => {
        if (saved) {
          handleLocalSync(saved);
        }
      });
  };

  const handleLocalSync = (saved: Quotation) => {
    const existingIndex = quotations.findIndex(
      (q) => q.id === saved.id || q.quotationNumber === saved.quotationNumber
    );
    if (existingIndex >= 0) {
      const updated = [...quotations];
      updated[existingIndex] = saved;
      onUpdateQuotations(updated);
    } else {
      onUpdateQuotations([saved, ...quotations]);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    const s = (status || 'Draft').toLowerCase();
    let bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
    let color = isDark ? '#93C5FD' : '#2563EB';

    if (s.includes('accept') || s.includes('won') || s.includes('approved')) {
      bg = isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5';
      color = isDark ? '#6EE7B7' : '#059669';
    } else if (s.includes('changes') || s.includes('revision') || s.includes('required')) {
      bg = isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED';
      color = isDark ? '#FB923C' : '#EA580C';
    } else if (s.includes('sent')) {
      bg = isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF';
      color = isDark ? '#A5B4FC' : '#4F46E5';
    } else if (s.includes('reject') || s.includes('lost') || s.includes('cancel')) {
      bg = isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2';
      color = isDark ? '#FCA5A5' : '#DC2626';
    } else if (s.includes('review')) {
      bg = isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB';
      color = isDark ? '#FCD34D' : '#D97706';
    } else if (s.includes('convert') || s.includes('order')) {
      bg = isDark ? 'rgba(147, 51, 234, 0.15)' : '#FAF5FF';
      color = isDark ? '#D8B4FE' : '#9333EA';
    }

    return (
      <Badge
        size="sm"
        radius="sm"
        style={{
          background: bg,
          color: color,
          border: `1px solid ${color}33`,
          textTransform: 'none',
          fontWeight: 700,
          padding: '4px 10px',
        }}
      >
        {status || 'Draft'}
      </Badge>
    );
  };

  // Active / current quotation status for conditional navigation
  // Sync quotations from billing backend if available
  useEffect(() => {
    if (!lead?.id) return;
    billingService
      .getQuotations({ leadId: lead.id, flat: true })
      .then((dbQuotes) => {
        if (dbQuotes && dbQuotes.length > 0) {
          onUpdateQuotations(dbQuotes);
        }
      })
      .catch(() => {});
  }, [lead?.id]);

  // Flatten quotations so each revision (V1, V2, etc.) is rendered as a separate, distinct row
  const displayQuotations = React.useMemo(() => {
    const list: Quotation[] = [];
    const seenIds = new Set<string>();

    for (const quote of quotations) {
      if (quote.allRevisions && quote.allRevisions.length > 0) {
        for (const rev of quote.allRevisions) {
          if (!seenIds.has(rev.id)) {
            seenIds.add(rev.id);
            list.push({
              ...rev,
              companyName: rev.companyName || quote.companyName,
              contactName: rev.contactName || quote.contactName,
            });
          }
        }
      } else {
        if (!seenIds.has(quote.id)) {
          seenIds.add(quote.id);
          list.push(quote);
        }
      }
    }

    // Sort: newest first, and within same quote group, higher version first
    return list.sort((a, b) => {
      const getBaseNum = (q: Quotation) =>
        q.originalQuotationNumber || (q.quotationNumber ? q.quotationNumber.replace(/-V\d+$/i, '') : '');
      const baseA = getBaseNum(a);
      const baseB = getBaseNum(b);

      if (baseA && baseB && baseA === baseB) {
        return (b.version || 1) - (a.version || 1);
      }
      const timeA = new Date(a.createdAt || a.quotationDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.quotationDate || 0).getTime();
      return timeB - timeA;
    });
  }, [quotations]);

  const activeQuotation = selectedQuotation || displayQuotations[0];
  const activeStatus = activeQuotation?.status;
  const hasAccepted = displayQuotations.some((q) => (q.status || '').toLowerCase() === 'accepted');
  const hasChangesRequired = displayQuotations.some((q) => (q.status || '').toLowerCase() === 'changes required');

  return (
    <Box>
      {createModalOpened ? (
        <QuotationModal
          opened={createModalOpened}
          embedded={true}
          onClose={() => {
            setCreateModalOpened(false);
            setIsRevisionModal(false);
            setRevisionBaseQuote(null);
            setEditingQuotation(null);
          }}
          isRevision={isRevisionModal}
          baseQuotation={revisionBaseQuote}
          quotation={editingQuotation}
          onSuccess={handleQuotationSaved}
          initialLead={lead}
          onNavigateSection={onNavigateSection}
        />
      ) : (
        <>
          {/* 1. Header Toolbar */}
          <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md">
            <div>
              <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
                Quotations
              </Text>
          <Text size="xs" c="dimmed">
            Generate and manage itemized price quotations and estimates for {lead.name}.
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
            Create Quotation
          </Button>

          {/* Conditional Navigation Buttons based on current quotation status */}
          {(activeStatus === 'Accepted' || hasAccepted) && (
            <Button
              size="sm"
              variant="light"
              color="teal"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => onNavigateSection('contracts')}
              style={{ borderRadius: 10, fontWeight: 700 }}
            >
              Proceed to Contract
            </Button>
          )}

          {(activeStatus === 'Changes Required' || hasChangesRequired) && (
            <Button
              size="sm"
              variant="light"
              color="blue"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => onNavigateSection('negotiation')}
              style={{ borderRadius: 10, fontWeight: 700 }}
            >
              Proceed to Negotiation
            </Button>
          )}
        </Group>
      </Group>

      {/* 2. Quotation List Content */}
      {displayQuotations.length === 0 ? (
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
            <IconCalculator size={28} />
          </ThemeIcon>
          <Text fw={700} size="16px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>
            No Quotations Found
          </Text>
          <Text size="sm" c="dimmed" mt={4} mb="lg">
            No formal quotations have been generated for {lead.name} yet.
          </Text>
          <Group justify="center" gap="sm">
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
              Create Quotation
            </Button>
          </Group>
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
                      QUOTATION / REF
                    </Table.Th>
                    <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                      VERSION
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
                  {displayQuotations.map((quote) => {
                    const itemCount = quote.items?.length || 0;
                    const firstItem = quote.items?.[0]?.itemName || '';
                    const versionLabel = quote.revisionName || (quote.version ? `V${quote.version}` : 'V1');

                    return (
                      <Table.Tr
                        key={quote.id}
                        style={{
                          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                        }}
                      >
                        {/* 1. QUOTATION / REF */}
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
                              <IconCalculator size={19} stroke={1.8} />
                            </Box>
                            <div>
                              <Text
                                size="sm"
                                fw={700}
                                style={{
                                  color: isDark ? '#F8FAFC' : '#0F172A',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setPrintingQuotation(quote)}
                              >
                                {quote.quotationNumber}
                              </Text>
                              <Group gap={6} mt={2}>
                                <Text size="11px" c="dimmed">
                                  {quote.companyName || quote.contactName || lead.name}
                                </Text>
                                {itemCount > 0 && (
                                  <>
                                    <Text size="11px" c="dimmed">•</Text>
                                    <Text size="11px" c="dimmed">
                                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                      {firstItem ? ` (${firstItem})` : ''}
                                    </Text>
                                  </>
                                )}
                              </Group>
                            </div>
                          </Group>
                        </Table.Td>

                        {/* 2. VERSION */}
                        <Table.Td>
                          <Badge size="sm" variant="filled" color="indigo" radius="sm">
                            {versionLabel}
                          </Badge>
                        </Table.Td>

                        {/* 3. DATE & VALIDITY */}
                        <Table.Td>
                          <Group gap={6}>
                            <IconCalendar size={14} color="#94A3B8" />
                            <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                              {quote.quotationDate ? new Date(quote.quotationDate).toISOString().split('T')[0] : 'N/A'}
                            </Text>
                          </Group>
                          <Text size="11px" c="dimmed" mt={2}>
                            Valid till: {quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : 'N/A'}
                          </Text>
                        </Table.Td>

                        {/* 4. VALUE / PRICING */}
                        <Table.Td>
                          <Text size="sm" fw={800} style={{ color: '#2563EB', letterSpacing: '-0.02em' }}>
                            ₹{Number(quote.grandTotal || 0).toLocaleString('en-IN')}
                          </Text>
                        </Table.Td>

                        {/* 5. STATUS */}
                        <Table.Td>
                          {renderStatusBadge(quote.status)}
                        </Table.Td>

                        {/* 6. ACTIONS */}
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Group justify="flex-end" gap={6} wrap="nowrap">
                            <Tooltip label="Create Revised Quotation" withArrow>
                              <ActionIcon
                                variant="light"
                                color="indigo"
                                size="md"
                                radius="md"
                                onClick={() => handleCreateRevision(quote)}
                              >
                                <IconPlus size={16} />
                              </ActionIcon>
                            </Tooltip>

                            <Tooltip label="View Quotation PDF" withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                size="md"
                                radius="md"
                                onClick={() => setPrintingQuotation(quote)}
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>

                            <Tooltip label="Print / Download Quotation" withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="indigo"
                                size="md"
                                radius="md"
                                onClick={() => printQuotationDirect(quote)}
                              >
                                <IconPrinter size={16} />
                              </ActionIcon>
                            </Tooltip>

                            <Menu shadow="md" width={180} position="bottom-end" withinPortal radius="md">
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
                                {QUOTATION_STATUS_OPTIONS.map((opt) => {
                                  const isSelected = (quote.status || '').toLowerCase() === opt.value.toLowerCase();
                                  return (
                                    <Menu.Item
                                      key={opt.value}
                                      onClick={() => handleStatusChange(quote.id, opt.value)}
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
                                                : opt.color === 'orange'
                                                ? '#F97316'
                                                : opt.color === 'red'
                                                ? '#EF4444'
                                                : opt.color === 'green'
                                                ? '#059669'
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

                            <Tooltip label="Edit Quotation" withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="md"
                                radius="md"
                                onClick={() => handleOpenEdit(quote)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>

                            <Tooltip label="Delete Quotation" withArrow>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="md"
                                radius="md"
                                onClick={() => handleDelete(quote.id)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>

          {/* MOBILE CARDS VIEW */}
          <Stack hiddenFrom="sm" gap="md" mt="md">
            {displayQuotations.map((quote) => {
              const versionLabel = quote.revisionName || (quote.version ? `V${quote.version}` : 'V1');
              return (
                <Paper
                  key={quote.id}
                  p="md"
                  radius="md"
                  style={{
                    background: isDark ? '#111827' : '#FFFFFF',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                  }}
                >
                  <Group justify="space-between" align="flex-start" mb="xs">
                    <div>
                      <Group gap="xs" align="center">
                        <Text fw={700} size="sm" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                          {quote.quotationNumber}
                        </Text>
                        <Badge size="xs" variant="filled" color="indigo" radius="sm">
                          {versionLabel}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed" mt={2}>
                        {quote.companyName || quote.contactName || lead.name}
                      </Text>
                    </div>
                    {renderStatusBadge(quote.status)}
                  </Group>

                  <Group justify="space-between" align="center" my="xs">
                    <div>
                      <Text size="11px" c="dimmed">
                        Total Quotation Value
                      </Text>
                      <Text size="md" fw={800} style={{ color: '#2563EB' }}>
                        ₹{Number(quote.grandTotal || 0).toLocaleString('en-IN')}
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text size="11px" c="dimmed">
                        Valid Till
                      </Text>
                      <Text size="xs" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                        {quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : 'N/A'}
                      </Text>
                    </div>
                  </Group>

                  <Divider my="xs" color={isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'} />

                  <Group justify="flex-end" gap={8}>
                    <Tooltip label="Create Revision" withArrow>
                      <ActionIcon
                        size="md"
                        variant="light"
                        color="indigo"
                        radius="md"
                        onClick={() => handleCreateRevision(quote)}
                      >
                        <IconPlus size={15} />
                      </ActionIcon>
                    </Tooltip>
                    <Button
                      size="xs"
                      variant="light"
                      color="blue"
                      leftSection={<IconEye size={13} />}
                      onClick={() => setPrintingQuotation(quote)}
                    >
                      View PDF
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="indigo"
                      leftSection={<IconPrinter size={13} />}
                      onClick={() => printQuotationDirect(quote)}
                    >
                      Print
                    </Button>
                    <Menu shadow="md" width={180} position="bottom-end" withinPortal radius="md">
                      <Menu.Target>
                        <ActionIcon
                          variant="subtle"
                          color="teal"
                          size="md"
                          radius="md"
                          title="Update Status"
                        >
                          <IconRefresh size={15} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Update Status</Menu.Label>
                        {QUOTATION_STATUS_OPTIONS.map((opt) => {
                          const isSelected = (quote.status || '').toLowerCase() === opt.value.toLowerCase();
                          return (
                            <Menu.Item
                              key={opt.value}
                              onClick={() => handleStatusChange(quote.id, opt.value)}
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
                                        : opt.color === 'orange'
                                        ? '#F97316'
                                        : opt.color === 'red'
                                        ? '#EF4444'
                                        : opt.color === 'green'
                                        ? '#059669'
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
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="md"
                      radius="md"
                      onClick={() => handleOpenEdit(quote)}
                    >
                      <IconEdit size={15} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="md"
                      radius="md"
                      onClick={() => handleDelete(quote.id)}
                    >
                      <IconTrash size={15} />
                    </ActionIcon>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        </>
      )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. QUOTATION DETAILS MODAL (Matching Meeting & Proposal Details Design)   */}
      {/* ========================================================================= */}
      <Modal
        opened={!!selectedQuotation}
        onClose={() => setSelectedQuotation(null)}
        size="1050px"
        padding="xl"
        radius="lg"
        centered
        withCloseButton={false}
        styles={{
          header: { display: 'none' },
          body: {
            padding: 0,
            maxHeight: 'calc(90vh - 20px)',
            overflowY: 'auto',
          },
          content: {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
            borderRadius: '16px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {selectedQuotation && (
          <Box p={{ base: 'md', sm: 'xl' }} pb={{ base: 'xl', sm: '2xl' }}>
            {/* Modal Top Header */}
            <Group justify="space-between" align="center" mb="lg">
              <Group gap="sm">
                <Box
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                  }}
                >
                  <IconCalculator size={24} />
                </Box>
                <div>
                  <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
                    Quotation Details
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    Quotation Ref: <span style={{ fontWeight: 700, color: '#3B82F6' }}>{selectedQuotation.quotationNumber}</span>
                  </Text>
                </div>
              </Group>

              {/* Status Selector */}
              <Group gap="xs">
                <Select
                  size="xs"
                  data={['Draft', 'Sent', 'Under Review', 'Changes Required', 'Accepted', 'Rejected', 'Converted']}
                  value={selectedQuotation.status || 'Draft'}
                  onChange={(val) => val && handleStatusChange(selectedQuotation.id, val)}
                  style={{ width: 160 }}
                  styles={{
                    input: {
                      fontWeight: 700,
                      borderRadius: 8,
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                    },
                  }}
                />
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  radius="md"
                  onClick={() => setSelectedQuotation(null)}
                >
                  <IconCheck size={18} />
                </ActionIcon>
              </Group>
            </Group>

            <Divider mb="lg" color={isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'} />

            {/* Read-only Information Grid */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="lg">
              <TextInput
                label="Quotation Number"
                value={selectedQuotation.quotationNumber}
                readOnly
                leftSection={<IconFileText size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Client / Contact Name"
                value={selectedQuotation.contactName || lead.name}
                readOnly
                leftSection={<IconUser size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Company Name"
                value={selectedQuotation.companyName || lead.companyName || 'N/A'}
                readOnly
                leftSection={<IconBuilding size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Email Address"
                value={selectedQuotation.contactEmail || lead.email || 'N/A'}
                readOnly
                leftSection={<IconMail size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Phone Number"
                value={selectedQuotation.contactPhone || lead.phone || 'N/A'}
                readOnly
                leftSection={<IconPhone size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Quotation Date"
                value={selectedQuotation.quotationDate ? new Date(selectedQuotation.quotationDate).toISOString().split('T')[0] : 'N/A'}
                readOnly
                leftSection={<IconCalendar size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Valid Until"
                value={selectedQuotation.validUntil ? new Date(selectedQuotation.validUntil).toISOString().split('T')[0] : 'N/A'}
                readOnly
                leftSection={<IconCalendarEvent size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />

              <TextInput
                label="Payment Terms"
                value={selectedQuotation.paymentTerms || 'Net 30 Days'}
                readOnly
                leftSection={<IconClock size={16} color="#64748B" />}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    fontWeight: 600,
                  },
                }}
              />
            </SimpleGrid>

            {/* Line Items Table */}
            {selectedQuotation.items && selectedQuotation.items.length > 0 && (
              <Box mb="lg">
                <Text fw={700} size="sm" mb="xs" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  Itemized Line Items ({selectedQuotation.items.length})
                </Text>
                <Paper
                  radius="md"
                  style={{
                    background: isDark ? '#1E293B' : '#F8FAFC',
                    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
                    overflow: 'hidden',
                  }}
                >
                  <Table verticalSpacing="xs" horizontalSpacing="md">
                    <Table.Thead style={{ background: isDark ? '#0F172A' : '#F1F5F9' }}>
                      <Table.Tr>
                        <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>ITEM / SERVICE</Table.Th>
                        <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>TYPE</Table.Th>
                        <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'center' }}>QTY</Table.Th>
                        <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'right' }}>UNIT PRICE</Table.Th>
                        <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'right' }}>DISCOUNT</Table.Th>
                        <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'right' }}>TAX</Table.Th>
                        <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'right' }}>TOTAL</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {selectedQuotation.items.map((item, idx) => {
                        const qty = Number(item.quantity) || 1;
                        const price = Number(item.unitPrice) || 0;
                        const gross = qty * price;
                        const disc = Number(item.discount) || 0;
                        const discType = item.discountType || (disc > 0 && disc <= 100 ? 'percentage' : 'fixed');
                        const discAmt = discType === 'percentage' ? (gross * disc) / 100 : Math.min(gross, disc);
                        const discDisplay = disc > 0
                          ? (discType === 'percentage'
                              ? `${disc}% (₹${discAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
                              : `₹${disc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
                          : '—';

                        return (
                          <Table.Tr key={item.id || idx}>
                            <Table.Td>
                              <Text size="xs" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                                {item.itemName}
                              </Text>
                              {item.description && (
                                <Text size="10px" c="dimmed">
                                  {item.description}
                                </Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Badge size="xs" variant="light" color={item.itemType === 'Product' ? 'blue' : 'teal'}>
                                {item.itemType || 'Service'}
                              </Badge>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center' }}>
                              <Text size="xs" fw={600}>
                                {item.quantity}
                              </Text>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Text size="xs" fw={600}>
                                ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Text size="xs" fw={disc > 0 ? 600 : 400} style={{ color: disc > 0 ? '#16A34A' : '#94A3B8' }}>
                                {discDisplay}
                              </Text>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Text size="xs" c="dimmed">
                                {item.taxRate}%
                              </Text>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Text size="xs" fw={700} style={{ color: '#2563EB' }}>
                                ₹{Number(item.totalAmount || (gross - discAmt) + ((gross - discAmt) * (item.taxRate || 18) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Paper>
              </Box>
            )}

            {/* Financial Summary Card with full discount breakdown */}
            {(() => {
              const grossSub = selectedQuotation.items?.reduce(
                (acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
                0
              ) || Number(selectedQuotation.subtotal) || 0;

              const totalItemDisc = selectedQuotation.items?.reduce((acc, it) => {
                const qty = Number(it.quantity) || 1;
                const price = Number(it.unitPrice) || 0;
                const gross = qty * price;
                const disc = Number(it.discount) || 0;
                const discType = it.discountType || (disc > 0 && disc <= 100 ? 'percentage' : 'fixed');
                return acc + (discType === 'percentage' ? (gross * disc) / 100 : Math.min(gross, disc));
              }, 0) || 0;

              const netSub = Math.max(0, grossSub - totalItemDisc);
              const overallDiscAmt = Number(selectedQuotation.discountAmount) || 0;
              const taxableAmt = Math.max(0, netSub - overallDiscAmt);

              return (
                <Paper
                  p="md"
                  radius="md"
                  mb="lg"
                  style={{
                    background: isDark ? '#1E293B' : '#F8FAFC',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                  }}
                >
                  <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md">
                    <div>
                      <Text size="11px" c="dimmed" fw={600}>
                        Subtotal before discounts
                      </Text>
                      <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        ₹{grossSub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </div>
                    <div>
                      <Text size="11px" c="dimmed" fw={600}>
                        Item-wise Discount
                      </Text>
                      <Text size="sm" fw={700} style={{ color: totalItemDisc > 0 ? '#16A34A' : isDark ? '#94A3B8' : '#64748B' }}>
                        {totalItemDisc > 0 ? `- ₹${totalItemDisc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
                      </Text>
                    </div>
                    <div>
                      <Text size="11px" c="dimmed" fw={600}>
                        Overall Discount {selectedQuotation.discountValue && selectedQuotation.discountValue > 0 ? `(${selectedQuotation.discountValue}%)` : ''}
                      </Text>
                      <Text size="sm" fw={700} style={{ color: overallDiscAmt > 0 ? '#16A34A' : isDark ? '#94A3B8' : '#64748B' }}>
                        {overallDiscAmt > 0 ? `- ₹${overallDiscAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
                      </Text>
                    </div>
                    <div>
                      <Text size="11px" c="dimmed" fw={600}>
                        Taxable Amount
                      </Text>
                      <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        ₹{taxableAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </div>
                    <div>
                      <Text size="11px" c="dimmed" fw={600}>
                        GST Amount
                      </Text>
                      <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        ₹{(selectedQuotation.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </div>
                    <div>
                      <Text size="11px" c="dimmed" fw={600}>
                        Grand Total
                      </Text>
                      <Text size="md" fw={800} style={{ color: '#2563EB' }}>
                        ₹{selectedQuotation.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0'}
                      </Text>
                    </div>
                  </SimpleGrid>
                </Paper>
              );
            })()}

            {/* Notes & Terms (if present) */}
            {(selectedQuotation.notes || selectedQuotation.termsConditions) && (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="lg">
                {selectedQuotation.notes && (
                  <Textarea
                    label="Internal Notes"
                    value={selectedQuotation.notes}
                    readOnly
                    minRows={2}
                    styles={{
                      input: {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    }}
                  />
                )}
                {selectedQuotation.termsConditions && (
                  <Textarea
                    label="Terms & Conditions"
                    value={selectedQuotation.termsConditions}
                    readOnly
                    minRows={2}
                    styles={{
                      input: {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    }}
                  />
                )}
              </SimpleGrid>
            )}

            {/* Footer Buttons */}
            <Group justify="flex-end" gap="sm">
              <Button
                variant="default"
                onClick={() => setSelectedQuotation(null)}
                style={{ borderRadius: 10 }}
              >
                Close
              </Button>
              <Button
                variant="light"
                color="indigo"
                leftSection={<IconPrinter size={15} />}
                onClick={() => {
                  if (selectedQuotation) printQuotationDirect(selectedQuotation);
                }}
                style={{ borderRadius: 10 }}
              >
                Print / Save PDF
              </Button>
              <Button
                variant="filled"
                color="blue"
                leftSection={<IconEdit size={15} />}
                onClick={() => {
                  const q = selectedQuotation;
                  setSelectedQuotation(null);
                  handleOpenEdit(q);
                }}
                style={{
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                }}
              >
                Edit Quotation
              </Button>

              {/* Conditional Navigation Button matching Quotation Status */}
              {selectedQuotation?.status === 'Accepted' && (
                <Button
                  color="teal"
                  rightSection={<IconArrowRight size={14} />}
                  onClick={() => {
                    setSelectedQuotation(null);
                    onNavigateSection('contracts');
                  }}
                  style={{ borderRadius: 10, fontWeight: 700 }}
                >
                  Proceed to Contract
                </Button>
              )}

              {selectedQuotation?.status === 'Changes Required' && (
                <Button
                  color="blue"
                  rightSection={<IconArrowRight size={14} />}
                  onClick={() => {
                    setSelectedQuotation(null);
                    onNavigateSection('negotiation');
                  }}
                  style={{ borderRadius: 10, fontWeight: 700 }}
                >
                  Proceed to Negotiation
                </Button>
              )}
            </Group>
          </Box>
        )}
      </Modal>



      {/* 5. Quotation Print / PDF Modal */}
      {printingQuotation && (
        <QuotationPrintModal
          opened={!!printingQuotation}
          onClose={() => setPrintingQuotation(null)}
          quotation={printingQuotation}
        />
      )}
    </Box>
  );
};
