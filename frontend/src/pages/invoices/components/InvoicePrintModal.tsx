import React, { useRef, useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Group,
  Text,
  Box,
  Badge,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconPrinter,
  IconDownload,
  IconCheck,
  IconArrowLeft,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Invoice, BillingSettings } from '../../../types/billing';
import { billingService } from '../../../services/billingService';
import {
  downloadInvoicePDF,
  printInvoiceElement,
} from '../../../utils/invoicePdfGenerator';
import { InvoiceDocument } from '../../billing/components/InvoiceDocument';

interface InvoicePrintModalProps {
  opened: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  autoPrint?: boolean;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  opened,
  onClose,
  invoice,
  autoPrint = false,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [settings, setSettings] = useState<BillingSettings | null>(null);

  // Fetch real company settings from project
  useEffect(() => {
    billingService
      .getSettings()
      .then((res) => {
        if (res) setSettings(res);
      })
      .catch(() => {});
  }, []);

  // Direct PDF Download Handler
  const handleDownloadPDF = async () => {
    if (!invoice || !printRef.current) return;
    try {
      setDownloading(true);
      const filename = `Invoice_${invoice.invoiceNumber || 'OA'}_OneAssist.pdf`;
      await downloadInvoicePDF(printRef.current, filename);
      notifications.show({
        title: 'PDF Downloaded',
        message: `${filename} saved to your downloads.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err: any) {
      notifications.show({
        title: 'Download Failed',
        message: err.message || 'Could not generate PDF. Please try Print.',
        color: 'red',
      });
    } finally {
      setDownloading(false);
    }
  };

  // High-fidelity Print Handler using isolated iframe
  const handlePrint = () => {
    if (!invoice || !printRef.current) return;
    printInvoiceElement(
      printRef.current,
      `Invoice_${invoice.invoiceNumber || 'OA'}_OneAssist`
    );
  };

  // Auto-download trigger if opened in download mode
  useEffect(() => {
    if (opened && autoPrint && invoice && printRef.current) {
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [opened, autoPrint, invoice]);

  if (!invoice) return null;

  // Status configuration
  const statusColors: Record<string, string> = {
    Paid: '#059669',
    Issued: '#4F46E5',
    Sent: '#4F46E5',
    'Partially Paid': '#D97706',
    Overdue: '#DC2626',
    Draft: '#64748B',
    Cancelled: '#64748B',
  };
  const statusColor = statusColors[invoice.status] || '#4F46E5';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      withCloseButton={false}
      padding={0}
      transitionProps={{ transition: 'fade', duration: 150 }}
      styles={{
        content: {
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#F1F5F9',
        },
        body: {
          flex: 1,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* 1. TOP FULL-SCREEN APPLICATION BAR */}
      <Box
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 28px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          {/* Left: Back Button, Divider, Logo, Invoice Title & Status */}
          <Group gap="sm" align="center">
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconArrowLeft size={18} />}
              onClick={onClose}
              style={{ fontWeight: 600, color: '#334155' }}
            >
              Back
            </Button>

            <Box style={{ width: 1, height: 26, background: '#CBD5E1', margin: '0 4px' }} />

            <img
              src="/oneassist-logo.png"
              alt="OneAssist"
              style={{ width: 32, height: 32, objectFit: 'contain' }}
            />

            <Box>
              <Group gap="xs" align="center">
                <Text fw={800} size="md" c="#0F172A" style={{ letterSpacing: '-0.02em' }}>
                  Invoice #{invoice.invoiceNumber}
                </Text>
                <Badge
                  variant="filled"
                  style={{ backgroundColor: statusColor, fontSize: 11, fontWeight: 700 }}
                >
                  {invoice.status}
                </Badge>
              </Group>
              <Text size="11px" c="#64748B">
                Billed to <b>{invoice.companyName || invoice.contactName || 'Client'}</b> • {invoice.invoiceDate}
              </Text>
            </Box>
          </Group>

          {/* Right: Download PDF, Print, Close Actions */}
          <Group gap="sm" align="center">
            <Button
              variant="light"
              color="indigo"
              size="sm"
              leftSection={<IconDownload size={16} />}
              loading={downloading}
              onClick={handleDownloadPDF}
              style={{ fontWeight: 600, borderRadius: 8 }}
            >
              Download PDF
            </Button>

            <Button
              variant="filled"
              color="blue"
              size="sm"
              leftSection={<IconPrinter size={16} />}
              onClick={handlePrint}
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                fontWeight: 600,
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              }}
            >
              Print Tax Invoice
            </Button>

            <Tooltip label="Close (Esc)">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                radius="md"
                onClick={onClose}
              >
                <IconX size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Box>

      {/* 2. MAIN DOCUMENT SCREEN CANVAS */}
      <Box
        style={{
          flex: 1,
          background: '#F1F5F9',
          padding: '36px 16px 64px',
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <Box style={{ width: '100%', maxWidth: 940, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          <InvoiceDocument innerRef={printRef} invoice={invoice} settings={settings} />
        </Box>
      </Box>
    </Modal>
  );
};
