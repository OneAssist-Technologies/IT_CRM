import React, { useState, useEffect, useMemo } from 'react';
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
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconPlus,
  IconCheck,
  IconTrash,
  IconFileInvoice,
  IconX,
  IconPencil,
  IconList,
  IconUserCheck,
  IconInfoCircle,
  IconArrowLeft,
  IconBriefcase,
  IconFolder,
  IconSparkles,
  IconUser,
  IconBuilding,
  IconMail,
  IconPhone,
  IconMapPin,
  IconReceiptTax,
  IconCalendar,
  IconClock,
  IconHash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Invoice, InvoiceItem, BillingProduct, SalesOrder, BillingMilestone, BillingSettings } from '../../../types/billing';
import { billingService } from '../../../services/billingService';
import { contactService } from '../../../services/contactService';
import { projectService } from '../../../services/projectService';
import { settingsService } from '../../../services/settingsService';
import { Project, ProjectModuleItem } from '../../../types/project';
import { MasterProject } from '../../../types/settings';
import { Contact } from '../../../types/contact';
import { Lead } from '../../../types/lead';

interface ParsedModule {
  name: string;
  description: string;
}

const getProductModules = (
  product?: BillingProduct | null,
  availableProjectsList: { name: string; modules?: any }[] = []
): ParsedModule[] => {
  if (!product) return [];
  let rawModules: any = product.modules;
  if (typeof rawModules === 'string') {
    try {
      rawModules = JSON.parse(rawModules);
    } catch {
      rawModules = [];
    }
  }
  if (Array.isArray(rawModules) && rawModules.length > 0) {
    return rawModules
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

  // Fallback: check matching project / master project by name
  if (availableProjectsList && availableProjectsList.length > 0) {
    const matched = availableProjectsList.find(
      (p) => p.name && p.name.toLowerCase() === product.name.toLowerCase()
    );
    if (matched) {
      let mods: any = matched.modules;
      if (typeof mods === 'string') {
        try {
          mods = JSON.parse(mods);
        } catch {
          mods = [];
        }
      }
      if (Array.isArray(mods) && mods.length > 0) {
        return mods
          .map((m: any) => {
            if (typeof m === 'string') return { name: m, description: '' };
            return { name: m?.name || '', description: m?.description || '' };
          })
          .filter((m) => m.name && m.name.trim() !== '');
      }
    }
  }

  if (product && product.name) {
    return [{ name: product.name, description: product.description || '' }];
  }

  return [];
};

const INDIAN_STATES = [
  'Tamil Nadu',
  'Karnataka',
  'Maharashtra',
  'Delhi',
  'Kerala',
  'Telangana',
  'Andhra Pradesh',
  'Gujarat',
  'Haryana',
  'Uttar Pradesh',
  'West Bengal',
  'Rajasthan',
  'Madhya Pradesh',
  'Punjab',
  'Goa',
  'Bihar',
  'Odisha',
  'Assam',
  'Other / Union Territory',
];

const UNIT_OPTIONS = [
  { value: 'Nos', label: 'Nos (Numbers)' },
  { value: 'Hrs', label: 'Hrs (Hours)' },
  { value: 'Days', label: 'Days' },
  { value: 'Months', label: 'Months' },
  { value: 'Units', label: 'Units' },
  { value: 'Pcs', label: 'Pcs (Pieces)' },
  { value: 'Set', label: 'Set' },
];

/**
 * Safely parse a date string (YYYY-MM-DD) into a local Date without timezone offset shift
 */
const parseDateString = (str?: string | null): Date | null => {
  if (!str) return null;
  const clean = str.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Format a Date object into YYYY-MM-DD string
 */
const formatDateToString = (d: Date | null): string => {
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Converts numbers into standard Indian Rupee Currency Words (Lakhs, Crores, Thousands)
 */
export function numberToWordsINR(num: number): string {
  if (isNaN(num) || num <= 0) return 'ZERO RUPEES ONLY';

  const singleDigits = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teenDigits = [
    'TEN',
    'ELEVEN',
    'TWELVE',
    'THIRTEEN',
    'FOURTEEN',
    'FIFTEEN',
    'SIXTEEN',
    'SEVENTEEN',
    'EIGHTEEN',
    'NINETEEN',
  ];
  const tensDigits = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const convertTwoDigits = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n < 20) return teenDigits[n - 10];
    const tens = tensDigits[Math.floor(n / 10)];
    const remainder = singleDigits[n % 10];
    return remainder ? `${tens} ${remainder}` : tens;
  };

  const convertThreeDigits = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += `${singleDigits[hundred]} HUNDRED`;
      if (rest > 0) res += ' ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  };

  const rupee = Math.floor(num);
  const paise = Math.round((num - rupee) * 100);

  let words = '';

  const crore = Math.floor(rupee / 10000000);
  let rem = rupee % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundredAndBelow = rem;

  if (crore > 0) {
    words += `${convertTwoDigits(crore)} CRORE `;
  }
  if (lakh > 0) {
    words += `${convertTwoDigits(lakh)} LAKH `;
  }
  if (thousand > 0) {
    words += `${convertTwoDigits(thousand)} THOUSAND `;
  }
  if (hundredAndBelow > 0) {
    words += `${convertThreeDigits(hundredAndBelow)} `;
  }

  words = words.trim() + ' RUPEES';

  if (paise > 0) {
    words += ` AND ${convertTwoDigits(paise)} PAISE`;
  }

  return `${words} ONLY`.toUpperCase();
}

interface InvoiceModalProps {
  opened: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  defaultSalesOrderId?: string;
  defaultMilestone?: BillingMilestone | null;
  onSuccess: () => void;
  initialLead?: Lead | null;
  asScreen?: boolean;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  opened,
  onClose,
  invoice,
  defaultSalesOrderId,
  defaultMilestone,
  onSuccess,
  initialLead,
  asScreen = false,
}) => {
  const isDark = useComputedColorScheme('light') === 'dark';
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<BillingProduct[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [masterProjects, setMasterProjects] = useState<MasterProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isManualProject, setIsManualProject] = useState<boolean>(false);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [selectedCatalogueId, setSelectedCatalogueId] = useState<string | null>(null);
  const [customRowIndices, setCustomRowIndices] = useState<number[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);

  // 1. Scenario: Project Billing vs Standard Product
  const [scenario, setScenario] = useState<'project' | 'standard'>('project');

  // Company Information (Seller) - Pre-loaded from settings in background
  const [companyName, setCompanyName] = useState<string>('OneAssist Technologies');
  const [companyGstin, setCompanyGstin] = useState<string>('');
  const [companyPincode, setCompanyPincode] = useState<string>('');
  const [companyCity, setCompanyCity] = useState<string>('');
  const [companyState, setCompanyState] = useState<string>('');
  const [companyAddress, setCompanyAddress] = useState<string>('');
  const [companyPhone, setCompanyPhone] = useState<string>('');
  const [companyEmail, setCompanyEmail] = useState<string>('');

  // Invoice Details
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [placeOfSupply, setPlaceOfSupply] = useState<string>('Tamil Nadu');
  const [status, setStatus] = useState<string>('Issued');
  const [paymentTerms, setPaymentTerms] = useState<string>('Due within 15 days');

  // Details of Receiver (Billed To)
  const [contactId, setContactId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientCompanyName, setClientCompanyName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');
  const [clientGst, setClientGst] = useState<string>('');

  // Bank Details - Pre-loaded from settings in background
  const [bankAccountHolder, setBankAccountHolder] = useState<string>('');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');
  const [bankIfsc, setBankIfsc] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [bankBranch, setBankBranch] = useState<string>('');
  const [bankUpi, setBankUpi] = useState<string>('');

  // Additional IDs & Relations
  const [salesOrderId, setSalesOrderId] = useState<string>('');
  const [milestoneId, setMilestoneId] = useState<string>('');

  // Financials & Line Items
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [termsConditions, setTermsConditions] = useState<string>(
    '1. Payment must be made by the due date.\n2. Please mention Invoice Number in NEFT/RTGS transaction remarks.\n3. Late payment incurs 1.5% interest per month.\n4. Dispute jurisdiction: Chennai, Tamil Nadu.'
  );

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      itemName: '',
      itemType: 'Service',
      description: '',
      hsnCode: '998314',
      quantity: 1,
      unit: 'Nos',
      unitPrice: 0,
      discount: 0,
      taxRate: 18,
      taxAmount: 0,
      totalAmount: 0,
    },
  ]);

  // Combined available projects list: from Project Management + Master Projects configured in Settings
  const availableProjects = useMemo(() => {
    const combined: {
      id: string;
      name: string;
      modules?: any;
      estimatedBudget?: number | null;
      clientName?: string | null;
      clientEmail?: string | null;
      clientPhone?: string | null;
    }[] = [];
    const seenNames = new Set<string>();

    for (const p of projects) {
      if (p.id && !seenNames.has(p.name.toLowerCase())) {
        seenNames.add(p.name.toLowerCase());
        combined.push(p);
      }
    }

    for (const mp of masterProjects) {
      if (mp.id && !seenNames.has(mp.name.toLowerCase())) {
        seenNames.add(mp.name.toLowerCase());
        combined.push({
          id: mp.id,
          name: mp.name,
          modules: mp.modules,
          estimatedBudget: mp.basePrice,
        });
      }
    }
    return combined;
  }, [projects, masterProjects]);

  const selectedCatalogueProduct = products.find((p) => p.id === selectedCatalogueId);
  const selectedProductModules = useMemo(() => {
    return getProductModules(selectedCatalogueProduct, availableProjects);
  }, [selectedCatalogueProduct, availableProjects]);

  // Resolves the selected Project from Project Management or Master Projects
  const selectedProject = useMemo(() => {
    if (selectedProjectId) {
      const found = availableProjects.find((p) => p.id === selectedProjectId);
      if (found) return found;
    }
    if (projectTitle && projectTitle.trim()) {
      const titleLower = projectTitle.trim().toLowerCase();
      const found = availableProjects.find(
        (p) =>
          p.name.toLowerCase() === titleLower ||
          titleLower.includes(p.name.toLowerCase()) ||
          p.name.toLowerCase().includes(titleLower)
      );
      if (found) return found;
    }
    if (selectedCatalogueProduct) {
      const found = availableProjects.find(
        (p) => p.name.toLowerCase() === selectedCatalogueProduct.name.toLowerCase()
      );
      if (found) return found;
    }
    return null;
  }, [selectedProjectId, projectTitle, selectedCatalogueProduct, availableProjects]);

  const selectedProjectModules: ProjectModuleItem[] = useMemo(() => {
    if (!selectedProject) return [];
    let mods: any = selectedProject.modules;
    if (typeof mods === 'string') {
      try {
        mods = JSON.parse(mods);
      } catch {
        mods = [];
      }
    }
    if (!Array.isArray(mods)) return [];
    return mods
      .map((m: any, idx: number) => {
        if (typeof m === 'string') {
          return {
            id: `mod-${idx}`,
            name: m,
            description: '',
            progress: 0,
            status: 'Not Started' as const,
          };
        }
        return {
          id: m.id || `mod-${idx}`,
          name: m.name || '',
          description: m.description || '',
          price: m.price ? Number(m.price) : undefined,
          progress: typeof m.progress === 'number' ? m.progress : 0,
          status: (m.status || 'Not Started') as ProjectModuleItem['status'],
        };
      })
      .filter((m: any) => m.name && m.name.trim() !== '');
  }, [selectedProject]);

  const handleSelectProject = (projId: string | null) => {
    setSelectedProjectId(projId);
    if (!projId) {
      setProjectTitle('');
      return;
    }
    const found = availableProjects.find((p) => p.id === projId);
    if (found) {
      setProjectTitle(found.name);

      // Auto-fill client details if clientName is empty or matching
      if (!clientName.trim() && found.clientName) {
        setClientName(found.clientName);
      }
      if (!clientEmail.trim() && found.clientEmail) {
        setClientEmail(found.clientEmail);
      }
      if (!clientPhone.trim() && found.clientPhone) {
        setClientPhone(found.clientPhone);
      }

      let modCount = 0;
      if (Array.isArray(found.modules)) {
        modCount = found.modules.length;
      } else if (typeof found.modules === 'string') {
        try {
          modCount = JSON.parse(found.modules).length;
        } catch {}
      }

      notifications.show({
        color: 'indigo',
        title: `Project: ${found.name}`,
        message: `${modCount} module(s) available for line items.`,
      });
    }
  };

  const handleAddAllProjectModules = (proj: any) => {
    let mods: any = proj.modules;
    if (typeof mods === 'string') {
      try {
        mods = JSON.parse(mods);
      } catch {
        mods = [];
      }
    }
    if (!Array.isArray(mods) || mods.length === 0) {
      notifications.show({ color: 'yellow', message: 'No modules found for this project in Project Management' });
      return;
    }

    const unitBudget =
      proj.estimatedBudget && proj.estimatedBudget > 0
        ? Math.round(proj.estimatedBudget / mods.length)
        : (items[0]?.unitPrice && items[0]?.unitPrice > 0 ? items[0].unitPrice : 0);

    const newItems: InvoiceItem[] = mods.map((m: any) => {
      const mName = typeof m === 'string' ? m : m.name;
      const mDesc = typeof m === 'string' ? '' : m.description;
      const mPrice = typeof m !== 'string' && m.price && Number(m.price) > 0 ? Number(m.price) : unitBudget;
      const price = mPrice;
      const tax = Number(((price * 18) / 100).toFixed(2));
      const total = Number((price + tax).toFixed(2));
      return {
        itemName: mName,
        itemType: 'Service',
        description: mDesc || `Project scope deliverables & milestone deployment for ${mName} (${proj.name})`,
        hsnCode: '998314',
        quantity: 1,
        unit: 'Nos',
        unitPrice: price,
        discount: 0,
        taxRate: 18,
        taxAmount: tax,
        totalAmount: total,
      };
    });

    if (items.length === 1 && !items[0].itemName.trim()) {
      setItems(newItems);
    } else {
      setItems([...items, ...newItems]);
    }

    notifications.show({
      color: 'teal',
      message: `Added all ${newItems.length} modules from project "${proj.name}"`,
    });
  };

  const toggleCustomRow = (idx: number) => {
    setCustomRowIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Load Contacts, Products, Projects, Master Projects, Orders, and Settings in background
  useEffect(() => {
    if (opened) {
      contactService.getContacts({ limit: 100 }).then((res) => {
        if (res?.data) setContacts(res.data);
      }).catch(() => {});

      projectService.getProjects({ limit: 100 }).then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setProjects(res.data);
        }
      }).catch(() => {});

      settingsService.getMasterProjects().then((res) => {
        if (res && res.success && Array.isArray(res.data)) {
          setMasterProjects(res.data);
        }
      }).catch(() => {});

      billingService.getProductsServices({ status: 'Active' }).then((data) => {
        if (data) setProducts(data);
      }).catch(() => {});

      billingService.getSalesOrders().then((data) => {
        if (data) setSalesOrders(data);
      }).catch(() => {});

      billingService.getSettings().then((s) => {
        if (s) {
          setBillingSettings(s);
          setCompanyName(s.companyName || 'OneAssist Technologies');
          setCompanyGstin(s.companyGst || '');
          setCompanyAddress(s.companyAddress || '');
          setCompanyPhone(s.companyPhone || '');
          setCompanyEmail(s.companyEmail || '');
          setBankAccountHolder(s.accountHolderName || '');
          setBankAccountNumber(s.accountNumber || '');
          setBankIfsc(s.ifscCode || '');
          setBankName(s.bankName || '');
          setBankBranch(s.branchName || '');
          setBankUpi(s.upiId || '');
        }
      }).catch(() => {});
    }
  }, [opened]);

  // Populate data when editing or opening from Milestone/Lead
  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber);
      setContactId(invoice.contactId || '');
      setClientName(invoice.contactName || '');
      setClientCompanyName(invoice.companyName || '');
      setClientEmail(invoice.contactEmail || '');
      setClientPhone(invoice.contactPhone || '');
      setClientGst(invoice.clientGst || '');
      setClientAddress(invoice.clientAddress || '');
      setSalesOrderId(invoice.salesOrderId || '');
      setMilestoneId(invoice.milestoneId || '');
      setSelectedProjectId(invoice.projectId || null);
      setProjectTitle(invoice.projectName || invoice.projectTitle || '');
      setPlaceOfSupply(invoice.placeOfSupply || 'Tamil Nadu');
      setInvoiceDate(invoice.invoiceDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
      setDueDate(invoice.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
      setStatus(invoice.status || 'Issued');
      setDiscountAmount(Number(invoice.discountAmount) || 0);
      setAdvanceAmount(Number(invoice.amountPaid) || Number(invoice.advanceAmount) || 0);
      setPaymentTerms(invoice.paymentTerms || 'Due within 15 days');
      setNotes(invoice.notes || '');
      setTermsConditions(invoice.termsConditions || '');

      if (invoice.companyDetails) {
        if (invoice.companyDetails.companyName) setCompanyName(invoice.companyDetails.companyName);
        if (invoice.companyDetails.gstin) setCompanyGstin(invoice.companyDetails.gstin);
        if (invoice.companyDetails.address) setCompanyAddress(invoice.companyDetails.address);
        if (invoice.companyDetails.phone) setCompanyPhone(invoice.companyDetails.phone);
        if (invoice.companyDetails.email) setCompanyEmail(invoice.companyDetails.email);
      }

      if (invoice.bankDetails) {
        if (invoice.bankDetails.accountHolderName) setBankAccountHolder(invoice.bankDetails.accountHolderName);
        if (invoice.bankDetails.accountNumber) setBankAccountNumber(invoice.bankDetails.accountNumber);
        if (invoice.bankDetails.ifscCode) setBankIfsc(invoice.bankDetails.ifscCode);
        if (invoice.bankDetails.bankName) setBankName(invoice.bankDetails.bankName);
        if (invoice.bankDetails.branchName) setBankBranch(invoice.bankDetails.branchName);
        if (invoice.bankDetails.upiId) setBankUpi(invoice.bankDetails.upiId);
      }

      if (invoice.items && invoice.items.length > 0) {
        setItems(
          invoice.items.map((it) => ({
            ...it,
            hsnCode: it.hsnCode || '998314',
            unit: it.unit || 'Nos',
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            discount: Number(it.discount) || 0,
            taxRate: Number(it.taxRate) || 0,
            taxAmount: Number(it.taxAmount) || 0,
            totalAmount: Number(it.totalAmount) || 0,
          }))
        );
      }
    } else if (defaultMilestone) {
      setMilestoneId(defaultMilestone.id);
      setSalesOrderId(defaultMilestone.salesOrderId || '');
      setProjectTitle(defaultMilestone.projectName || defaultMilestone.name || 'Milestone Deliverable');
      if (defaultMilestone.salesOrder) {
        setClientName(defaultMilestone.salesOrder.contactName || '');
        setClientCompanyName(defaultMilestone.salesOrder.companyName || '');
      }
      setItems([
        {
          itemName: defaultMilestone.name,
          itemType: 'Service',
          description: defaultMilestone.description || `Milestone Phase: ${defaultMilestone.name}`,
          hsnCode: '998314',
          quantity: 1,
          unit: 'Nos',
          unitPrice: Number(defaultMilestone.amount) || 0,
          discount: 0,
          taxRate: 18,
          taxAmount: Number(((Number(defaultMilestone.amount) * 18) / 100).toFixed(2)),
          totalAmount: Number((Number(defaultMilestone.amount) * 1.18).toFixed(2)),
        },
      ]);
    } else if (defaultSalesOrderId) {
      setSalesOrderId(defaultSalesOrderId);
      const foundOrder = salesOrders.find((o) => o.id === defaultSalesOrderId);
      if (foundOrder) {
        setContactId(foundOrder.contactId || '');
        setClientName(foundOrder.contactName || '');
        setClientCompanyName(foundOrder.companyName || '');
        setClientEmail(foundOrder.contactEmail || '');
        setClientPhone(foundOrder.contactPhone || '');
        setClientGst(foundOrder.clientGst || '');
        setClientAddress(foundOrder.clientAddress || '');
        setProjectTitle(`Sales Order ${foundOrder.orderNumber}`);
      }
    } else if (initialLead) {
      const matchedContact = contacts.find(
        (c) =>
          (initialLead.email && c.email && c.email.toLowerCase() === initialLead.email.toLowerCase()) ||
          (initialLead.phone && c.phone && c.phone === initialLead.phone) ||
          (c.name && c.name.toLowerCase() === initialLead.name.toLowerCase())
      );

      setContactId(initialLead.id || '');
      setClientName(initialLead.name || '');
      setClientCompanyName(initialLead.companyName || initialLead.profession || '');
      setClientEmail(initialLead.email || '');
      setClientPhone(initialLead.phone || '');
      setClientGst(matchedContact?.gstNumber || '');
      setClientAddress(
        initialLead.address ||
          (matchedContact?.address
            ? `${matchedContact.address}${matchedContact.registeredState ? `, ${matchedContact.registeredState}` : ''}`.trim()
            : '')
      );
      setPlaceOfSupply(initialLead.registeredState || matchedContact?.registeredState || 'Tamil Nadu');

      const leadItem =
        initialLead.product ||
        initialLead.service ||
        initialLead.productList?.[0] ||
        initialLead.serviceList?.[0];

      if (leadItem) {
        setProjectTitle(leadItem);
        const matched = availableProjects.find(
          (p) =>
            p.name.toLowerCase() === leadItem.toLowerCase() ||
            p.name.toLowerCase().includes(leadItem.toLowerCase()) ||
            leadItem.toLowerCase().includes(p.name.toLowerCase())
        );
        if (matched) {
          setSelectedProjectId(matched.id);
        } else {
          setSelectedProjectId(null);
        }
      } else {
        setSelectedProjectId(null);
        setProjectTitle('');
      }

      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setStatus('Issued');
      setDiscountAmount(0);
      setAdvanceAmount(0);
      setPaymentTerms('Net 30 Days');
      setNotes('');
      setSelectedCatalogueId(null);
      setCustomRowIndices([]);

      setItems([
        {
          itemName: '',
          itemType: 'Service',
          description: '',
          hsnCode: '998314',
          quantity: 1,
          unit: 'Nos',
          unitPrice: 0,
          discount: 0,
          taxRate: 18,
          taxAmount: 0,
          totalAmount: 0,
        },
      ]);
    } else {
      // Clean slate for creating a new invoice
      setInvoiceNumber('');
      setContactId('');
      setClientName('');
      setClientCompanyName('');
      setClientEmail('');
      setClientPhone('');
      setClientGst('');
      setClientAddress('');
      setSalesOrderId('');
      setMilestoneId('');
      setSelectedProjectId(null);
      setProjectTitle('');
      setPlaceOfSupply('Tamil Nadu');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setStatus('Issued');
      setDiscountAmount(0);
      setAdvanceAmount(0);
      setPaymentTerms('Net 30 Days');
      setNotes('');
      setSelectedCatalogueId(null);
      setCustomRowIndices([]);

      setItems([
        {
          itemName: '',
          itemType: 'Service',
          description: '',
          hsnCode: '998314',
          quantity: 1,
          unit: 'Nos',
          unitPrice: 0,
          discount: 0,
          taxRate: 18,
          taxAmount: 0,
          totalAmount: 0,
        },
      ]);
    }
  }, [invoice, defaultMilestone, defaultSalesOrderId, initialLead, contacts, opened]);

  // Reactive auto-matching when availableProjects loads asynchronously for an initialLead
  useEffect(() => {
    if (initialLead && !selectedProjectId && availableProjects.length > 0) {
      const leadItem =
        initialLead.product ||
        initialLead.service ||
        initialLead.productList?.[0] ||
        initialLead.serviceList?.[0];
      if (leadItem) {
        const matched = availableProjects.find(
          (p) =>
            p.name.toLowerCase() === leadItem.toLowerCase() ||
            p.name.toLowerCase().includes(leadItem.toLowerCase()) ||
            leadItem.toLowerCase().includes(p.name.toLowerCase())
        );
        if (matched) {
          setSelectedProjectId(matched.id);
          if (!projectTitle.trim()) {
            setProjectTitle(matched.name);
          }
        }
      }
    }
  }, [initialLead, availableProjects, selectedProjectId, projectTitle]);

  const handleSelectContact = (val: string | null) => {
    setContactId(val || '');
    if (!val) return;
    const found = contacts.find((c) => c.id === val);
    if (found) {
      setClientName(found.name || '');
      setClientCompanyName(found.companyName || '');
      setClientEmail(found.email || '');
      setClientPhone(found.phone || '');
      setClientGst(found.gstNumber || '');
      setClientAddress(found.address ? `${found.address}${found.registeredState ? `, ${found.registeredState}` : ''}`.trim() : (found.registeredState || ''));
      if (found.registeredState) {
        setPlaceOfSupply(found.registeredState);
      }
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    const qty = Number(updated[index].quantity) || 1;
    const price = Number(updated[index].unitPrice) || 0;
    const disc = Number(updated[index].discount) || 0;
    const rate = Number(updated[index].taxRate) || 0;

    const baseAmount = Math.max(0, qty * price - disc);
    const tax = Number(((baseAmount * rate) / 100).toFixed(2));
    const total = Number((baseAmount + tax).toFixed(2));

    updated[index].taxAmount = tax;
    updated[index].totalAmount = total;

    setItems(updated);
  };

  const getRowModuleOptions = (currentItemName: string) => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];

    // 1. Modules from Selected Project (clean label, highest priority)
    if (selectedProject && selectedProjectModules.length > 0) {
      for (const m of selectedProjectModules) {
        if (m.name && !seen.has(m.name)) {
          seen.add(m.name);
          options.push({ value: m.name, label: m.name });
        }
      }
    }

    // 2. Modules from Selected Catalogue Product
    if (selectedCatalogueProduct && selectedProductModules.length > 0) {
      for (const m of selectedProductModules) {
        if (m.name && !seen.has(m.name)) {
          seen.add(m.name);
          options.push({ value: m.name, label: m.name });
        }
      }
    }

    // 3. Products & Services directly from Catalogue (Highest Utility)
    for (const p of products) {
      if (p.name && !seen.has(p.name)) {
        seen.add(p.name);
        options.push({ value: p.name, label: `${p.name} (${p.type || 'Product'})` });
      }
    }

    // 4. Modules from other available projects (Master Projects + Delivery Projects)
    for (const prj of availableProjects) {
      if (selectedProject && prj.id === selectedProject.id) continue;
      let mods: any = prj.modules;
      if (typeof mods === 'string') {
        try {
          mods = JSON.parse(mods);
        } catch {
          mods = [];
        }
      }
      if (Array.isArray(mods)) {
        for (const m of mods) {
          const mName = typeof m === 'string' ? m : m?.name;
          if (mName && !seen.has(mName)) {
            seen.add(mName);
            options.push({ value: mName, label: `${mName} (${prj.name})` });
          }
        }
      }
    }

    // 5. Modules from Catalogue
    for (const p of products) {
      if (selectedCatalogueProduct && p.id === selectedCatalogueProduct.id) continue;
      const mods = getProductModules(p, availableProjects);
      for (const m of mods) {
        if (m.name && !seen.has(m.name)) {
          seen.add(m.name);
          options.push({ value: m.name, label: `${m.name} (${p.name})` });
        }
      }
    }

    if (currentItemName && !seen.has(currentItemName) && currentItemName !== '__CUSTOM__') {
      seen.add(currentItemName);
      options.unshift({
        value: currentItemName,
        label: currentItemName,
      });
    }

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
      const updated = [...items];
      updated[idx] = {
        ...updated[idx],
        itemName: '',
        description: '',
        unitPrice: 0,
        discount: 0,
        taxAmount: 0,
        totalAmount: 0,
      };
      setItems(updated);
      return;
    }

    let foundDesc = '';
    let foundTaxRate = 18;
    let foundProdId: string | undefined = undefined;
    let foundProdType: any = undefined;
    let foundPrice: number | undefined = undefined;

    // 1. Check selected project modules
    let matchedProjectMod = selectedProjectModules.find((m) => m.name === val);

    // 2. Check all available projects (Master Projects and Delivery Projects)
    if (!matchedProjectMod) {
      for (const prj of availableProjects) {
        let mods: any = prj.modules;
        if (typeof mods === 'string') {
          try {
            mods = JSON.parse(mods);
          } catch {
            mods = [];
          }
        }
        if (Array.isArray(mods)) {
          const mod = mods.find((m: any) => (typeof m === 'string' ? m : m.name) === val);
          if (mod) {
            matchedProjectMod =
              typeof mod === 'string' ? { id: mod, name: mod, description: '' } : mod;
            break;
          }
        }
      }
    }

    if (matchedProjectMod) {
      foundDesc = matchedProjectMod.description || '';
      foundTaxRate = 18;
      if (matchedProjectMod.price && Number(matchedProjectMod.price) > 0) {
        foundPrice = Number(matchedProjectMod.price);
      }
    } else if (selectedCatalogueProduct) {
      foundProdId = selectedCatalogueProduct.id;
      foundProdType = selectedCatalogueProduct.type;
      foundTaxRate = Number(selectedCatalogueProduct.taxRate) || 18;
      const mod = selectedProductModules.find((m) => m.name === val);
      if (mod) foundDesc = mod.description;
    } else {
      for (const p of products) {
        if (p.name === val) {
          foundProdId = p.id;
          foundProdType = p.type;
          foundTaxRate = Number(p.taxRate) || 18;
          foundDesc = p.description || '';
          if (p.unitPrice && Number(p.unitPrice) > 0) {
            foundPrice = Number(p.unitPrice);
          }
          break;
        }
        const mods = getProductModules(p, availableProjects);
        const mod = mods.find((m) => m.name === val);
        if (mod) {
          foundProdId = p.id;
          foundProdType = p.type;
          foundTaxRate = Number(p.taxRate) || 18;
          foundDesc = mod.description || p.description || '';
          break;
        }
      }
    }

    const updated = [...items];
    updated[idx].itemName = val;
    if (foundProdId) updated[idx].productId = foundProdId;
    if (foundProdType) updated[idx].itemType = foundProdType;
    if (foundDesc && !updated[idx].description) {
      updated[idx].description = foundDesc;
    }
    if (foundPrice !== undefined && (!updated[idx].unitPrice || updated[idx].unitPrice === 0)) {
      updated[idx].unitPrice = foundPrice;
    }
    if (foundTaxRate && (!updated[idx].taxRate || updated[idx].taxRate === 18)) {
      updated[idx].taxRate = foundTaxRate;
    }

    const qty = Number(updated[idx].quantity) || 1;
    const price = Number(updated[idx].unitPrice) || 0;
    const disc = Number(updated[idx].discount) || 0;
    const rate = Number(updated[idx].taxRate) || 18;

    const baseAmount = Math.max(0, qty * price - disc);
    const tax = Number(((baseAmount * rate) / 100).toFixed(2));
    const total = Number((baseAmount + tax).toFixed(2));

    updated[idx].taxAmount = tax;
    updated[idx].totalAmount = total;

    setItems(updated);
  };

  const handleAddAllModules = (prod: BillingProduct) => {
    const mods = getProductModules(prod);
    if (mods.length === 0) return;

    const isFirstItemEmpty =
      items.length === 1 && !items[0].itemName.trim() && (items[0].unitPrice === 0 || !items[0].unitPrice);

    const newItems: InvoiceItem[] = mods.map((m) => ({
      productId: prod.id,
      itemCode: prod.itemCode,
      itemName: m.name,
      itemType: prod.type,
      description: m.description || prod.description || '',
      hsnCode: '998314',
      quantity: 1,
      unit: 'Nos',
      unitPrice: 0,
      discount: 0,
      taxRate: Number(prod.taxRate) || 18,
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

  const handleLoadWholeProject = () => {
    const title = projectTitle.trim() || 'Complete Project Implementation & Deliverables';
    const rate = items[0]?.unitPrice && items[0]?.unitPrice > 0 ? items[0].unitPrice : 0;
    const tax = Number(((rate * 18) / 100).toFixed(2));
    const total = Number((rate + tax).toFixed(2));

    setItems([
      {
        itemName: title,
        itemType: 'Service',
        description: 'End-to-end full project development, architecture, testing, and production deployment',
        hsnCode: '998314',
        quantity: 1,
        unit: 'Nos',
        unitPrice: rate,
        discount: 0,
        taxRate: 18,
        taxAmount: tax,
        totalAmount: total,
      },
    ]);

    notifications.show({
      color: 'indigo',
      message: 'Set items to Whole Project Single Line',
    });
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        itemName: '',
        itemType: 'Service',
        description: '',
        hsnCode: '998314',
        quantity: 1,
        unit: 'Nos',
        unitPrice: 0,
        discount: 0,
        taxRate: 18,
        taxAmount: 0,
        totalAmount: 0,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  // Tax and Total Calculations
  const subtotal = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) - (Number(it.discount) || 0),
    0
  );
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const totalTax = items.reduce((acc, it) => {
    const lineBase = Math.max(0, (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) - (Number(it.discount) || 0));
    const effectiveBase = subtotal > 0 ? (lineBase / subtotal) * taxableSubtotal : lineBase;
    return acc + (effectiveBase * (Number(it.taxRate) || 0)) / 100;
  }, 0);
  const grandTotal = Number((taxableSubtotal + totalTax).toFixed(2));
  const balanceDue = Math.max(0, Number((grandTotal - advanceAmount).toFixed(2)));

  // Intra-State (CGST + SGST) vs Inter-State (IGST)
  const isIntraState = useMemo(() => {
    const normCompany = (companyState || 'Tamil Nadu').trim().toLowerCase();
    const normPlace = (placeOfSupply || 'Tamil Nadu').trim().toLowerCase();
    return normCompany === normPlace;
  }, [companyState, placeOfSupply]);

  const wordsInINR = useMemo(() => {
    if (!grandTotal || grandTotal <= 0) return '—';
    return numberToWordsINR(grandTotal);
  }, [grandTotal]);

  const getStatusDotColor = (st: string) => {
    switch (st) {
      case 'Paid':
        return '#10B981'; // Green
      case 'Partially Paid':
        return '#F59E0B'; // Amber
      case 'Issued':
        return '#3B82F6'; // Blue
      case 'Overdue':
        return '#EF4444'; // Red
      case 'Cancelled':
        return '#6B7280'; // Gray
      case 'Draft':
      default:
        return '#94A3B8'; // Slate
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);

    if (newStatus === 'Paid') {
      if (grandTotal > 0) {
        setAdvanceAmount(grandTotal);
      }
    } else if (newStatus === 'Partially Paid') {
      if (grandTotal > 0 && (advanceAmount === 0 || advanceAmount >= grandTotal)) {
        setAdvanceAmount(Math.round(grandTotal / 2));
      }
    } else if (newStatus === 'Issued' || newStatus === 'Draft' || newStatus === 'Cancelled') {
      if (advanceAmount === grandTotal && grandTotal > 0) {
        setAdvanceAmount(0);
      }
    }
  };

  const handleAdvanceAmountChange = (val: number) => {
    const clamped = Math.max(0, val);
    setAdvanceAmount(clamped);

    // Dynamically adjust status based on advance amount vs grandTotal
    if (status !== 'Cancelled' && status !== 'Draft') {
      if (grandTotal > 0 && clamped >= grandTotal) {
        setStatus('Paid');
      } else if (clamped > 0 && clamped < grandTotal) {
        setStatus('Partially Paid');
      } else if (clamped === 0 && (status === 'Paid' || status === 'Partially Paid')) {
        const isPast = dueDate && new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
        setStatus(isPast ? 'Overdue' : 'Issued');
      }
    }
  };

  const handleDueDateChange = (newDueDate: string) => {
    setDueDate(newDueDate);
    if (status !== 'Paid' && status !== 'Cancelled' && status !== 'Draft') {
      const isPast = newDueDate && new Date(newDueDate).getTime() < new Date().setHours(0, 0, 0, 0);
      if (isPast && advanceAmount === 0) {
        setStatus('Overdue');
      } else if (!isPast && status === 'Overdue') {
        setStatus(advanceAmount > 0 ? 'Partially Paid' : 'Issued');
      }
    }
  };

  // Dynamic sync: Keep Advance Paid in sync with Grand Total when status is Paid
  useEffect(() => {
    if (status === 'Paid' && grandTotal > 0 && advanceAmount !== grandTotal) {
      setAdvanceAmount(grandTotal);
    }
  }, [grandTotal, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (!clientName.trim()) {
      notifications.show({
        color: 'red',
        title: 'Customer Name Required',
        message: 'Customer / Client Name is mandatory (*). Please enter or select a customer name.',
      });
      return;
    }

    if (!projectTitle.trim() && !selectedProjectId) {
      notifications.show({
        color: 'red',
        title: 'Project Title Required',
        message: 'Project Title is mandatory (*). Please select a project or enter a title.',
      });
      return;
    }

    if (!invoiceDate || !invoiceDate.trim()) {
      notifications.show({
        color: 'red',
        title: 'Invoice Date Required',
        message: 'Date of Invoice is mandatory (*). Please choose an invoice date.',
      });
      return;
    }

    if (!dueDate || !dueDate.trim()) {
      notifications.show({
        color: 'red',
        title: 'Due Date Required',
        message: 'Payment Due Date is mandatory (*). Please choose a payment due date.',
      });
      return;
    }

    if (!items || items.length === 0) {
      notifications.show({
        color: 'red',
        title: 'Line Item Required',
        message: 'Please add at least one line item to the invoice.',
      });
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const rowNum = i + 1;
      const name = it.itemName ? it.itemName.trim() : '';
      const price = Number(it.unitPrice || 0);

      if (!name) {
        notifications.show({
          color: 'red',
          title: 'Item Name Required',
          message: `Line Item #${rowNum}: Item Name / Service is mandatory (*). Please select from dropdown or click ✎ to type a custom name.`,
        });
        return;
      }

      if (price <= 0) {
        notifications.show({
          color: 'red',
          title: 'Amount Required',
          message: `Line Item #${rowNum} ("${name}"): Amount (₹) is mandatory (*) and must be greater than 0.`,
        });
        return;
      }

      if (scenario === 'standard' && (Number(it.quantity) || 0) <= 0) {
        notifications.show({
          color: 'red',
          title: 'Quantity Required',
          message: `Line Item #${rowNum} ("${name}"): Quantity must be at least 1.`,
        });
        return;
      }
    }

    if (grandTotal <= 0) {
      notifications.show({
        color: 'red',
        title: 'Invalid Grand Total',
        message: 'Invoice Grand Total must be greater than ₹0.',
      });
      return;
    }

    const validItems = items;

    try {
      setSubmitting(true);
      const payload: Partial<Invoice> = {
        contactId: contactId || null,
        contactName: clientName,
        companyName: clientCompanyName,
        contactEmail: clientEmail,
        contactPhone: clientPhone,
        clientGst,
        clientAddress,
        salesOrderId: salesOrderId || null,
        milestoneId: milestoneId || null,
        projectId: selectedProjectId || selectedProject?.id || null,
        projectName: projectTitle,
        projectTitle: projectTitle,
        placeOfSupply,
        invoiceDate,
        dueDate,
        status: status as any,
        subtotal: Number(subtotal.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        taxAmount: Number(totalTax.toFixed(2)),
        grandTotal,
        advanceAmount,
        paymentTerms,
        notes,
        termsConditions,
        companyDetails: {
          companyName,
          gstin: companyGstin,
          pincode: companyPincode,
          city: companyCity,
          state: companyState,
          address: companyAddress,
          phone: companyPhone,
          email: companyEmail,
        },
        bankDetails: {
          accountHolderName: bankAccountHolder,
          accountNumber: bankAccountNumber,
          ifscCode: bankIfsc,
          bankName,
          branchName: bankBranch,
          upiId: bankUpi,
        },
        items: validItems,
      };

      if (invoice?.id) {
        await billingService.updateInvoice(invoice.id, payload);
        notifications.show({ color: 'green', message: 'Invoice updated successfully' });
      } else {
        await billingService.createInvoice(payload);
        notifications.show({ color: 'green', message: 'Invoice generated successfully' });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      notifications.show({ color: 'red', message: err.message || 'Failed to save invoice' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeader = (isScreenMode: boolean) => {
    const content = (
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Group gap="sm" align="center">
          {isScreenMode && (
            <Tooltip label="Back to Invoices" withArrow>
              <ActionIcon
                variant="light"
                color="gray"
                size="lg"
                radius="md"
                onClick={onClose}
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
            </Tooltip>
          )}
          <Box
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              flexShrink: 0,
            }}
          >
            <IconFileInvoice size={20} stroke={1.8} />
          </Box>
          <div>
            <Group gap="xs" align="center">
              <Text fw={800} size="17px" style={{ color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
                {invoice ? `Edit Tax Invoice (${invoice.invoiceNumber})` : 'Tax Invoice Generator'}
              </Text>
              <Badge variant="light" color={isIntraState ? 'teal' : 'indigo'} radius="sm" size="xs" fw={700}>
                {isIntraState ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
              </Badge>
              <Badge
                variant="light"
                color={
                  status === 'Paid'
                    ? 'teal'
                    : status === 'Partially Paid'
                    ? 'yellow'
                    : status === 'Issued'
                    ? 'blue'
                    : status === 'Overdue'
                    ? 'red'
                    : status === 'Cancelled'
                    ? 'gray'
                    : 'violet'
                }
                radius="sm"
                size="xs"
                fw={700}
              >
                {status}
              </Badge>
              {initialLead && (
                <Badge variant="light" color="blue" radius="sm" size="xs" fw={600}>
                  Lead: {initialLead.name}
                </Badge>
              )}
            </Group>
            <Text size="11px" c="dimmed" mt={2}>
              Professional GST-compliant tax invoice generation & live billing ledger sync
            </Text>
          </div>
        </Group>

        {isScreenMode ? (
          <Group gap="xs" align="center">
            <Button
              variant="default"
              size="xs"
              radius="md"
              onClick={onClose}
              disabled={submitting}
              style={{ fontWeight: 600, height: 34 }}
            >
              Back to Invoices
            </Button>
            <Button
              type="submit"
              size="xs"
              radius="md"
              loading={submitting}
              leftSection={<IconCheck size={14} />}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                height: 34,
                border: 'none',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              }}
            >
              {invoice ? 'Update Invoice' : 'Generate & Save Invoice'}
            </Button>
          </Group>
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
    );

    if (isScreenMode) {
      return (
        <Paper
          p="sm"
          px="lg"
          radius="12px"
          withBorder
          mb="md"
          style={{
            background: isDark ? '#111827' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {content}
        </Paper>
      );
    }

    return <Box mb="md">{content}</Box>;
  };

  const formContent = (
    <Stack gap="md">
          {/* Client Information & Invoice Details Cards */}
          <Grid gutter="md">
            {/* 1. Client Details (Billed To) */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper
                p="md"
                withBorder
                radius="lg"
                style={{
                  background: isDark ? '#111827' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                  boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Group justify="space-between" mb="xs" align="center">
                  <Group gap={8} align="center">
                    <Box
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconUserCheck size={16} color="#6366F1" />
                    </Box>
                    <div>
                      <Text fw={700} size="xs" tt="uppercase" style={{ letterSpacing: '0.05em', color: isDark ? '#F1F5F9' : '#1E293B' }}>
                        Client Details
                      </Text>
                      <Text size="10px" c="dimmed" style={{ lineHeight: 1 }}>
                        Billed party & GST registration
                      </Text>
                    </div>
                  </Group>

                  {initialLead ? (
                    <Badge size="xs" variant="light" color="indigo" leftSection={<IconSparkles size={11} />}>
                      Auto-filled from Lead
                    </Badge>
                  ) : (
                    <Select
                      placeholder="Pick Existing Contact..."
                      data={contacts.map((c) => ({
                        value: c.id,
                        label: `${c.name} ${c.companyName ? `(${c.companyName})` : ''}`,
                      }))}
                      value={contactId}
                      onChange={handleSelectContact}
                      searchable
                      clearable
                      size="xs"
                      radius="md"
                      style={{ width: 180 }}
                    />
                  )}
                </Group>

                <Divider mb="xs" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }} />

                <Grid gutter="xs" style={{ flex: 1 }}>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Customer / Client Name"
                      placeholder="e.g. Sudhan / Santhosh C"
                      value={clientName}
                      onChange={(e) => setClientName(e.currentTarget.value)}
                      required
                      error={hasAttemptedSubmit && !clientName.trim() ? 'Customer name is required' : undefined}
                      size="xs"
                      radius="md"
                      leftSection={<IconUser size={14} color="#94A3B8" />}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Company / Entity Name"
                      placeholder="e.g. SK Home Products"
                      value={clientCompanyName}
                      onChange={(e) => setClientCompanyName(e.currentTarget.value)}
                      size="xs"
                      radius="md"
                      leftSection={<IconBuilding size={14} color="#94A3B8" />}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Email Address"
                      placeholder="client@example.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.currentTarget.value)}
                      size="xs"
                      radius="md"
                      leftSection={<IconMail size={14} color="#94A3B8" />}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Phone / Mobile"
                      placeholder="9198458645"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.currentTarget.value)}
                      size="xs"
                      radius="md"
                      leftSection={<IconPhone size={14} color="#94A3B8" />}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 8 }}>
                    <TextInput
                      label="Billing Address"
                      placeholder="e.g. 45/2 Gandhi Road, Salem"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.currentTarget.value)}
                      size="xs"
                      radius="md"
                      leftSection={<IconMapPin size={14} color="#94A3B8" />}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                      label="Client GSTIN"
                      placeholder="33AAAAA0000A1Z5"
                      value={clientGst}
                      onChange={(e) => setClientGst(e.currentTarget.value.toUpperCase())}
                      size="xs"
                      radius="md"
                      leftSection={<IconReceiptTax size={14} color="#94A3B8" />}
                    />
                  </Grid.Col>
                </Grid>
              </Paper>
            </Grid.Col>

            {/* 2. Invoice & Project Metadata */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper
                p="md"
                withBorder
                radius="lg"
                style={{
                  background: isDark ? '#111827' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                  boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Group justify="space-between" mb="xs" align="center">
                  <Group gap={8} align="center">
                    <Box
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconFileInvoice size={16} color="#0284C7" />
                    </Box>
                    <div>
                      <Text fw={700} size="xs" tt="uppercase" style={{ letterSpacing: '0.05em', color: isDark ? '#F1F5F9' : '#1E293B' }}>
                        Invoice Details
                      </Text>
                      <Text size="10px" c="dimmed" style={{ lineHeight: 1 }}>
                        GST tax invoice & payment cycle
                      </Text>
                    </div>
                  </Group>
                  <Badge size="xs" variant="light" color="cyan" leftSection={<IconReceiptTax size={11} />}>
                    Tax Invoice
                  </Badge>
                </Group>

                <Divider mb="xs" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }} />

                <Grid gutter="xs" style={{ flex: 1 }}>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Invoice Number"
                      placeholder={invoice ? invoice.invoiceNumber : 'Auto-generated on save'}
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.currentTarget.value)}
                      size="xs"
                      radius="md"
                      disabled={!invoice}
                      leftSection={<IconHash size={14} color="#94A3B8" />}
                      rightSection={
                        !invoice ? (
                          <Badge size="xs" variant="subtle" color="gray" radius="sm">
                            Auto
                          </Badge>
                        ) : null
                      }
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    {isManualProject ? (
                      <TextInput
                        label={
                          <Group justify="space-between" align="center" style={{ width: '100%', marginBottom: 2 }}>
                            <Text size="xs" fw={500}>
                              Project Title <span style={{ color: '#EF4444' }}>*</span>
                            </Text>
                            <Text
                              size="11px"
                              c="indigo"
                              style={{ cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              onClick={() => setIsManualProject(false)}
                            >
                              <IconBriefcase size={11} /> From Projects
                            </Text>
                          </Group>
                        }
                        placeholder="e.g. Venus Implementation"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.currentTarget.value)}
                        error={hasAttemptedSubmit && !projectTitle.trim() ? 'Project Title is required' : undefined}
                        size="xs"
                        radius="md"
                        leftSection={<IconBriefcase size={14} color="#94A3B8" />}
                      />
                    ) : (
                      <Select
                        label={
                          <Group justify="space-between" align="center" style={{ width: '100%', marginBottom: 2 }}>
                            <Text size="xs" fw={500}>
                              Project Title <span style={{ color: '#EF4444' }}>*</span>
                            </Text>
                            <Text
                              size="11px"
                              c="indigo"
                              style={{ cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              onClick={() => setIsManualProject(true)}
                            >
                              <IconPencil size={11} /> Enter Manually
                            </Text>
                          </Group>
                        }
                        placeholder="Select project..."
                        data={availableProjects.map((p) => ({
                          value: p.id,
                          label: p.name,
                        }))}
                        value={selectedProjectId || null}
                        onChange={handleSelectProject}
                        error={hasAttemptedSubmit && !selectedProjectId && !projectTitle.trim() ? 'Project Title is required' : undefined}
                        searchable
                        clearable
                        size="xs"
                        radius="md"
                        leftSection={<IconBriefcase size={14} color="#94A3B8" />}
                        nothingFoundMessage="No projects found"
                      />
                    )}
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <DateInput
                      label="Date of Invoice"
                      value={parseDateString(invoiceDate)}
                      onChange={(d) => setInvoiceDate(formatDateToString(d))}
                      required
                      error={hasAttemptedSubmit && !invoiceDate ? 'Date of Invoice is required' : undefined}
                      size="xs"
                      radius="md"
                      valueFormat="DD-MM-YYYY"
                      placeholder="DD-MM-YYYY"
                      leftSection={<IconCalendar size={14} color="#94A3B8" />}
                      leftSectionPointerEvents="none"
                      popoverProps={{ withinPortal: true, zIndex: 3000 }}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <DateInput
                      label="Payment Due Date"
                      value={parseDateString(dueDate)}
                      onChange={(d) => handleDueDateChange(formatDateToString(d))}
                      required
                      error={hasAttemptedSubmit && !dueDate ? 'Payment Due Date is required' : undefined}
                      size="xs"
                      radius="md"
                      valueFormat="DD-MM-YYYY"
                      placeholder="DD-MM-YYYY"
                      leftSection={<IconCalendar size={14} color="#94A3B8" />}
                      leftSectionPointerEvents="none"
                      popoverProps={{ withinPortal: true, zIndex: 3000 }}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Select
                      label="Place of Supply"
                      data={INDIAN_STATES}
                      value={placeOfSupply}
                      onChange={(v) => setPlaceOfSupply(v || 'Tamil Nadu')}
                      size="xs"
                      radius="md"
                      leftSection={<IconMapPin size={14} color="#94A3B8" />}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Select
                      label="Status"
                      data={[
                        { value: 'Draft', label: 'Draft' },
                        { value: 'Issued', label: 'Issued' },
                        { value: 'Partially Paid', label: 'Partially Paid' },
                        { value: 'Paid', label: 'Paid' },
                        { value: 'Overdue', label: 'Overdue' },
                        { value: 'Cancelled', label: 'Cancelled' },
                      ]}
                      value={status}
                      onChange={(v) => handleStatusChange(v || 'Issued')}
                      leftSection={
                        <Box
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: getStatusDotColor(status),
                            boxShadow: `0 0 6px ${getStatusDotColor(status)}88`,
                          }}
                        />
                      }
                      size="xs"
                      radius="md"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Select
                      label="Payment Terms"
                      data={[
                        { value: 'Due within 15 days', label: 'Due within 15 days' },
                        { value: 'Due within 30 days', label: 'Due within 30 days' },
                        { value: 'Due on Receipt', label: 'Due on Receipt' },
                        { value: 'Net 15 Days', label: 'Net 15 Days' },
                        { value: 'Net 30 Days', label: 'Net 30 Days' },
                        { value: 'Net 45 Days', label: 'Net 45 Days' },
                        { value: '50% Advance, 50% on Delivery', label: '50% Advance, 50% on Delivery' },
                        { value: 'Milestone based release', label: 'Milestone based release' },
                      ]}
                      value={paymentTerms}
                      onChange={(v) => setPaymentTerms(v || 'Due within 15 days')}
                      size="xs"
                      radius="md"
                      leftSection={<IconClock size={14} color="#94A3B8" />}
                    />
                  </Grid.Col>
                </Grid>
              </Paper>
            </Grid.Col>
          </Grid>

          {/* Billed Items / Services Scope Table */}
          <Paper
            p="md"
            withBorder
            radius="lg"
            style={{
              background: isDark ? '#111827' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            }}
          >
            <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
              <Text fw={700} size="sm">
                Line Items & Services
              </Text>

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
                <Group gap="xs" align="center" wrap="wrap">
                  <Button
                    variant="light"
                    color="indigo"
                    size="compact-xs"
                    radius="sm"
                    onClick={handleLoadWholeProject}
                    title="Invoice for Whole Project (Single Line Item)"
                  >
                    📦 Whole Project (Single Item)
                  </Button>
                  <Divider orientation="vertical" h={18} />
                  <Select
                    placeholder="Quick add from Catalogue..."
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
                    style={{ width: 260 }}
                  />
                </Group>

                {selectedProject && selectedProjectModules.length > 0 && (
                  <Button
                    variant="light"
                    color="violet"
                    size="compact-xs"
                    radius="sm"
                    leftSection={<IconSparkles size={12} />}
                    onClick={() => handleAddAllProjectModules(selectedProject)}
                    title={`Add all ${selectedProjectModules.length} modules defined in Project Management`}
                  >
                    Add All {selectedProject.name} Modules ({selectedProjectModules.length})
                  </Button>
                )}

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
              <Table striped highlightOnHover withTableBorder withColumnBorders style={{ minWidth: 920 }}>
                <Table.Thead>
                  <Table.Tr style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
                    <Table.Th style={{ width: '4%', fontSize: 11, textAlign: 'center' }}>#</Table.Th>
                    <Table.Th style={{ width: '46%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      Item Name / Service *
                    </Table.Th>
                    {scenario === 'standard' && (
                      <>
                        <Table.Th style={{ width: '8%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                          Qty
                        </Table.Th>
                        <Table.Th style={{ width: '9%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                          Unit
                        </Table.Th>
                      </>
                    )}
                    <Table.Th style={{ width: '14%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      {scenario === 'project' ? 'Amount (₹) *' : 'Unit Rate (₹) *'}
                    </Table.Th>
                    <Table.Th style={{ width: '8%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      Disc (₹)
                    </Table.Th>
                    <Table.Th style={{ width: '8%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      GST %
                    </Table.Th>
                    <Table.Th style={{ width: '14%', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>
                      Total (₹)
                    </Table.Th>
                    <Table.Th style={{ width: '3%', textAlign: 'center' }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((item, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td style={{ textAlign: 'center', fontSize: 12, fontWeight: 600 }}>
                        {idx + 1}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} wrap="nowrap" align="center">
                          {customRowIndices.includes(idx) ? (
                            <TextInput
                              placeholder="Type item or deliverable name..."
                              value={item.itemName}
                              onChange={(e) => updateItem(idx, 'itemName', e.currentTarget.value)}
                              size="xs"
                              radius="sm"
                              style={{ flex: 1 }}
                              required
                              error={hasAttemptedSubmit && (!item.itemName || !item.itemName.trim())}
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
                              error={
                                (!item.itemName || !item.itemName.trim()) &&
                                (Number(item.unitPrice || item.totalAmount || 0) > 0 || hasAttemptedSubmit)
                              }
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
                      {scenario === 'standard' && (
                        <>
                          <Table.Td>
                            <NumberInput
                              value={item.quantity}
                              onChange={(val) => updateItem(idx, 'quantity', val)}
                              min={1}
                              size="xs"
                              radius="sm"
                              error={hasAttemptedSubmit && Number(item.quantity || 0) <= 0}
                            />
                          </Table.Td>
                          <Table.Td>
                            <Select
                              data={UNIT_OPTIONS}
                              value={item.unit || 'Nos'}
                              onChange={(v) => updateItem(idx, 'unit', v || 'Nos')}
                              size="xs"
                              radius="sm"
                            />
                          </Table.Td>
                        </>
                      )}
                      <Table.Td>
                        <NumberInput
                          placeholder="0.00"
                          value={item.unitPrice === 0 || !item.unitPrice ? '' : item.unitPrice}
                          onChange={(val) => updateItem(idx, 'unitPrice', val === '' || val === null ? 0 : val)}
                          min={0}
                          size="xs"
                          radius="sm"
                          error={Number(item.unitPrice || 0) <= 0 && (hasAttemptedSubmit || !!item.itemName?.trim())}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          placeholder="0"
                          value={item.discount === 0 || !item.discount ? '' : item.discount}
                          onChange={(val) => updateItem(idx, 'discount', val === '' || val === null ? 0 : val)}
                          min={0}
                          size="xs"
                          radius="sm"
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
                          {Number(item.totalAmount || 0) > 0 ? `₹${Number(item.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
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

            {/* Live Amount In Words & Summary Section */}
            {/* Live Amount In Words & Summary Section (Clean borderless layout - no nested cards) */}
            <Grid gutter="xl" mt="lg" align="flex-start">
              {/* Left Column: Amount in Words & GST Compliance */}
              <Grid.Col span={{ base: 12, md: 7 }}>
                <Box py="xs" px={4}>
                  <Text size="11px" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }} mb={4}>
                    Amount Chargeable in Words
                  </Text>
                  <Text
                    size="13px"
                    fw={700}
                    style={{
                      color: isDark ? '#F1F5F9' : '#0F172A',
                      lineHeight: 1.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {wordsInINR}
                  </Text>

                  <Group gap="xs" align="center" mt="md" wrap="wrap">
                    <Text size="12px" fw={600} style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
                      GST Compliance: {isIntraState ? 'Intra-State Supply' : 'Inter-State Supply'}
                    </Text>
                    <Text size="11px" c="dimmed">
                      ({companyState} → {placeOfSupply})
                    </Text>
                    <Badge size="xs" variant="light" color={isIntraState ? 'teal' : 'indigo'}>
                      {isIntraState ? 'CGST + SGST (50% each)' : 'IGST (100%)'}
                    </Badge>
                  </Group>
                </Box>
              </Grid.Col>

              {/* Right Column: Totals Breakdown */}
              <Grid.Col span={{ base: 12, md: 5 }}>
                <Box py="xs" px={4}>
                  <Stack gap={8}>
                    <Group justify="space-between">
                      <Text size="12px" c={isDark ? '#94A3B8' : '#64748B'}>Subtotal (Gross):</Text>
                      <Text size="12px" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                        {subtotal > 0 ? `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="12px" c={isDark ? '#94A3B8' : '#64748B'}>Discount (₹):</Text>
                      <NumberInput
                        placeholder="0"
                        value={discountAmount === 0 ? '' : discountAmount}
                        onChange={(v) => setDiscountAmount(Number(v) || 0)}
                        min={0}
                        size="xs"
                        radius="md"
                        style={{ width: 110 }}
                      />
                    </Group>
                    <Group justify="space-between">
                      <Text size="12px" c={isDark ? '#94A3B8' : '#64748B'}>Taxable Value:</Text>
                      <Text size="12px" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                        {taxableSubtotal > 0 ? `₹${taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </Text>
                    </Group>

                    {isIntraState ? (
                      <>
                        <Group justify="space-between">
                          <Text size="12px" c={isDark ? '#94A3B8' : '#64748B'}>CGST (Central Tax):</Text>
                          <Text size="12px" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                            {totalTax > 0 ? `₹${(totalTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="12px" c={isDark ? '#94A3B8' : '#64748B'}>SGST (State Tax):</Text>
                          <Text size="12px" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                            {totalTax > 0 ? `₹${(totalTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </Text>
                        </Group>
                      </>
                    ) : (
                      <Group justify="space-between">
                        <Text size="12px" c={isDark ? '#94A3B8' : '#64748B'}>IGST (Integrated Tax):</Text>
                        <Text size="12px" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                          {totalTax > 0 ? `₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </Text>
                      </Group>
                    )}

                    <Divider my={4} style={{ borderColor: isDark ? '#334155' : '#E2E8F0' }} />
                    <Group justify="space-between">
                      <Text size="13px" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        Total Invoice Amount:
                      </Text>
                      <Text size="15px" fw={800} c="indigo">
                        {grandTotal > 0 ? `₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </Text>
                    </Group>

                    <Group justify="space-between">
                      <Text size="12px" c={isDark ? '#94A3B8' : '#64748B'} fw={600}>
                        Advance Paid (₹):
                      </Text>
                      <NumberInput
                        placeholder="0"
                        value={advanceAmount === 0 ? '' : advanceAmount}
                        onChange={(v) => handleAdvanceAmountChange(Number(v) || 0)}
                        min={0}
                        max={grandTotal}
                        size="xs"
                        radius="md"
                        style={{ width: 110 }}
                      />
                    </Group>

                    <Divider my={4} style={{ borderColor: isDark ? '#334155' : '#E2E8F0' }} />
                    <Group justify="space-between">
                      <Text size="13px" fw={700} c={grandTotal > 0 && balanceDue > 0 ? 'red' : grandTotal > 0 ? 'green' : 'dimmed'}>
                        Balance Due (₹):
                      </Text>
                      <Text size="15px" fw={800} c={grandTotal > 0 && balanceDue > 0 ? 'red' : grandTotal > 0 ? 'green' : 'dimmed'}>
                        {grandTotal > 0 ? `₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </Text>
                    </Group>
                  </Stack>
                </Box>
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Notes & Terms & Conditions Card */}
          <Paper
            p="md"
            radius="md"
            withBorder
            style={{
              background: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            }}
          >
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Textarea
                  label="Notes / Client Instructions"
                  placeholder="Payment instructions or client remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.currentTarget.value)}
                  minRows={4}
                  autosize
                  maxRows={8}
                  radius="md"
                  styles={{
                    label: {
                      fontWeight: 600,
                      fontSize: 13,
                      marginBottom: 6,
                      color: isDark ? '#E2E8F0' : '#334155',
                    },
                    input: {
                      fontSize: 13,
                      lineHeight: 1.5,
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF',
                    },
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Textarea
                  label="Terms & Conditions"
                  placeholder="Standard invoice terms and conditions..."
                  value={termsConditions}
                  onChange={(e) => setTermsConditions(e.currentTarget.value)}
                  minRows={4}
                  autosize
                  maxRows={8}
                  radius="md"
                  styles={{
                    label: {
                      fontWeight: 600,
                      fontSize: 13,
                      marginBottom: 6,
                      color: isDark ? '#E2E8F0' : '#334155',
                    },
                    input: {
                      fontSize: 13,
                      lineHeight: 1.5,
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF',
                    },
                  }}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Action Buttons Footer */}
          <Paper
            p="md"
            radius="md"
            withBorder
            style={{
              background: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap" gap="sm">
              <Text size="xs" c={isDark ? '#94A3B8' : '#64748B'}>
                {invoice ? 'Review changes carefully before saving.' : 'All line items and taxes will be computed and recorded automatically.'}
              </Text>

              <Group gap="sm">
                <Button
                  variant="default"
                  radius="md"
                  onClick={onClose}
                  disabled={submitting}
                  style={{ fontWeight: 600, minWidth: 100, height: 40 }}
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
                    minWidth: 190,
                    height: 40,
                    border: 'none',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                  }}
                >
                  {invoice ? 'Update Invoice' : 'Generate & Save Invoice'}
                </Button>
              </Group>
            </Group>
          </Paper>
        </Stack>
  );

  if (asScreen) {
    return (
      <Box style={{ width: '100%', padding: '4px 0 28px 0' }}>
        <form onSubmit={handleSubmit}>
          {renderHeader(true)}
          {formContent}
        </form>
      </Box>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="1180px"
      centered
      yOffset="2vh"
      withCloseButton={false}
      radius="lg"
      styles={{
        content: {
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.28)',
          maxWidth: '96vw',
          maxHeight: '96vh',
          display: 'flex',
          flexDirection: 'column',
          background: isDark ? '#0B0F19' : '#F8FAFC',
        },
        body: {
          padding: '22px 26px',
          overflowY: 'auto',
          maxHeight: 'calc(96vh - 20px)',
        },
      }}
      closeOnClickOutside={!submitting}
    >
      {renderHeader(false)}
      <form onSubmit={handleSubmit}>
        {formContent}
      </form>
    </Modal>
  );
};
