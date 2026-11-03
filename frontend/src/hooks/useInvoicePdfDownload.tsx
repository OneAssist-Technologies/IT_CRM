import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Invoice, BillingSettings } from '../types/billing';
import { billingService } from '../services/billingService';
import { InvoiceDocument } from '../pages/billing/components/InvoiceDocument';
import { downloadInvoicePDF } from '../utils/invoicePdfGenerator';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

export const useInvoicePdfDownload = () => {
  const [downloadingInvoice, setDownloadingInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [activeSettings, setActiveSettings] = useState<BillingSettings | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    billingService
      .getSettings()
      .then((res) => {
        if (res) {
          setSettings(res);
          setActiveSettings(res);
        }
      })
      .catch(() => {});
  }, []);

  const triggerDownload = useCallback(
    async (invoice: Invoice | null | undefined, customSettings?: BillingSettings | null) => {
      if (!invoice) return;

      try {
        setIsDownloading(true);
        const invNum = invoice.invoiceNumber || 'OA';
        const notificationId = `download-${invNum}-${Date.now()}`;

        notifications.show({
          id: notificationId,
          loading: true,
          title: 'Downloading PDF',
          message: `Preparing invoice #${invNum}...`,
          autoClose: false,
          withCloseButton: false,
        });

        if (customSettings !== undefined) {
          setActiveSettings(customSettings);
        } else if (settings) {
          setActiveSettings(settings);
        }

        // Set invoice to render into offscreen container
        setDownloadingInvoice(invoice);

        // Wait for React to mount the component and load fonts/images
        await new Promise((resolve) => setTimeout(resolve, 250));

        if (downloadRef.current) {
          const filename = `Invoice_${invNum}_OneAssist.pdf`;
          await downloadInvoicePDF(downloadRef.current, filename);

          notifications.update({
            id: notificationId,
            color: 'teal',
            title: 'Invoice Downloaded',
            message: `${filename} downloaded successfully.`,
            icon: <IconCheck size={16} />,
            loading: false,
            autoClose: 3000,
          });
        } else {
          throw new Error('PDF render target not found.');
        }
      } catch (err: any) {
        notifications.show({
          color: 'red',
          title: 'Download Failed',
          message: err.message || 'Could not download invoice. Please try again.',
          icon: <IconX size={16} />,
          autoClose: 4000,
        });
      } finally {
        setDownloadingInvoice(null);
        setIsDownloading(false);
      }
    },
    [settings]
  );

  const HiddenInvoiceDownloadContainer = (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 920,
        zIndex: -9999,
        pointerEvents: 'none',
        opacity: downloadingInvoice ? 0.01 : 0,
        background: '#FFFFFF',
      }}
    >
      {downloadingInvoice && (
        <InvoiceDocument
          innerRef={downloadRef}
          invoice={downloadingInvoice}
          settings={activeSettings || settings}
        />
      )}
    </div>
  );

  return {
    triggerDownload,
    isDownloading,
    HiddenInvoiceDownloadContainer,
  };
};
