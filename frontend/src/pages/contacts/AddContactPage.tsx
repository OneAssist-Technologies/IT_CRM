import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Stack,
  SimpleGrid,
  TextInput,
  Textarea,
  Button,
  Group,
  Text,
  Breadcrumbs,
  Anchor,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconUser,
  IconBuilding,
  IconId,
  IconMail,
  IconPhone,
} from '@tabler/icons-react';
import { Contact, ContactFormData } from '../../types/contact';
import { useContact } from '../../context/ContactContext';
import { useCRM } from '../../context/CRMContext';

interface AddContactPageProps {
  onBack?: () => void;
  initialData?: Contact | null;
}

export const AddContactPage: React.FC<AddContactPageProps> = ({ onBack, initialData }) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { setActiveNav } = useCRM();
  const { createContact, updateContact, loading } = useContact();

  const isEditing = Boolean(initialData);

  const initialFormState: ContactFormData = {
    name: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    assignedTo: '',
    estimatedValue: '',
    expectedCloseDate: '',
    description: '',
  };

  const [formData, setFormData] = useState<ContactFormData>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        contactId: initialData.contactId,
        name: initialData.name || '',
        companyName: initialData.companyName || '',
        contactPerson: initialData.contactPerson || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        assignedTo: initialData.assignedTo || '',
        estimatedValue: initialData.estimatedValue || '',
        expectedCloseDate: initialData.expectedCloseDate || '',
        description: initialData.description || initialData.notes || '',
      });
    } else {
      setFormData(initialFormState);
    }
    setErrors({});
  }, [initialData]);

  const handleFieldChange = (field: keyof ContactFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Name validation
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    // 2. Company validation
    if (!formData.companyName?.trim()) {
      newErrors.companyName = 'Company is required';
    }

    // 3. Email validation
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Invalid email address format';
      }
    }

    // 4. Phone validation (required)
    if (!formData.phone || !formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length !== 10) {
        newErrors.phone = 'Phone number must be exactly 10 digits';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload: ContactFormData = {
        name: (formData.name || '').trim(),
        companyName: formData.companyName?.trim(),
        contactPerson: formData.contactPerson?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone ? formData.phone.replace(/\D/g, '') : '',
        assignedTo: formData.assignedTo && formData.assignedTo !== 'none' ? formData.assignedTo : undefined,
        estimatedValue: formData.estimatedValue?.trim() || undefined,
        expectedCloseDate: formData.expectedCloseDate?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        remarks: formData.description?.trim() || undefined,
        notes: formData.description?.trim() || undefined,
        status: initialData?.status || 'New',
        stage: initialData?.stage || 'Initialization',
        qualificationStatus: initialData?.qualificationStatus || 'New',
      };

      let res;
      if (isEditing && initialData?.id) {
        res = await updateContact(initialData.id, payload);
      } else {
        res = await createContact(payload);
      }

      if (res?.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('crm_contacts_tab', 'NEW');
        }
        if (onBack) onBack();
        else setActiveNav('contacts');
      }
    } catch (err: any) {
      console.error('Error saving contact:', err);
    }
  };



  const inputStyles = {
    input: {
      height: 44,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      border: isDark ? '1.5px solid rgba(255, 255, 255, 0.16)' : '1.5px solid #CBD5E1',
      borderRadius: 10,
      color: isDark ? '#F8FAFC' : '#0F172A',
      fontSize: 14,
      fontWeight: 500,
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.04)',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
    },
    label: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 6,
      color: isDark ? '#E2E8F0' : '#1E293B',
      letterSpacing: '0.01em',
    },
    section: {
      color: isDark ? '#94A3B8' : '#64748B',
    },
  };

  const textareaStyles = {
    input: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      border: isDark ? '1.5px solid rgba(255, 255, 255, 0.16)' : '1.5px solid #CBD5E1',
      borderRadius: 10,
      color: isDark ? '#F8FAFC' : '#0F172A',
      fontSize: 14,
      fontWeight: 500,
      padding: '12px 14px',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.04)',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    },
    label: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 6,
      color: isDark ? '#E2E8F0' : '#1E293B',
      letterSpacing: '0.01em',
    },
  };

  return (
    <Box p="lg" style={{ maxWidth: 840, margin: '0 auto' }}>
      <style>{`
        .contact-form-field input:focus,
        .contact-form-field textarea:focus {
          border-color: #3B82F6 !important;
          box-shadow: 0 0 0 3.5px rgba(59, 130, 246, 0.18) !important;
        }
        .contact-form-field input:hover,
        .contact-form-field textarea:hover {
          border-color: ${isDark ? 'rgba(255, 255, 255, 0.3)' : '#94A3B8'} !important;
        }
      `}</style>

      {/* Breadcrumb Navigation */}
      <Breadcrumbs mb="md" separator="→">
        <Anchor
          component="button"
          type="button"
          size="sm"
          onClick={() => {
            if (onBack) onBack();
            else setActiveNav('contacts');
          }}
          c="dimmed"
        >
          Contacts
        </Anchor>
        <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
          {isEditing ? 'Edit Contact' : 'Create Contact'}
        </Text>
      </Breadcrumbs>

      <Paper
        p="xl"
        radius="16px"
        style={{
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Box mb="xl">
          <Text fw={700} size="22px" style={{ color: isDark ? '#F8FAFC' : '#111827', lineHeight: 1.2 }}>
            {isEditing ? 'Edit contact' : 'Create contact'}
          </Text>
          <Text size="13.5px" c="dimmed" mt={4}>
            Add the essential details. You can complete the record later.
          </Text>
        </Box>

        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            {/* Row 1: Name | Company */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <TextInput
                className="contact-form-field"
                label="Name"
                placeholder="e.g. John Doe / Lead Name"
                required
                leftSection={<IconUser size={18} stroke={1.6} />}
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                error={errors.name}
                styles={inputStyles}
              />

              <TextInput
                className="contact-form-field"
                label="Company"
                placeholder="e.g. TechCorp Solutions"
                required
                leftSection={<IconBuilding size={18} stroke={1.6} />}
                value={formData.companyName || ''}
                onChange={(e) => handleFieldChange('companyName', e.target.value)}
                error={errors.companyName}
                styles={inputStyles}
              />
            </SimpleGrid>

            {/* Row 2: Contact person | Email */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <TextInput
                className="contact-form-field"
                label="Contact person"
                placeholder="e.g. Alex Morgan (Optional)"
                leftSection={<IconId size={18} stroke={1.6} />}
                value={formData.contactPerson || ''}
                onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
                styles={inputStyles}
              />

              <TextInput
                className="contact-form-field"
                label="Email"
                placeholder="e.g. alex@techcorp.com"
                type="email"
                leftSection={<IconMail size={18} stroke={1.6} />}
                value={formData.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                error={errors.email}
                styles={inputStyles}
              />
            </SimpleGrid>

            {/* Row 3: Phone number */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <TextInput
                className="contact-form-field"
                label="Phone number"
                placeholder="e.g. 9876543210"
                required
                maxLength={10}
                leftSection={<IconPhone size={18} stroke={1.6} />}
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  handleFieldChange('phone', val);
                }}
                error={errors.phone}
                styles={inputStyles}
              />
            </SimpleGrid>

            {/* Row 4: Description & Remarks */}
            <Textarea
              className="contact-form-field"
              label="Description & Remarks"
              placeholder="Add context, requirements, notes, or remarks..."
              minRows={3}
              value={formData.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              styles={textareaStyles}
            />

            {/* Footer Buttons */}
            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="default"
                radius="md"
                size="md"
                onClick={() => {
                  if (onBack) onBack();
                  else setActiveNav('contacts');
                }}
                disabled={loading}
                style={{
                  fontWeight: 600,
                  paddingLeft: 20,
                  paddingRight: 20,
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#D1D5DB',
                  color: isDark ? '#E2E8F0' : '#374151',
                  background: isDark ? '#1F2937' : '#FFFFFF',
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                radius="md"
                size="md"
                loading={loading}
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  paddingLeft: 24,
                  paddingRight: 24,
                  border: 'none',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                }}
              >
                Save record
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default AddContactPage;
