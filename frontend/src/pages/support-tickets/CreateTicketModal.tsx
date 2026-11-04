import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  Autocomplete,
  Button,
  Group,
  Stack,
  SimpleGrid,
  Text,
  Badge,
  FileInput,
  Paper,
  Box,
} from '@mantine/core';
import {
  IconUpload,
  IconPaperclip,
  IconTicket,
} from '@tabler/icons-react';
import { useSupportTicket } from '../../context/SupportTicketContext';
import { useCRM } from '../../context/CRMContext';
import {
  SupportTicket,
  TicketPriority,
  TicketIssueType,
  TicketSource,
} from '../../types/supportTicket';

interface CreateTicketModalProps {
  opened: boolean;
  onClose: () => void;
  ticket?: SupportTicket | null;
  onSuccess?: (ticketId: string) => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  opened,
  onClose,
  ticket,
  onSuccess,
}) => {
  const { metadata, createTicket, updateTicket, uploadAttachments, totalTickets } = useSupportTicket();
  const { currentUser } = useCRM();

  const isEdit = Boolean(ticket);

  // Form states
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [source, setSource] = useState<TicketSource>('Customer');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactPersonName, setContactPersonName] = useState<string>('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [handoverId, setHandoverId] = useState<string>('');
  const [contractId, setContractId] = useState<string | null>(null);
  const [affectedModule, setAffectedModule] = useState<string>('');
  const [issueType, setIssueType] = useState<TicketIssueType>('Bug');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [reportedBy, setReportedBy] = useState<string>('');
  const [assignedTeam, setAssignedTeam] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Auto-calculated Ticket ID preview
  const previewTicketId = `TKT-${String(totalTickets + 1).padStart(6, '0')}`;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'New': return 'teal';
      case 'Assigned': return 'blue';
      case 'In Progress': return 'indigo';
      case 'Pending Customer': return 'orange';
      case 'On Hold': return 'yellow';
      case 'Resolved': return 'green';
      case 'Closed': return 'gray';
      case 'Reopened': return 'grape';
      case 'Cancelled': return 'red';
      default: return 'blue';
    }
  };

  // Reset or pre-populate form when modal opens or ticket changes
  useEffect(() => {
    if (opened) {
      if (ticket) {
        setSubject(ticket.subject || '');
        setDescription(ticket.description || '');
        setSource((ticket.source as TicketSource) || 'Customer');

        // Match customer / lead ID
        let matchedCustId: string | null = ticket.customerId || null;
        if (!matchedCustId && ticket.customerName) {
          const cNameLower = ticket.customerName.toLowerCase().trim();
          const foundCust = (metadata?.customers || []).find(
            (c) => c.name && c.name.toLowerCase().trim() === cNameLower
          );
          if (foundCust) {
            matchedCustId = foundCust.id;
          } else {
            const foundLead = (metadata?.leads || []).find(
              (l) => (l.companyName || l.name || '').toLowerCase().trim() === cNameLower
            );
            if (foundLead) {
              matchedCustId = `lead:${foundLead.id}`;
            }
          }
        }
        setCustomerId(matchedCustId);

        setContactId(ticket.contactId || null);
        setContactPersonName(ticket.contactName || (ticket as any).contactPerson || '');
        setProjectId(ticket.projectId || null);
        setHandoverId(ticket.handoverId || '');
        setContractId(ticket.contractId || null);
        setAffectedModule(ticket.affectedModule || '');
        setIssueType((ticket.issueType as TicketIssueType) || 'Bug');
        setPriority((ticket.priority as TicketPriority) || 'Medium');
        setReportedBy(ticket.reportedBy || currentUser?.name || 'Staff User');
        setAssignedTeam(ticket.assignedTeam || null);
        setAssignedTo(ticket.assignedTo || null);

        if (ticket.resolutionDueAt) {
          try {
            const d = new Date(ticket.resolutionDueAt);
            if (!isNaN(d.getTime())) {
              setDueDate(d.toISOString().split('T')[0]);
            } else {
              setDueDate('');
            }
          } catch {
            setDueDate('');
          }
        } else {
          setDueDate('');
        }

        setFiles([]);
      } else {
        setSubject('');
        setDescription('');
        setSource('Customer');
        setCustomerId(null);
        setContactId(null);
        setContactPersonName('');
        setProjectId(null);
        setHandoverId('');
        setContractId(null);
        setAffectedModule('');
        setIssueType('Bug');
        setPriority('Medium');
        setReportedBy(currentUser?.name || 'Staff User');
        setAssignedTeam(null);
        setAssignedTo(null);
        setDueDate('');
        setFiles([]);
      }
    }
  }, [opened, ticket, currentUser, metadata]);

  // Combined Customer & Lead list for client company selection
  const customerList = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    (metadata?.customers || []).forEach((c) => {
      list.push({
        value: c.id,
        label: `${c.name} (${c.code || 'CUST'})`,
      });
      if (c.name) seen.add(c.name.toLowerCase().trim());
    });

    (metadata?.leads || []).forEach((ld) => {
      const company = (ld.companyName || ld.name || '').trim();
      if (company && !seen.has(company.toLowerCase())) {
        list.push({
          value: `lead:${ld.id}`,
          label: `${company} (${ld.code || 'LEAD'})`,
        });
        seen.add(company.toLowerCase());
      }
    });

    return list;
  }, [metadata?.customers, metadata?.leads]);

  // Auto-fetch Contact Person and Project when Customer / Client is selected
  const handleCustomerChange = (val: string | null) => {
    setCustomerId(val);
    setProjectId(null);

    if (!val) {
      setContactId(null);
      setContactPersonName('');
      return;
    }

    let companyName = '';
    let autoContact = '';
    let foundContactId: string | null = null;

    if (val.startsWith('lead:')) {
      const leadId = val.replace('lead:', '');
      const lead = (metadata?.leads || []).find((l) => l.id === leadId);
      companyName = (lead?.companyName || lead?.name || '').toLowerCase().trim();
      autoContact = lead?.name || '';
    } else {
      const cust = (metadata?.customers || []).find((c) => c.id === val);
      companyName = (cust?.name || '').toLowerCase().trim();
      autoContact = cust?.contactPerson || '';

      // Check if there is an exact matching contact in Contact table
      const matchedContact = (metadata?.contacts || []).find(
        (ct) => ct.companyName && ct.companyName.toLowerCase().trim() === companyName
      );
      if (matchedContact) {
        foundContactId = matchedContact.id;
        if (!autoContact) autoContact = matchedContact.name;
      }

      // Check if there is a matching lead in Lead table
      if (!autoContact) {
        const matchedLead = (metadata?.leads || []).find(
          (ld) => ld.companyName && ld.companyName.toLowerCase().trim() === companyName
        );
        if (matchedLead) autoContact = matchedLead.name;
      }
    }

    setContactPersonName(autoContact.trim());
    setContactId(foundContactId);

    // Auto-select project if there's only 1 matching project for this customer/client
    if (companyName) {
      const custProjects = (metadata?.projects || []).filter(
        (p) => p.clientName && p.clientName.toLowerCase().trim() === companyName
      );
      if (custProjects.length === 1) {
        setProjectId(custProjects[0].id);
      }
    }
  };

  // Autocomplete suggestions for Contact Person (customer contactPerson, contact records, and leads)
  const contactSuggestions = useMemo(() => {
    let companyName = '';
    if (customerId) {
      if (customerId.startsWith('lead:')) {
        const leadId = customerId.replace('lead:', '');
        const lead = (metadata?.leads || []).find((l) => l.id === leadId);
        companyName = (lead?.companyName || lead?.name || '').toLowerCase().trim();
      } else {
        const cust = (metadata?.customers || []).find((c) => c.id === customerId);
        companyName = (cust?.name || '').toLowerCase().trim();
      }
    }

    const set = new Set<string>();

    if (customerId && !customerId.startsWith('lead:')) {
      const cust = (metadata?.customers || []).find((c) => c.id === customerId);
      if (cust?.contactPerson?.trim()) set.add(cust.contactPerson.trim());
    }

    (metadata?.contacts || []).forEach((ct) => {
      if (!companyName || (ct.companyName && ct.companyName.toLowerCase().trim() === companyName)) {
        if (ct.name?.trim()) set.add(ct.name.trim());
      }
    });

    (metadata?.leads || []).forEach((ld) => {
      if (!companyName || (ld.companyName && ld.companyName.toLowerCase().trim() === companyName)) {
        if (ld.name?.trim()) set.add(ld.name.trim());
      }
    });

    return Array.from(set);
  }, [metadata?.customers, metadata?.contacts, metadata?.leads, customerId]);

  // Filter projects by customer
  const selectedCustomer = metadata?.customers.find((c) => c.id === customerId);
  const filteredProjects = (metadata?.projects || []).filter((p) => {
    if (!selectedCustomer) return true;
    return p.clientName && p.clientName.toLowerCase() === selectedCustomer.name.toLowerCase();
  });
  const projectOptions = (filteredProjects.length > 0 ? filteredProjects : (metadata?.projects || [])).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.code || 'PRJ'})`,
  }));

  // Filter contracts
  const contractOptions = (metadata?.contracts || []).map((k) => ({
    value: k.id,
    label: `${k.title} (${k.contractType || 'Contract'})`,
  }));

  const teamOptions = (metadata?.teams || []).map((t) => ({ value: t, label: t }));
  const employeeOptions = (metadata?.employees || []).map((emp) => ({
    value: emp.id,
    label: `${emp.name} (${emp.department || emp.designation || 'Staff'})`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const cleanCustomerId = customerId && !customerId.startsWith('lead:') ? customerId : undefined;
      const cleanContactName = contactPersonName.trim() || undefined;

      const payload: any = {
        subject: subject.trim(),
        description: description.trim(),
        source,
        customer_id: cleanCustomerId,
        contact_id: contactId || undefined,
        contact_name: cleanContactName,
        project_id: projectId || undefined,
        handover_id: handoverId.trim() || undefined,
        contract_id: contractId || undefined,
        affected_module: affectedModule.trim() || undefined,
        issue_type: issueType,
        priority,
        reported_by: reportedBy.trim() || 'Staff',
        assigned_team: assignedTeam || undefined,
        assigned_to: assignedTo || undefined,
        due_date: dueDate || undefined,
      };

      if (isEdit && ticket?.id) {
        if (dueDate) {
          payload.resolution_due_at = new Date(dueDate).toISOString();
        }
        await updateTicket(ticket.id, payload);
        if (files.length > 0) {
          await uploadAttachments(ticket.id, files);
        }
        onClose();
        if (onSuccess) onSuccess(ticket.id);
      } else {
        const created = await createTicket(payload, files);
        onClose();
        if (onSuccess) onSuccess(created.id);
      }
    } catch {
      // notification shown by context
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
          <IconTicket size={20} color="#2563EB" />
          <Text fw={700} size="md">
            {isEdit ? 'Edit Support Ticket' : 'Create Support Ticket'}
          </Text>
        </Group>
      }
      size="xl"
      radius="md"
      padding="lg"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Header Bar with Ticket ID & Status */}
          <Paper p="xs" radius="md" withBorder style={{ background: '#F8FAFC' }}>
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Text size="xs" fw={600} c="dimmed">
                  {isEdit ? 'TICKET ID:' : 'TICKET ID (AUTO-GENERATED):'}
                </Text>
                <Badge color="blue" variant="filled" size="md" style={{ fontFamily: 'monospace' }}>
                  {isEdit ? ticket?.ticketNumber : previewTicketId}
                </Badge>
              </Group>
              <Badge color={isEdit ? getStatusColor(ticket?.status) : 'teal'} variant="light" size="sm">
                Status: {isEdit ? ticket?.status : 'New'}
              </Badge>
            </Group>
          </Paper>

          {/* Subject & Source */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Box style={{ gridColumn: 'span 2' }}>
              <TextInput
                label="Subject / Title"
                placeholder="e.g. Critical: Payment Gateway Timeout on Checkout"
                value={subject}
                onChange={(e) => setSubject(e.currentTarget.value)}
                required
              />
            </Box>
            <Select
              label="Ticket Source"
              data={['Customer', 'Email', 'Phone', 'Internal', 'Project']}
              value={source}
              onChange={(val) => setSource((val as TicketSource) || 'Customer')}
              required
            />
          </SimpleGrid>

          {/* Description */}
          <Textarea
            label="Problem Description"
            placeholder="Provide a detailed explanation of the problem, error messages, and customer observations..."
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            required
          />

          {/* CRM Relationships: Customer, Contact, Project */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Select
              label="Customer / Client Company"
              placeholder="Select customer or client"
              data={customerList}
              value={customerId}
              onChange={handleCustomerChange}
              searchable
              clearable
            />

            <Autocomplete
              label="Contact Person"
              placeholder="Enter or select contact person"
              data={contactSuggestions}
              value={contactPersonName}
              onChange={(val) => {
                setContactPersonName(val);
                const matched = (metadata?.contacts || []).find(
                  (ct) => ct.name.toLowerCase().trim() === val.toLowerCase().trim()
                );
                setContactId(matched ? matched.id : null);
              }}
              clearable
            />

            <Select
              label="Related Project"
              placeholder="Select project"
              data={projectOptions}
              value={projectId}
              onChange={setProjectId}
              searchable
              clearable
            />
          </SimpleGrid>

          {/* Project Handover, Contract & Affected Module */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <TextInput
              label="Handover ID (Optional)"
              placeholder="e.g. HND-2026-001"
              value={handoverId}
              onChange={(e) => setHandoverId(e.currentTarget.value)}
            />

            <Select
              label="Service / Support Contract (Optional)"
              placeholder="Link support contract"
              data={contractOptions}
              value={contractId}
              onChange={setContractId}
              searchable
              clearable
            />

            <TextInput
              label="Affected Screen / Module"
              placeholder="e.g. Invoicing, Checkout, RBAC"
              value={affectedModule}
              onChange={(e) => setAffectedModule(e.currentTarget.value)}
            />
          </SimpleGrid>

          {/* Issue Type, Priority, Due Date */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Select
              label="Issue Type"
              data={[
                'Bug',
                'Technical Issue',
                'UI / Design Issue',
                'Performance Issue',
                'Feature Request',
                'Change Request',
                'General Support',
              ]}
              value={issueType}
              onChange={(val) => setIssueType((val as TicketIssueType) || 'Bug')}
              required
            />

            <Select
              label="Priority"
              data={['Critical', 'High', 'Medium', 'Low']}
              value={priority}
              onChange={(val) => setPriority((val as TicketPriority) || 'Medium')}
              required
            />

            <TextInput
              label="Target Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.currentTarget.value)}
            />
          </SimpleGrid>

          {/* Assignment Information */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Select
              label="Assigned Team / Department"
              placeholder="Select team"
              data={teamOptions}
              value={assignedTeam}
              onChange={setAssignedTeam}
              clearable
            />

            <Select
              label="Assign To Employee"
              placeholder="Select employee"
              data={employeeOptions}
              value={assignedTo}
              onChange={setAssignedTo}
              searchable
              clearable
            />

            <TextInput
              label="Reported By"
              placeholder="Reporter name"
              value={reportedBy}
              onChange={(e) => setReportedBy(e.currentTarget.value)}
              required
            />
          </SimpleGrid>

          {/* File Attachments */}
          <FileInput
            label="Attachments (Screenshots, Logs, Documents)"
            placeholder="Select one or multiple files"
            leftSection={<IconPaperclip size={16} />}
            multiple
            value={files}
            onChange={(payload) => setFiles(payload || [])}
            clearable
          />

          {/* Actions */}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="blue"
              loading={submitting}
              leftSection={<IconUpload size={16} />}
            >
              {isEdit ? 'Save Changes' : 'Create Support Ticket'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default CreateTicketModal;
