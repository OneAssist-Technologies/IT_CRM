import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Convert Number to Indian Rupees Words
export function numberToWordsINR(num: number): string {
  if (!num || num <= 0) return 'ZERO RUPEES ONLY';

  const singleDigits = [
    '',
    'ONE',
    'TWO',
    'THREE',
    'FOUR',
    'FIVE',
    'SIX',
    'SEVEN',
    'EIGHT',
    'NINE',
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
    if (n < 20) return singleDigits[n];
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

  if (crore > 0) words += `${convertTwoDigits(crore)} CRORE `;
  if (lakh > 0) words += `${convertTwoDigits(lakh)} LAKH `;
  if (thousand > 0) words += `${convertTwoDigits(thousand)} THOUSAND `;
  if (hundredAndBelow > 0) words += `${convertThreeDigits(hundredAndBelow)} `;

  words = words.trim() + ' RUPEES';
  if (paise > 0) {
    words += ` AND ${convertTwoDigits(paise)} PAISE`;
  }
  return `${words} ONLY`.toUpperCase();
}

/**
 * Direct PDF file download using html2canvas & jsPDF.
 * Renders at 2x resolution for crisp text, computes multi-page slicing,
 * and saves directly to the user's Downloads folder.
 */
export async function downloadInvoicePDF(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // Ensure all images and fonts are loaded inside element
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  if (document.fonts) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 2, // 2x for sharp printing & crisp typography
    useCORS: true,
    logging: false,
    backgroundColor: '#FFFFFF',
    scrollX: 0,
    scrollY: 0,
    windowWidth: 1024,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 210; // A4 width mm
  const pdfPageHeight = 297; // A4 height mm
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  // If content height is close to a single A4 page (up to ~15% extra), scale to fit on 1 page cleanly
  if (imgHeight > pdfPageHeight && imgHeight <= pdfPageHeight * 1.15) {
    const scaleRatio = pdfPageHeight / imgHeight;
    const fittedWidth = pdfWidth * scaleRatio;
    const fittedHeight = pdfPageHeight;
    const marginX = (pdfWidth - fittedWidth) / 2;
    pdf.addImage(imgData, 'PNG', marginX, 0, fittedWidth, fittedHeight, undefined, 'FAST');
  } else if (imgHeight <= pdfPageHeight) {
    // Fits naturally on 1 page
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
  } else {
    // Multi-page handling with exact page height offsets
    let heightLeft = imgHeight;
    let pageIndex = 0;

    // Page 1
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfPageHeight;

    while (heightLeft > 5) {
      pageIndex++;
      pdf.addPage();
      const pos = -(pageIndex * pdfPageHeight);
      pdf.addImage(imgData, 'PNG', 0, pos, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfPageHeight;
    }
  }

  const cleanName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(cleanName);
}

/**
 * Isolated iframe-based printing.
 * Eliminates Mantine Modal overflow/clipping bugs so that the entire invoice prints without truncation.
 */
export function printInvoiceElement(element: HTMLElement, title: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return;
  }

  // Copy stylesheets & fonts
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((s) => s.outerHTML)
    .join('\n');

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #FFFFFF !important;
            color: #0F172A !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            width: 100%;
          }
          .printable-invoice {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        </style>
      </head>
      <body>
        <div class="printable-invoice">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for images in iframe to load
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 600);
}
