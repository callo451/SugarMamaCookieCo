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
  collection_date?: string | null;
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

// Shared with the public site's green, paper and ink palette.
const GREEN = '#36513c';
const PAPER = '#faf7f1';
const INK = '#293d32';
const MUTED = '#626658';
const money = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
const clean = (value: string) => value.replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
const date = (value: string) => {
  if (!value || Number.isNaN(Date.parse(value))) return 'Not specified';
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Melbourne' }).format(new Date(value.length === 10 ? value + 'T12:00:00+10:00' : value));
};
const statuses: Record<string, string> = {pending:'Awaiting confirmation',confirmed:'Confirmed',in_progress:'In the making',completed:'Completed',cancelled:'Cancelled'};

export interface PdfInspirationPhoto { data: Uint8Array; name: string; }

/** Build separately from download so pagination can be checked with sample data. */
export function buildOrderPdf(order: OrderForPdf, items: OrderItemForPdf[] = [], photos: PdfInspirationPhoto[] = []): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const quote = order.status === 'pending';
  const kind = quote ? 'Quote' : 'Order';
  const reference = order.display_order_id || order.id.slice(0,8);
  doc.setProperties({ title: `${kind} ${reference} - Sugar Mama Cookie Co.`, author: 'Sugar Mama Cookie Co.' });
  let y = 0;
  function header(first: boolean) {
    doc.setFillColor(PAPER); doc.rect(0,0,210,first ? 48 : 27,'F');
    doc.setFillColor(GREEN); doc.rect(0,0,210,3,'F');
    doc.setTextColor(GREEN); doc.setFont('times','normal'); doc.setFontSize(first ? 29 : 19);
    doc.text('Sugar Mama',20,first ? 22 : 16);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setCharSpace(2);
    doc.text('COOKIE CO.',21,first ? 29 : 22);doc.setCharSpace(0);
    doc.setFontSize(9);doc.setTextColor(MUTED);
    doc.text(first ? 'Custom cookies - Albury-Wodonga' : `${kind} ${reference} - continued`,190,16,{align:'right'});
    if(first){doc.text('hello@sugarmamacookieco.com.au',190,24,{align:'right'});doc.text('sugarmamacookieco.com.au',190,31,{align:'right'});}
    y=first ? 60 : 38;
  }
  function room(height: number) { if(y+height>264){doc.addPage();header(false);} }
  function text(value: string, size=10, colour=INK, bold=false, x=20) {
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(colour);doc.text(clean(value),x,y);
  }
  function paragraph(value: string, width=170) {
    doc.setFont('helvetica','normal');doc.setFontSize(10);
    const lines: string[]=doc.splitTextToSize(clean(value),width);
    for(const line of lines){room(6);text(line);y+=5;}
    y+=3;
  }
  function section(label: string) {
    room(22);y+=4;doc.setDrawColor('#cfd2c3');doc.line(20,y,190,y);y+=9;
    text(label.toUpperCase(),9,GREEN,true);y+=8;
  }
  function field(label: string,value?: string) {
    if(!value?.trim())return;
    room(17);text(label,8,MUTED,true);y+=5;paragraph(value);
  }
  header(true);
  doc.setFont('times','normal');doc.setFontSize(26);doc.setTextColor(INK);doc.text(`${kind} ${reference}`,20,y);y+=10;
  text(statuses[order.status] || order.status,10,GREEN,true);y+=8;
  text(`Created ${date(order.created_at)}  |  Updated ${date(order.updated_at)}`,9,MUTED);y+=8;
  section('Prepared for');
  field('Customer',order.customer_name);
  field('Email / phone',[order.customer_email,order.customer_phone].filter(Boolean).join('  |  '));
  section('Your cookies');
  paragraph(`${order.quantity} cookies${order.category ? '  |  '+order.category.replace(/-/g,' ') : ''}${order.shape ? '  |  '+order.shape : ''}`);
  field('Collection date',order.collection_date ? date(order.collection_date) : 'To be arranged');
  field('Design',order.description);
  field('Text & fonts',order.special_fonts);
  field('Special instructions',order.special_instructions);
  if(items.length){
    section('Item details');
    for(const item of items){
      room(20);paragraph(item.description || 'Custom cookies');
      room(7);text(`${item.quantity} x ${money(item.unit_price)} each`,9,MUTED);text(money(item.quantity*item.unit_price),10,INK,true,155);y+=10;
    }
  }
  room(41);y+=4;doc.setFillColor(GREEN);doc.rect(20,y,170,19,'F');
  y+=12;text(quote?'QUOTE TOTAL (AUD)':'ORDER TOTAL (AUD)',10,'#ffffff',true,26);
  doc.setFontSize(18);doc.text(money(order.total_amount),184,y,{align:'right'});y+=16;
  paragraph(quote ? 'This quote is subject to confirmation of design, availability and final price. Your booking is confirmed separately.' : order.status === 'cancelled' ? 'This order is cancelled. Contact us if you have any questions.' : 'Thank you for choosing Sugar Mama. Contact us to confirm collection or delivery arrangements.');
  for (const [index, photo] of photos.entries()) {
    doc.addPage(); header(false);
    doc.setFont('times', 'normal'); doc.setFontSize(26); doc.setTextColor(INK);
    doc.text('Design inspiration', 20, y); y += 10;
    paragraph('Customer-supplied reference. Faith will confirm the final cookie design.');
    text(`${photo.name}  |  ${index + 1} of ${photos.length}`, 9, MUTED);
    y += 8;
    const boxHeight = 252 - y;
    const props = doc.getImageProperties(photo.data);
    const scale = Math.min(166 / props.width, (boxHeight - 4) / props.height);
    const width = props.width * scale, height = props.height * scale;
    doc.setFillColor(PAPER); doc.rect(20, y, 170, boxHeight, 'F');
    doc.addImage(photo.data, 'JPEG', 20 + (170 - width) / 2, y + (boxHeight - height) / 2, width, height);
  }
  const pages=doc.getNumberOfPages();
  for(let page=1;page<=pages;page++){
    doc.setPage(page);doc.setDrawColor('#cfd2c3');doc.line(20,276,190,276);
    doc.setFont('times','italic');doc.setFontSize(11);doc.setTextColor(GREEN);doc.text('Baked local. Made personal.',20,283);
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(MUTED);doc.text(`${kind} ${reference}  |  ${page} / ${pages}`,190,283,{align:'right'});
  }
  return doc;
}
export async function generateOrderPdf(order: OrderForPdf, items: OrderItemForPdf[] = []): Promise<void> {
 const { loadPdfInspirationPhotos } = await import('../lib/pdfInspirationPhotos');
 const photos = await loadPdfInspirationPhotos(order.id);
 const reference=(order.display_order_id || order.id.slice(0,8)).replace(/[^a-zA-Z0-9_-]/g,'_');
 const name=order.customer_name.replace(/[^a-zA-Z0-9_-]/g,'_');
 buildOrderPdf(order,items,photos).save(`${order.status === 'pending' ? 'Quote' : 'Order'}-${reference}-${name}.pdf`);
}
