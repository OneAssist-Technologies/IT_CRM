import React from 'react';
import {
  Table,
  Group,
  Text,
  Badge,
  ActionIcon,
  Paper,
  Stack,
  Center,
  Tooltip,
  useComputedColorScheme,
  Box,
} from '@mantine/core';
import {
  IconBuilding,
  IconUser,
  IconCalendarEvent,
  IconCalendar,
  IconClock,
  IconPlus,
  IconChevronRight,
  IconTarget,
} from '@tabler/icons-react';
import { Lead } from '../../../types/lead';
import { ScheduledMeeting } from '../../../types/meeting';
import { isMeetingForLead } from '../meetingLeadUtils';

interface LeadMeetingsTableViewProps {
  leads: Lead[];
  meetings: ScheduledMeeting[];
  activeTab?: string;
  statusFilter?: string;
  onSelectLead: (lead: Lead) => void;
  onScheduleMeetingForLead: (lead: Lead) => void;
  loading?: boolean;
}

export const LeadMeetingsTableView: React.FC<LeadMeetingsTableViewProps> = ({
  leads,
  meetings,
  activeTab = 'ALL',
  statusFilter = 'All',
  onSelectLead,
  onScheduleMeetingForLead,
  loading = false,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const getLeadMeetings = (lead: Lead) => {
    let leadAllMeetings = meetings.filter((m) => isMeetingForLead(m, lead));

    if (activeTab === 'COMPLETED') {
      leadAllMeetings = leadAllMeetings.filter(
        (m) => (m.status || m.meetingStatus || '').toLowerCase() === 'completed'
      );
    } else if (activeTab === 'TODAY') {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      leadAllMeetings = leadAllMeetings.filter((m) => m.meetingDate === todayStr);
    } else if (activeTab === 'UPCOMING') {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      leadAllMeetings = leadAllMeetings.filter(
        (m) => m.meetingDate && m.meetingDate > todayStr && (m.status || m.meetingStatus || '').toLowerCase() !== 'cancelled'
      );
    }

    if (statusFilter && statusFilter !== 'All') {
      leadAllMeetings = leadAllMeetings.filter(
        (m) => (m.status || m.meetingStatus || '').toLowerCase() === statusFilter.toLowerCase()
      );
    }

    return leadAllMeetings;
  };

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const parts = dateString.split('T')[0].split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      const d = new Date(dateString);
      return isNaN(d.getTime()) ? dateString : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const renderStatusBadge = (status?: string) => {
    const s = (status || 'SCHEDULED').toUpperCase();
    let bg = isDark ? 'rgba(234, 179, 8, 0.15)' : '#FEF9C3';
    let color = isDark ? '#FDE047' : '#854D0E';
    let border = isDark ? 'rgba(234, 179, 8, 0.3)' : '#FEF08A';
    let label = status || 'Scheduled';

    if (s.includes('COMPLET')) {
      bg = isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5';
      color = isDark ? '#34D399' : '#047857';
      border = isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0';
    } else if (s.includes('PROGRESS') || s.includes('INTERESTING')) {
      bg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';
      color = isDark ? '#60A5FA' : '#1D4ED8';
      border = isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE';
    } else if (s.includes('CANCEL') || s.includes('NOT INTEREST')) {
      bg = isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2';
      color = isDark ? '#F87171' : '#B91C1C';
      border = isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA';
    } else if (s.includes('RESCHEDUL')) {
      bg = isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED';
      color = isDark ? '#FB923C' : '#C2410C';
      border = isDark ? 'rgba(249, 115, 22, 0.3)' : '#FED7AA';
    } else if (s.includes('PROPOSAL') || s.includes('GATHER') || s.includes('CONSIDER')) {
      bg = isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF';
      color = isDark ? '#818CF8' : '#4338CA';
      border = isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE';
    }

    return (
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 12px',
          borderRadius: 100,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.02em',
          textTransform: 'capitalize',
        }}
      >
        {label}
      </Box>
    );
  };

  if (!loading && leads.length === 0) {
    return (
      <Paper
        p="3.5rem"
        radius="lg"
        style={{
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
          textAlign: 'center',
          marginTop: 16,
        }}
      >
        <Center>
          <Stack align="center" gap="sm">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: isDark ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#818CF8' : '#4F46E5',
              }}
            >
              <IconTarget size={32} stroke={1.8} />
            </Box>
            <Text fw={700} size="lg" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
              No Meetings Found
            </Text>
            <Text size="sm" c="dimmed" style={{ maxWidth: 420 }}>
              No leads currently have meetings matching your search or filters. Click &quot;Schedule Meeting&quot; above to schedule one.
            </Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  return (
    <Paper
      radius="lg"
      style={{
        backgroundColor: isDark ? '#111827' : '#FFFFFF',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
        overflow: 'hidden',
        marginTop: 16,
      }}
    >
      <Table.ScrollContainer minWidth={850}>
        <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
          <Table.Thead
            style={{
              backgroundColor: isDark ? '#0F172A' : '#FBFBFC',
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #F1F5F9',
            }}
          >
            <Table.Tr>
              {/* 1. LEAD NAME */}
              <Table.Th style={{ color: '#64748B', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>
                LEAD NAME
              </Table.Th>

              {/* 2. COMPANY / PROFESSION */}
              <Table.Th style={{ color: '#64748B', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>
                COMPANY / PROFESSION
              </Table.Th>

              {/* 3. MEETINGS COUNT */}
              <Table.Th style={{ color: '#64748B', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>
                MEETINGS COUNT
              </Table.Th>

              {/* 4. LATEST MEETING DATE */}
              <Table.Th style={{ color: '#64748B', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>
                {activeTab === 'COMPLETED' ? 'LAST COMPLETED DATE' : 'LATEST MEETING DATE'}
              </Table.Th>

              {/* 5. STATUS */}
              <Table.Th style={{ color: '#64748B', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>
                STATUS
              </Table.Th>

              {/* 6. ACTIONS */}
              <Table.Th style={{ color: '#64748B', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textAlign: 'right' }}>
                ACTIONS
              </Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {leads.map((lead) => {
              const allLeadMeetings = meetings.filter((m) => isMeetingForLead(m, lead));
              const leadMeetings = getLeadMeetings(lead);
              const meetingsCount = leadMeetings.length;
              const initialLetter = (lead.name || 'L').charAt(0).toUpperCase();

              // Active meetings (excluding cancelled)
              const activeAllMeets = allLeadMeetings.filter(
                (m) => (m.status || m.meetingStatus || '').toLowerCase() !== 'cancelled'
              );
              // Pending meetings that still need to be attended
              const pendingMeets = activeAllMeets.filter(
                (m) => (m.status || m.meetingStatus || '').toLowerCase() !== 'completed'
              );
              // Lead is ONLY marked Completed if ALL active scheduled meetings are complete!
              const isAllCompleted = activeAllMeets.length > 0 && pendingMeets.length === 0;

              // Overall status: Completed only when all are done, otherwise Scheduled (or active status)
              const meetingStatus =
                activeTab === 'COMPLETED' || isAllCompleted
                  ? 'Completed'
                  : (pendingMeets[0]?.status || pendingMeets[0]?.meetingStatus || 'Scheduled');

              // Determine display meeting:
              // If all complete: show latest completed meeting date.
              // Otherwise: show NEXT meeting to attend (earliest upcoming/today date & time).
              let displayMeeting: ScheduledMeeting | undefined;
              if (isAllCompleted || activeTab === 'COMPLETED') {
                const sortedCompleted = [...(activeTab === 'COMPLETED' ? leadMeetings : activeAllMeets)]
                  .filter((m) => (m.status || m.meetingStatus || '').toLowerCase() === 'completed')
                  .sort((a, b) => {
                    const dateA = a.meetingDate || '';
                    const dateB = b.meetingDate || '';
                    if (dateA !== dateB) return dateB.localeCompare(dateA);
                    return (b.startTime || '').localeCompare(a.startTime || '');
                  });
                displayMeeting = sortedCompleted[0];
              } else {
                const sortedPending = [...pendingMeets].sort((a, b) => {
                  const dateA = a.meetingDate || '';
                  const dateB = b.meetingDate || '';
                  if (dateA !== dateB) return dateA.localeCompare(dateB);
                  return (a.startTime || '').localeCompare(b.startTime || '');
                });
                displayMeeting = sortedPending[0] || leadMeetings[0];
              }

              const lastMeetingDate = displayMeeting?.meetingDate;
              const lastMeetingTime = displayMeeting?.startTime;

              return (
                <Table.Tr
                  key={lead.id}
                  style={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onClick={() => onSelectLead(lead)}
                >
                  {/* 1. LEAD NAME */}
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Box
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          background: isDark ? '#14532D' : '#DCFCE7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isDark ? '#86EFAC' : '#15803D',
                          fontWeight: 700,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {initialLetter}
                      </Box>
                      <div>
                        <Text
                          fw={700}
                          size="sm"
                          style={{
                            color: isDark ? '#F9FAFB' : '#0F172A',
                          }}
                        >
                          {lead.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {lead.email || lead.phone || `Lead ID: ${lead.leadId || lead.id.slice(0, 8)}`}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>

                  {/* 2. COMPANY NAME */}
                  <Table.Td>
                    <Stack gap={2}>
                      <Group gap={6} wrap="nowrap">
                        {lead.companyName ? (
                          <>
                            <IconBuilding size={15} color="#64748B" />
                            <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                              {lead.companyName}
                            </Text>
                          </>
                        ) : (
                          <>
                            <IconUser size={15} color="#64748B" />
                            <Text size="sm" fw={500} style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
                              {lead.profession || 'Individual'}
                            </Text>
                          </>
                        )}
                      </Group>
                      {lead.designation && lead.companyName && (
                        <Text size="xs" c="dimmed">
                          {lead.designation}
                        </Text>
                      )}
                    </Stack>
                  </Table.Td>

                  {/* 3. MEETINGS COUNT */}
                  <Table.Td>
                    <Box
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px 10px',
                        borderRadius: 100,
                        backgroundColor:
                          activeTab === 'COMPLETED'
                            ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5')
                            : (isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF'),
                        color:
                          activeTab === 'COMPLETED'
                            ? (isDark ? '#34D399' : '#047857')
                            : (isDark ? '#A5B4FC' : '#4F46E5'),
                        border:
                          activeTab === 'COMPLETED'
                            ? (isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #A7F3D0')
                            : (isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #E0E7FF'),
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {meetingsCount} {meetingsCount === 1 ? 'Meeting' : 'Meetings'}
                    </Box>
                  </Table.Td>

                  {/* 4. LATEST MEETING DATE */}
                  <Table.Td>
                    {displayMeeting ? (
                      <Stack gap={2}>
                        <Group gap={6} wrap="nowrap">
                          <IconCalendar size={14} color="#64748B" />
                          <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                            {formatDisplayDate(lastMeetingDate)}
                          </Text>
                        </Group>
                        {lastMeetingTime && (
                          <Group gap={6} wrap="nowrap">
                            <IconClock size={12} color="#94A3B8" />
                            <Text size="xs" c="dimmed">
                              {lastMeetingTime}
                            </Text>
                          </Group>
                        )}
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>

                  {/* 5. STATUS */}
                  <Table.Td>
                    {renderStatusBadge(meetingStatus)}
                  </Table.Td>

                  {/* 6. ACTIONS */}
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap="xs" justify="flex-end" wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                      <Tooltip label={`View Meetings (${meetingsCount})`} withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="indigo"
                          size="md"
                          radius="md"
                          onClick={() => onSelectLead(lead)}
                        >
                          <IconCalendarEvent size={16} />
                        </ActionIcon>
                      </Tooltip>

                      <Tooltip label="Schedule Another Meeting" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="teal"
                          size="md"
                          radius="md"
                          onClick={() => onScheduleMeetingForLead(lead)}
                        >
                          <IconPlus size={16} />
                        </ActionIcon>
                      </Tooltip>

                      <Tooltip label="Open Meetings" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="md"
                          radius="md"
                          onClick={() => onSelectLead(lead)}
                        >
                          <IconChevronRight size={16} />
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
  );
};
