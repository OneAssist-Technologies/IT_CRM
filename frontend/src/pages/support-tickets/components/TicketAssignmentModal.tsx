import React, { useState, useEffect } from 'react';
import {
  Modal,
  Select,
  Textarea,
  Button,
  Group,
  Stack,
  Text,
  Badge,
} from '@mantine/core';
import { SupportTicket } from '../../../types/supportTicket';
import { useSupportTicket } from '../../../context/SupportTicketContext';

interface TicketAssignmentModalProps {
  opened: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
}

export const TicketAssignmentModal: React.FC<TicketAssignmentModalProps> = ({
  opened,
  onClose,
  ticket,
}) => {
  const { metadata, reassignTicket } = useSupportTicket();

  const [team, setTeam] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [teamLeadId, setTeamLeadId] = useState<string | null>(null);
  const [qaAssignedTo, setQaAssignedTo] = useState<string | null>(null);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (ticket) {
      setTeam(ticket.assignedTeam || null);
      setAssignedTo(ticket.assignedTo || null);
      setTeamLeadId(ticket.teamLeadId || null);
      setQaAssignedTo(ticket.qaAssignedTo || null);
      setReason('');
    }
  }, [ticket]);

  if (!ticket) return null;

  const teamOptions = (metadata?.teams || []).map((t) => ({ value: t, label: t }));
  const employeeOptions = (metadata?.employees || []).map((emp) => ({
    value: emp.id,
    label: `${emp.name} (${emp.designation || emp.department || 'Staff'})`,
  }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await reassignTicket(ticket.id, {
        assigned_team: team || undefined,
        assigned_to: assignedTo || undefined,
        team_lead_id: teamLeadId || undefined,
        qa_assigned_to: qaAssignedTo || undefined,
        reason: reason.trim() || undefined,
      });
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
          Change responsible team, developer, lead, or QA specialist. This action will be logged in the assignment history.
        </Text>

        <Select
          label="Responsible Team / Department"
          placeholder="Select team"
          data={teamOptions}
          value={team}
          onChange={setTeam}
          clearable
        />

        <Select
          label="Assigned Developer / Support Agent"
          placeholder="Select staff member"
          data={employeeOptions}
          value={assignedTo}
          onChange={setAssignedTo}
          searchable
          clearable
        />

        <Select
          label="Team Lead / Escalation Contact"
          placeholder="Select team lead"
          data={employeeOptions}
          value={teamLeadId}
          onChange={setTeamLeadId}
          searchable
          clearable
        />

        <Select
          label="QA Assigned To"
          placeholder="Select QA reviewer"
          data={employeeOptions}
          value={qaAssignedTo}
          onChange={setQaAssignedTo}
          searchable
          clearable
        />

        <Textarea
          label="Assignment Notes / Reason"
          placeholder="Optional explanation for this assignment or escalation..."
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
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

