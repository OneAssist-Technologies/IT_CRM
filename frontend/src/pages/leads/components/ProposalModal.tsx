import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  TextInput,
  Select,
  Button,
  Group,
  Stack,
  Text,
  NumberInput,
  ActionIcon,
  Textarea,
  Box,
  Badge,
  Grid,
  SimpleGrid,
  ThemeIcon,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconTrash,
  IconX,
  IconUpload,
  IconFileDescription,
  IconEye,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Lead, LeadProposal } from '../../../types/lead';
import { leadService } from '../../../services/leadService';
import { contactService } from '../../../services/contactService';
import { Contact } from '../../../types/contact';
import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';

interface ProposalModalProps {
  opened: boolean;
  onClose: () => void;
  proposal?: LeadProposal | null;
  lead: Lead;
  onSave: (proposal: LeadProposal) => void;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({
  opened,
  onClose,
  proposal,
  lead,
  onSave,
}) => {
  const computedColorScheme = useComputedColorScheme('light');
  const isDark = computedColorScheme === 'dark';

  const generateProposalNumber = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `PROP-${year}-${randomNum}`;
  };

  const [proposalNumber, setProposalNumber] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [clientGst, setClientGst] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');

  const [proposalDate, setProposalDate] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [status, setStatus] = useState<LeadProposal['status']>('Draft');
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30 Days');

  // Proposal Document & Valuation State
  const [proposalTitle, setProposalTitle] = useState<string>('');
  const [proposalAmount, setProposalAmount] = useState<number | ''>('');
  const [documentFileName, setDocumentFileName] = useState<string>('');
  const [documentFileUrl, setDocumentFileUrl] = useState<string>('');
  const [documentFileSize, setDocumentFileSize] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [termsConditions, setTermsConditions] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Populate data when opening
  useEffect(() => {
    if (!opened) return;

    if (proposal) {
      setProposalNumber(proposal.proposalNumber || generateProposalNumber());
      setContactName(lead.name || '');
      setCompanyName(lead.companyName || lead.profession || '');
      setContactEmail(lead.email || '');
      setContactPhone(lead.phone || '');
      setClientAddress(lead.address || '');

      setProposalDate(proposal.issueDate || new Date().toISOString().split('T')[0]);
      setValidUntil(proposal.validUntil || '');
      setStatus(proposal.status || 'Draft');
      setRejectionReason((proposal as any).rejectionReason || '');
      setPaymentTerms((proposal as any).paymentTerms || 'Net 30 Days');

      setProposalTitle(proposal.title || `${lead.companyName || lead.name} Solution Proposal`);
      setProposalAmount(
        proposal.totalAmount != null
          ? Number(proposal.totalAmount)
          : proposal.subtotal != null
          ? Number(proposal.subtotal)
          : ''
      );
      setDocumentFileName(proposal.documentName || '');
      setDocumentFileUrl(proposal.documentUrl || '');
      setDocumentFileSize(proposal.documentSize || '');

      setNotes(proposal.notes || '');
      setTermsConditions(
        proposal.terms ||
          '1. Proposal valid for 30 days from issue.\n2. 50% advance along with confirmed Purchase Order.\n3. Taxes extra as applicable by law.'
      );
    } else {
      // Auto-fetch from lead
      setProposalNumber(generateProposalNumber());
      setContactName(lead.name || '');
      setCompanyName(lead.companyName || lead.profession || '');
      setContactEmail(lead.email || '');
      setContactPhone(lead.phone || '');
      setClientAddress(lead.address || '');

      setProposalDate(new Date().toISOString().split('T')[0]);
      setValidUntil('');
      setStatus('Draft');
      setRejectionReason('');
      setPaymentTerms('');

      setProposalTitle('');
      setProposalAmount('');
      setDocumentFileName('');
      setDocumentFileUrl('');
      setDocumentFileSize('');

      setNotes('');
      setTermsConditions('');

      // Attempt to look up matching contact for GSTIN
      contactService
        .getContacts({ limit: 100 })
        .then((res) => {
          if (res?.data) {
            const found = res.data.find(
              (c: Contact) =>
                (lead.email && c.email && c.email.toLowerCase() === lead.email.toLowerCase()) ||
                (lead.phone && c.phone && c.phone === lead.phone) ||
                (c.name && c.name.toLowerCase() === lead.name.toLowerCase())
            );
            if (found?.gstNumber) {
              setClientGst(found.gstNumber);
            }
            if (!lead.address && found?.address) {
              setClientAddress(found.address);
            }
          }
        })
        .catch(() => {});
    }
  }, [opened, proposal, lead]);

  const processSelectedFile = (file: File) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      notifications.show({
        title: 'File Too Large',
        message: 'Please upload a proposal document smaller than 25MB.',
        color: 'red',
      });
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setDocumentFileName(file.name);
      setDocumentFileUrl(dataUrl);
      setDocumentFileSize(sizeFormatted);
      notifications.show({
        title: 'Document Attached',
        message: `${file.name} (${sizeFormatted}) uploaded successfully.`,
        color: 'teal',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setDocumentFileName('');
    setDocumentFileUrl('');
    setDocumentFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenDocument = () => {
    if (!documentFileUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${documentFileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalNumber.trim()) {
      notifications.show({ color: 'red', message: 'Proposal Number is required' });
      return;
    }

    if (!contactName.trim()) {
      notifications.show({ color: 'red', message: 'Client or Contact Name is required' });
      return;
    }

    if (proposalAmount === '' || Number(proposalAmount) <= 0) {
      notifications.show({ color: 'red', message: 'Proposed Value / Budget is required' });
      return;
    }

    if (!validUntil || !validUntil.trim()) {
      notifications.show({ color: 'red', message: 'Valid Until date is required' });
      return;
    }

    if (!documentFileName && !documentFileUrl) {
      notifications.show({
        color: 'yellow',
        message: 'Please upload a proposal document before saving.',
      });
      return;
    }

    if (status === 'Rejected' && !rejectionReason.trim()) {
      notifications.show({ color: 'red', message: 'Rejection Reason is required when Status is Rejected' });
      return;
    }

    try {
      setSubmitting(true);

      const proposalId = proposal?.id || `prop-${Date.now()}`;
      const proposalNum =
        proposalNumber.trim() ||
        proposal?.proposalNumber ||
        generateProposalNumber();

      let createdDbProposal: any = null;

      // Sync with backend proposals table
      try {
        const payload: any = {
          proposalNumber: proposalNum,
          contactName,
          companyName,
          contactEmail,
          contactPhone,
          clientGst,
          clientAddress,
          proposalDate,
          validUntil,
          status,
          rejectionReason: status === 'Rejected' ? rejectionReason.trim() : null,
          paymentTerms,
          notes,
          terms: termsConditions,
          title: proposalTitle.trim(),
          documentName: documentFileName.trim() || undefined,
          documentUrl: documentFileUrl || undefined,
          documentSize: documentFileSize.trim() || undefined,
          grandTotal: proposalAmount || 0,
          subtotal: proposalAmount || 0,
          totalAmount: proposalAmount || 0,
          leadId: lead.id,
          items: [
            {
              itemName: proposalTitle.trim() || 'Proposal Deliverable',
              description: documentFileName ? `Document: ${documentFileName}` : 'Proposal Document',
              quantity: 1,
              unitPrice: proposalAmount || 0,
              totalAmount: proposalAmount || 0,
            },
          ],
        };

        if (proposal?.id && !proposal.id.startsWith('prop-')) {
          const res = await leadService.updateProposal(proposal.id, payload);
          createdDbProposal = res?.data;
        } else {
          const res = await leadService.createProposal(payload);
          createdDbProposal = res?.data;
        }
      } catch (backendErr) {
        console.warn('Backend proposal sync skipped:', backendErr);
      }

      const finalId =
        createdDbProposal?.id ||
        proposal?.id ||
        (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proposal-${Date.now()}`);
      const finalNum = createdDbProposal?.proposalNumber || proposalNum;

      const savedProposal: LeadProposal = {
        id: finalId,
        leadId: lead.id,
        proposalNumber: finalNum,
        title: createdDbProposal?.title || proposalTitle.trim() || `${companyName || contactName} Solution Proposal`,
        issueDate: proposalDate,
        validUntil: validUntil,
        status: status,
        rejectionReason: status === 'Rejected' ? rejectionReason.trim() : undefined,
        currency: 'INR (₹)',
        items: createdDbProposal?.items || [],
        discountPercent: 0,
        taxPercent: 0,
        subtotal: proposalAmount || 0,
        totalAmount: proposalAmount || 0,
        documentName: documentFileName.trim() || undefined,
        documentUrl: documentFileUrl || undefined,
        documentSize: documentFileSize.trim() || undefined,
        notes: notes,
        terms: termsConditions,
        createdAt: createdDbProposal?.createdAt || proposal?.createdAt || new Date().toISOString(),
      };

      onSave(savedProposal);
      onClose();
    } catch (err: any) {
      notifications.show({
        color: 'red',
        message: err.message || 'Failed to save proposal',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="860px"
      radius="18px"
      withCloseButton={false}
      padding="xl"
      centered
      styles={{
        content: {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        },
      }}
      closeOnClickOutside={!submitting}
    >
      {/* Header matching Schedule Meeting Modal */}
      <Group justify="space-between" align="flex-start" mb="lg">
        <Group gap="sm" align="center">
          <Box
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#60A5FA' : '#2563EB',
            }}
          >
            <IconFileDescription size={22} stroke={1.8} />
          </Box>
          <div>
            <Text fw={800} size="19px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
              {proposal ? 'Edit Proposal' : 'Create Proposal'}
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              Enter proposal details
            </Text>
          </div>
        </Group>

        <ActionIcon
          variant="subtle"
          color="gray"
          size="md"
          radius="100px"
          onClick={onClose}
        >
          <IconX size={18} />
        </ActionIcon>
      </Group>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* 1. Proposal Number * & Proposal Title * */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              label="Proposal Number"
              withAsterisk
              placeholder="e.g. PROP-2026-1001"
              value={proposalNumber}
              onChange={(e) => setProposalNumber(e.currentTarget.value)}
              radius="md"
              required
            />
            <TextInput
              label="Proposal Title"
              withAsterisk
              placeholder={
                lead.category === 'Product'
                  ? `${lead.productList?.[0] || 'IT CRM'} Solution Proposal`
                  : `${lead.serviceList?.[0] || 'Software Implementation'} Proposal`
              }
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.currentTarget.value)}
              radius="md"
              required
            />
          </SimpleGrid>

          {/* 2. Client / Contact Name * & Company Name */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              label="Contact / Client Name"
              withAsterisk
              placeholder={lead.name ? `e.g. ${lead.name}` : 'e.g. Rahul Sharma'}
              value={contactName}
              onChange={(e) => setContactName(e.currentTarget.value)}
              required
              radius="md"
            />
            <TextInput
              label="Company Name"
              placeholder={lead.companyName || lead.profession || 'e.g. Acme Technologies'}
              value={companyName}
              onChange={(e) => setCompanyName(e.currentTarget.value)}
              radius="md"
            />
          </SimpleGrid>

          {/* 3. Email Address & Phone Number */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              label="Email Address"
              placeholder="client@example.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.currentTarget.value)}
              radius="md"
            />
            <TextInput
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.currentTarget.value)}
              radius="md"
            />
          </SimpleGrid>

          {/* 4. Proposed Value / Budget (₹) * & Status * */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <NumberInput
              label="Proposed Value / Budget (₹)"
              withAsterisk
              placeholder="e.g. 85,000"
              value={proposalAmount}
              onChange={(val) => setProposalAmount(val === '' ? '' : Number(val))}
              min={0}
              thousandSeparator=","
              prefix="₹ "
              radius="md"
              required
            />
            <Select
              label="Status"
              withAsterisk
              data={[
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent to Client' },
                { value: 'Under Review', label: 'Under Review' },
                { value: 'Accepted', label: 'Accepted' },
                { value: 'Rejected', label: 'Rejected' },
              ]}
              value={status}
              onChange={(val) => setStatus((val as any) || 'Draft')}
              allowDeselect={false}
              required
              radius="md"
            />
          </SimpleGrid>

          {/* Dynamic Rejection Reason Field */}
          {status === 'Rejected' && (
            <TextInput
              label="Rejection Reason"
              withAsterisk
              placeholder="Enter reason for proposal rejection (e.g. Budget constraints, selected another vendor)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.currentTarget.value)}
              required
              radius="md"
            />
          )}

          {/* 5. Proposal Date * & Valid Until * */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <MeetingDatePicker
              label="Proposal Date"
              placeholder="dd-mm-yyyy"
              value={proposalDate}
              onChange={(val) => setProposalDate(val)}
              required
              zIndex={3000}
            />
            <MeetingDatePicker
              label="Valid Until"
              placeholder="dd-mm-yyyy"
              value={validUntil}
              onChange={(val) => setValidUntil(val)}
              required
              zIndex={3000}
            />
          </SimpleGrid>

          {/* 5. Proposal Document Upload */}
          <div>
            <Text size="sm" fw={500} mb={4} c={isDark ? 'gray.3' : 'gray.8'}>
              Proposal Document <span style={{ color: '#EF4444' }}>*</span>
            </Text>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*"
              style={{ display: 'none' }}
            />

            {!documentFileName ? (
              <Box
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  minHeight: 78,
                  borderRadius: 10,
                  border: isDragging
                    ? '2px dashed #4F46E5'
                    : isDark
                    ? '1.5px dashed rgba(99, 102, 241, 0.5)'
                    : '1.5px dashed #CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: isDragging
                    ? isDark
                      ? 'rgba(79, 70, 229, 0.2)'
                      : 'rgba(79, 70, 229, 0.08)'
                    : isDark
                    ? '#1F2937'
                    : '#F8FAFC',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isDragging ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.borderColor = '#6366F1';
                    e.currentTarget.style.background = isDark ? '#263346' : '#F1F5F9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.borderColor = isDark ? 'rgba(99, 102, 241, 0.5)' : '#CBD5E1';
                    e.currentTarget.style.background = isDark ? '#1F2937' : '#F8FAFC';
                  }
                }}
              >
                <Group gap="md" align="center" wrap="nowrap" style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                  <ThemeIcon
                    size={42}
                    radius="md"
                    variant="light"
                    color="indigo"
                    style={{ flexShrink: 0 }}
                  >
                    <IconUpload size={22} stroke={1.8} />
                  </ThemeIcon>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text size="sm" fw={600} style={{ color: isDark ? '#F1F5F9' : '#1E293B', lineHeight: 1.3 }}>
                      Attach proposal document
                    </Text>
                    <Text size="xs" c="dimmed" mt={3} style={{ lineHeight: 1.3 }}>
                      Click to browse or drag & drop (PDF, Word, Excel, PPT, images up to 25MB)
                    </Text>
                  </div>
                </Group>

                <Button
                  size="sm"
                  variant="light"
                  color="indigo"
                  radius="md"
                  leftSection={<IconUpload size={15} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  style={{ flexShrink: 0, fontWeight: 600 }}
                >
                  Upload Document
                </Button>
              </Box>
            ) : (
              <Box
                style={{
                  minHeight: 74,
                  borderRadius: 10,
                  border: isDark ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid #C7D2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  background: isDark ? 'rgba(79, 70, 229, 0.12)' : '#EFF6FF',
                  transition: 'all 0.15s ease',
                }}
              >
                <Group gap="md" align="center" wrap="nowrap" style={{ overflow: 'hidden', flex: 1, minWidth: 0, marginRight: 16 }}>
                  <ThemeIcon size={42} radius="md" variant="light" color="indigo" style={{ flexShrink: 0 }}>
                    <IconFileDescription size={22} color={isDark ? '#818CF8' : '#4F46E5'} />
                  </ThemeIcon>
                  <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
                    <Text size="sm" fw={700} lineClamp={1} style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                      {documentFileName}
                    </Text>
                    <Group gap="xs" mt={3} wrap="nowrap">
                      {documentFileSize && (
                        <Badge size="xs" variant="light" color="indigo" radius="sm">
                          {documentFileSize}
                        </Badge>
                      )}
                      <Text size="xs" c="teal" fw={600}>
                        ✓ Attached & ready to submit
                      </Text>
                    </Group>
                  </div>
                </Group>

                <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                  {documentFileUrl && (
                    <Button
                      size="xs"
                      variant="light"
                      color="indigo"
                      radius="md"
                      leftSection={<IconEye size={14} />}
                      onClick={handleOpenDocument}
                      title="Preview"
                    >
                      View
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="subtle"
                    color="indigo"
                    radius="md"
                    onClick={() => fileInputRef.current?.click()}
                    title="Choose a different document"
                  >
                    Change
                  </Button>
                  <ActionIcon
                    size="md"
                    variant="subtle"
                    color="red"
                    radius="md"
                    onClick={handleRemoveFile}
                    title="Remove file"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Box>
            )}
          </div>

          {/* 6. Additional Notes / Scope Details */}
          <Textarea
            label="Additional Notes / Discussion Points"
            placeholder="Special preparation, commercial remarks, scope details..."
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            minRows={2}
            radius="md"
          />

          {/* Action Buttons: Cancel & Create Proposal */}
          <Group justify="flex-end" gap="sm" mt="md">
            <Button
              variant="default"
              radius="md"
              onClick={onClose}
              disabled={submitting}
              style={{
                fontWeight: 600,
                minWidth: 90,
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              radius="md"
              loading={submitting}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                minWidth: 130,
              }}
            >
              {proposal ? 'Update Proposal' : 'Create Proposal'}
            </Button>
          </Group>
        </Stack>
      </Box>
    </Modal>
  );
};

export default ProposalModal;
