import { supabase } from './supabase';
import type { PdfInspirationPhoto } from '../utils/generateOrderPdf';

/** Use the viewer's session and existing private-photo permissions. */
export async function loadPdfInspirationPhotos(orderId: string): Promise<PdfInspirationPhoto[]> {
  try {
    const { data: order, error } = await supabase.from('orders')
      .select('inspiration_upload_token').eq('id', orderId).single();
    if (error) throw error;
    const folder = `${orderId}/${order.inspiration_upload_token}`;
    const bucket = supabase.storage.from('quote-inspiration');
    const { data: files, error: listError } = await bucket.list(folder);
    if (listError) throw listError;
    const photos: PdfInspirationPhoto[] = [];
    for (const file of (files || []).filter(file => /^[123]\.jpg$/.test(file.name)).sort((a, b) => a.name.localeCompare(b.name))) {
      const { data, error: downloadError } = await bucket.download(`${folder}/${file.name}`);
      if (downloadError) throw downloadError;
      photos.push({ data: new Uint8Array(await data.arrayBuffer()), name: `Inspiration photo ${file.name[0]}` });
    }
    return photos;
  } catch {
    throw new Error('The inspiration photos could not be loaded. Please retry the PDF export.');
  }
}
