import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  TextInput,
  Select,
  Autocomplete,
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
  ThemeIcon,
  Tooltip,
  SimpleGrid,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconCalculator,
  IconDeviceFloppy,
  IconX,
  IconPencil,
  IconList,
  IconUpload,
  IconDownload,
  IconFileDescription,
  IconEye,
  IconFile,
  IconArrowLeft,
  IconArrowRight,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Quotation, QuotationItem, ProductType } from '../../../types/billing';
import { billingService } from '../../../services/billingService';
import { contactService } from '../../../services/contactService';
import { settingsService } from '../../../services/settingsService';
import { Contact } from '../../../types/contact';
import { Lead } from '../../../types/lead';
import { MasterProject, MasterModuleItem } from '../../../types/settings';
import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';

interface QuotationModalProps {
  opened: boolean;
  onClose: () => void;
  quotation?: Quotation | null;
  onSuccess: (savedQuote?: Quotation) => void;
  initialLead?: Lead | null;
  embedded?: boolean;
  onNavigateSection?: (section: any) => void;
  isRevision?: boolean;
  baseQuotation?: Quotation | null;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  opened,
  onClose,
  quotation,
  onSuccess,
  initialLead,
  embedded = false,
  onNavigateSection,
  isRevision = false,
  baseQuotation = null,
}) => {
  const isDark = useComputedColorScheme('light') === 'dark';
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [masterProjects, setMasterProjects] = useState<MasterProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [customRowIndices, setCustomRowIndices] = useState<number[]>([]);

  // Revision state & details
  const effectiveBase = isRevision ? (baseQuotation || quotation) : null;
  const nextVersion = effectiveBase
    ? (effectiveBase.latestVersion ? effectiveBase.latestVersion + 1 : ((effectiveBase.version || 1) + 1))
    : 2;
  const nextRevisionName = `V${nextVersion}`;
  const baseQuotationNumber = effectiveBase
    ? (effectiveBase.originalQuotationNumber || effectiveBase.quotationNumber)
    : '';
  const [revisionNotes, setRevisionNotes] = useState<string>('');

  const selectedProject = masterProjects.find(
    (p) => p.id === selectedProjectId || p.projectCode === selectedProjectId
  );
  const projectModules = selectedProject?.modules || [];

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
  const [quotationDate, setQuotationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [validUntil, setValidUntil] = useState<string>('');
  const [status, setStatus] = useState<string>('Draft');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [termsConditions, setTermsConditions] = useState<string>('');

  const [items, setItems] = useState<QuotationItem[]>([
    {
      itemName: '',
      itemType: 'Service',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 'percentage',
      taxRate: 18,
      taxAmount: 0,
      totalAmount: 0,
    },
  ]);

  // Load Contacts & Products on open
  useEffect(() => {
    if (opened) {
      contactService.getContacts({ limit: 100 }).then((res) => {
        if (res?.data) {
          setContacts(res.data);
          // If we have an initialLead and clientGst is empty, try to match contact
          if (initialLead && !quotation) {
            const found = res.data.find(
              (c: Contact) =>
                (initialLead.email && c.email && c.email.toLowerCase() === initialLead.email.toLowerCase()) ||
                (initialLead.phone && c.phone && c.phone === initialLead.phone) ||
                (c.name && c.name.toLowerCase() === initialLead.name.toLowerCase())
            );
            if (found) {
              if (found.gstNumber) setClientGst((prev) => prev || found.gstNumber || '');
              if (!initialLead.address && found.address) {
                setClientAddress((prev) => prev || found.address || '');
              }
            }
          }
        }
      }).catch(() => {});

      settingsService.getMasterProjects().then((res) => {
        if (res && res.success && Array.isArray(res.data)) {
          setMasterProjects(res.data);
          // If lead has product or service matching a master project, auto-select it
          if (initialLead) {
            const leadItem =
              initialLead.product ||
              initialLead.service ||
              initialLead.productList?.[0] ||
              initialLead.serviceList?.[0];
            if (leadItem) {
              const matchedProj = res.data.find(
                (p) =>
                  p.name.toLowerCase().includes(leadItem.toLowerCase()) ||
                  leadItem.toLowerCase().includes(p.name.toLowerCase())
              );
              if (matchedProj) {
                setSelectedProjectId(matchedProj.id);
              }
            }
          }
        }
      }).catch(() => {});
    }
  }, [opened, initialLead]);

  // Populate on edit, revision or initialLead
  useEffect(() => {
    if (!opened) return;

    if (isRevision && effectiveBase) {
      setContactId(effectiveBase.contactId || '');
      setContactName(effectiveBase.contactName || '');
      setCompanyName(effectiveBase.companyName || '');
      setContactEmail(effectiveBase.contactEmail || '');
      setContactPhone(effectiveBase.contactPhone || '');
      setClientGst(effectiveBase.clientGst || '');
      setClientAddress(effectiveBase.clientAddress || '');
      setQuotationDate(new Date().toISOString().split('T')[0]);
      setValidUntil(
        effectiveBase.validUntil?.split('T')[0] ||
        new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
      );
      setStatus('Draft');
      setDiscountType(effectiveBase.discountType || 'percentage');
      setDiscountValue(Number(effectiveBase.discountValue) || 0);
      setPaymentTerms(effectiveBase.paymentTerms || 'Net 30 Days');
      setNotes(effectiveBase.notes || '');
      setTermsConditions(effectiveBase.termsConditions || '');
      setRevisionNotes('');
      if (effectiveBase.items && effectiveBase.items.length > 0) {
        setItems(
          effectiveBase.items.map((it) => {
            const qty = Number(it.quantity) || 1;
            const price = Number(it.unitPrice) || 0;
            const disc = Number(it.discount) || 0;
            const discType = it.discountType || 'percentage';
            const gross = qty * price;
            const discAmt = discType === 'percentage' ? (gross * disc) / 100 : Math.min(gross, disc);
            const base = Math.max(0, gross - discAmt);
            const taxRate = Number(it.taxRate) || 0;
            const taxAmount = Number(((base * taxRate) / 100).toFixed(2));
            const totalAmount = Number((base + taxAmount).toFixed(2));

            return {
              ...it,
              quantity: qty,
              unitPrice: price,
              discount: disc,
              discountType: discType,
              taxRate,
              taxAmount: it.taxAmount ? Number(it.taxAmount) : taxAmount,
              totalAmount: it.totalAmount ? Number(it.totalAmount) : totalAmount,
            };
          })
        );
      }
    } else if (quotation) {
      setContactId(quotation.contactId || '');
      setContactName(quotation.contactName || '');
      setCompanyName(quotation.companyName || '');
      setContactEmail(quotation.contactEmail || '');
      setContactPhone(quotation.contactPhone || '');
      setClientGst(quotation.clientGst || '');
      setClientAddress(quotation.clientAddress || '');
      setQuotationDate(quotation.quotationDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
      setValidUntil(quotation.validUntil?.split('T')[0] || '');
      setStatus(quotation.status || 'Draft');
      setDiscountType(quotation.discountType || 'percentage');
      setDiscountValue(Number(quotation.discountValue) || 0);
      setPaymentTerms(quotation.paymentTerms || 'Net 30 Days');
      setNotes(quotation.notes || '');
      setTermsConditions(quotation.termsConditions || '');
      if (quotation.items && quotation.items.length > 0) {
        setItems(
          quotation.items.map((it) => {
            const qty = Number(it.quantity) || 1;
            const price = Number(it.unitPrice) || 0;
            const disc = Number(it.discount) || 0;
            const discType = it.discountType || 'percentage';
            const gross = qty * price;
            const discAmt = discType === 'percentage' ? (gross * disc) / 100 : Math.min(gross, disc);
            const base = Math.max(0, gross - discAmt);
            const taxRate = Number(it.taxRate) || 0;
            const taxAmount = Number(((base * taxRate) / 100).toFixed(2));
            const totalAmount = Number((base + taxAmount).toFixed(2));

            return {
              ...it,
              quantity: qty,
              unitPrice: price,
              discount: disc,
              discountType: discType,
              taxRate,
              taxAmount: it.taxAmount ? Number(it.taxAmount) : taxAmount,
              totalAmount: it.totalAmount ? Number(it.totalAmount) : totalAmount,
            };
          })
        );
      }
    } else if (initialLead) {
      // Auto-fetch details directly from the active Lead
      const matchedContact = contacts.find(
        (c) =>
          (initialLead.email && c.email && c.email.toLowerCase() === initialLead.email.toLowerCase()) ||
          (initialLead.phone && c.phone && c.phone === initialLead.phone) ||
          (c.name && c.name.toLowerCase() === initialLead.name.toLowerCase())
      );

      setContactId(initialLead.id || '');
      setContactName(initialLead.name || '');
      setCompanyName(initialLead.companyName || initialLead.profession || '');
      setContactEmail(initialLead.email || '');
      setContactPhone(initialLead.phone || '');
      setClientGst(matchedContact?.gstNumber || '');
      setClientAddress(
        initialLead.address ||
          (matchedContact?.address
            ? `${matchedContact.address}${matchedContact.registeredState ? `, ${matchedContact.registeredState}` : ''}`.trim()
            : '')
      );
      setQuotationDate(new Date().toISOString().split('T')[0]);
      setValidUntil('');
      setStatus('Draft');
      setDiscountType('percentage');
      setDiscountValue(0);
      setPaymentTerms('');
      setNotes('');
      setTermsConditions('');
      setSelectedProjectId(null);
      setCustomRowIndices([]);
      setItems([
        {
          itemName: '',
          itemType: 'Service',
          description: '',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          discountType: 'percentage',
          taxRate: 18,
          taxAmount: 0,
          totalAmount: 0,
        },
      ]);
    } else {
      // Reset form
      setContactId('');
      setContactName('');
      setCompanyName('');
      setContactEmail('');
      setContactPhone('');
      setClientGst('');
      setClientAddress('');
      setQuotationDate(new Date().toISOString().split('T')[0]);
      setValidUntil('');
      setStatus('Draft');
      setDiscountType('percentage');
      setDiscountValue(0);
      setPaymentTerms('');
      setNotes('');
      setTermsConditions('');
      setSelectedProjectId(null);
      setCustomRowIndices([]);
      setItems([
        {
          itemName: '',
          itemType: 'Service',
          description: '',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          discountType: 'percentage',
          taxRate: 18,
          taxAmount: 0,
          totalAmount: 0,
        },
      ]);
    }
  }, [quotation, opened, initialLead]);

  // Handle Contact Selection
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

  // Calculations & Item Updates
  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // Recompute line item total
    const qty = Number(updated[index].quantity) || 0;
    const price = Number(updated[index].unitPrice) || 0;
    const gross = qty * price;
    const disc = Number(updated[index].discount) || 0;
    const discType = updated[index].discountType || 'percentage';
    const rate = Number(updated[index].taxRate) || 0;

    let lineDiscAmt = 0;
    if (discType === 'percentage') {
      lineDiscAmt = (gross * disc) / 100;
    } else {
      lineDiscAmt = Math.min(gross, disc);
    }
    lineDiscAmt = Number(lineDiscAmt.toFixed(2));

    const baseAmount = Math.max(0, gross - lineDiscAmt);
    const tax = Number(((baseAmount * rate) / 100).toFixed(2));
    const total = Number((baseAmount + tax).toFixed(2));

    updated[index].taxAmount = tax;
    updated[index].totalAmount = total;

    setItems(updated);
  };

  // Smart suggestions for item names (products + modules)
  // Smart suggestions for item names (from selected project or all catalog projects)
  const autocompleteOptions = useMemo(() => {
    const list: string[] = [];
    if (selectedProject) {
      for (const m of selectedProject.modules || []) {
        const mName = typeof m === 'string' ? m : m.name;
        if (mName && !list.includes(mName)) {
          list.push(mName);
        }
      }
      if (selectedProject.name && !list.includes(selectedProject.name)) {
        list.push(selectedProject.name);
      }
    } else {
      for (const p of masterProjects) {
        for (const m of p.modules || []) {
          const mName = typeof m === 'string' ? m : m.name;
          if (mName && !list.includes(mName)) {
            list.push(mName);
          }
        }
        if (p.name && !list.includes(p.name)) {
          list.push(p.name);
        }
      }
    }
    return list;
  }, [masterProjects, selectedProject]);

  const resolveProductType = (type?: string): ProductType => {
    if (!type) return 'Service';
    return type.toLowerCase().includes('product') ? 'Product' : 'Service';
  };

  const handleItemSelect = (idx: number, val: string) => {
    const updated = [...items];
    updated[idx].itemName = val;

    // Check if it matches a master project name
    const proj = masterProjects.find((p) => p.name.toLowerCase() === val.toLowerCase());
    if (proj) {
      updated[idx].itemType = resolveProductType(proj.projectType);
      if (proj.basePrice && (!updated[idx].unitPrice || updated[idx].unitPrice === 0)) {
        updated[idx].unitPrice = Number(proj.basePrice);
      }
      if (proj.description && !updated[idx].description) {
        updated[idx].description = proj.description;
      }
    } else {
      // Check if it matches a module in selectedProject or any project
      const searchPool = selectedProject ? [selectedProject] : masterProjects;
      for (const p of searchPool) {
        const foundMod = (p.modules || []).find((m) => {
          const mName = typeof m === 'string' ? m : m.name;
          return mName.toLowerCase() === val.toLowerCase();
        });
        if (foundMod) {
          if (typeof foundMod !== 'string') {
            if (foundMod.description && !updated[idx].description) {
              updated[idx].description = foundMod.description;
            }
            if (foundMod.price && (!updated[idx].unitPrice || updated[idx].unitPrice === 0)) {
              updated[idx].unitPrice = Number(foundMod.price);
            }
          }
          break;
        }
      }
    }

    // Recalculate line total
    const qty = Number(updated[idx].quantity) || 1;
    const price = Number(updated[idx].unitPrice) || 0;
    const gross = qty * price;
    const disc = Number(updated[idx].discount) || 0;
    const discType = updated[idx].discountType || 'percentage';
    let lineDiscAmt = 0;
    if (discType === 'percentage') {
      lineDiscAmt = (gross * disc) / 100;
    } else {
      lineDiscAmt = Math.min(gross, disc);
    }
    lineDiscAmt = Number(lineDiscAmt.toFixed(2));
    const base = Math.max(0, gross - lineDiscAmt);
    const taxRate = updated[idx].taxRate !== undefined ? Number(updated[idx].taxRate) : 18;
    const taxAmt = Number(((base * taxRate) / 100).toFixed(2));
    updated[idx].taxAmount = taxAmt;
    updated[idx].totalAmount = Number((base + taxAmt).toFixed(2));

    setItems(updated);
  };

  const handleAddSingleModule = (mod: MasterModuleItem | string) => {
    const modName = typeof mod === 'string' ? mod : mod.name;
    const modDesc = typeof mod === 'string' ? '' : mod.description || '';
    const modPrice = typeof mod === 'string' ? 0 : Number(mod.price) || 0;

    const isFirstItemEmpty =
      items.length === 1 && !items[0].itemName.trim() && (items[0].unitPrice === 0 || !items[0].unitPrice);

    const price = modPrice > 0 ? modPrice : 0;
    const taxRate = 18;
    const taxAmt = Number(((price * taxRate) / 100).toFixed(2));

    const newItem: QuotationItem = {
      itemName: modName,
      itemType: resolveProductType(selectedProject?.projectType),
      description: modDesc || (selectedProject ? `${selectedProject.name} - ${modName} module` : ''),
      quantity: 1,
      unitPrice: price,
      discount: 0,
      discountType: 'percentage',
      taxRate: taxRate,
      taxAmount: taxAmt,
      totalAmount: Number((price + taxAmt).toFixed(2)),
    };

    if (isFirstItemEmpty) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }

    notifications.show({
      color: 'teal',
      message: `Added module "${modName}" to line items`,
    });
  };

  const handleAddAllProjectModules = (proj: MasterProject) => {
    const mods = proj.modules || [];
    if (mods.length === 0) return;

    const isFirstItemEmpty =
      items.length === 1 && !items[0].itemName.trim() && (items[0].unitPrice === 0 || !items[0].unitPrice);

    const newItems: QuotationItem[] = mods.map((m) => {
      const modName = typeof m === 'string' ? m : m.name;
      const modDesc = typeof m === 'string' ? '' : m.description || '';
      const modPrice = typeof m === 'string' ? 0 : Number(m.price) || 0;
      const taxRate = 18;
      const taxAmt = Number(((modPrice * taxRate) / 100).toFixed(2));

      return {
        itemName: modName,
        itemType: resolveProductType(proj.projectType),
        description: modDesc || `${proj.name} - ${modName} module`,
        quantity: 1,
        unitPrice: modPrice,
        discount: 0,
        discountType: 'percentage',
        taxRate: taxRate,
        taxAmount: taxAmt,
        totalAmount: Number((modPrice + taxAmt).toFixed(2)),
      };
    });

    if (isFirstItemEmpty) {
      setItems(newItems);
    } else {
      setItems([...items, ...newItems]);
    }

    notifications.show({
      color: 'teal',
      message: `Added all ${newItems.length} modules from "${proj.name}"`,
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
        discount: 0,
        taxRate: 18,
        taxAmount: 0,
        totalAmount: 0,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) {
      notifications.show({
        color: 'yellow',
        message: initialLead ? 'A proposal must have at least one line item.' : 'A quotation must have at least one line item.',
      });
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
  };

  // Grand summary calculations matching PDF and DB
  const grossSubtotal = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );
  const totalItemDiscount = items.reduce((acc, it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const gross = qty * price;
    const disc = Number(it.discount) || 0;
    const discType = it.discountType || 'percentage';
    const lineDiscAmt = discType === 'percentage' ? (gross * disc) / 100 : Math.min(gross, disc);
    return acc + lineDiscAmt;
  }, 0);
  const netSubtotal = Math.max(0, grossSubtotal - totalItemDiscount);
  const overallDiscount = discountType === 'percentage'
    ? (netSubtotal * discountValue) / 100
    : Math.min(netSubtotal, discountValue);
  const taxableSubtotal = Math.max(0, netSubtotal - overallDiscount);
  const factor = netSubtotal > 0 ? taxableSubtotal / netSubtotal : 1;
  const totalTax = items.reduce((acc, it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const gross = qty * price;
    const disc = Number(it.discount) || 0;
    const discType = it.discountType || 'percentage';
    const lineDiscAmt = discType === 'percentage' ? (gross * disc) / 100 : Math.min(gross, disc);
    const lineBase = Math.max(0, gross - lineDiscAmt);
    const effectiveBase = lineBase * factor;
    return acc + (effectiveBase * (Number(it.taxRate) || 0)) / 100;
  }, 0);
  const grandTotal = Number((taxableSubtotal + totalTax).toFixed(2));

  const saveQuotationData = async (): Promise<Quotation | null> => {
    if (!contactName.trim()) {
      notifications.show({ color: 'red', message: 'Client or Contact Name is required' });
      return null;
    }

    if (!validUntil || !validUntil.trim()) {
      notifications.show({ color: 'red', message: 'Valid Until date is required' });
      return null;
    }

    if (items.some((it) => !it.itemName.trim() || Number(it.quantity) <= 0)) {
      notifications.show({ color: 'red', message: 'All items must have a valid name and quantity greater than 0' });
      return null;
    }

    try {
      setSubmitting(true);
      const payload: Partial<Quotation> = {
        contactId: contactId || null,
        leadId: initialLead?.id || quotation?.leadId || null,
        contactName,
        companyName,
        contactEmail,
        contactPhone,
        clientGst,
        clientAddress,
        quotationDate,
        validUntil,
        status: status as any,
        discountType,
        discountValue,
        discountAmount: Number(overallDiscount.toFixed(2)),
        taxAmount: Number(totalTax.toFixed(2)),
        paymentTerms,
        notes,
        termsConditions,
        grandTotal,
        subtotal: Number(netSubtotal.toFixed(2)),
        items,
      };

      let savedQuote: Quotation | undefined;
      if (isRevision && effectiveBase?.id) {
        savedQuote = await billingService.createQuotationRevision(effectiveBase.id, {
          ...payload,
          projectName: effectiveBase.projectName || payload.projectName,
          revisionNotes: revisionNotes.trim() || `Revision ${nextRevisionName} created from ${baseQuotationNumber}`,
        });
        notifications.show({
          color: 'green',
          message: `Quotation Revision ${nextRevisionName} (${savedQuote.quotationNumber}) created successfully!`,
        });
      } else if (quotation?.id && !quotation.id.startsWith('quo-')) {
        savedQuote = await billingService.updateQuotation(quotation.id, payload);
        notifications.show({
          color: 'green',
          message: 'Quotation updated successfully in CRM database',
        });
      } else {
        savedQuote = await billingService.createQuotation(payload);
        notifications.show({
          color: 'green',
          message: 'Quotation created and saved in CRM database',
        });
      }

      return savedQuote || null;
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to save quotation' });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await saveQuotationData();
    if (saved) {
      onSuccess(saved);
      onClose();
    }
  };

  const handleSaveAndNavigate = async (targetSection: 'contracts' | 'negotiation') => {
    const saved = await saveQuotationData();
    if (saved) {
      onSuccess(saved);
      onClose();
      if (onNavigateSection) {
        onNavigateSection(targetSection);
      }
    }
  };

  if (!opened) return null;

  const formContent = (
    <>
      {/* Header */}
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
            <IconCalculator size={22} stroke={1.8} />
          </Box>
          <div>
            <Text fw={800} size="19px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
              {isRevision && effectiveBase
                ? `Create Revision ${nextRevisionName} (${baseQuotationNumber}-${nextRevisionName})`
                : quotation
                ? `Edit Quotation (${quotation.quotationNumber})`
                : initialLead
                ? `Create Quotation • ${initialLead.name}`
                : 'Quotation Maker • New Quotation'}
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              {isRevision && effectiveBase
                ? `Cloning line items and terms from ${effectiveBase.quotationNumber}. Historical version is preserved.`
                : initialLead
                ? `Build and save quotation for ${initialLead.name} (${initialLead.companyName || 'Lead'}) directly in CRM database`
                : 'Prepare itemized estimate with catalogue products, GST rates, and terms (Stored in CRM Database)'}
            </Text>
          </div>
        </Group>

        {embedded ? (
          <Button
            variant="light"
            color="gray"
            size="sm"
            radius="md"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onClose}
            style={{ fontWeight: 600 }}
          >
            Back to Quotations
          </Button>
        ) : (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            radius="100px"
            onClick={onClose}
          >
            <IconX size={18} />
          </ActionIcon>
        )}
      </Group>

      {/* Revision Banner if creating revision */}
      {isRevision && effectiveBase && (
        <Paper
          p="sm"
          radius="md"
          mb="md"
          style={{
            background: isDark ? 'rgba(79, 70, 229, 0.15)' : '#EEF2FF',
            border: isDark ? '1px solid rgba(79, 70, 229, 0.35)' : '1px solid #C7D2FE',
          }}
        >
          <Group justify="space-between" align="center" mb={6}>
            <Group gap="xs">
              <Badge color="indigo" variant="filled" size="sm" radius="sm">
                Next Version: {nextRevisionName}
              </Badge>
              <Text size="xs" fw={700} style={{ color: isDark ? '#C7D2FE' : '#3730A3' }}>
                Revision of {baseQuotationNumber}
              </Text>
            </Group>
            <Text size="11px" c="dimmed">
              Original Version: {effectiveBase.revisionName || `V${effectiveBase.version || 1}`} ({effectiveBase.status})
            </Text>
          </Group>
          <TextInput
            label="Revision Reason / Changes Requested by Client"
            placeholder="e.g., Client requested 5% additional discount on software development and 45-day credit period"
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.currentTarget.value)}
            size="xs"
            styles={{
              input: {
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              },
            }}
          />
        </Paper>
      )}

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Client Details Section */}
          <Paper p="md" withBorder radius="lg" style={{ background: isDark ? '#111827' : '#F8FAFC', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0' }}>
            <Group justify="space-between" align="center" mb="xs">
              <Text fw={700} size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                Client Information {initialLead ? '(Auto-fetched from Lead)' : '(CRM Contact / Organization)'}
              </Text>
              {initialLead && (
                <Badge size="xs" variant="light" color="indigo" radius="sm">
                  Lead: {initialLead.name}
                </Badge>
              )}
            </Group>
            <Grid gutter="xs">
              {!initialLead && (
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
              )}
              <Grid.Col span={{ base: 12, sm: initialLead ? 6 : 6 }}>
                <TextInput
                  label="Contact / Client Name"
                  placeholder="e.g. Rahul Sharma"
                  value={contactName}
                  onChange={(e) => setContactName(e.currentTarget.value)}
                  required
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: initialLead ? 6 : 4 }}>
                <TextInput
                  label="Company Name"
                  placeholder="e.g. Acme Innovations Pvt Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.currentTarget.value)}
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
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <TextInput
                  label="Phone Number"
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.currentTarget.value)}
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <TextInput
                  label="Client GSTIN"
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  value={clientGst}
                  onChange={(e) => setClientGst(e.currentTarget.value)}
                  radius="md"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: initialLead ? 12 : 8 }}>
                <TextInput
                  label="Billing Address"
                  placeholder="Registered Office Address"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.currentTarget.value)}
                  radius="md"
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Validity & Dates */}
          <Grid gutter="xs">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <MeetingDatePicker
                label={initialLead ? 'Proposal Date' : 'Quotation Date'}
                placeholder="dd-mm-yyyy"
                value={quotationDate}
                onChange={(val) => setQuotationDate(val)}
                required
                zIndex={3000}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <MeetingDatePicker
                label="Valid Until"
                placeholder="dd-mm-yyyy"
                value={validUntil}
                onChange={(val) => setValidUntil(val)}
                required
                zIndex={3000}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Select
                label="Status"
                data={[
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Sent', label: 'Sent to Client' },
                  { value: 'Changes Required', label: 'Changes Required' },
                  { value: 'Accepted', label: 'Accepted' },
                  { value: 'Rejected', label: 'Rejected' },
                  { value: 'Expired', label: 'Expired' },
                ]}
                value={status}
                onChange={(val) => setStatus(val || 'Draft')}
                radius="md"
                styles={{
                  input: {
                    height: 44,
                    borderRadius: 10,
                  },
                }}
              />
            </Grid.Col>
          </Grid>

          {/* Line Items Table */}
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
                  Line Items (Products, Services & Modules)
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
                Add Item
              </Button>
            </Group>

            {/* Project Name & Module Selection Toolbar */}
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
                <Group gap="xs" align="center" wrap="wrap">
                  <Badge variant="light" color="indigo" radius="sm" size="sm">
                    Project Name:
                  </Badge>
                  <Select
                    placeholder="Choose Project..."
                    data={masterProjects.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                    value={selectedProjectId}
                    onChange={(val) => setSelectedProjectId(val)}
                    searchable
                    clearable
                    size="xs"
                    radius="md"
                    style={{ width: 270 }}
                  />

                  {selectedProject && projectModules.length > 0 && (
                    <Select
                      placeholder="Select a module to add..."
                      data={projectModules.map((m) => {
                        const mName = typeof m === 'string' ? m : m.name;
                        return { value: mName, label: `+ Add ${mName}` };
                      })}
                      value={null}
                      onChange={(val) => {
                        if (val) {
                          const found = projectModules.find(
                            (m) => (typeof m === 'string' ? m : m.name) === val
                          );
                          if (found) handleAddSingleModule(found);
                        }
                      }}
                      searchable
                      clearable
                      size="xs"
                      radius="md"
                      style={{ width: 230 }}
                    />
                  )}
                </Group>

                {selectedProject && projectModules.length > 0 && (
                  <Button
                    variant="light"
                    color="indigo"
                    size="compact-xs"
                    radius="sm"
                    leftSection={<IconPlus size={12} />}
                    onClick={() => handleAddAllProjectModules(selectedProject)}
                  >
                    Add All {selectedProject.name} Modules ({projectModules.length})
                  </Button>
                )}
              </Group>
            </Paper>

            <Box style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover withTableBorder withColumnBorders style={{ minWidth: 800 }}>
                <Table.Thead>
                  <Table.Tr style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
                    <Table.Th style={{ width: '36%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Items / Item Description
                    </Table.Th>
                    <Table.Th style={{ width: '7%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Qty
                    </Table.Th>
                    <Table.Th style={{ width: '14%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Unit Rate (₹)
                    </Table.Th>
                    <Table.Th style={{ width: '17%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Discount
                    </Table.Th>
                    <Table.Th style={{ width: '10%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      GST %
                    </Table.Th>
                    <Table.Th style={{ width: '12%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                      Total (₹)
                    </Table.Th>
                    <Table.Th style={{ width: '4%', textAlign: 'center' }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((item, idx) => {
                    const qty = Number(item.quantity) || 1;
                    const price = Number(item.unitPrice) || 0;
                    const gross = qty * price;
                    const disc = Number(item.discount) || 0;
                    const discType = item.discountType || 'percentage';
                    const lineDiscAmt = discType === 'percentage' ? (gross * disc) / 100 : Math.min(gross, disc);

                    return (
                      <Table.Tr key={idx}>
                        <Table.Td>
                          <Autocomplete
                            placeholder="Type or select product/service, enter item description..."
                            data={autocompleteOptions}
                            value={item.itemName || ''}
                            onChange={(val) => updateItem(idx, 'itemName', val)}
                            onOptionSubmit={(val) => handleItemSelect(idx, val)}
                            size="xs"
                            radius="sm"
                            style={{ width: '100%' }}
                            required
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
                            value={item.unitPrice === 0 ? '' : item.unitPrice}
                            onChange={(val) => updateItem(idx, 'unitPrice', val)}
                            min={0}
                            size="xs"
                            radius="sm"
                            thousandSeparator=","
                          />
                        </Table.Td>
                        <Table.Td>
                          <Group gap={3} wrap="nowrap" align="center">
                            <Select
                              data={[
                                { value: 'percentage', label: '%' },
                                { value: 'fixed', label: '₹' },
                              ]}
                              value={item.discountType || 'percentage'}
                              onChange={(v) => updateItem(idx, 'discountType', v || 'percentage')}
                              size="xs"
                              radius="sm"
                              style={{ width: 54 }}
                              comboboxProps={{ withinPortal: false }}
                            />
                            <NumberInput
                              value={item.discount === 0 ? '' : item.discount}
                              placeholder="0"
                              onChange={(val) => updateItem(idx, 'discount', Number(val) || 0)}
                              min={0}
                              size="xs"
                              radius="sm"
                              style={{ width: 70 }}
                            />
                          </Group>
                          {disc > 0 && discType === 'percentage' && (
                            <Text size="10px" c="green" mt={2} ta="right">
                              -₹{lineDiscAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </Text>
                          )}
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
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Box>

            {/* Calculations Box matching PDF & DB */}
            <Group justify="flex-end" mt="md">
              <Box style={{ width: 340 }}>
                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Subtotal before discounts:</Text>
                    <Text size="xs" fw={600}>₹{grossSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="xs" c={totalItemDiscount > 0 ? 'green' : 'dimmed'}>Total Item-wise Discount:</Text>
                    <Text size="xs" fw={600} c={totalItemDiscount > 0 ? 'green' : 'dimmed'}>
                      {totalItemDiscount > 0 ? `-₹${totalItemDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Group gap={4}>
                      <Text size="xs" c="dimmed">Overall Discount:</Text>
                      <Select
                        data={[{ value: 'percentage', label: '%' }, { value: 'fixed', label: '₹' }]}
                        value={discountType}
                        onChange={(v) => setDiscountType((v as any) || 'percentage')}
                        size="xs"
                        radius="xs"
                        style={{ width: 56 }}
                        comboboxProps={{ withinPortal: false }}
                      />
                      <NumberInput
                        value={discountValue}
                        onChange={(v) => setDiscountValue(Number(v) || 0)}
                        min={0}
                        size="xs"
                        radius="xs"
                        style={{ width: 68 }}
                      />
                    </Group>
                    <Text size="xs" fw={600} c={overallDiscount > 0 ? 'green' : 'dimmed'}>
                      {overallDiscount > 0 ? `-₹${overallDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00'}
                    </Text>
                  </Group>

                  <Divider my={2} />

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Taxable Amount:</Text>
                    <Text size="xs" fw={600}>₹{taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">GST Amount:</Text>
                    <Text size="xs" fw={600}>₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </Group>

                  <Divider my={2} />

                  <Group justify="space-between">
                    <Text size="sm" fw={700}>Grand Total:</Text>
                    <Text size="sm" fw={800} c="indigo">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </Group>
                </Stack>
              </Box>
            </Group>
          </Paper>

          {/* Notes & Terms */}
          <Grid gutter="xs">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Textarea
                label="Notes / Client Remarks"
                placeholder="Internal notes or project remarks..."
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                minRows={4}
                autosize
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Textarea
                label="Terms & Conditions"
                placeholder={
                  "1. Quotation valid for 30 days from issue.\n2. 50% advance along with confirmed Purchase Order.\n3. Taxes extra as applicable by law."
                }
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.currentTarget.value)}
                minRows={4}
                autosize
                radius="md"
              />
            </Grid.Col>
          </Grid>

          {/* Footer Actions */}
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
              {isRevision ? `Create Revision ${nextRevisionName}` : (quotation ? 'Update Quotation' : 'Create Quotation')}
            </Button>

            {/* Conditional Navigation Buttons based on quotation status */}
            {status === 'Accepted' && onNavigateSection && (
              <Button
                type="button"
                color="teal"
                radius="md"
                loading={submitting}
                rightSection={<IconArrowRight size={15} />}
                onClick={() => handleSaveAndNavigate('contracts')}
                style={{
                  fontWeight: 600,
                  minWidth: 160,
                  background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                }}
              >
                Proceed to Contract
              </Button>
            )}

            {status === 'Changes Required' && onNavigateSection && (
              <Button
                type="button"
                color="blue"
                radius="md"
                loading={submitting}
                rightSection={<IconArrowRight size={15} />}
                onClick={() => handleSaveAndNavigate('negotiation')}
                style={{
                  fontWeight: 600,
                  minWidth: 170,
                  background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                }}
              >
                Proceed to Negotiation
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </>
  );

  if (embedded) {
    return (
      <Paper
        p={{ base: 'md', sm: 'xl' }}
        radius="lg"
        style={{
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(0,0,0,0.03)',
        }}
      >
        {formContent}
      </Paper>
    );
  }

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
      {formContent}
    </Modal>
  );
};
