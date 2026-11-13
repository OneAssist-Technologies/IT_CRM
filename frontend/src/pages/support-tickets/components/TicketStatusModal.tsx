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
  Alert,
} from '@mantine/core';
import { IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';
import { SupportTicket, TicketStatus } from '../../../types/supportTicket';
import { useSupportTicket } from '../../../context/SupportTicketContext';

interface TicketStatusModalProps {
  opened: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
  onSuccess?: () => void;
}

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  New: ['Assigned', 'Cancelled'],
  Assigned: ['In Progress', 'Cancelled'],
  'In Progress': ['Pending Customer', 'On Hold', 'Resolved'],
  'Pending Customer': ['In Progress'],
  'On Hold': ['In Progress'],
  Resolved: ['In Progress', 'Reopened', 'Closed'],
  Reopened: ['In Progress'],
  Closed: [],
  Cancelled: [],
};

export const TicketStatusModal: React.FC<TicketStatusModalProps> = ({
  opened,
  onClose,
  ticket,
  onSuccess,
}) => {
  const { changeStatus } = useSupportTicket();

  const [targetStatus, setTargetStatus] = useState<TicketStatus | null>(null);
  const [resolutionDescription, setResolutionDescription] = useState<string>('');
  const [rootCause, setRootCause] = useState<string>('');
  const [workaround, setWorkaround] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (ticket) {
      setTargetStatus(null);
      setResolutionDescription(ticket.resolutionDescription || '');
      setRootCause(ticket.rootCause || '');
      setWorkaround(ticket.workaround || '');
      setReason('');
      setErrorMsg(null);
    }
  }, [ticket, opened]);

  if (!ticket) return null;

  const currentStatus = ticket.status as TicketStatus;
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  const statusOptions = allowedNext.map((st) => ({ value: st, label: st }));

  const handleSubmit = async () => {
    if (!targetStatus) {
      setErrorMsg('Please select a target status');
      return;
    }

    if (targetStatus === 'Resolved') {
      try {
        const saved =
          localStorage.getItem(`crm_ticket_tasks_${ticket.id}`) ||
          (ticket.ticketNumber ? localStorage.getItem(`crm_ticket_tasks_${ticket.ticketNumber}`) : null);
        if (saved) {
          const tasks = JSON.parse(saved);
          if (Array.isArray(tasks) && tasks.length > 0) {
            const incomplete = tasks.filter(
              (t: any) => t.status !== 'Completed' && t.status !== 'Resolved'
            );
            if (incomplete.length > 0) {
              setErrorMsg(
                `Cannot resolve ticket: ${incomplete.length} task(s) in Work in Progress are still not completed.`
              );
              return;
            }
          }
        }
      } catch (_) {}

      if (!resolutionDescription.trim()) {
        setErrorMsg('Resolution Description is required to mark a ticket as Resolved');
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload: Record<string, any> = {
        reason: reason.trim() || undefined,
      };

      if (targetStatus === 'Resolved') {
        payload.resolution_description = resolutionDescription.trim();
        payload.root_cause = rootCause.trim() || undefined;
        payload.workaround = workaround.trim() || undefined;
      }

      await changeStatus(ticket.id, targetStatus, payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Status transition rejected');
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
          <Text fw={700}>Change Ticket Status</Text>
          <Badge color="blue" variant="light" size="sm">
            {ticket.ticketNumber}
          </Badge>
        </Group>
      }
      radius="md"
      size="md"
    >
      <Stack gap="md">
        <Group gap="xs">
          <Text size="sm" fw={500}>Current Status:</Text>
          <Badge size="sm">{currentStatus}</Badge>
        </Group>

        {allowedNext.length === 0 ? (
          <Alert color="gray" icon={<IconInfoCircle size={16} />}>
            This ticket is in a final state ({currentStatus}) and cannot be transitioned further.
          </Alert>
        ) : (
          <>
            <Select
              label="Select New Status"
              placeholder="Choose target status"
              data={statusOptions}
              value={targetStatus}
              onChange={(val) => {
                setTargetStatus(val as TicketStatus);
                setErrorMsg(null);
              }}
              required
            />

            {targetStatus === 'Resolved' && (
              <Stack gap="sm">
                <Alert color="teal" icon={<IconInfoCircle size={16} />}>
                  Resolving a ticket requires providing resolution details and root cause.
                </Alert>
                <Textarea
                  label="Fixed Details"
                  placeholder="Explain how this issue was resolved..."
                  rows={3}
                  value={resolutionDescription}
                  onChange={(e) => setResolutionDescription(e.currentTarget.value)}
                  required
                />
                <Textarea
                  label="Root Cause (Optional)"
                  placeholder="Identify what caused the defect or incident..."
                  rows={2}
                  value={rootCause}
                  onChange={(e) => setRootCause(e.currentTarget.value)}
                />
                <Textarea
                  label="Workaround (Optional)"
                  placeholder="Any interim workaround provided to client..."
                  rows={2}
                  value={workaround}
                  onChange={(e) => setWorkaround(e.currentTarget.value)}
                />
              </Stack>
            )}

            {targetStatus === 'Reopened' && (
              <Alert color="grape" icon={<IconAlertTriangle size={16} />}>
                Reopening will increment the ticket's Reopened Count and preserve prior resolution records.
              </Alert>
            )}

            <Textarea
              label="Transition Notes / Reason"
              placeholder="Why is this status change being made?"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
            />

            {errorMsg && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                {errorMsg}
              </Alert>
            )}

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                color="blue"
                onClick={handleSubmit}
                loading={submitting}
                disabled={!targetStatus}
              >
                Apply Transition
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
};

export default TicketStatusModal;

