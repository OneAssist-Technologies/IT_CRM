import React from 'react';
import {
  Group,
  TextInput,
  Select,
  Button,
  Paper,
  ActionIcon,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconSearch,
  IconX,
  IconFilterOff,
} from '@tabler/icons-react';
import { useSupportTicket } from '../../../context/SupportTicketContext';
import { TicketFilters } from '../../../types/supportTicket';

export const TicketFilterBar: React.FC = () => {
  const { filters, setFilters, resetFilters, metadata } = useSupportTicket();
  const computedColorScheme = useComputedColorScheme('light');
  const isDark = computedColorScheme === 'dark';

  const statusOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'New', label: 'New' },
    { value: 'Assigned', label: 'Assigned' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Pending Customer', label: 'Pending Customer' },
    { value: 'On Hold', label: 'On Hold' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Reopened', label: 'Reopened' },
    { value: 'Closed', label: 'Closed' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: 'All', label: 'All Priorities' },
    { value: 'Critical', label: 'Critical' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ];

  const issueTypeOptions = [
    { value: 'All', label: 'All Issue Types' },
    { value: 'Bug', label: 'Bug' },
    { value: 'Technical Issue', label: 'Technical Issue' },
    { value: 'UI / Design Issue', label: 'UI / Design Issue' },
    { value: 'Performance Issue', label: 'Performance Issue' },
    { value: 'Feature Request', label: 'Feature Request' },
    { value: 'Change Request', label: 'Change Request' },
    { value: 'General Support', label: 'General Support' },
  ];

  const employeeOptions = [
    { value: 'All', label: 'All Assignees' },
    ...(metadata?.employees || []).map((emp: any) => ({ value: emp.id, label: emp.name })),
  ];

  const isFiltered =
    Boolean(filters.search) ||
    filters.status !== 'All' ||
    filters.priority !== 'All' ||
    filters.issueType !== 'All' ||
    filters.assignedTo !== 'All';

  return (
    <Paper
      p="sm"
      radius="md"
      withBorder
      style={{
        width: '100%',
        background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#FFFFFF',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
        marginBottom: 16,
      }}
    >
      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder="Search by ID, Customer, Project, Subject..."
          leftSection={<IconSearch size={16} color="#94A3B8" />}
          rightSection={
            filters.search ? (
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={() => setFilters((prev: TicketFilters) => ({ ...prev, search: '' }))}
              >
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
          value={filters.search || ''}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setFilters((prev: TicketFilters) => ({ ...prev, search: val }));
          }}
          style={{ flex: '1 1 260px', minWidth: 200 }}
          size="sm"
          radius="md"
        />

        <Select
          placeholder="Status"
          data={statusOptions}
          value={filters.status || 'All'}
          onChange={(val) => setFilters((prev: TicketFilters) => ({ ...prev, status: val || 'All' }))}
          style={{ width: 140 }}
          size="sm"
          radius="md"
          clearable={false}
        />

        <Select
          placeholder="Priority"
          data={priorityOptions}
          value={filters.priority || 'All'}
          onChange={(val) => setFilters((prev: TicketFilters) => ({ ...prev, priority: val || 'All' }))}
          style={{ width: 130 }}
          size="sm"
          radius="md"
          clearable={false}
        />

        <Select
          placeholder="Issue Type"
          data={issueTypeOptions}
          value={filters.issueType || 'All'}
          onChange={(val) => setFilters((prev: TicketFilters) => ({ ...prev, issueType: val || 'All' }))}
          style={{ width: 160 }}
          size="sm"
          radius="md"
          clearable={false}
        />

        <Select
          placeholder="Assignee"
          data={employeeOptions}
          value={filters.assignedTo || 'All'}
          onChange={(val) => setFilters((prev: TicketFilters) => ({ ...prev, assignedTo: val || 'All' }))}
          style={{ width: 160 }}
          size="sm"
          radius="md"
          clearable={false}
        />

        {isFiltered && (
          <Tooltip label="Reset all filters">
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconFilterOff size={15} />}
              onClick={resetFilters}
            >
              Reset
            </Button>
          </Tooltip>
        )}
      </Group>
    </Paper>
  );
};

export default TicketFilterBar;
