import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  Button,
  Group,
  Stack,
  Text,
  NumberInput,
  Grid,
  Textarea,
  Paper,
  Alert,
  ActionIcon,
  Box,
  useComputedColorScheme,
} from '@mantine/core';
import { IconFlag, IconAlertCircle, IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { BillingMilestone, SalesOrder } from '../../../types/billing';
import { billingService } from '../../../services/billingService';
import { projectService } from '../../../services/projectService';
import { Project } from '../../../types/project';

interface MilestoneModalProps {
  opened: boolean;
  onClose: () => void;
  milestone?: BillingMilestone | null;
  defaultSalesOrderId?: string;
  onSuccess: () => void;
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  opened,
  onClose,
  milestone,
  defaultSalesOrderId,
  onSuccess,
}) => {
  const isDark = useComputedColorScheme('light') === 'dark';
  const [submitting, setSubmitting] = useState(false);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Form State
  const [salesOrderId, setSalesOrderId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [percentage, setPercentage] = useState<number | undefined>(undefined);
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [status, setStatus] = useState<string>('Pending');

  // Load Sales Orders & Projects
  useEffect(() => {
    if (opened) {
      billingService.getSalesOrders({ status: 'All' }).then((data) => {
        if (data) setSalesOrders(data);
      }).catch(() => {});

      projectService.getProjects({ limit: 100 }).then((res) => {
        if (res?.data) setProjects(res.data);
      }).catch(() => {});
    }
  }, [opened]);

  // Populate state
  useEffect(() => {
    if (milestone) {
      setSalesOrderId(milestone.salesOrderId || '');
      setProjectId(milestone.projectId || '');
      setName(milestone.name || '');
      setDescription(milestone.description || '');
      setPercentage(milestone.percentage ? Number(milestone.percentage) : undefined);
      setAmount(Number(milestone.amount) || 0);
      setDueDate(milestone.dueDate?.split('T')[0] || '');
      setStatus(milestone.status || 'Pending');
    } else {
      setSalesOrderId(defaultSalesOrderId || '');
      setProjectId('');
      setName('');
      setDescription('');
      setPercentage(undefined);
      setAmount(0);
      setDueDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setStatus('Pending');
    }
  }, [milestone, defaultSalesOrderId, opened]);

  // Handle Sales Order change & auto-calculate amount if % is set
  const selectedOrder = salesOrders.find((o) => o.id === salesOrderId);

  const handlePercentageChange = (val: number | string) => {
    const num = Number(val) || 0;
    setPercentage(num);
    if (selectedOrder && Number(selectedOrder.contractValue) > 0) {
      const calcAmount = Number(((selectedOrder.contractValue * num) / 100).toFixed(2));
      setAmount(calcAmount);
    }
  };

  const handleAmountChange = (val: number | string) => {
    const num = Number(val) || 0;
    setAmount(num);
    if (selectedOrder && Number(selectedOrder.contractValue) > 0) {
      const calcPercent = Number(((num / selectedOrder.contractValue) * 100).toFixed(2));
      setPercentage(calcPercent);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notifications.show({ color: 'red', message: 'Milestone name is required' });
      return;
    }
    if (amount <= 0) {
      notifications.show({ color: 'red', message: 'Milestone amount must be greater than 0' });
      return;
    }

    try {
      setSubmitting(true);
      const payload: Partial<BillingMilestone> & { validateContractTotal?: boolean } = {
        salesOrderId: salesOrderId || null,
        projectId: projectId || null,
        name,
        description,
        percentage: percentage || null,
        amount,
        dueDate: dueDate || null,
        status: status as any,
        validateContractTotal: true,
      };

      if (milestone?.id) {
        await billingService.updateMilestone(milestone.id, payload);
        notifications.show({ color: 'green', message: 'Milestone updated successfully' });
      } else {
        await billingService.createMilestone(payload);
        notifications.show({ color: 'green', message: 'Milestone created successfully' });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to save milestone' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="920px"
      centered
      yOffset="4vh"
      withCloseButton={false}
      radius="lg"
      styles={{
        content: {
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.22)',
          maxWidth: '95vw',
          maxHeight: '94vh',
        },
        body: {
          padding: '26px 32px',
          maxHeight: 'calc(94vh - 20px)',
          overflowY: 'auto',
        },
      }}
      closeOnClickOutside={!submitting}
    >
      {/* Header matching existing CRM modals */}
      <Group justify="space-between" align="flex-start" mb="lg">
        <Group gap="md">
          <Box
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#818CF8' : '#4F46E5',
            }}
          >
            <IconFlag size={22} stroke={1.8} />
          </Box>
          <div>
            <Text fw={800} size="19px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
              {milestone ? `Edit Milestone: ${milestone.name}` : 'Create Project / Billing Milestone'}
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              Set up milestone percentage, target amount, due dates, and deliverables
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

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {selectedOrder && (
            <Alert color="indigo" radius="md" icon={<IconAlertCircle size={16} />} title={`Contract: ${selectedOrder.orderNumber}`}>
              Total Contract Value: <b>₹{Number(selectedOrder.contractValue).toLocaleString('en-IN')}</b> | Client: {selectedOrder.contactName}
            </Alert>
          )}

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Associated Sales Order / Contract"
                placeholder="Pick Sales Order"
                data={salesOrders.map((o) => ({
                  value: o.id,
                  label: `${o.orderNumber} - ${o.contactName} (₹${o.contractValue})`,
                }))}
                value={salesOrderId}
                onChange={(val) => setSalesOrderId(val || '')}
                searchable
                clearable
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Associated CRM Project (Optional)"
                placeholder="Link to active Project"
                data={projects.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.status})`,
                }))}
                value={projectId}
                onChange={(val) => setProjectId(val || '')}
                searchable
                clearable
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <TextInput
                label="Milestone Name / Deliverable Phase"
                placeholder="e.g. Phase 1: Architecture Design & UI Prototype"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                required
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Percentage of Contract (%)"
                placeholder="e.g. 25"
                value={percentage}
                onChange={handlePercentageChange}
                min={0}
                max={100}
                decimalScale={2}
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Milestone Amount (₹)"
                placeholder="e.g. 250000"
                value={amount}
                onChange={handleAmountChange}
                min={0}
                required
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <MeetingDatePicker
                label="Due Date"
                placeholder="DD-MM-YYYY"
                value={dueDate}
                onChange={(val: string) => setDueDate(val)}
                zIndex={3000}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Select
                label="Execution Status"
                data={[
                  { value: 'Pending', label: 'Pending' },
                  { value: 'In Progress', label: 'In Progress' },
                  { value: 'Completed', label: 'Completed (Ready for Approval)' },
                  { value: 'Cancelled', label: 'Cancelled' },
                ]}
                value={status}
                onChange={(v) => setStatus(v || 'Pending')}
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Deliverables Description"
                placeholder="Specific sign-off deliverables required for this milestone"
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                minRows={3}
                radius="md"
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" gap="sm" mt="sm">
            <Button
              variant="default"
              radius="md"
              onClick={onClose}
              disabled={submitting}
              style={{ fontWeight: 600, minWidth: 90 }}
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
                minWidth: 140,
                border: 'none',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              }}
            >
              {milestone ? 'Update Milestone' : 'Save Milestone'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
