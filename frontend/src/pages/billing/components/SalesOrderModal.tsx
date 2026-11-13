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
  Table,
  ActionIcon,
  Textarea,
  Divider,
  Paper,
  Box,
  Badge,
  useComputedColorScheme,
} from '@mantine/core';
import { IconPlus, IconTrash, IconFileSpreadsheet, IconDeviceFloppy, IconX, IconPencil, IconList } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { SalesOrder, SalesOrderItem, BillingMethod, BillingProduct } from '../../../types/billing';
import { billingService } from '../../../services/billingService';
import { contactService } from '../../../services/contactService';
import { projectService } from '../../../services/projectService';
import { Contact } from '../../../types/contact';
import { Project } from '../../../types/project';

interface ParsedModule {
  name: string;
  description: string;
}

const getProductModules = (product?: BillingProduct | null): ParsedModule[] => {
  if (!product) return [];
  if (product.modules && Array.isArray(product.modules) && product.modules.length > 0) {
    return product.modules
      .map((m: any) => {
        if (typeof m === 'string') {
          return { name: m, description: '' };
        }
        return {
          name: m?.name || '',
          description: m?.description || '',
        };
      })
      .filter((m) => m.name && m.name.trim() !== '');
  }
  if (product.name) {
    return [{ name: product.name, description: product.description || '' }];
  }
  return [];
};

interface SalesOrderModalProps {
  opened: boolean;
  onClose: () => void;
  order?: SalesOrder | null;
  onSuccess: () => void;
}

export const SalesOrderModal: React.FC<SalesOrderModalProps> = ({
  opened,
  onClose,
  order,
  onSuccess,
}) => {
  const isDark = useComputedColorScheme('light') === 'dark';
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<BillingProduct[]>([]);
  const [selectedCatalogueId, setSelectedCatalogueId] = useState<string | null>(null);
  const [customRowIndices, setCustomRowIndices] = useState<number[]>([]);

  const selectedCatalogueProduct = products.find((p) => p.id === selectedCatalogueId);
  const selectedProductModules = getProductModules(selectedCatalogueProduct);

  const toggleCustomRow = (idx: number) => {
    setCustomRowIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Form State
  const [contactId, setContactId] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [clientGst, setClientGst] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');
  const [billingMethod, setBillingMethod] = useState<BillingMethod>('Milestone');
  const [contractValue, setContractValue] = useState<number>(0);
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [status, setStatus] = useState<string>('Confirmed');
  const [paymentTerms, setPaymentTerms] = useState<string>('Milestone based release');
  const [projectId, setProjectId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [termsConditions, setTermsConditions] = useState<string>('');

  const [items, setItems] = useState<SalesOrderItem[]>([
    {
      itemName: '',
      itemType: 'Service',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      taxAmount: 0,
      totalAmount: 0,
    },
  ]);

  // Load Contacts, Projects & Products
  useEffect(() => {
    if (opened) {
      contactService.getContacts({ limit: 100 }).then((res) => {
        if (res?.data) setContacts(res.data);
      }).catch(() => {});

      projectService.getProjects({ limit: 100 }).then((res) => {
        if (res?.data) setProjects(res.data);
      }).catch(() => {});

      billingService.getProductsServices({ status: 'Active' }).then((data) => {
        if (data) setProducts(data);
      }).catch(() => {});
    }
  }, [opened]);

  // Populate state
  useEffect(() => {
    if (order) {
      setContactId(order.contactId || '');
      setContactName(order.contactName || '');
      setCompanyName(order.companyName || '');
      setContactEmail(order.contactEmail || '');
      setContactPhone(order.contactPhone || '');
      setClientGst(order.clientGst || '');
      setClientAddress(order.clientAddress || '');
      setBillingMethod(order.billingMethod || 'Milestone');
      setContractValue(Number(order.contractValue) || 0);
      setOrderDate(order.orderDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
      setStartDate(order.startDate?.split('T')[0] || '');
      setEndDate(order.endDate?.split('T')[0] || '');
      setStatus(order.status || 'Confirmed');
      setPaymentTerms(order.paymentTerms || '');
      setProjectId(order.projectId || '');
      setNotes(order.notes || '');
      setTermsConditions(order.termsConditions || '');
      if (order.items && order.items.length > 0) {
        setItems(
          order.items.map((it) => ({
            ...it,
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            taxRate: Number(it.taxRate) || 0,
            taxAmount: Number(it.taxAmount) || 0,
            totalAmount: Number(it.totalAmount) || 0,
          }))
        );
      }
    } else {
      setContactId('');
      setContactName('');
      setCompanyName('');
      setContactEmail('');
      setContactPhone('');
      setClientGst('');
      setClientAddress('');
      setBillingMethod('Milestone');
      setContractValue(0);
      setOrderDate(new Date().toISOString().split('T')[0]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setStatus('Confirmed');
      setPaymentTerms('Milestone based release');
      setProjectId('');
      setNotes('');
      setTermsConditions('');
      setSelectedCatalogueId(null);
      setCustomRowIndices([]);
      setItems([
        {
          itemName: '',
          itemType: 'Service',
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 18,
          taxAmount: 0,
          totalAmount: 0,
        },
      ]);
    }
  }, [order, opened]);

  const handleSelectContact = (val: string | null) => {
    setContactId(val || '');
    if (!val) return;
    const found = contacts.find((c) => c.id === val);
    if (found) {
      setContactName(found.name || '');
      setCompanyName(found.companyName || '');
      setContactEmail(found.email || '');
      setContactPhone(found.phone || '');
      setClientGst(found.gstNumber || '');
      setClientAddress(found.address ? `${found.address}${found.registeredState ? `, ${found.registeredState}` : ''}`.trim() : (found.registeredState || ''));
    }
  };

  const updateItem = (index: number, field: keyof SalesOrderItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    const qty = Number(updated[index].quantity) || 0;
    const price = Number(updated[index].unitPrice) || 0;
    const rate = Number(updated[index].taxRate) || 0;
    const base = qty * price;
    const tax = Number(((base * rate) / 100).toFixed(2));
    const total = Number((base + tax).toFixed(2));

    updated[index].taxAmount = tax;
    updated[index].totalAmount = total;

    setItems(updated);

    // Auto-update contract value from items total if items exist
    const sum = updated.reduce((acc, it) => acc + (Number(it.totalAmount) || 0), 0);
    setContractValue(Number(sum.toFixed(2)));
  };

  const getRowModuleOptions = (currentItemName: string) => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];

    if (selectedCatalogueProduct && selectedProductModules.length > 0) {
      for (const m of selectedProductModules) {
        if (m.name && !seen.has(m.name)) {
          seen.add(m.name);
          options.push({ value: m.name, label: m.name });
        }
      }
    } else {
      // All products directly
      for (const p of products) {
        if (p.name && !seen.has(p.name)) {
          seen.add(p.name);
          options.push({ value: p.name, label: `${p.name} (${p.type || 'Product'})` });
        }
      }
      // All modules across all active products
      for (const p of products) {
        const mods = getProductModules(p);
        for (const m of mods) {
          if (m.name && !seen.has(m.name)) {
            seen.add(m.name);
            options.push({ value: m.name, label: `${m.name} (${p.name})` });
          }
        }
      }
    }

    // Add currently selected value if not in list
    if (currentItemName && !seen.has(currentItemName) && currentItemName !== '__CUSTOM__') {
      seen.add(currentItemName);
      options.unshift({
        value: currentItemName,
        label: currentItemName,
      });
    }

    // Add option to switch to custom typing
    options.push({
      value: '__CUSTOM__',
      label: '✎ Type Custom Item Manually...',
    });

    return options;
  };

  const handleModuleSelect = (idx: number, val: string | null) => {
    if (val === '__CUSTOM__') {
      if (!customRowIndices.includes(idx)) {
        setCustomRowIndices((prev) => [...prev, idx]);
      }
      return;
    }

    if (!val) {
      updateItem(idx, 'itemName', '');
      return;
    }

    let foundDesc = '';
    if (selectedCatalogueProduct) {
      const mod = selectedProductModules.find((m) => m.name === val);
      if (mod) foundDesc = mod.description;
    } else {
      for (const p of products) {
        const mods = getProductModules(p);
        const mod = mods.find((m) => m.name === val);
        if (mod) {
          foundDesc = mod.description || p.description || '';
          break;
        }
      }
    }

    const updated = [...items];
    updated[idx].itemName = val;
    if (foundDesc && !updated[idx].description) {
      updated[idx].description = foundDesc;
    }
    setItems(updated);
  };

  const handleAddAllModules = (prod: BillingProduct) => {
    const mods = getProductModules(prod);
    if (mods.length === 0) return;

    const isFirstItemEmpty =
      items.length === 1 && !items[0].itemName.trim() && (items[0].unitPrice === 0 || !items[0].unitPrice);

    const newItems: SalesOrderItem[] = mods.map((m) => ({
      productId: prod.id,
      itemCode: prod.itemCode,
      itemName: m.name,
      itemType: prod.type,
      description: m.description || prod.description || '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      taxAmount: 0,
      totalAmount: 0,
    }));

    if (isFirstItemEmpty) {
      setItems(newItems);
    } else {
      setItems([...items, ...newItems]);
    }

    notifications.show({
      color: 'teal',
      message: `Added all ${newItems.length} modules from "${prod.name}"`,
    });
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        itemName: '',
        itemType: 'Service',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 18,
        taxAmount: 0,
        totalAmount: 0,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    const sum = updated.reduce((acc, it) => acc + (Number(it.totalAmount) || 0), 0);
    setContractValue(Number(sum.toFixed(2)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      notifications.show({ color: 'red', message: 'Client or Contact Name is required (*)' });
      return;
    }
    if (contractValue <= 0) {
      notifications.show({ color: 'red', message: 'Total Contract Value must be greater than 0' });
      return;
    }
    if (!items || items.length === 0) {
      notifications.show({ color: 'red', message: 'Please add at least one line item to the sales order' });
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.itemName?.trim()) {
        notifications.show({ color: 'red', message: `Line Item #${i + 1}: Item Name / Service is required (*)` });
        return;
      }
      if (Number(it.unitPrice || 0) <= 0) {
        notifications.show({ color: 'red', message: `Line Item #${i + 1} (${it.itemName}): Amount is required and must be greater than 0` });
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload: Partial<SalesOrder> = {
        contactId: contactId || null,
        contactName,
        companyName,
        contactEmail,
        contactPhone,
        clientGst,
        clientAddress,
        billingMethod,
        contractValue,
        orderDate,
        startDate: startDate || null,
        endDate: endDate || null,
        status: status as any,
        paymentTerms,
        projectId: projectId || null,
        notes,
        termsConditions,
        items,
      };

      if (order?.id) {
        await billingService.updateSalesOrder(order.id, payload);
        notifications.show({ color: 'green', message: 'Sales Order updated successfully' });
      } else {
        await billingService.createSalesOrder(payload);
        notifications.show({ color: 'green', message: 'Sales Order created successfully' });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to save sales order' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="1240px"
      centered
      yOffset="3vh"
      withCloseButton={false}
      radius="lg"
      styles={{
        content: {
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.22)',
          maxWidth: '96vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
        },
        body: {
          padding: '24px 28px',
          overflowY: 'auto',
          maxHeight: 'calc(94vh - 20px)',
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
            <IconFileSpreadsheet size={22} stroke={1.8} />
          </Box>
          <div>
            <Text fw={800} size="19px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
              {order ? `Edit Sales Order: ${order.orderNumber}` : 'Create New Sales Order / Contract'}
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              Define contract value, billing method, dates, and deliverables
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
          {/* Client Details */}
          <Paper p="md" withBorder radius="lg" style={{ background: isDark ? '#111827' : '#F8FAFC', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0' }}>
            <Text fw={700} size="xs" mb="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
              Client Information (CRM Contact)
            </Text>
            <Grid gutter="xs">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Select Existing CRM Contact"
                  placeholder="Choose contact to auto-fill"
                  data={contacts.map((c) => ({
                    value: c.id,
                    label: `${c.name} ${c.companyName ? `(${c.companyName})` : ''}`,
                  }))}
                  value={contactId}
                  onChange={handleSelectContact}
                  searchable
                  clearable
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Contact / Client Name"
                  placeholder="e.g. Anand Kumar"
                  value={contactName}
                  onChange={(e) => setContactName(e.currentTarget.value)}
                  required
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <TextInput
                  label="Company Name"
                  placeholder="e.g. Global Tech Solutions"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.currentTarget.value)}
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <TextInput
                  label="Client GSTIN"
                  placeholder="33AAAAA0000A1Z5"
                  value={clientGst}
                  onChange={(e) => setClientGst(e.currentTarget.value)}
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <TextInput
                  label="Email Address"
                  placeholder="client@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.currentTarget.value)}
                  radius="md"
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Contract / Billing Methodology */}
          <Grid gutter="xs">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Select
                label="Billing Method *"
                data={[
                  { value: 'Milestone', label: 'Milestone-Based Billing' },
                  { value: 'Fixed Price', label: 'Fixed Price / Lump Sum' },
                  { value: 'Product', label: 'Product / Time & Material' },
                ]}
                value={billingMethod}
                onChange={(v) => setBillingMethod((v as BillingMethod) || 'Milestone')}
                required
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Total Contract Value (₹) *"
                value={contractValue}
                onChange={(val) => setContractValue(Number(val) || 0)}
                min={0}
                required
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Select
                label="Order Status"
                data={[
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Confirmed', label: 'Confirmed / Active' },
                  { value: 'In Progress', label: 'In Progress' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Cancelled', label: 'Cancelled' },
                ]}
                value={status}
                onChange={(v) => setStatus(v || 'Confirmed')}
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <MeetingDatePicker
                label="Order Date"
                placeholder="DD-MM-YYYY"
                value={orderDate}
                onChange={(val: string) => setOrderDate(val)}
                required
                zIndex={3000}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <MeetingDatePicker
                label="Start Date"
                placeholder="DD-MM-YYYY"
                value={startDate}
                onChange={(val: string) => setStartDate(val)}
                zIndex={3000}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <MeetingDatePicker
                label="End Date"
                placeholder="DD-MM-YYYY"
                value={endDate}
                onChange={(val: string) => setEndDate(val)}
                zIndex={3000}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Link to Existing Project (Optional)"
                placeholder="Connect to project in CRM"
                data={projects.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.category || 'IT Project'})`,
                }))}
                value={projectId}
                onChange={(val) => setProjectId(val || '')}
                searchable
                clearable
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Payment Terms"
                placeholder="Select payment terms"
                data={[
                  { value: 'Milestone based release', label: 'Milestone based release' },
                  { value: 'Net 15 Days', label: 'Net 15 Days' },
                  { value: 'Net 30 Days', label: 'Net 30 Days' },
                  { value: 'Net 45 Days', label: 'Net 45 Days' },
                  { value: 'Net 60 Days', label: 'Net 60 Days' },
                  { value: 'Due on Receipt', label: 'Due on Receipt' },
                  { value: '50% Advance, 50% on Delivery', label: '50% Advance, 50% on Delivery' },
                  { value: '30% Advance, 40% UAT, 30% Go-Live', label: '30% Advance, 40% UAT, 30% Go-Live' },
                  { value: '100% Advance', label: '100% Advance' },
                ]}
                value={paymentTerms}
                onChange={(val) => setPaymentTerms(val || 'Milestone based release')}
                searchable
                radius="md"
              />
            </Grid.Col>
          </Grid>

          {/* Deliverables / Scope Line Items */}
          <Paper
            p="md"
            withBorder
            radius="lg"
            style={{
              background: isDark ? '#111827' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
            }}
          >
            <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
              <div>
                <Text fw={700} size="sm">
                  Deliverables / Line Items Scope
                </Text>
                <Text size="xs" c="dimmed">
                  Select a product/service to pick its modules or type custom items manually. Enter rates manually.
                </Text>
              </div>

              <Button
                leftSection={<IconPlus size={15} />}
                variant="light"
                size="xs"
                radius="md"
                onClick={addItem}
                color="indigo"
              >
                Add Deliverable
              </Button>
            </Group>

            {/* Quick Add from Catalogue Toolbar */}
            <Paper
              p="xs"
              radius="md"
              mb="sm"
              style={{
                background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0',
              }}
            >
              <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                <Group gap="xs" align="center">
                  <Badge variant="light" color="indigo" radius="sm" size="sm">
                    Select Catalogue:
                  </Badge>
                  <Select
                    placeholder="Choose Product or Service to filter modules..."
                    data={products.map((p) => ({
                      value: p.id,
                      label: `${p.name} (${p.type})`,
                    }))}
                    value={selectedCatalogueId}
                    onChange={setSelectedCatalogueId}
                    searchable
                    clearable
                    size="xs"
                    radius="md"
                    style={{ width: 300 }}
                  />
                </Group>

                {selectedCatalogueProduct && selectedProductModules.length > 0 && (
                  <Button
                    variant="light"
                    color="indigo"
                    size="compact-xs"
                    radius="sm"
                    leftSection={<IconPlus size={12} />}
                    onClick={() => handleAddAllModules(selectedCatalogueProduct)}
                  >
                    Add All {selectedCatalogueProduct.name} Modules ({selectedProductModules.length})
                  </Button>
                )}
              </Group>
            </Paper>

            <Box style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover withTableBorder withColumnBorders style={{ minWidth: 750 }}>
                <Table.Thead>
                  <Table.Tr style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
                    <Table.Th style={{ width: '28%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Item Name / Deliverable
                    </Table.Th>
                    <Table.Th style={{ width: '26%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Scope / Description
                    </Table.Th>
                    <Table.Th style={{ width: '10%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Qty
                    </Table.Th>
                    <Table.Th style={{ width: '15%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Rate (₹)
                    </Table.Th>
                    <Table.Th style={{ width: '10%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      GST %
                    </Table.Th>
                    <Table.Th style={{ width: '14%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                      Total (₹)
                    </Table.Th>
                    <Table.Th style={{ width: '4%', textAlign: 'center' }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((item, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Group gap={4} wrap="nowrap" align="center">
                          {customRowIndices.includes(idx) ? (
                            <TextInput
                              placeholder="Type custom deliverable name..."
                              value={item.itemName}
                              onChange={(e) => updateItem(idx, 'itemName', e.currentTarget.value)}
                              size="xs"
                              radius="sm"
                              style={{ flex: 1 }}
                              required
                              autoFocus
                            />
                          ) : (
                            <Select
                              placeholder="Select Item or Module..."
                              data={getRowModuleOptions(item.itemName)}
                              value={item.itemName || null}
                              onChange={(val) => handleModuleSelect(idx, val)}
                              searchable
                              clearable
                              size="xs"
                              radius="sm"
                              style={{ flex: 1 }}
                              error={!item.itemName && Number(item.unitPrice || item.totalAmount || 0) > 0}
                              nothingFoundMessage="No matching item (click ✎ pencil to type manually)"
                            />
                          )}
                          <ActionIcon
                            variant="subtle"
                            color={customRowIndices.includes(idx) ? 'indigo' : 'gray'}
                            size="sm"
                            radius="sm"
                            onClick={() => toggleCustomRow(idx)}
                            title={customRowIndices.includes(idx) ? 'Switch to Select Module' : 'Switch to Type Manually'}
                          >
                            {customRowIndices.includes(idx) ? <IconList size={13} /> : <IconPencil size={13} />}
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Textarea
                          placeholder="Scope details / features..."
                          value={item.description || ''}
                          onChange={(e) => updateItem(idx, 'description', e.currentTarget.value)}
                          size="xs"
                          radius="sm"
                          minRows={2}
                          maxRows={4}
                          autosize
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={item.quantity}
                          onChange={(val) => updateItem(idx, 'quantity', val)}
                          min={1}
                          size="xs"
                          radius="sm"
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          placeholder="Enter rate"
                          value={item.unitPrice}
                          onChange={(val) => updateItem(idx, 'unitPrice', val)}
                          min={0}
                          size="xs"
                          radius="sm"
                          thousandSeparator=","
                        />
                      </Table.Td>
                      <Table.Td>
                        <Select
                          data={[
                            { value: '0', label: '0%' },
                            { value: '5', label: '5%' },
                            { value: '12', label: '12%' },
                            { value: '18', label: '18%' },
                            { value: '28', label: '28%' },
                          ]}
                          value={String(item.taxRate)}
                          onChange={(val) => updateItem(idx, 'taxRate', Number(val) || 0)}
                          size="xs"
                          radius="sm"
                        />
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" fw={700}>
                          ₹{Number(item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <ActionIcon color="red" variant="subtle" size="sm" onClick={() => removeItem(idx)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          </Paper>

          {/* Notes */}
          <Textarea
            label="Internal Notes / Contract Clauses"
            placeholder="Key project assumptions, SLA guidelines, or scope notes"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            minRows={2}
            radius="md"
          />

          {/* Footer */}
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
                minWidth: 150,
                border: 'none',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              }}
            >
              {order ? 'Update Sales Order' : 'Create Sales Order'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
