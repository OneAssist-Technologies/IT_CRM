import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Button,
  Group,
  Stack,
  Grid,
  Text,
  useComputedColorScheme,
} from '@mantine/core';
import { IconBuilding, IconUser, IconPhone, IconMail, IconCurrencyRupee, IconWorld } from '@tabler/icons-react';
import { Customer, CustomerFormData } from '../../../types/customer';
import { CRM_COLORS } from '../../../theme/colors';
import { useEmployee } from '../../../context/EmployeeContext';

interface CustomerModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => Promise<any>;
  customer?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  opened,
  onClose,
  onSubmit,
  customer,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { employees } = useEmployee();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    designation: '',
    industry: 'Technology & IT Services',
    customerTier: 'Mid-Market',
    status: 'Active',
    address: '',
    city: '',
    state: 'Tamil Nadu',
    gstNumber: '',
    panNumber: '',
    website: '',
    contractValue: 0,
    accountManager: '',
    notes: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        companyName: customer.companyName || '',
        contactPerson: customer.contactPerson || '',
        email: customer.email || '',
        phone: customer.phone || '',
        designation: customer.designation || '',
        industry: customer.industry || 'Technology & IT Services',
        customerTier: customer.customerTier || 'Mid-Market',
        status: customer.status || 'Active',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || 'Tamil Nadu',
        gstNumber: customer.gstNumber || '',
        panNumber: customer.panNumber || '',
        website: customer.website || '',
        contractValue: customer.contractValue || 0,
        accountManager: customer.accountManager || '',
        notes: customer.notes || '',
      });
    } else {
      setFormData({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        designation: '',
        industry: 'Technology & IT Services',
        customerTier: 'Mid-Market',
        status: 'Active',
        address: '',
        city: '',
        state: 'Tamil Nadu',
        gstNumber: '',
        panNumber: '',
        website: '',
        contractValue: 0,
        accountManager: '',
        notes: '',
      });
    }
  }, [customer, opened]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim() || !formData.contactPerson.trim() || !formData.phone.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="md" style={{ color: isDark ? '#FFFFFF' : CRM_COLORS.textPrimary }}>
          {customer ? `Edit Customer - ${customer.companyName}` : 'Add New Customer Account'}
        </Text>
      }
      size="lg"
      radius="md"
      centered
      styles={{
        header: {
          borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : CRM_COLORS.borderLight}`,
          paddingBottom: 12,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md" mt="sm">
          <Grid gutter="sm">
            <Grid.Col span={6}>
              <TextInput
                required
                label="Company Name"
                placeholder="e.g. Zoho Corporation"
                leftSection={<IconBuilding size={16} />}
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                required
                label="Primary Contact Person"
                placeholder="e.g. Neelambaran S"
                leftSection={<IconUser size={16} />}
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                required
                label="Contact Mobile Phone"
                placeholder="e.g. 9840123456"
                leftSection={<IconPhone size={16} />}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Email Address"
                placeholder="client@company.com"
                type="email"
                leftSection={<IconMail size={16} />}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                label="Designation / Role"
                placeholder="e.g. VP of Engineering"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Industry Domain"
                data={[
                  'Technology & IT Services',
                  'SaaS & CRM Solutions',
                  'Healthcare & Biotech',
                  'Banking & Fintech',
                  'E-commerce & Retail',
                  'Manufacturing & Logistics',
                  'Education & EdTech',
                ]}
                value={formData.industry}
                onChange={(val) => setFormData({ ...formData, industry: val || 'Technology & IT Services' })}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Select
                label="Customer Tier"
                data={['Enterprise', 'Mid-Market', 'Startup', 'Government']}
                value={formData.customerTier}
                onChange={(val) => setFormData({ ...formData, customerTier: val || 'Mid-Market' })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Account Status"
                data={['Complete', 'Active', 'Onboarding', 'Inactive', 'Churned']}
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val || 'Complete' })}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <NumberInput
                label="Annual Contract Value (₹)"
                placeholder="e.g. 500000"
                min={0}
                leftSection={<IconCurrencyRupee size={16} />}
                value={formData.contractValue}
                onChange={(val) => setFormData({ ...formData, contractValue: typeof val === 'number' ? val : 0 })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Account Manager"
                placeholder="Select or assign Account Manager"
                clearable
                searchable
                data={(() => {
                  const seen = new Set<string>();
                  const opts: { value: string; label: string }[] = [{ value: 'Unassigned', label: 'Unassigned' }];
                  seen.add('Unassigned');
                  employees.forEach((emp) => {
                    const val = (emp.name || '').trim();
                    if (val && !seen.has(val.toLowerCase())) {
                      seen.add(val.toLowerCase());
                      opts.push({
                        value: val,
                        label: `${emp.name} (${emp.designation || emp.department || 'Staff'})`,
                      });
                    }
                  });
                  if (
                    formData.accountManager &&
                    formData.accountManager !== 'Unassigned' &&
                    !seen.has(formData.accountManager.trim().toLowerCase())
                  ) {
                    opts.push({ value: formData.accountManager, label: formData.accountManager });
                  }
                  return opts;
                })()}
                value={formData.accountManager || 'Unassigned'}
                onChange={(val) => setFormData({ ...formData, accountManager: val || 'Unassigned' })}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                label="GSTIN Number"
                placeholder="e.g. 33AAACZ1234A1Z5"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Company Website"
                placeholder="https://company.com"
                leftSection={<IconWorld size={16} />}
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                label="City"
                placeholder="e.g. Chennai"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="State"
                placeholder="e.g. Tamil Nadu"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Internal Notes / Relationship Highlights"
            placeholder="Key discussion points, past projects, or contractual terms..."
            minRows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={onClose} disabled={loading} color="gray">
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {customer ? 'Update Customer' : 'Save Customer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
