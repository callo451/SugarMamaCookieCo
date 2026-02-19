import jsPDF from 'jspdf';

interface OrderForPdf {
  id: string;
  display_order_id?: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  quantity: number;
  description: string;
  category: string;
  shape: string;
  special_fonts: string;
  special_instructions: string;
  total_amount: number;
}

interface OrderItemForPdf {
  id: string;
  order_id: string;
  quantity: number;
  unit_price: number;
  description: string;
}

// Sage/green accent color
const SAGE = { r: 120, g: 145, b: 138 }; // #78918a
const SAGE_LIGHT = { r: 232, g: 240, b: 237 }; // light sage for backgrounds
const DARK = { r: 31, g: 41, b: 55 }; // dark gray for body text
const MEDIUM = { r: 107, g: 114, b: 128 }; // medium gray for secondary text

const PAGE_WIDTH = 210; // A4 width in mm
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const dateFormat = new Intl.DateTimeFormat('en-AU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const currencyFormat = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
}

function capitalize(str: string): string {
  if (!str) return '—';
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Draw a horizontal divider line across the content area.
 */
function drawDivider(doc: jsPDF, y: number): number {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  return y + 4;
}

/**
 * Draw a section header with a sage-colored left accent bar.
 */
function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  // Accent bar
  doc.setFillColor(SAGE.r, SAGE.g, SAGE.b);
  doc.rect(MARGIN_LEFT, y, 3, 7, 'F');

  // Title text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  doc.text(title, MARGIN_LEFT + 7, y + 5.5);

  return y + 14;
}

/**
 * Draw a key-value pair. Returns the new Y position.
 */
function drawField(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  options?: { maxWidth?: number },
): number {
  const maxWidth = options?.maxWidth || CONTENT_WIDTH - 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(MEDIUM.r, MEDIUM.g, MEDIUM.b);
  doc.text(label, MARGIN_LEFT + 5, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(DARK.r, DARK.g, DARK.b);

  const lines = doc.splitTextToSize(value || '—', maxWidth);
  doc.text(lines, MARGIN_LEFT + 5, y + 5);

  return y + 5 + lines.length * 4.5 + 3;
}

/**
 * Draw two fields side by side. Returns the new Y position.
 */
function drawFieldPair(
  doc: jsPDF,
  label1: string,
  value1: string,
  label2: string,
  value2: string,
  y: number,
): number {
  const halfWidth = CONTENT_WIDTH / 2 - 10;

  // Left field
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(MEDIUM.r, MEDIUM.g, MEDIUM.b);
  doc.text(label1, MARGIN_LEFT + 5, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  const lines1 = doc.splitTextToSize(value1 || '—', halfWidth);
  doc.text(lines1, MARGIN_LEFT + 5, y + 5);

  // Right field
  const rightX = MARGIN_LEFT + CONTENT_WIDTH / 2 + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(MEDIUM.r, MEDIUM.g, MEDIUM.b);
  doc.text(label2, rightX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  const lines2 = doc.splitTextToSize(value2 || '—', halfWidth);
  doc.text(lines2, rightX, y + 5);

  const maxLines = Math.max(lines1.length, lines2.length);
  return y + 5 + maxLines * 4.5 + 3;
}

/**
 * Draw three fields in a row. Returns the new Y position.
 */
function drawFieldTriple(
  doc: jsPDF,
  fields: Array<{ label: string; value: string }>,
  y: number,
): number {
  const colWidth = CONTENT_WIDTH / 3 - 8;
  let maxLines = 1;

  fields.forEach((field, index) => {
    const x = MARGIN_LEFT + 5 + index * (CONTENT_WIDTH / 3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(MEDIUM.r, MEDIUM.g, MEDIUM.b);
    doc.text(field.label, x, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    const lines = doc.splitTextToSize(field.value || '—', colWidth);
    doc.text(lines, x, y + 5);
    maxLines = Math.max(maxLines, lines.length);
  });

  return y + 5 + maxLines * 4.5 + 3;
}

export function generateOrderPdf(order: OrderForPdf, items: OrderItemForPdf[] = []): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y = 15;

  // =====================================================
  // HEADER - Business branding with sage background bar
  // =====================================================
  doc.setFillColor(SAGE.r, SAGE.g, SAGE.b);
  doc.rect(0, 0, PAGE_WIDTH, 42, 'F');

  // Business name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Sugar Mama Cookie Co', MARGIN_LEFT, y + 7);

  // Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(232, 240, 237);
  doc.text('Custom Decorated Cookies for Every Occasion', MARGIN_LEFT, y + 15);

  // Contact info on the right
  doc.setFontSize(9);
  doc.setTextColor(232, 240, 237);
  doc.text('hello@sugarmamacookieco.com.au', PAGE_WIDTH - MARGIN_RIGHT, y + 7, {
    align: 'right',
  });
  doc.text('www.sugarmamacookieco.com.au', PAGE_WIDTH - MARGIN_RIGHT, y + 13, {
    align: 'right',
  });

  y = 50;

  // =====================================================
  // ORDER INFO BAR
  // =====================================================
  // Light sage background bar for order info
  doc.setFillColor(SAGE_LIGHT.r, SAGE_LIGHT.g, SAGE_LIGHT.b);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 22, 2, 2, 'F');

  const orderId = order.display_order_id || order.id.slice(0, 8);

  // Order number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(SAGE.r, SAGE.g, SAGE.b);
  doc.text(`Order #${orderId}`, MARGIN_LEFT + 6, y + 9);

  // Status badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(DARK.r, DARK.g, DARK.b);
  const statusText = formatStatus(order.status);
  doc.text(`Status: ${statusText}`, MARGIN_LEFT + 6, y + 17);

  // Order date on the right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MEDIUM.r, MEDIUM.g, MEDIUM.b);
  doc.text(
    `Order Date: ${dateFormat.format(new Date(order.created_at))}`,
    PAGE_WIDTH - MARGIN_RIGHT - 6,
    y + 9,
    { align: 'right' },
  );
  doc.text(
    `Last Updated: ${dateFormat.format(new Date(order.updated_at))}`,
    PAGE_WIDTH - MARGIN_RIGHT - 6,
    y + 17,
    { align: 'right' },
  );

  y = 80;

  // =====================================================
  // CUSTOMER INFORMATION
  // =====================================================
  y = drawSectionHeader(doc, 'Customer Information', y);
  y = drawFieldTriple(doc, [
    { label: 'Name', value: order.customer_name },
    { label: 'Email', value: order.customer_email },
    { label: 'Phone', value: order.customer_phone || '—' },
  ], y);

  y = drawDivider(doc, y + 2);
  y += 2;

  // =====================================================
  // COOKIE DETAILS
  // =====================================================
  y = drawSectionHeader(doc, 'Cookie Details', y);
  y = drawFieldTriple(doc, [
    { label: 'Category', value: capitalize(order.category) },
    { label: 'Shape', value: capitalize(order.shape) },
    { label: 'Quantity', value: order.quantity > 0 ? `${order.quantity} cookies` : '—' },
  ], y);

  if (order.description) {
    y = drawField(doc, 'Description', order.description, y, {
      maxWidth: CONTENT_WIDTH - 10,
    });
  }

  y = drawDivider(doc, y + 2);
  y += 2;

  // =====================================================
  // SPECIAL REQUESTS
  // =====================================================
  const hasSpecialFonts = order.special_fonts && order.special_fonts.trim();
  const hasSpecialInstructions = order.special_instructions && order.special_instructions.trim();

  if (hasSpecialFonts || hasSpecialInstructions) {
    y = drawSectionHeader(doc, 'Special Requests', y);

    if (hasSpecialFonts) {
      y = drawField(doc, 'Text & Fonts', order.special_fonts, y, {
        maxWidth: CONTENT_WIDTH - 10,
      });
    }

    if (hasSpecialInstructions) {
      y = drawField(doc, 'Special Instructions', order.special_instructions, y, {
        maxWidth: CONTENT_WIDTH - 10,
      });
    }

    y = drawDivider(doc, y + 2);
    y += 2;
  }

  // =====================================================
  // ORDER ITEMS (if any)
  // =====================================================
  if (items.length > 0) {
    y = drawSectionHeader(doc, 'Order Items', y);

    // Table header
    doc.setFillColor(SAGE_LIGHT.r, SAGE_LIGHT.g, SAGE_LIGHT.b);
    doc.rect(MARGIN_LEFT + 2, y - 1, CONTENT_WIDTH - 4, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(SAGE.r, SAGE.g, SAGE.b);
    doc.text('Item', MARGIN_LEFT + 5, y + 4);
    doc.text('Qty', MARGIN_LEFT + 105, y + 4);
    doc.text('Unit Price', MARGIN_LEFT + 125, y + 4);
    doc.text('Total', PAGE_WIDTH - MARGIN_RIGHT - 5, y + 4, { align: 'right' });

    y += 10;

    // Table rows
    items.forEach((item, index) => {
      if (index > 0) {
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.2);
        doc.line(MARGIN_LEFT + 5, y - 2, PAGE_WIDTH - MARGIN_RIGHT - 5, y - 2);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(DARK.r, DARK.g, DARK.b);
      doc.text(item.description || 'Item', MARGIN_LEFT + 5, y + 2);
      doc.text(`${item.quantity}`, MARGIN_LEFT + 105, y + 2);
      doc.text(currencyFormat.format(item.unit_price), MARGIN_LEFT + 125, y + 2);
      doc.setFont('helvetica', 'bold');
      doc.text(
        currencyFormat.format(item.unit_price * item.quantity),
        PAGE_WIDTH - MARGIN_RIGHT - 5,
        y + 2,
        { align: 'right' },
      );

      y += 8;
    });

    y += 2;
    y = drawDivider(doc, y);
    y += 2;
  }

  // =====================================================
  // PRICING SUMMARY
  // =====================================================
  y = drawSectionHeader(doc, 'Pricing Summary', y);

  // Summary box
  doc.setFillColor(SAGE_LIGHT.r, SAGE_LIGHT.g, SAGE_LIGHT.b);
  doc.roundedRect(MARGIN_LEFT + 2, y - 1, CONTENT_WIDTH - 4, order.quantity > 0 ? 28 : 18, 2, 2, 'F');

  // Quantity and unit price row
  if (order.quantity > 0) {
    const unitPrice = order.total_amount / order.quantity;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(MEDIUM.r, MEDIUM.g, MEDIUM.b);
    doc.text('Quantity:', MARGIN_LEFT + 8, y + 6);
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.text(`${order.quantity} cookies`, MARGIN_LEFT + 60, y + 6);

    doc.setTextColor(MEDIUM.r, MEDIUM.g, MEDIUM.b);
    doc.text('Unit Price:', MARGIN_LEFT + 8, y + 13);
    doc.setTextColor(DARK.r, DARK.g, DARK.b);
    doc.text(`${currencyFormat.format(unitPrice)} each`, MARGIN_LEFT + 60, y + 13);

    // Total row
    doc.setDrawColor(SAGE.r, SAGE.g, SAGE.b);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT + 8, y + 17, MARGIN_LEFT + CONTENT_WIDTH - 10, y + 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(SAGE.r, SAGE.g, SAGE.b);
    doc.text('Total:', MARGIN_LEFT + 8, y + 24);
    doc.text(
      currencyFormat.format(order.total_amount),
      PAGE_WIDTH - MARGIN_RIGHT - 8,
      y + 24,
      { align: 'right' },
    );

    y += 34;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(SAGE.r, SAGE.g, SAGE.b);
    doc.text('Total:', MARGIN_LEFT + 8, y + 10);
    doc.text(
      currencyFormat.format(order.total_amount),
      PAGE_WIDTH - MARGIN_RIGHT - 8,
      y + 10,
      { align: 'right' },
    );

    y += 24;
  }

  // =====================================================
  // FOOTER
  // =====================================================
  const footerY = 272;

  // Divider above footer
  doc.setDrawColor(SAGE.r, SAGE.g, SAGE.b);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY);

  // Thank you message
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(SAGE.r, SAGE.g, SAGE.b);
  doc.text('Thank you for your order!', PAGE_WIDTH / 2, footerY + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(MEDIUM.r, MEDIUM.g, MEDIUM.b);
  doc.text(
    'This document was generated by Sugar Mama Cookie Co. For questions, please contact hello@sugarmamacookieco.com.au',
    PAGE_WIDTH / 2,
    footerY + 14,
    { align: 'center' },
  );

  // Generated date (small, bottom-right)
  doc.setFontSize(7);
  doc.text(
    `Generated: ${dateFormat.format(new Date())}`,
    PAGE_WIDTH - MARGIN_RIGHT,
    footerY + 20,
    { align: 'right' },
  );

  // Save
  const fileName = `Order-${orderId}-${order.customer_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
