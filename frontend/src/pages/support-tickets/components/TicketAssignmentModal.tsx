import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Select,
  MultiSelect,
  Autocomplete,
  Textarea,
  Button,
  Group,
  Stack,
  Text,
  Badge,
} from '@mantine/core';
import { SupportTicket } from '../../../types/supportTicket';
import { useSupportTicket } from '../../../context/SupportTicketContext';

export interface AssignmentResult {
  team?: string | null;
  teamLeadId?: string | null;
  teamLeadName?: string | null;
  teamMembers?: string[];
  teamMemberNames?: string[];
  assignedTask?: string | null;
  notes?: string;
  finalAssigneeName?: string;
}

interface TicketAssignmentModalProps {
  opened: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
  tasks?: Array<{ id: string; refNumber?: string; taskName: string; assignedTo?: string } | any>;
  onSuccess?: (result?: AssignmentResult) => void;
}

export const TicketAssignmentModal: React.FC<TicketAssignmentModalProps> = ({
  opened,
  onClose,
  ticket,
  tasks,
  onSuccess,
}) => {
  const { metadata, reassignTicket } = useSupportTicket();

  const [team, setTeam] = useState<string>('');
  const [teamLeadId, setTeamLeadId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [assignedTask, setAssignedTask] = useState<string | null>('ALL');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (ticket) {
      const initialTeam = ticket.assignedTeam || 'Engineering / Development';
      setTeam(initialTeam);
      setTeamLeadId(ticket.teamLeadId || null);
      setTeamMembers(ticket.assignedTo ? [ticket.assignedTo] : []);
      setAssignedTask('ALL');
      setAssignmentNotes('');
    }
  }, [ticket, tasks]);

  if (!ticket) return null;

  const defaultTeams = [
    'Engineering / Development',
    'Quality Assurance (QA)',
    'Technical Support',
    'Customer Success',
    'Product Management',
    'DevOps & Infrastructure',
    'Security & Compliance',
    'UI / Design Team',
    'Mobile Development',
  ];

  const teamSuggestions = Array.from(new Set([...defaultTeams, ...(metadata?.teams || [])]));

  const employeeOptions = (metadata?.employees || []).map((emp) => ({
    value: emp.id,
    label: `${emp.name} (${emp.designation || emp.department || 'Staff'})`,
  }));

  const taskOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [
      { value: 'ALL', label: 'All Tasks (Entire Work in Progress)' },
    ];
    if (tasks && tasks.length > 0) {
      tasks.forEach((t) => {
        list.push({
          value: t.id || t.taskName,
          label: `${t.refNumber ? `${t.refNumber} • ` : ''}${t.taskName}`,
        });
      });
    } else {
      list.push(
        { value: 'task-1', label: 'TSK-01 • Issue Diagnosis & Reproduction (UI / Design Issue)' },
        { value: 'task-2', label: 'TSK-02 • Root Cause Analysis & Code Fix' },
        { value: 'task-3', label: 'TSK-03 • Quality Assurance Testing & Validation' },
        { value: 'task-4', label: 'Hotfix Deployment & Code Verification' },
        { value: 'task-5', label: 'Customer Verification & Sign-off' },
      );
    }
    return list;
  }, [tasks]);

  const teamLeadObj = (metadata?.employees || []).find((e) => e.id === teamLeadId);
  const chosenTeamLeadName = teamLeadObj ? teamLeadObj.name : '';

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const memberObjs = (metadata?.employees || []).filter((e) => teamMembers.includes(e.id));
      const memberNames = memberObjs.map((m) => m.name);

      const taskObj = taskOptions.find((t) => t.value === assignedTask);
      const selectedTaskLabel = taskObj?.label || (assignedTask === 'ALL' ? 'All Tasks' : assignedTask) || '';

      const trimmedTeam = team.trim();

      // Determine what name should be displayed in the Assigned To column:
      // Priority 1: If Team Lead is selected, show Team Lead name (as requested by user)
      // Priority 2: If Team is selected or custom-typed, show Team name (as requested by user)
      // Priority 3: If Team Members are selected, show member names
      // Priority 4: Fallback to ticket assignedToName or 'Assigned'
      const finalAssigneeName =
        chosenTeamLeadName ||
        trimmedTeam ||
        (memberNames.length > 0 ? memberNames.join(', ') : '') ||
        ticket.assignedToName ||
        'Assigned';

      // Construct detailed assignment history message
      let compositeReason = assignmentNotes.trim();
      const detailsParts: string[] = [];
      if (selectedTaskLabel) detailsParts.push(`Task: ${selectedTaskLabel}`);
      if (trimmedTeam) detailsParts.push(`Team: ${trimmedTeam}`);
      if (chosenTeamLeadName) detailsParts.push(`Lead: ${chosenTeamLeadName}`);
      if (memberNames.length > 0) detailsParts.push(`Members: ${memberNames.join(', ')}`);

      if (detailsParts.length > 0) {
        compositeReason = compositeReason
          ? `[${detailsParts.join(' | ')}] ${compositeReason}`
          : `Assigned: ${detailsParts.join(' | ')}`;
      }

      // Primary assigned user on ticket
      const primaryAssignedId = teamLeadId || (teamMembers.length > 0 ? teamMembers[0] : undefined);

      await reassignTicket(ticket.id, {
        assigned_team: trimmedTeam || undefined,
        assigned_to: primaryAssignedId || undefined,
        team_lead_id: teamLeadId || undefined,
        reason: compositeReason || 'Assignment updated',
      });

      if (onSuccess) {
        onSuccess({
          team: trimmedTeam || null,
          teamLeadId,
          teamLeadName: chosenTeamLeadName,
          teamMembers,
          teamMemberNames: memberNames,
          assignedTask,
          notes: assignmentNotes.trim(),
          finalAssigneeName,
        });
      }

      onClose();
    } catch (e) {
      // handled by notification
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Text fw={700}>Assign / Reassign Ticket</Text>
          <Badge color="blue" variant="light" size="sm">
            {ticket.ticketNumber}
          </Badge>
        </Group>
      }
      radius="md"
      size="md"
    >
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          Change responsible team (select or type custom), assigned team lead, team members, and task.
        </Text>

        {/* 1. Responsible Team / Department (Select or Type Custom) */}
        <Autocomplete
          label="Responsible Team / Department"
          placeholder="Select or type custom team / department"
          data={teamSuggestions}
          value={team}
          onChange={(val) => setTeam(val)}
          clearable
        />

        {/* 2. Assigned Team Lead */}
        <Select
          label="Assigned Team Lead"
          placeholder="Select team lead"
          data={employeeOptions}
          value={teamLeadId}
          onChange={setTeamLeadId}
          searchable
          clearable
        />

        {/* 3. Team Members */}
        <MultiSelect
          label="Team Members"
          placeholder="Select team members"
          data={employeeOptions}
          value={teamMembers}
          onChange={setTeamMembers}
          searchable
          clearable
        />

        {/* 4. Assigned Task */}
        <Select
          label="Assigned Task"
          placeholder="Select assigned task"
          data={taskOptions}
          value={assignedTask}
          onChange={setAssignedTask}
          searchable
          clearable
        />

        {/* 5. Assignment Notes */}
        <Textarea
          label="Assignment Notes"
          placeholder="Optional explanation, instructions, or notes for this assignment..."
          rows={3}
          value={assignmentNotes}
          onChange={(e) => setAssignmentNotes(e.currentTarget.value)}
        />

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button color="blue" onClick={handleSubmit} loading={submitting}>
            Confirm Assignment
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default TicketAssignmentModal;
