import React, { useState, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  Text,
  Group,
  Button,
  Stack,
  Select,
  Badge,
  Table,
  ActionIcon,
  Tooltip,
  useComputedColorScheme,
  Modal,
  Loader,
  Alert,
  SegmentedControl,
} from '@mantine/core';
import {
  IconUpload,
  IconDownload,
  IconFileSpreadsheet,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconTrash,
  IconUsers,
  IconInfoCircle,
  IconRefresh,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import * as XLSX from 'xlsx';
import { useContact } from '../../../context/ContactContext';
import { useCRM } from '../../../context/CRMContext';
import { usePermissions } from '../../../context/AccessControlContext';

export interface ParsedContactRow {
  rowNum: number;
  customId?: string;
  name: string;
  phone: string;
  email: string;
  companyName: string;
  contactPerson: string;
  designation: string;
  category: string;
  location?: string;
  source: string;
  callStatus?: string;
  remarks: string;
  website?: string;
  isValid: boolean;
  errors: string[];
}

// Exported utility to download sample CSV template
export const downloadSampleCSV = () => {
  const csvContent =
    'ID,Company Name,Industry / Category,Location,Contact Person,Phone Number,Email,Designation,Website,Source\n' +
    '1,Apex Tech Solutions,,Chennai,Ramesh Kumar,9876543210,ramesh@apextech.com,Director,,Bulk Import\n' +
    '2,CloudSphere IT,,Bangalore,Priya,9123456780,priya@cloudsphere.in,Tech Lead,,Bulk Import\n' +
    '3,NexGen Logistics,,Coimbatore,Vignesh,9840123456,vignesh@nexgen.com,Operations Manager,,Bulk Import\n' +
    '4,Starlight Media,,Madurai,Anitha,9789012345,anitha@starlight.co,Marketing Head,,Bulk Import\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'crm_contacts_bulk_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface BulkImportSectionProps {
  opened: boolean;
  onClose: () => void;
  onImportComplete?: (newBatchId?: string) => void;
}

export const BulkImportSection: React.FC<BulkImportSectionProps> = ({
  opened,
  onClose,
  onImportComplete,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { metadata, bulkImportContacts } = useContact();
  const { currentUser } = useCRM();
  const { isSuperAdmin } = usePermissions();

  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedContactRow[]>([]);
  const [importing, setImporting] = useState(false);

  // Configuration options for the batch
  const [defaultAssignedTo, setDefaultAssignedTo] = useState<string>('Unassigned');
  const [filterMode, setFilterMode] = useState<'all' | 'ready' | 'issues'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = downloadSampleCSV;

  const handleModalClose = () => {
    handleClear();
    onClose();
  };

  // 2. Parse 2D Grid rows (Native XLSX/CSV parser preserving multiline notes)
  const parseGridRows = (grid: any[][]): ParsedContactRow[] => {
    if (!grid || grid.length < 2) return [];

    // Header row normalization
    const rawHeaders = (grid[0] || []).map((h) =>
      String(h ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
    );

    const findExact = (keys: string[]) => rawHeaders.findIndex((h) => keys.includes(h));
    const findCol = (exactKeys: string[], fallbackKeys: string[] = []) => {
      const ex = findExact(exactKeys);
      if (ex !== -1) return ex;
      if (fallbackKeys.length > 0) {
        return rawHeaders.findIndex((h) => fallbackKeys.some((k) => h === k || h.includes(k)));
      }
      return -1;
    };

    const idxId = findCol(
      ['leadid', 'id', 'sno', 'slno', 'contactid', 'leadno', 'leadnumber', 'customerid'],
      ['leadid', 'id', 'sno']
    );
    const idxCompany = findCol(
      ['companyname', 'company', 'organization', 'business', 'firm', 'agency'],
      ['company', 'org', 'firm']
    );
    const idxContactPerson = findCol(
      ['contactperson', 'representative', 'rep', 'person', 'contactname', 'clientname'],
      ['contactperson', 'person']
    );
    const idxName = findCol(
      ['fullname', 'name'],
      ['fullname', 'clientname']
    );
    const idxPhone = findCol(
      ['phone', 'phonenumber', 'mobile', 'cell', 'contactnumber', 'tel', 'phonenumb', 'mobilenumber'],
      ['phone', 'mobile', 'cell', 'numb']
    );
    const idxEmail = findCol(['email', 'mail', 'emailaddress'], ['email', 'mail']);
    const idxDesignation = findCol(['designation', 'role', 'title', 'position'], ['designation']);
    const idxCategory = findCol(
      ['industrycategory', 'industry', 'category', 'type', 'serviceorproduct'],
      ['industry', 'category']
    );
    const idxLocation = findCol(
      ['location', 'city', 'place', 'area', 'address', 'town', 'state'],
      ['location', 'city', 'place']
    );
    const idxWebsite = findCol(['website', 'web', 'site', 'companywebsite', 'url'], ['website', 'site']);
    const idxSource = findCol(['leadsource', 'source', 'leadsourcename'], ['source']);
    const idxCallStatus = findCol(['callstatus', 'status', 'callstate', 'leadstatus'], ['status']);
    const idxRemarks = findCol(
      ['notes', 'remarks', 'description', 'comment', 'comments', 'feedback'],
      ['notes', 'remarks', 'desc']
    );

    const rows: ParsedContactRow[] = [];

    for (let i = 1; i < grid.length; i++) {
      const values = grid[i] || [];
      if (!values || values.every((v: any) => String(v ?? '').trim() === '')) {
        continue; // skip completely empty rows
      }

      const rawId = idxId !== -1 && values[idxId] !== undefined ? String(values[idxId]).trim() : '';
      const companyName = idxCompany !== -1 && values[idxCompany] !== undefined ? String(values[idxCompany]).trim() : '';
      const contactPerson = idxContactPerson !== -1 && values[idxContactPerson] !== undefined ? String(values[idxContactPerson]).trim() : '';
      const explicitName = idxName !== -1 && values[idxName] !== undefined ? String(values[idxName]).trim() : '';

      // Fallback hierarchy: Contact Person > Explicit Name > Company Name > Lead ID
      const resolvedName =
        contactPerson ||
        explicitName ||
        companyName ||
        (rawId ? `Contact ${rawId}` : `Contact ${i}`);

      const rawPhone = idxPhone !== -1 && values[idxPhone] !== undefined ? String(values[idxPhone]).trim() : '';
      const email = idxEmail !== -1 && values[idxEmail] !== undefined ? String(values[idxEmail]).trim() : '';
      const designation = idxDesignation !== -1 && values[idxDesignation] !== undefined ? String(values[idxDesignation]).trim() : '';
      const category = idxCategory !== -1 && values[idxCategory] !== undefined && String(values[idxCategory]).trim() ? String(values[idxCategory]).trim() : 'Product';
      const location = idxLocation !== -1 && values[idxLocation] !== undefined ? String(values[idxLocation]).trim() : '';
      const website = idxWebsite !== -1 && values[idxWebsite] !== undefined ? String(values[idxWebsite]).trim() : '';
      const source = idxSource !== -1 && values[idxSource] !== undefined && String(values[idxSource]).trim() ? String(values[idxSource]).trim() : 'Bulk Import';
      const callStatus = idxCallStatus !== -1 && values[idxCallStatus] !== undefined ? String(values[idxCallStatus]).trim() : '';
      const remarks = idxRemarks !== -1 && values[idxRemarks] !== undefined ? String(values[idxRemarks]).trim() : '';

      // Normalize phone: strip spaces/symbols, strip leading 0, strip country code 91
      let digits = rawPhone.replace(/\D/g, '');
      if (digits.length === 11 && digits.startsWith('0')) {
        digits = digits.slice(1);
      } else if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.slice(2);
      } else if (digits.length > 10 && (digits.startsWith('0') || digits.startsWith('91'))) {
        digits = digits.slice(-10);
      }

      const hasValidPhone = Boolean(digits && digits.length === 10);
      const hasValidEmail = Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

      const errors: string[] = [];
      // Rule: Only show issue if BOTH email and phone number are not there / invalid
      if (!hasValidPhone && !hasValidEmail) {
        if (!digits && !email) {
          errors.push('Both Phone number and Email are missing');
        } else if (!hasValidPhone && !email) {
          errors.push(`Invalid phone (${digits.length} digits, must be 10) & Email missing`);
        } else if (!digits && !hasValidEmail) {
          errors.push('Invalid email format & Phone number missing');
        } else {
          errors.push('Both Phone number and Email are invalid');
        }
      }

      rows.push({
        rowNum: i,
        customId: rawId || String(i),
        name: resolvedName,
        phone: digits || rawPhone,
        email: email.toLowerCase(),
        companyName: companyName || resolvedName,
        contactPerson: contactPerson || resolvedName,
        designation,
        category,
        location,
        source,
        callStatus,
        remarks,
        website,
        isValid: errors.length === 0,
        errors,
      });
    }

    return rows;
  };

  // 3. Handle File Input Change (Supports .xlsx, .xls, and .csv natively without newline splitting issues)
  const handleFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const grid: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (grid && grid.length > 1) {
          const rows = parseGridRows(grid);
          setParsedRows(rows);
        } else {
          notifications.show({
            title: 'Empty File',
            message: 'No data rows found in the selected spreadsheet.',
            color: 'orange',
          });
        }
      } catch (err: any) {
        console.error('Failed to parse spreadsheet file:', err);
        notifications.show({
          title: 'Error reading file',
          message: 'Could not read the spreadsheet. Please ensure it is a valid .xlsx, .xls, or .csv file.',
          color: 'red',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // 4. Submit Bulk Import
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const finalAssignedTo = isSuperAdmin
        ? (defaultAssignedTo !== 'Unassigned' ? defaultAssignedTo : (currentUser?.name || undefined))
        : (currentUser?.name || currentUser?.id || undefined);

      const contactsToImport = validRows.map((r) => ({
        customId: r.customId || undefined,
        leadId: r.customId || undefined,
        name: r.name,
        phone: r.phone,
        email: r.email || null,
        companyName: r.companyName || null,
        contactPerson: r.contactPerson || r.name,
        designation: r.designation || null,
        companyWebsite: r.website || null,
        category: r.category || null,
        city: r.location || null,
        street: r.location || null,
        location: r.location || null,
        source: r.source || 'Bulk Import',
        contactMode: r.callStatus ? 'Call' : (r.phone ? 'Call' : null),
        remarks: r.remarks || (r.callStatus ? `Call Status: ${r.callStatus}` : null),
        status:
          r.callStatus === 'Connected'
            ? 'Interested'
            : r.callStatus === 'Not picked'
            ? 'No Answer'
            : r.callStatus === 'Not interested' || r.callStatus === 'Not Interested'
            ? 'Not Interested'
            : r.callStatus || 'Not Connected',
        assignedTo: finalAssignedTo || null,
      }));

      const res = await bulkImportContacts({
        contacts: contactsToImport,
        defaultAssignedTo: finalAssignedTo,
        defaultSource: 'Bulk Import',
        fileName: fileName || 'bulk_contacts.csv',
      });

      if (res.success) {
        setParsedRows([]);
        setFileName(null);
        const importedBatchId = (res as any).batchId || (res as any).batch?.batchId;
        onImportComplete?.(importedBatchId);
        onClose();
      }
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    setParsedRows([]);
    setFileName(null);
    setFilterMode('all');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  const filteredRows = useMemo(() => {
    if (filterMode === 'ready') return parsedRows.filter((r) => r.isValid);
    if (filterMode === 'issues') return parsedRows.filter((r) => !r.isValid);
    return parsedRows;
  }, [parsedRows, filterMode]);

  // Build employee list for bulk assignment
  const employeeOptions = useMemo(() => {
    const list = [
      { value: 'Unassigned', label: 'Leave Unassigned (New Contacts)' },
      ...(metadata?.employees?.map((emp) => ({
        value: emp.id,
        label: `${emp.name} (${emp.designation || 'Sales Rep'})`,
      })) || []),
    ];
    const seen = new Set<string>();
    return list.filter((opt) => {
      if (!opt.value || seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [metadata?.employees]);

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      size="xl"
      radius="lg"
      centered
      withCloseButton={true}
      title={
        <Group gap="xs">
          <Box
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#E0F2FE',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconFileSpreadsheet size={22} stroke={2} />
          </Box>
          <div>
            <Text fw={700} size="md" style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}>
              Bulk Contact Import
            </Text>
            <Text size="xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              Quickly onboard multiple contacts from CSV / Excel spreadsheets into the CRM.
            </Text>
          </div>
        </Group>
      }
      styles={{
        header: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
          padding: '16px 20px',
        },
        body: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          padding: '20px',
        },
        content: {
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          boxShadow: isDark ? '0 20px 40px rgba(0, 0, 0, 0.6)' : '0 20px 40px rgba(0, 0, 0, 0.12)',
          maxWidth: 1040,
        },
      }}
    >
      <Stack gap="md">
        {/* Top actions toolbar */}
        <Group justify="space-between" align="center">
          <Text size="xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            Upload your contact spreadsheet (.csv format) to stage contacts in bulk.
          </Text>

          <Button
            variant="default"
            size="xs"
            radius="md"
            leftSection={<IconDownload size={14} color="#0284C7" />}
            onClick={handleDownloadTemplate}
            styles={{
              root: {
                height: 32,
                fontSize: 12,
                fontWeight: 600,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
              },
            }}
          >
            Download Sample CSV
          </Button>
        </Group>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,text/csv,text/plain,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {/* Interactive Drag & Drop Area */}
        {!parsedRows.length ? (
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isDragOver
                ? '2px dashed #0284C7'
                : isDark
                ? '2px dashed rgba(255, 255, 255, 0.16)'
                : '2px dashed #CBD5E1',
              borderRadius: 14,
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: isDragOver
                ? isDark
                  ? 'rgba(14, 165, 233, 0.12)'
                  : '#F0F9FF'
                : isDark
                ? '#1E293B'
                : '#F8FAFC',
              transition: 'all 0.15s ease',
            }}
          >
            <Stack align="center" gap={8}>
              <Box
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconUpload size={26} stroke={2} />
              </Box>
              <Text fw={600} size="sm" style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                Drag and drop your contact spreadsheet here, or <span style={{ color: '#0284C7' }}>browse</span>
              </Text>
              <Text size="xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Supports .CSV and spreadsheet exports. Columns like Name, Phone (10 digits), Company, and Email are auto-mapped.
              </Text>
            </Stack>
          </Box>
        ) : (
          /* Staging & Validation Overview Panel */
          <Stack gap="md">
            <Paper
              p="md"
              radius="md"
              style={{
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group justify="space-between" align="center" wrap="wrap" gap="md">
                <Group gap="sm">
                  <IconFileSpreadsheet size={24} color="#0284C7" />
                  <div>
                    <Text fw={600} size="sm" style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}>
                      {fileName || 'contacts_import.csv'}
                    </Text>
                    <Group gap={8} mt={2}>
                      <Badge size="sm" color="blue" variant="light">
                        {parsedRows.length} Total Rows
                      </Badge>
                      <Badge size="sm" color="teal" variant="light" leftSection={<IconCheck size={12} />}>
                        {validCount} Valid Ready
                      </Badge>
                      {invalidCount > 0 && (
                        <Badge size="sm" color="red" variant="light" leftSection={<IconAlertTriangle size={12} />}>
                          {invalidCount} Issues Found
                        </Badge>
                      )}
                    </Group>
                  </div>
                </Group>

                {/* Batch Options */}
                <Group gap="sm" align="flex-end" wrap="wrap">
                  {isSuperAdmin ? (
                    <Select
                      label="Assign Imported Contacts To"
                      size="xs"
                      data={employeeOptions}
                      value={defaultAssignedTo}
                      onChange={(val) => setDefaultAssignedTo(val || 'Unassigned')}
                      style={{ width: 220 }}
                      styles={{
                        input: {
                          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                          fontSize: 12,
                        },
                      }}
                    />
                  ) : (
                    <Box style={{ minWidth: 160 }}>
                      <Text size="11px" fw={600} c={isDark ? '#94A3B8' : '#64748B'} mb={4}>
                        Assigned Owner
                      </Text>
                      <Badge
                        radius="md"
                        styles={{
                          root: {
                            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                            color: isDark ? '#93C5FD' : '#1D4ED8',
                            border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #BFDBFE',
                            fontWeight: 600,
                            fontSize: 12,
                            textTransform: 'none',
                            padding: '6px 12px',
                            height: 32,
                            display: 'inline-flex',
                            alignItems: 'center',
                          },
                        }}
                      >
                        {currentUser?.name || 'Assigned to Me'}
                      </Badge>
                    </Box>
                  )}

                  <Button
                    variant="default"
                    size="xs"
                    color="gray"
                    onClick={handleClear}
                    leftSection={<IconTrash size={14} />}
                    styles={{ root: { height: 32 } }}
                  >
                    Discard
                  </Button>

                  <Button
                    size="xs"
                    color="blue"
                    disabled={validCount === 0 || importing}
                    loading={importing}
                    onClick={handleConfirmImport}
                    leftSection={<IconCheck size={15} stroke={2.5} />}
                    styles={{
                      root: {
                        height: 32,
                        background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                        fontWeight: 600,
                      },
                    }}
                  >
                    Import {validCount} Contacts
                  </Button>
                </Group>
              </Group>
            </Paper>

            {/* Detailed Issue & Reason Banner if any errors are found */}
            {invalidCount > 0 && (
              <Alert
                icon={<IconAlertTriangle size={20} />}
                color="red"
                variant="light"
                radius="md"
                styles={{
                  root: {
                    border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #FECACA',
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                  },
                }}
                title={
                  <Group justify="space-between" align="center" wrap="wrap">
                    <Text fw={700} size="sm" c="red">
                      {invalidCount} {invalidCount === 1 ? 'Row has issues' : 'Rows have issues'} — Missing or Invalid Required Fields
                    </Text>
                    <Button
                      size="compact-xs"
                      variant={filterMode === 'issues' ? 'filled' : 'outline'}
                      color="red"
                      radius="md"
                      onClick={() => setFilterMode(filterMode === 'issues' ? 'all' : 'issues')}
                    >
                      {filterMode === 'issues' ? 'Show All Rows' : `View Only ${invalidCount} Issue Row${invalidCount > 1 ? 's' : ''}`}
                    </Button>
                  </Group>
                }
              >
                <Text size="xs" mb={8} c={isDark ? '#FCA5A5' : '#991B1B'}>
                  The following rows cannot be imported because they have validation issues. Review the specific reasons below:
                </Text>
                <Box style={{ maxHeight: 95, overflowY: 'auto' }}>
                  <Stack gap={4}>
                    {parsedRows
                      .filter((r) => !r.isValid)
                      .map((r) => (
                        <Group key={r.rowNum} gap={8} wrap="nowrap" align="center">
                          <Badge size="xs" color="red" variant="filled">
                            Row {r.rowNum}
                          </Badge>
                          <Text size="xs" fw={700} style={{ minWidth: 160, maxWidth: 240 }} truncate>
                            {r.companyName || r.name || 'Unnamed'}:
                          </Text>
                          <Badge size="xs" color="red" variant="light" leftSection={<IconAlertCircle size={11} stroke={2.5} />}>
                            Reason: {r.errors.join(' • ')}
                          </Badge>
                        </Group>
                      ))}
                  </Stack>
                </Box>
              </Alert>
            )}

            {/* Filter controls between All, Ready, and Issues */}
            <Group justify="space-between" align="center" wrap="wrap" gap="xs">
              <Group gap={8} align="center">
                <Text size="xs" fw={700} style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  PREVIEW FILTER:
                </Text>
                <SegmentedControl
                  size="xs"
                  radius="md"
                  value={filterMode}
                  onChange={(val) => setFilterMode(val as any)}
                  data={[
                    { label: `All (${parsedRows.length})`, value: 'all' },
                    { label: `Ready (${validCount})`, value: 'ready' },
                    {
                      label: invalidCount > 0 ? `Issues (${invalidCount})` : 'Issues (0)',
                      value: 'issues',
                      disabled: invalidCount === 0,
                    },
                  ]}
                  styles={{
                    root: {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    },
                  }}
                />
              </Group>

              <Text size="xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Showing {filteredRows.length} of {parsedRows.length} rows
              </Text>
            </Group>

            {/* Parsed Contacts Preview Table with Clear Issue Reason Column */}
            <Box style={{ maxHeight: 280, overflowY: 'auto', borderRadius: 8, border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #E2E8F0' }}>
              <Table highlightOnHover striped withTableBorder style={{ width: '100%' }}>
                <Table.Thead style={{ backgroundColor: isDark ? '#0F172A' : '#F1F5F9', position: 'sticky', top: 0, zIndex: 1 }}>
                  <Table.Tr>
                    <Table.Th style={{ width: 45, fontSize: 11, textAlign: 'center' }}>#</Table.Th>
                    <Table.Th style={{ width: 75, fontSize: 11, textAlign: 'center' }}>STATUS</Table.Th>
                    <Table.Th style={{ minWidth: 200, fontSize: 11, color: isDark ? '#FCA5A5' : '#DC2626' }}>
                      ISSUE REASON
                    </Table.Th>
                    <Table.Th style={{ width: 75, fontSize: 11 }}>LEAD ID</Table.Th>
                    <Table.Th style={{ fontSize: 11, minWidth: 140 }}>COMPANY / NAME</Table.Th>
                    <Table.Th style={{ fontSize: 11, minWidth: 110 }}>PHONE</Table.Th>
                    <Table.Th style={{ fontSize: 11, minWidth: 140 }}>EMAIL</Table.Th>
                    <Table.Th style={{ fontSize: 11, minWidth: 95 }}>LOCATION</Table.Th>
                    <Table.Th style={{ fontSize: 11, minWidth: 90 }}>SOURCE</Table.Th>
                    <Table.Th style={{ fontSize: 11, maxWidth: 180 }}>NOTES / REMARKS</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredRows.map((row) => (
                    <Table.Tr
                      key={row.rowNum}
                      style={{
                        backgroundColor: !row.isValid
                          ? isDark
                            ? 'rgba(239, 68, 68, 0.12)'
                            : '#FEF2F2'
                          : undefined,
                        borderLeft: !row.isValid ? '4px solid #EF4444' : undefined,
                      }}
                    >
                      {/* 1. Row # */}
                      <Table.Td style={{ fontSize: 12, textAlign: 'center', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                        {row.rowNum}
                      </Table.Td>

                      {/* 2. Status Badge */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        {row.isValid ? (
                          <Badge size="xs" color="teal" variant="light">
                            Ready
                          </Badge>
                        ) : (
                          <Badge size="xs" color="red" variant="filled">
                            Issue
                          </Badge>
                        )}
                      </Table.Td>

                      {/* 3. Issue Reason Column */}
                      <Table.Td>
                        {!row.isValid ? (
                          <Group gap={5} wrap="nowrap" align="center">
                            <IconAlertCircle size={14} color="#EF4444" stroke={2.5} style={{ flexShrink: 0 }} />
                            <Text size="11.5px" fw={700} c="red" style={{ lineHeight: 1.25 }}>
                              {row.errors.join(' • ')}
                            </Text>
                          </Group>
                        ) : (
                          <Text size="11px" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>

                      {/* 4. Lead ID */}
                      <Table.Td style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                        {row.customId || `L-${row.rowNum}`}
                      </Table.Td>

                      {/* 5. Company / Contact Name */}
                      <Table.Td style={{ fontSize: 12, fontWeight: 600 }}>
                        {!row.companyName && !row.name ? (
                          <Badge size="xs" color="red" variant="light">
                            Missing Name
                          </Badge>
                        ) : (
                          row.companyName || row.name
                        )}
                      </Table.Td>

                      {/* 6. Phone */}
                      <Table.Td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {!row.phone || row.phone === '—' ? (
                          <Text size="11px" c="dimmed">
                            —
                          </Text>
                        ) : row.errors.some((e) => e.toLowerCase().includes('phone')) ? (
                          <Group gap={4} wrap="nowrap">
                            <Text size="12px" fw={700} c="red">
                              {row.phone}
                            </Text>
                            <Badge size="xs" color="red" variant="outline">
                              Invalid
                            </Badge>
                          </Group>
                        ) : (
                          row.phone
                        )}
                      </Table.Td>

                      {/* 6.5 Email */}
                      <Table.Td style={{ fontSize: 12, maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.email ? (
                          <Tooltip label={row.email} withArrow position="top">
                            <span style={{ color: isDark ? '#CBD5E1' : '#334155' }}>{row.email}</span>
                          </Tooltip>
                        ) : (
                          <Text size="11px" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>

                      {/* 7. Location */}
                      <Table.Td style={{ fontSize: 12 }}>
                        {row.location || '—'}
                      </Table.Td>

                      {/* 8. Source */}
                      <Table.Td style={{ fontSize: 12 }}>
                        {row.source || 'Bulk Import'}
                      </Table.Td>

                      {/* 9. Notes / Remarks */}
                      <Table.Td
                        style={{
                          fontSize: 11.5,
                          maxWidth: 200,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: isDark ? '#94A3B8' : '#64748B',
                        }}
                      >
                        <Tooltip label={row.remarks || row.callStatus || 'No notes'} withArrow multiline maw={280}>
                          <span>{row.callStatus ? `${row.callStatus}${row.remarks ? ` (${row.remarks})` : ''}` : (row.remarks || '—')}</span>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
};

export default BulkImportSection;
