import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Stack,
  SimpleGrid,
  TextInput,
  Select,
  Textarea,
  Button,
  Group,
  Text,
  Badge,
  useComputedColorScheme,
  Avatar,
  Divider,
  Center,
  Loader,
  Grid,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  Autocomplete,
  Modal,
  Checkbox,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCheck,
  IconBuilding,
  IconPhone,
  IconMail,
  IconTargetArrow,
  IconCalendar,
  IconCoin,
  IconClock,
  IconAlertCircle,
  IconBriefcase,
  IconIdBadge,
  IconUserCheck,
  IconUsers,
  IconArrowRight,
  IconPhoneCall,
  IconTag,
  IconBox,
  IconBrandWhatsapp,
  IconChevronDown,
  IconMapPin,
  IconReceiptTax,
  IconCreditCard,
  IconCalendarEvent,
  IconVideo,
  IconEdit,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import { Contact, QualificationStatus } from '../../types/contact';

import { contactService } from '../../services/contactService';
import { billingService } from '../../services/billingService';
import { settingsService } from '../../services/settingsService';
import { MeetingDatePicker } from '../meetings/components/MeetingDatePicker';
import { useContact } from '../../context/ContactContext';
import { useLead } from '../../context/LeadContext';
import { useCRM } from '../../context/CRMContext';

interface ContactQualificationPageProps {
  contact?: Contact | null;
  onBack: () => void;
  onSuccess?: (status?: string) => void;
}

export const ContactQualificationPage: React.FC<ContactQualificationPageProps> = ({
  contact: propContact,
  onBack,
  onSuccess,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const { currentUser } = useCRM();
  const { contacts, updateContact, metadata, loading } = useContact();
  const { fetchLeads, fetchStats } = useLead();

  const [activeContact, setActiveContact] = useState<Contact | null>(() => {
    if (propContact) return propContact;
    try {
      const saved = sessionStorage.getItem('crm_qualifying_contact');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return contacts.length > 0 ? contacts[0] : null;
  });

  // 1. Fetch live contact from server on mount to ensure fresh database data
  useEffect(() => {
    const targetId =
      propContact?.importedContactId ||
      propContact?.id ||
      propContact?.contactId ||
      (() => {
        try {
          const saved = sessionStorage.getItem('crm_qualifying_contact');
          if (saved) {
            const parsed = JSON.parse(saved);
            return parsed?.importedContactId || parsed?.id || parsed?.contactId;
          }
        } catch (e) {}
        return contacts.length > 0 ? (contacts[0].importedContactId || contacts[0].id || contacts[0].contactId) : null;
      })();

    if (targetId) {
      contactService
        .getContactById(targetId)
        .then((res) => {
          if (res?.success && res.data) {
            setActiveContact(res.data);
            try {
              sessionStorage.setItem('crm_qualifying_contact', JSON.stringify(res.data));
            } catch (e) {}
          }
        })
        .catch((err) => {
          console.warn('Live contact details sync notice:', err?.message || err);
        });
    }
  }, []);

  // 2. Only switch activeContact if propContact explicitly targets a different contact ID
  useEffect(() => {
    if (propContact && propContact.id && propContact.id !== activeContact?.id) {
      setActiveContact(propContact);
    }
  }, [propContact?.id]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [qualificationStatus, setQualificationStatus] = useState<QualificationStatus>('Pending');
  const [category, setCategory] = useState<'Product' | 'Service' | ''>('');
  const [productCode, setProductCode] = useState<string>('');
  const [budgetRange, setBudgetRange] = useState<string>('');
  const [interestedService, setInterestedService] = useState<string>('');
  const [employeeCount, setEmployeeCount] = useState<string>('');
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>('');
  const [nextFollowDate, setNextFollowDate] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [gstNumber, setGstNumber] = useState<string>('');
  const [companyPan, setCompanyPan] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [qualifiedBy, setQualifiedBy] = useState<string>('');
  const [qualificationDate, setQualificationDate] = useState<string>(todayStr);
  const [unqualifiedReason, setUnqualifiedReason] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Catalog Products & Services State
  const [catalogProducts, setCatalogProducts] = useState<string[]>([]);
  const [catalogServices, setCatalogServices] = useState<string[]>([]);
  const [customModalOpened, setCustomModalOpened] = useState<boolean>(false);
  const [customNameInput, setCustomNameInput] = useState<string>('');
  const [saveToCatalog, setSaveToCatalog] = useState<boolean>(true);
  const [savingCatalogItem, setSavingCatalogItem] = useState<boolean>(false);



  const loadCatalogItems = useCallback(async () => {
    try {
      const [prodsRes, projectsRes] = await Promise.allSettled([
        billingService.getProductsServices({ status: 'Active' }),
        settingsService.getMasterProjects({ status: 'Active' }),
      ]);
      const prods: string[] = [];
      const servs: string[] = [];

      if (prodsRes.status === 'fulfilled' && Array.isArray(prodsRes.value)) {
        prodsRes.value.forEach((p) => {
          if (p.name) {
            if (p.type === 'Service') servs.push(p.name.trim());
            else prods.push(p.name.trim());
          }
          if (Array.isArray(p.modules)) {
            p.modules.forEach((m: any) => {
              const name = typeof m === 'string' ? m : m?.name;
              if (name) servs.push(name.trim());
            });
          }
        });
      }

      if (projectsRes.status === 'fulfilled' && projectsRes.value?.success && Array.isArray(projectsRes.value.data)) {
        projectsRes.value.data.forEach((mp) => {
          if (mp.name) prods.push(mp.name.trim());
          if (Array.isArray(mp.modules)) {
            mp.modules.forEach((m: any) => {
              const name = typeof m === 'string' ? m : m?.name;
              if (name) servs.push(name.trim());
            });
          }
        });
      }

      if (metadata?.catalogProducts && Array.isArray(metadata.catalogProducts)) {
        metadata.catalogProducts.forEach((p) => p && prods.push(p.trim()));
      }
      if (metadata?.catalogServices && Array.isArray(metadata.catalogServices)) {
        metadata.catalogServices.forEach((s) => s && servs.push(s.trim()));
      }

      setCatalogProducts(Array.from(new Set(prods.filter(Boolean))));
      setCatalogServices(Array.from(new Set(servs.filter(Boolean))));
    } catch (err) {
      console.warn('Could not load catalog items:', err);
    }
  }, [metadata?.catalogProducts, metadata?.catalogServices]);

  useEffect(() => {
    loadCatalogItems();
  }, [loadCatalogItems]);

  const handleSaveCustomProduct = async () => {
    const trimmed = customNameInput.trim();
    if (!trimmed) return;

    setInterestedService(trimmed);
    setCustomModalOpened(false);
    setCustomNameInput('');

    if (saveToCatalog) {
      try {
        setSavingCatalogItem(true);
        await billingService.createProduct({
          name: trimmed,
          type: category === 'Product' ? 'Product' : 'Service',
          status: 'Active',
        });
        notifications.show({
          title: 'Added to Catalog',
          message: `"${trimmed}" has been added to your product catalog and selected.`,
          color: 'teal',
        });
        await loadCatalogItems();
      } catch (err: any) {
        console.error('Error saving to catalog:', err);
        notifications.show({
          title: 'Custom Product Selected',
          message: `"${trimmed}" selected for this contact. (Note: ${err.message || 'Could not sync to catalog'})`,
          color: 'blue',
        });
      } finally {
        setSavingCatalogItem(false);
      }
    } else {
      notifications.show({
        title: 'Custom Product Selected',
        message: `"${trimmed}" selected for this contact.`,
        color: 'teal',
      });
    }
  };

  const handleItemSelect = (val: string) => {
    if (val === '__ADD_CUSTOM__') {
      setCustomNameInput('');
      setSaveToCatalog(true);
      setCustomModalOpened(true);
      return;
    }
    setInterestedService(val);
  };



  const normalizeStatus = (status?: string | null): 'Qualified' | 'Follow-up Required' | 'Unqualified' | 'Pending' => {
    if (!status) return 'Pending';
    const s = status.trim().toLowerCase();
    if (s === 'qualified') return 'Qualified';
    if (s === 'follow-up required' || s === 'follow-up' || s === 'followup' || s === 'in progress') return 'Follow-up Required';
    if (s === 'unqualified' || s === 'disqualified') return 'Unqualified';
    return 'Pending';
  };

  // 3. Populate form fields when activeContact loads or updates
  useEffect(() => {
    if (activeContact) {
      // Category only if explicitly saved, otherwise empty
      const initialCat: 'Product' | 'Service' | '' =
        activeContact.category === 'Product' || activeContact.category === 'Service'
          ? activeContact.category
          : '';
      setCategory(initialCat);

      setProductCode(activeContact.productCode || activeContact.customProduct || activeContact.internalReference || '');
      setBudgetRange(activeContact.budgetRange || '');

      // Check interestedService -> serviceList -> productList (NO fallback auto-filling)
      const savedService =
        activeContact.interestedService && activeContact.interestedService.trim() !== ''
          ? activeContact.interestedService.trim()
          : activeContact.serviceList && activeContact.serviceList.length > 0 && activeContact.serviceList[0]?.trim() !== ''
          ? activeContact.serviceList[0].trim()
          : activeContact.productList && activeContact.productList.length > 0 && activeContact.productList[0]?.trim() !== ''
          ? activeContact.productList[0].trim()
          : '';

      setInterestedService(savedService);

      setEmployeeCount(activeContact.employeeCount || '');
      setExpectedCloseDate(activeContact.expectedCloseDate || '');
      setNextFollowDate(activeContact.nextFollowDate || '');
      setAddress(activeContact.address || '');
      setGstNumber(activeContact.gstNumber || '');
      setCompanyPan(activeContact.companyPan || '');
      setRemarks(activeContact.remarks || activeContact.notes || '');

      const initialStatus = normalizeStatus(activeContact.qualificationStatus || activeContact.status);
      setQualificationStatus(initialStatus);

      // Default empty if not already set on contact
      setQualifiedBy(activeContact.qualifiedBy || '');
      setQualificationDate(activeContact.qualificationDate || todayStr);
      setUnqualifiedReason(activeContact.unqualifiedReason || activeContact.disqualificationReason || '');
    }
  }, [activeContact?.id, activeContact?.updatedAt]);

  const handleSaveQualification = async () => {
    if (!activeContact) {
      notifications.show({
        title: 'Error',
        message: 'No contact selected for qualification.',
        color: 'red',
      });
      return;
    }

    try {
      setSaving(true);

      let statusValue: string = currentStatus;
      if (currentStatus === 'Qualified') statusValue = 'Qualified';
      else if (currentStatus === 'Unqualified') statusValue = 'Disqualified';
      else if (currentStatus === 'Follow-up Required') statusValue = 'Follow-up Required';
      else if (currentStatus === 'Pending') statusValue = 'Pending';

      const trimmedService = interestedService?.trim() || '';

      const payload: any = {
        category: category || (trimmedService ? 'Service' : (activeContact.category || 'Service')),
        productList: category === 'Product' && trimmedService ? [trimmedService] : [],
        serviceList: category === 'Service' && trimmedService ? [trimmedService] : (category !== 'Product' && trimmedService ? [trimmedService] : []),
        qualificationStatus: currentStatus,
        status: statusValue,
        budgetRange: budgetRange?.trim() || '',
        interestedService: trimmedService,
        address: address?.trim() || '',
        gstNumber: gstNumber?.trim().toUpperCase() || '',
        companyPan: companyPan?.trim().toUpperCase() || '',
        panNumber: companyPan?.trim().toUpperCase() || '',
        // Employee count & Product code saved for Qualified / Pending
        employeeCount: (currentStatus === 'Qualified' || currentStatus === 'Pending') ? employeeCount?.trim() || '' : '',
        productCode: currentStatus === 'Qualified' ? productCode?.trim() || '' : '',
        customProduct: currentStatus === 'Qualified' ? (productCode?.trim() || trimmedService) : (category === 'Product' ? (productCode?.trim() || trimmedService) : ''),
        internalReference: currentStatus === 'Qualified' ? productCode?.trim() || '' : '',
        expectedCloseDate: currentStatus === 'Qualified' ? expectedCloseDate || '' : '',
        nextFollowDate: (currentStatus === 'Follow-up Required' || currentStatus === 'Pending') ? nextFollowDate?.trim() || '' : '',
        remarks: remarks?.trim() || '',
        stage: 'Qualification',
        assignmentStatus: 'Assigned',
        assignedTo: activeContact.assignedTo || currentUser?.id || undefined,
        assignedToName: activeContact.assignedToName || currentUser?.name || undefined,
        qualifiedBy: qualifiedBy?.trim() || activeContact.qualifiedBy || currentUser?.name || '',
        qualificationDate: qualificationDate || todayStr,
        unqualifiedReason: currentStatus === 'Unqualified' ? unqualifiedReason?.trim() || '' : '',
        disqualificationReason: currentStatus === 'Unqualified' ? unqualifiedReason?.trim() || '' : '',
      };

      const res = await updateContact(activeContact.id, payload, { silent: true });

      if (res?.success) {
        const savedData = res.data || { ...activeContact, ...payload };
        setActiveContact(savedData);
        setAddress(savedData.address || address?.trim() || '');
        setGstNumber(savedData.gstNumber || gstNumber?.trim().toUpperCase() || '');
        setCompanyPan(savedData.companyPan || companyPan?.trim().toUpperCase() || '');
        setInterestedService(savedData.interestedService || savedData.serviceList?.[0] || trimmedService);
        try {
          sessionStorage.setItem('crm_qualifying_contact', JSON.stringify(savedData));
        } catch (e) {}

        if (currentStatus === 'Qualified') {
          notifications.show({
            title: 'Contact Qualified Successfully!',
            message: `Contact '${activeContact.name}' has been qualified and synced to Leads pipeline.`,
            color: 'teal',
            icon: <IconCheck size={16} />,
          });
          await fetchLeads();
          await fetchStats();
        } else if (currentStatus === 'Follow-up Required') {
          notifications.show({
            title: 'Follow-up Scheduled',
            message: `Follow-up updated for '${activeContact.name}'${nextFollowDate ? ` on ${nextFollowDate}` : ''}.`,
            color: 'blue',
            icon: <IconPhoneCall size={16} />,
          });
          // Desktop Browser Web Notification
          if ('Notification' in window && Notification.permission === 'granted' && nextFollowDate) {
            try {
              new Notification(`CRM Follow-up: ${activeContact.name}`, {
                body: `Follow-up scheduled for ${nextFollowDate}.`,
                icon: '/favicon.ico',
              });
            } catch (e) {}
          }
        } else if (currentStatus === 'Pending') {
          notifications.show({
            title: 'Pending Review Scheduled',
            message: `Contact '${activeContact.name}' marked as Pending${nextFollowDate ? ` with date on ${nextFollowDate}` : ''}.`,
            color: 'orange',
            icon: <IconClock size={16} />,
          });
          // Desktop Browser Web Notification
          if ('Notification' in window && Notification.permission === 'granted' && nextFollowDate) {
            try {
              new Notification(`CRM Pending Review: ${activeContact.name}`, {
                body: `Review scheduled for ${nextFollowDate}.`,
                icon: '/favicon.ico',
              });
            } catch (e) {}
          }
        } else if (currentStatus === 'Unqualified') {
          notifications.show({
            title: 'Contact Marked Unqualified',
            message: `Contact '${activeContact.name}' has been marked as disqualified.`,
            color: 'red',
            icon: <IconAlertCircle size={16} />,
          });
        } else {
          notifications.show({
            title: 'Qualification Updated',
            message: `Qualification details saved successfully.`,
            color: 'teal',
            icon: <IconCheck size={16} />,
          });
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('crm_contacts_tab', 'ASSIGNED');
          sessionStorage.setItem('crm_contacts_tab', 'ASSIGNED');
        }
        // Notify notification bell and other components across the CRM
        window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
        if (currentStatus === 'Qualified') {
          window.dispatchEvent(new CustomEvent('crm_leads_updated'));
        }

        if (onSuccess) {
          onSuccess(currentStatus);
        } else {
          onBack();
        }
      }
    } catch (err: any) {
      console.error('Error updating qualification:', err);
      notifications.show({
        title: 'Save Failed',
        message: err.message || 'Failed to save qualification details.',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'CT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Employees List
  const employeeMap = new Map<string, { value: string; label: string }>();
  if (currentUser?.name) {
    employeeMap.set(currentUser.name, {
      value: currentUser.name,
      label: `${currentUser.name} (Current User)`,
    });
  }
  if (metadata?.employees && Array.isArray(metadata.employees)) {
    metadata.employees.forEach((emp) => {
      if (emp.name && !employeeMap.has(emp.name)) {
        employeeMap.set(emp.name, {
          value: emp.name,
          label: `${emp.name}${emp.empCode ? ` (${emp.empCode})` : ''}`,
        });
      }
    });
  }
  const employeeOptions = Array.from(employeeMap.values());
  const currentUserOnlyOptions = currentUser?.name
    ? [{ value: currentUser.name, label: `${currentUser.name} (Current User)` }]
    : employeeOptions.slice(0, 1);


  const availableOptions = React.useMemo(() => {
    const list = new Set<string>();

    if (category === 'Product') {
      // 1. Catalog Products (Always first)
      catalogProducts.forEach((p) => p && list.add(p.trim()));
      if (metadata?.catalogProducts && Array.isArray(metadata.catalogProducts)) {
        metadata.catalogProducts.forEach((p) => p && list.add(p.trim()));
      }
      if (metadata?.productOptions && Array.isArray(metadata.productOptions)) {
        metadata.productOptions.forEach((p) => p && list.add(p.trim()));
      }
      // 2. Custom products from contacts
      if (contacts && Array.isArray(contacts)) {
        contacts.forEach((c) => {
          if (Array.isArray(c.productList)) c.productList.forEach((p) => p && list.add(p.trim()));
          if (c.category === 'Product' && c.interestedService) list.add(c.interestedService.trim());
          if (c.customProduct) list.add(c.customProduct.trim());
        });
      }
    } else if (category === 'Service') {
      // 1. Catalog Services (Always first)
      catalogServices.forEach((s) => s && list.add(s.trim()));
      if (metadata?.catalogServices && Array.isArray(metadata.catalogServices)) {
        metadata.catalogServices.forEach((s) => s && list.add(s.trim()));
      }
      if (metadata?.serviceOptions && Array.isArray(metadata.serviceOptions)) {
        metadata.serviceOptions.forEach((s) => s && list.add(s.trim()));
      }
      // 2. Custom services from contacts
      if (contacts && Array.isArray(contacts)) {
        contacts.forEach((c) => {
          if (Array.isArray(c.serviceList)) c.serviceList.forEach((s) => s && list.add(s.trim()));
          if (c.category === 'Service' && c.interestedService) list.add(c.interestedService.trim());
        });
      }
    } else {
      catalogProducts.forEach((p) => p && list.add(p.trim()));
      catalogServices.forEach((s) => s && list.add(s.trim()));
      (metadata?.catalogProducts || []).forEach((p) => p && list.add(p.trim()));
      (metadata?.catalogServices || []).forEach((s) => s && list.add(s.trim()));
      (metadata?.productOptions || []).forEach((p) => p && list.add(p.trim()));
      (metadata?.serviceOptions || []).forEach((s) => s && list.add(s.trim()));
    }

    const items: { value: string; label: string }[] = Array.from(list)
      .filter(Boolean)
      .map((val) => ({ value: val, label: val }));

    const addLabel =
      category === 'Product'
        ? '➕ + Add Custom Product...'
        : category === 'Service'
        ? '➕ + Add Custom Service...'
        : '➕ + Add Custom Item...';

    items.push({ value: '__ADD_CUSTOM__', label: addLabel });

    return items;
  }, [category, catalogProducts, catalogServices, metadata, contacts]);

  const handleAutocompleteFilter = ({ options, search }: { options: any[]; search: string }) => {
    const q = (search || '').trim().toLowerCase();
    const currentVal = (interestedService || '').trim().toLowerCase();

    // If search is empty or equal to current value, show all options!
    if (!q || q === currentVal) {
      return options;
    }

    const filtered = options.filter((item: any) =>
      (item.label || item.value || '').toLowerCase().includes(q)
    );

    const exactMatch = options.some(
      (item: any) => (item.value || '').toLowerCase() === q && item.value !== '__ADD_CUSTOM__'
    );
    if (!exactMatch && q) {
      return [
        ...filtered,
        {
          value: search.trim(),
          label: `➕ Use custom ${category === 'Product' ? 'product' : 'service'}: "${search.trim()}"`,
        },
      ];
    }

    return filtered;
  };

  const handleReasonFilter = ({ options, search }: { options: any[]; search: string }) => {
    const q = (search || '').trim().toLowerCase();
    const currentVal = (unqualifiedReason || '').trim().toLowerCase();
    if (!q || q === currentVal) {
      return options;
    }
    return options.filter((item: any) =>
      (item.label || item.value || (typeof item === 'string' ? item : '')).toLowerCase().includes(q)
    );
  };

  const employeeCountOptions = [
    { value: '1 - 10 Employees', label: '1 - 10 Employees' },
    { value: '11 - 50 Employees', label: '11 - 50 Employees' },
    { value: '51 - 200 Employees', label: '51 - 200 Employees' },
    { value: '201 - 500 Employees', label: '201 - 500 Employees' },
    { value: '500+ Employees', label: '500+ Employees' },
  ];

  const statusDropdownOptions = [
    { value: 'Qualified', label: 'Qualified' },
    { value: 'Follow-up Required', label: 'Follow-up Required' },
    { value: 'Pending', label: 'Pending Review' },
    { value: 'Unqualified', label: 'Unqualified' },
  ];

  const unqualifiedReasonOptions = [
    { value: 'Budget issue / Customer budget too low', label: 'Budget issue / Budget too low' },
    { value: 'No immediate business need / Not required', label: 'No immediate business need' },
    { value: 'Wrong contact / Not the decision maker', label: 'Wrong contact / Not decision maker' },
    { value: 'Already using competitor software', label: 'Already using competitor software' },
    { value: 'Feature mismatch / Out of technical scope', label: 'Feature mismatch / Out of scope' },
    { value: 'Did not respond / Invalid contact info', label: 'Did not respond / Invalid contact' },
    { value: 'Other reason', label: 'Other reason' },
  ];

  if (loading && !activeContact) {
    return (
      <Center style={{ minHeight: 400 }}>
        <Stack align="center" gap="sm">
          <Loader size="lg" color="blue" />
          <Text size="sm" c="dimmed">Loading contact details...</Text>
        </Stack>
      </Center>
    );
  }

  const labelColor = isDark ? '#E2E8F0' : '#334155';
  const inputStyles = {
    label: {
      fontSize: 12.5,
      fontWeight: 600,
      marginBottom: 5,
      color: isDark ? '#E2E8F0' : '#334155',
    },
    input: {
      height: 42,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #CBD5E1',
      borderRadius: 8,
      fontSize: 13.5,
      fontWeight: 500,
      color: isDark ? '#F8FAFC' : '#0F172A',
      boxShadow: isDark ? '0 1px 2px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.02)',
      transition: 'border-color 0.15s ease',
    },
  };

  const textareaStyles = {
    label: inputStyles.label,
    input: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #CBD5E1',
      borderRadius: 8,
      fontSize: 13.5,
      fontWeight: 500,
      color: isDark ? '#F8FAFC' : '#0F172A',
      padding: '10px 12px',
      minHeight: 84,
    },
  };

  const currentStatus: 'Qualified' | 'Follow-up Required' | 'Unqualified' | 'Pending' =
    normalizeStatus(qualificationStatus);

  return (
    <Box p={{ base: 'xs', sm: 'sm', md: 'md', lg: 'lg' }} style={{ width: '100%', maxWidth: '100%' }}>
      {/* Top Header & Back Button */}
      <Group justify="space-between" align="center" mb="md">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBack}
          radius="md"
          size="sm"
          styles={{ root: { fontWeight: 600 } }}
        >
          Back to Contacts
        </Button>
      </Group>

      <Grid gutter={{ base: 'md', md: 'xl' }} align="stretch">
        {/* Left Column: Contact Profile Card */}
        <Grid.Col span={{ base: 12, md: 4.5, lg: 3.8, xl: 3.2 }}>
          {activeContact && (
            <Paper
              p="xl"
              radius="16px"
              style={{
                background: isDark ? '#0F172A' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                boxShadow: isDark ? '0 8px 24px rgba(0, 0, 0, 0.28)' : '0 2px 12px rgba(0, 0, 0, 0.04)',
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Stack gap="md" align="center">
                {/* Modern Sleek Avatar */}
                <Box
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isDark
                      ? '0 0 0 4px rgba(59, 130, 246, 0.2), 0 8px 20px rgba(0, 0, 0, 0.4)'
                      : '0 0 0 4px #EFF6FF, 0 8px 20px rgba(37, 99, 235, 0.22)',
                  }}
                >
                  <Text fw={800} size="22px" style={{ color: '#FFFFFF', letterSpacing: '0.5px' }}>
                    {getInitials(activeContact.name)}
                  </Text>
                </Box>

                {/* Name & Headline */}
                <Box style={{ textAlign: 'center', width: '100%' }}>
                  <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', letterSpacing: '-0.3px', lineHeight: 1.25 }}>
                    {activeContact.name}
                  </Text>
                  {(activeContact.companyName || activeContact.designation) ? (
                    <Group gap={5} justify="center" mt={5}>
                      <IconBuilding size={13} color={isDark ? '#94A3B8' : '#64748B'} stroke={1.8} />
                      <Text size="xs" fw={550} c="dimmed">
                        {activeContact.designation && activeContact.companyName
                          ? `${activeContact.designation} • ${activeContact.companyName}`
                          : activeContact.companyName || activeContact.designation}
                      </Text>
                    </Group>
                  ) : (
                    <Text size="xs" c="dimmed" mt={4} fw={500}>
                      Business Contact
                    </Text>
                  )}
                </Box>

                {/* Quick Action Buttons (Call, WhatsApp, Email) */}
                <Group gap="sm" justify="center">
                  {activeContact.phone && (
                    <Tooltip label={`Call ${activeContact.phone}`} withArrow position="top">
                      <ActionIcon
                        component="a"
                        href={`tel:${activeContact.phone}`}
                        size={38}
                        radius="xl"
                        variant="light"
                        color="blue"
                        style={{
                          background: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
                          color: '#2563EB',
                          border: isDark ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid #DBEAFE',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <IconPhone size={17} stroke={2} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {activeContact.phone && (
                    <Tooltip label="Message on WhatsApp" withArrow position="top">
                      <ActionIcon
                        component="a"
                        href={`https://wa.me/${activeContact.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        size={38}
                        radius="xl"
                        variant="light"
                        color="teal"
                        style={{
                          background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                          color: '#059669',
                          border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #D1FAE5',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <IconBrandWhatsapp size={17} stroke={2} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {activeContact.email && (
                    <Tooltip label={`Email ${activeContact.email}`} withArrow position="top">
                      <ActionIcon
                        component="a"
                        href={`mailto:${activeContact.email}`}
                        size={38}
                        radius="xl"
                        variant="light"
                        color="indigo"
                        style={{
                          background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                          color: '#4F46E5',
                          border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #E0E7FF',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <IconMail size={17} stroke={2} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>

                {/* Status & Offering Badges */}
                <Group gap={8} justify="center" wrap="nowrap" mt={2}>
                  <Badge
                    size="sm"
                    variant="light"
                    color={
                      qualificationStatus === 'Qualified'
                        ? 'teal'
                        : qualificationStatus === 'Follow-up Required'
                        ? 'blue'
                        : qualificationStatus === 'Unqualified'
                        ? 'red'
                        : 'yellow'
                    }
                    radius="xl"
                    leftSection={
                      qualificationStatus === 'Qualified' ? (
                        <IconCheck size={12} stroke={2.5} />
                      ) : qualificationStatus === 'Follow-up Required' ? (
                        <IconClock size={12} stroke={2} />
                      ) : (
                        <IconAlertCircle size={12} stroke={2} />
                      )
                    }
                    styles={{
                      root: {
                        textTransform: 'none',
                        fontWeight: 650,
                        padding: '0 12px',
                        height: 26,
                      },
                    }}
                  >
                    {qualificationStatus}
                  </Badge>
                  <Badge
                    size="sm"
                    variant="light"
                    color={category === 'Product' ? 'indigo' : 'violet'}
                    radius="xl"
                    leftSection={
                      category === 'Product' ? (
                        <IconBox size={12} stroke={2} />
                      ) : (
                        <IconBriefcase size={12} stroke={2} />
                      )
                    }
                    styles={{
                      root: {
                        textTransform: 'none',
                        fontWeight: 650,
                        padding: '0 12px',
                        height: 26,
                      },
                    }}
                  >
                    {category === 'Product' ? 'Product' : 'Service'}
                  </Badge>
                </Group>

                {/* 2-Card Metadata Tile: Contact ID & Assigned Owner */}
                <SimpleGrid cols={2} spacing="xs" w="100%">
                  <Box
                    p="8px 12px"
                    style={{
                      borderRadius: 10,
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #E2E8F0',
                    }}
                  >
                    <Text size="10px" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                      Contact ID
                    </Text>
                    <Text size="12.5px" fw={700} mt={2} style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                      {activeContact.contactId || 'CNT-NEW'}
                    </Text>
                  </Box>

                  <Box
                    p="8px 12px"
                    style={{
                      borderRadius: 10,
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #E2E8F0',
                    }}
                  >
                    <Text size="10px" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                      Assigned Owner
                    </Text>
                    <Text size="12.5px" fw={700} mt={2} style={{ color: isDark ? '#93C5FD' : '#2563EB' }} truncate>
                      {activeContact.assignedToName || 'Unassigned'}
                    </Text>
                  </Box>
                </SimpleGrid>


              </Stack>

              <Divider my="md" color={isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'} />

              {/* UNIFIED CONTACT DETAILS PANEL */}
              <Stack gap="xs">
                <Text size="11px" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.6px', marginBottom: 2 }}>
                  Contact Information
                </Text>

                <Paper
                  radius="12px"
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #E2E8F0',
                    overflow: 'hidden',
                  }}
                >
                  {/* 1. Phone */}
                  {activeContact.phone && (
                    <Box
                      p="9px 12px"
                      style={{
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #EEF2F6',
                      }}
                    >
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap={10} wrap="nowrap">
                          <ThemeIcon size={26} radius="md" variant="light" color="blue">
                            <IconPhone size={13} stroke={2} />
                          </ThemeIcon>
                          <Text size="11.5px" fw={500} c="dimmed">
                            Phone
                          </Text>
                        </Group>
                        <Text
                          component="a"
                          href={`tel:${activeContact.phone}`}
                          size="xs"
                          fw={650}
                          style={{
                            color: isDark ? '#93C5FD' : '#2563EB',
                            textDecoration: 'none',
                          }}
                        >
                          {activeContact.phone}
                        </Text>
                      </Group>
                    </Box>
                  )}

                  {/* 2. Email */}
                  {activeContact.email && (
                    <Box
                      p="9px 12px"
                      style={{
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #EEF2F6',
                      }}
                    >
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap={10} wrap="nowrap">
                          <ThemeIcon size={26} radius="md" variant="light" color="gray">
                            <IconMail size={13} stroke={2} />
                          </ThemeIcon>
                          <Text size="11.5px" fw={500} c="dimmed">
                            Email
                          </Text>
                        </Group>
                        <Text
                          component="a"
                          href={`mailto:${activeContact.email}`}
                          size="xs"
                          fw={550}
                          truncate
                          maw={150}
                          style={{
                            color: isDark ? '#E2E8F0' : '#334155',
                            textDecoration: 'none',
                          }}
                        >
                          {activeContact.email}
                        </Text>
                      </Group>
                    </Box>
                  )}

                  {/* 3. Company */}
                  {activeContact.companyName && (
                    <Box
                      p="9px 12px"
                      style={{
                        borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #EEF2F6',
                      }}
                    >
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap={10} wrap="nowrap">
                          <ThemeIcon size={26} radius="md" variant="light" color="grape">
                            <IconBuilding size={13} stroke={2} />
                          </ThemeIcon>
                          <Text size="11.5px" fw={500} c="dimmed">
                            Company
                          </Text>
                        </Group>
                        <Text size="xs" fw={600} truncate maw={150} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                          {activeContact.companyName}
                        </Text>
                      </Group>
                    </Box>
                  )}

                  {/* 4. Lead Source */}
                  {activeContact.source && (
                    <Box p="9px 12px">
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap={10} wrap="nowrap">
                          <ThemeIcon size={26} radius="md" variant="light" color="teal">
                            <IconIdBadge size={13} stroke={2} />
                          </ThemeIcon>
                          <Text size="11.5px" fw={500} c="dimmed">
                            Lead Source
                          </Text>
                        </Group>
                        <Badge size="xs" variant="light" color="teal" radius="sm">
                          {activeContact.source}
                        </Badge>
                      </Group>
                    </Box>
                  )}

                  {/* 5. Address */}
                  {(address || activeContact.address) && (
                    <Box p="9px 12px" style={{ borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #EEF2F6' }}>
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap={10} wrap="nowrap">
                          <ThemeIcon size={26} radius="md" variant="light" color="orange">
                            <IconMapPin size={13} stroke={2} />
                          </ThemeIcon>
                          <Text size="11.5px" fw={500} c="dimmed">
                            Address
                          </Text>
                        </Group>
                        <Text size="xs" fw={550} truncate maw={160} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                          {address || activeContact.address}
                        </Text>
                      </Group>
                    </Box>
                  )}

                  {/* 6. GST Number */}
                  {(gstNumber || activeContact.gstNumber) && (
                    <Box p="9px 12px" style={{ borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #EEF2F6' }}>
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap={10} wrap="nowrap">
                          <ThemeIcon size={26} radius="md" variant="light" color="violet">
                            <IconReceiptTax size={13} stroke={2} />
                          </ThemeIcon>
                          <Text size="11.5px" fw={500} c="dimmed">
                            GST Number
                          </Text>
                        </Group>
                        <Badge size="xs" variant="light" color="violet" radius="sm">
                          {gstNumber || activeContact.gstNumber}
                        </Badge>
                      </Group>
                    </Box>
                  )}

                  {/* 7. PAN Number */}
                  {(companyPan || activeContact.companyPan) && (
                    <Box p="9px 12px" style={{ borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #EEF2F6' }}>
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap={10} wrap="nowrap">
                          <ThemeIcon size={26} radius="md" variant="light" color="teal">
                            <IconCreditCard size={13} stroke={2} />
                          </ThemeIcon>
                          <Text size="11.5px" fw={500} c="dimmed">
                            PAN Number
                          </Text>
                        </Group>
                        <Badge size="xs" variant="light" color="teal" radius="sm">
                          {companyPan || activeContact.companyPan}
                        </Badge>
                      </Group>
                    </Box>
                  )}
                </Paper>
              </Stack>
            </Paper>
          )}
        </Grid.Col>

        {/* Right Column: Clean Form Card */}
        <Grid.Col span={{ base: 12, md: 7.5, lg: 8.2, xl: 8.8 }}>
          <Paper
            p={{ base: 'md', sm: 'xl' }}
            radius="16px"
            style={{
              background: isDark ? '#0F172A' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Clean Header */}
            <Group justify="space-between" align="center" mb="lg">
              <Group gap="xs">
                <Box
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  <IconTargetArrow size={18} />
                </Box>
                <Text fw={700} size="16.5px" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  Lead Qualification
                </Text>
              </Group>

              <Group gap="sm" align="center">


                <Badge
                  size="md"
                  radius="md"
                  variant="light"
                  color={
                    currentStatus === 'Qualified'
                      ? 'teal'
                      : currentStatus === 'Follow-up Required'
                      ? 'blue'
                      : currentStatus === 'Unqualified'
                      ? 'red'
                      : 'yellow'
                  }
                >
                  {currentStatus}
                </Badge>
              </Group>
            </Group>

            <Divider mb="lg" color={isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'} />

            {/* FORM FIELDS */}
            <Stack gap="md" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Row 1: Always Visible Status & Category (Product/Service) */}
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Select
                  label="Qualification Status"
                  placeholder="Select status..."
                  leftSection={
                    currentStatus === 'Qualified' ? (
                      <IconCheck size={16} color="#059669" />
                    ) : currentStatus === 'Follow-up Required' ? (
                      <IconPhoneCall size={16} color="#2563EB" />
                    ) : currentStatus === 'Unqualified' ? (
                      <IconAlertCircle size={16} color="#DC2626" />
                    ) : (
                      <IconClock size={16} color="#D97706" />
                    )
                  }
                  data={statusDropdownOptions}
                  value={currentStatus}
                  onChange={(val) => setQualificationStatus((val as QualificationStatus) || 'Pending')}
                  styles={inputStyles}
                />

                <Select
                  label="Product or Service"
                  placeholder="Select type..."
                  leftSection={
                    category === 'Product' ? (
                      <IconBox size={16} color="#4F46E5" />
                    ) : category === 'Service' ? (
                      <IconBriefcase size={16} color="#7C3AED" />
                    ) : (
                      <IconTag size={16} color="#64748B" />
                    )
                  }
                  data={[
                    { value: 'Product', label: 'Product' },
                    { value: 'Service', label: 'Service' },
                  ]}
                  value={category || null}
                  onChange={(val) => {
                    setCategory((val as 'Product' | 'Service') || '');
                  }}
                  styles={inputStyles}
                  clearable
                />
              </SimpleGrid>

              {/* STATUS 1: QUALIFIED */}
              {currentStatus === 'Qualified' && (
                <>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {/* Row 2: Interested Item & Budget Range */}
                    <Box>
                      <Group justify="space-between" align="center" mb={4}>
                        <Text fw={600} size="13px" style={{ color: labelColor }}>
                          {category === 'Product'
                            ? 'Interested Product'
                            : category === 'Service'
                            ? 'Interested Service'
                            : 'Interested Product / Service'}
                        </Text>
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          color="indigo"
                          leftSection={<IconPlus size={12} />}
                          onClick={() => {
                            setCustomNameInput('');
                            setSaveToCatalog(true);
                            setCustomModalOpened(true);
                          }}
                        >
                          + Add Custom
                        </Button>
                      </Group>
                      <Autocomplete
                        placeholder={
                          category === 'Product'
                            ? 'Select product or type custom...'
                            : category === 'Service'
                            ? 'Select service or type custom...'
                            : 'Select or type product/service...'
                        }
                        leftSection={
                          category === 'Product' ? (
                            <IconBox size={16} color="#4F46E5" stroke={1.8} />
                          ) : category === 'Service' ? (
                            <IconBriefcase size={16} color="#7C3AED" stroke={1.8} />
                          ) : (
                            <IconTag size={16} color="#64748B" stroke={1.8} />
                          )
                        }
                        rightSection={
                          !interestedService ? (
                            <IconChevronDown size={15} color="#94A3B8" style={{ pointerEvents: 'none' }} />
                          ) : undefined
                        }
                        data={availableOptions}
                        value={interestedService}
                        onChange={handleItemSelect}
                        filter={handleAutocompleteFilter}
                        renderOption={({ option }) => {
                          if (option.value === '__ADD_CUSTOM__') {
                            return (
                              <Group gap="xs" py={4} style={{ color: '#4F46E5', fontWeight: 600 }}>
                                <IconPlus size={15} color="#4F46E5" />
                                <Text size="13px" fw={600} c="indigo">
                                  {category === 'Product' ? '+ Add Custom Product...' : '+ Add Custom Service...'}
                                </Text>
                              </Group>
                            );
                          }
                          const isCatalog = catalogProducts.includes(option.value) || catalogServices.includes(option.value);
                          return (
                            <Group gap="xs" py={2} justify="space-between" w="100%">
                              <Group gap="xs">
                                {category === 'Product' ? (
                                  <IconBox size={14} color="#4F46E5" />
                                ) : (
                                  <IconBriefcase size={14} color="#7C3AED" />
                                )}
                                <Text size="13px">{(option as any).label || (option as any).value}</Text>
                              </Group>
                              {isCatalog && (
                                <Badge size="xs" variant="light" color={category === 'Product' ? 'indigo' : 'grape'} radius="sm">
                                  Catalog
                                </Badge>
                              )}
                            </Group>
                          );
                        }}
                        styles={inputStyles}
                        clearable
                      />
                    </Box>

                    <TextInput
                      label="Budget Range"
                      placeholder="Enter budget (e.g. ₹50,000 or ₹1,00,000)"
                      leftSection={<IconCoin size={16} color="#2563EB" stroke={1.8} />}
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                      styles={inputStyles}
                    />

                    {/* Row 3: Employee Count & Qualification Date */}
                    <Select
                      label="Employee Count"
                      placeholder="Select employee count..."
                      leftSection={<IconUsers size={16} color="#0D9488" stroke={1.8} />}
                      data={employeeCountOptions}
                      value={employeeCount || null}
                      onChange={(val) => setEmployeeCount(val || '')}
                      styles={inputStyles}
                      clearable
                    />

                    <MeetingDatePicker
                      label="Qualification Date"
                      placeholder="DD-MM-YYYY"
                      value={qualificationDate}
                      onChange={(val) => setQualificationDate(val)}
                      styles={inputStyles}
                      zIndex={3000}
                    />
                  </SimpleGrid>

                  {/* GST & PAN Numbers (Optional) */}
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label="GST Number (Optional)"
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      leftSection={<IconReceiptTax size={16} color="#7C3AED" stroke={1.8} />}
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      styles={inputStyles}
                    />

                    <TextInput
                      label="PAN Number (Optional)"
                      placeholder="e.g. AAAAA0000A"
                      leftSection={<IconCreditCard size={16} color="#059669" stroke={1.8} />}
                      value={companyPan}
                      onChange={(e) => setCompanyPan(e.target.value.toUpperCase())}
                      styles={inputStyles}
                    />
                  </SimpleGrid>

                  {/* Address */}
                  <TextInput
                    label="Address"
                    placeholder="Enter street, city, state, postal code..."
                    leftSection={<IconMapPin size={16} color="#EA580C" stroke={1.8} />}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    styles={inputStyles}
                  />

                  {/* Notes (Full width) */}
                  <Textarea
                    label="Qualification Notes"
                    placeholder="Enter any client requirements or discussion notes..."
                    minRows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    styles={textareaStyles}
                  />
                </>
              )}

              {/* STATUS 2: FOLLOW-UP REQUIRED */}
              {currentStatus === 'Follow-up Required' && (
                <>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <MeetingDatePicker
                      label="Next Follow-up Date"
                      placeholder="DD-MM-YYYY"
                      value={nextFollowDate}
                      onChange={(val) => setNextFollowDate(val)}
                      styles={inputStyles}
                      zIndex={3000}
                    />

                    <Box>
                      <Group justify="space-between" align="center" mb={4}>
                        <Text fw={600} size="13px" style={{ color: labelColor }}>
                          {category === 'Product'
                            ? 'Interested Product'
                            : category === 'Service'
                            ? 'Interested Service'
                            : 'Interested Product / Service'}
                        </Text>
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          color="indigo"
                          leftSection={<IconPlus size={12} />}
                          onClick={() => {
                            setCustomNameInput('');
                            setSaveToCatalog(true);
                            setCustomModalOpened(true);
                          }}
                        >
                          + Add Custom
                        </Button>
                      </Group>
                      <Autocomplete
                        placeholder={
                          category === 'Product'
                            ? 'Select product or type custom...'
                            : category === 'Service'
                            ? 'Select service or type custom...'
                            : 'Select or type product/service...'
                        }
                        leftSection={
                          category === 'Product' ? (
                            <IconBox size={16} color="#4F46E5" stroke={1.8} />
                          ) : category === 'Service' ? (
                            <IconBriefcase size={16} color="#7C3AED" stroke={1.8} />
                          ) : (
                            <IconTag size={16} color="#64748B" stroke={1.8} />
                          )
                        }
                        rightSection={
                          !interestedService ? (
                            <IconChevronDown size={15} color="#94A3B8" style={{ pointerEvents: 'none' }} />
                          ) : undefined
                        }
                        data={availableOptions}
                        value={interestedService}
                        onChange={handleItemSelect}
                        filter={handleAutocompleteFilter}
                        renderOption={({ option }) => {
                          if (option.value === '__ADD_CUSTOM__') {
                            return (
                              <Group gap="xs" py={4} style={{ color: '#4F46E5', fontWeight: 600 }}>
                                <IconPlus size={15} color="#4F46E5" />
                                <Text size="13px" fw={600} c="indigo">
                                  {category === 'Product' ? '+ Add Custom Product...' : '+ Add Custom Service...'}
                                </Text>
                              </Group>
                            );
                          }
                          const isCatalog = catalogProducts.includes(option.value) || catalogServices.includes(option.value);
                          return (
                            <Group gap="xs" py={2} justify="space-between" w="100%">
                              <Group gap="xs">
                                {category === 'Product' ? (
                                  <IconBox size={14} color="#4F46E5" />
                                ) : (
                                  <IconBriefcase size={14} color="#7C3AED" />
                                )}
                                <Text size="13px">{(option as any).label || (option as any).value}</Text>
                              </Group>
                              {isCatalog && (
                                <Badge size="xs" variant="light" color={category === 'Product' ? 'indigo' : 'grape'} radius="sm">
                                  Catalog
                                </Badge>
                              )}
                            </Group>
                          );
                        }}
                        styles={inputStyles}
                        clearable
                      />
                    </Box>
                  </SimpleGrid>

                  {/* GST & PAN Numbers (Optional) */}
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label="GST Number (Optional)"
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      leftSection={<IconReceiptTax size={16} color="#7C3AED" stroke={1.8} />}
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      styles={inputStyles}
                    />

                    <TextInput
                      label="PAN Number (Optional)"
                      placeholder="e.g. AAAAA0000A"
                      leftSection={<IconCreditCard size={16} color="#059669" stroke={1.8} />}
                      value={companyPan}
                      onChange={(e) => setCompanyPan(e.target.value.toUpperCase())}
                      styles={inputStyles}
                    />
                  </SimpleGrid>

                  <TextInput
                    label="Address"
                    placeholder="Enter street, city, state, postal code..."
                    leftSection={<IconMapPin size={16} color="#EA580C" stroke={1.8} />}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    styles={inputStyles}
                  />

                  <Textarea
                    label="Follow-up Remarks"
                    placeholder="Enter discussion notes or required action points for next call..."
                    minRows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    styles={textareaStyles}
                  />
                </>
              )}

              {/* STATUS 3: UNQUALIFIED */}
              {currentStatus === 'Unqualified' && (
                <>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Autocomplete
                      label="Disqualification Reason"
                      placeholder="Select or type reason..."
                      leftSection={<IconAlertCircle size={16} color="#DC2626" stroke={1.8} />}
                      rightSection={!unqualifiedReason ? <IconChevronDown size={15} color="#94A3B8" /> : undefined}
                      data={unqualifiedReasonOptions}
                      value={unqualifiedReason}
                      onChange={(val) => setUnqualifiedReason(val)}
                      filter={handleReasonFilter}
                      styles={inputStyles}
                      clearable
                    />

                    <MeetingDatePicker
                      label="Date"
                      placeholder="DD-MM-YYYY"
                      value={qualificationDate}
                      onChange={(val) => setQualificationDate(val)}
                      styles={inputStyles}
                      zIndex={3000}
                    />
                  </SimpleGrid>

                  <Textarea
                    label="Detailed Explanation"
                    placeholder="Explain why this contact is not qualified..."
                    minRows={5}
                    value={unqualifiedReason}
                    onChange={(e) => setUnqualifiedReason(e.target.value)}
                    styles={textareaStyles}
                  />
                </>
              )}

              {/* STATUS 4: PENDING */}
              {currentStatus === 'Pending' && (
                <>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Box>
                      <Group justify="space-between" align="center" mb={4}>
                        <Text fw={600} size="13px" style={{ color: labelColor }}>
                          {category === 'Product'
                            ? 'Interested Product'
                            : category === 'Service'
                            ? 'Interested Service'
                            : 'Interested Product / Service'}
                        </Text>
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          color="indigo"
                          leftSection={<IconPlus size={12} />}
                          onClick={() => {
                            setCustomNameInput('');
                            setSaveToCatalog(true);
                            setCustomModalOpened(true);
                          }}
                        >
                          + Add Custom
                        </Button>
                      </Group>
                      <Autocomplete
                        placeholder={
                          category === 'Product'
                            ? 'Select product or type custom...'
                            : category === 'Service'
                            ? 'Select service or type custom...'
                            : 'Select or type product/service...'
                        }
                        leftSection={
                          category === 'Product' ? (
                            <IconBox size={16} color="#4F46E5" stroke={1.8} />
                          ) : category === 'Service' ? (
                            <IconBriefcase size={16} color="#7C3AED" stroke={1.8} />
                          ) : (
                            <IconTag size={16} color="#64748B" stroke={1.8} />
                          )
                        }
                        rightSection={
                          !interestedService ? (
                            <IconChevronDown size={15} color="#94A3B8" style={{ pointerEvents: 'none' }} />
                          ) : undefined
                        }
                        data={availableOptions}
                        value={interestedService}
                        onChange={handleItemSelect}
                        filter={handleAutocompleteFilter}
                        renderOption={({ option }) => {
                          if (option.value === '__ADD_CUSTOM__') {
                            return (
                              <Group gap="xs" py={4} style={{ color: '#4F46E5', fontWeight: 600 }}>
                                <IconPlus size={15} color="#4F46E5" />
                                <Text size="13px" fw={600} c="indigo">
                                  {category === 'Product' ? '+ Add Custom Product...' : '+ Add Custom Service...'}
                                </Text>
                              </Group>
                            );
                          }
                          const isCatalog = catalogProducts.includes(option.value) || catalogServices.includes(option.value);
                          return (
                            <Group gap="xs" py={2} justify="space-between" w="100%">
                              <Group gap="xs">
                                {category === 'Product' ? (
                                  <IconBox size={14} color="#4F46E5" />
                                ) : (
                                  <IconBriefcase size={14} color="#7C3AED" />
                                )}
                                <Text size="13px">{(option as any).label || (option as any).value}</Text>
                              </Group>
                              {isCatalog && (
                                <Badge size="xs" variant="light" color={category === 'Product' ? 'indigo' : 'grape'} radius="sm">
                                  Catalog
                                </Badge>
                              )}
                            </Group>
                          );
                        }}
                        styles={inputStyles}
                        clearable
                      />
                    </Box>

                    <MeetingDatePicker
                      label="Pending Follow-up / Review Date"
                      placeholder="DD-MM-YYYY"
                      value={nextFollowDate}
                      onChange={(val) => setNextFollowDate(val)}
                      styles={inputStyles}
                      zIndex={3000}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label="Budget Range"
                      placeholder="Enter budget (e.g. ₹50,000 or ₹1,00,000)"
                      leftSection={<IconCoin size={16} color="#2563EB" stroke={1.8} />}
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                      styles={inputStyles}
                    />

                    <Select
                      label="Employee Count"
                      placeholder="Select employee count..."
                      leftSection={<IconUsers size={16} color="#0D9488" stroke={1.8} />}
                      data={employeeCountOptions}
                      value={employeeCount || null}
                      onChange={(val) => setEmployeeCount(val || '')}
                      styles={inputStyles}
                      clearable
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <MeetingDatePicker
                      label="Qualification Date"
                      placeholder="DD-MM-YYYY"
                      value={qualificationDate}
                      onChange={(val) => setQualificationDate(val)}
                      styles={inputStyles}
                      zIndex={3000}
                    />
                  </SimpleGrid>

                  {/* GST & PAN Numbers (Optional) */}
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label="GST Number (Optional)"
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      leftSection={<IconReceiptTax size={16} color="#7C3AED" stroke={1.8} />}
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      styles={inputStyles}
                    />

                    <TextInput
                      label="PAN Number (Optional)"
                      placeholder="e.g. AAAAA0000A"
                      leftSection={<IconCreditCard size={16} color="#059669" stroke={1.8} />}
                      value={companyPan}
                      onChange={(e) => setCompanyPan(e.target.value.toUpperCase())}
                      styles={inputStyles}
                    />
                  </SimpleGrid>

                  <TextInput
                    label="Address"
                    placeholder="Enter street, city, state, postal code..."
                    leftSection={<IconMapPin size={16} color="#EA580C" stroke={1.8} />}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    styles={inputStyles}
                  />

                  <Textarea
                    label="Pending Notes"
                    placeholder="Enter notes on missing information or follow-up needed..."
                    minRows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    styles={textareaStyles}
                  />
                </>
              )}

              {/* Action Buttons */}
              <Group justify="flex-end" gap="sm" mt="auto" pt="lg" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #F1F5F9' }}>
                <Button
                  variant="subtle"
                  color="gray"
                  radius="md"
                  size="sm"
                  onClick={onBack}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  radius="md"
                  size="sm"
                  loading={saving}
                  onClick={handleSaveQualification}
                  rightSection={<IconArrowRight size={15} />}
                  color={
                    currentStatus === 'Unqualified'
                      ? 'red'
                      : 'blue'
                  }
                  style={{
                    fontWeight: 600,
                    paddingLeft: 22,
                    paddingRight: 22,
                    background:
                      currentStatus === 'Unqualified'
                        ? '#EF4444'
                        : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    boxShadow:
                      currentStatus === 'Unqualified'
                        ? '0 4px 14px rgba(239, 68, 68, 0.35)'
                        : '0 4px 14px rgba(37, 99, 235, 0.35)',
                    border: 'none',
                    color: '#FFFFFF',
                  }}
                >
                  {currentStatus === 'Qualified'
                    ? 'Save & Convert to Lead'
                    : currentStatus === 'Follow-up Required'
                    ? 'Save Follow-up'
                    : currentStatus === 'Unqualified'
                    ? 'Save as Unqualified'
                    : 'Save Qualification'}
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

            {/* Add Custom Product/Service Modal */}
      <Modal
        opened={customModalOpened}
        onClose={() => setCustomModalOpened(false)}
        title={
          <Group gap="xs">
            <ThemeIcon color="indigo" variant="light" size="md" radius="md">
              <IconPlus size={18} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Add Custom {category === 'Product' ? 'Product' : category === 'Service' ? 'Service' : 'Item'}
            </Text>
          </Group>
        }
        radius="md"
        centered
        zIndex={3500}
      >
        <Stack gap="md">
          <TextInput
            label={`${category === 'Product' ? 'Product' : 'Service'} Name`}
            placeholder={`e.g. ${category === 'Product' ? 'AI Analytics Engine' : 'Cloud Security Audit'}`}
            value={customNameInput}
            onChange={(e) => setCustomNameInput(e.target.value)}
            required
            autoFocus
          />
          <Checkbox
            label={`Save this ${category === 'Product' ? 'product' : 'service'} to Catalog for future leads`}
            checked={saveToCatalog}
            onChange={(e) => setSaveToCatalog(e.currentTarget.checked)}
            color="indigo"
          />
          <Group justify="flex-end" gap="xs" mt="sm">
            <Button variant="default" onClick={() => setCustomModalOpened(false)}>
              Cancel
            </Button>
            <Button
              color="indigo"
              loading={savingCatalogItem}
              disabled={!customNameInput.trim()}
              onClick={handleSaveCustomProduct}
            >
              Add {category === 'Product' ? 'Product' : 'Service'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default ContactQualificationPage;
