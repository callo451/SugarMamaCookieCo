export interface QuoteFormData {
  quantity: number;
  description: string;
  category: string;
  shape: string;
  specialFonts: string;
  specialInstructions: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  collectionDate: string;
}
export function validQuoteStep(form: QuoteFormData, step: number, today: string): boolean {
  switch (step) {
    case 0: return true;
    case 1: return Number.isInteger(form.quantity) && form.quantity >= 1 && form.quantity <= 10000 && form.description.trim().length >= 10 && form.description.length <= 4000;
    case 2: return (!form.collectionDate || form.collectionDate >= today) && form.specialFonts.length <= 1000 && form.specialInstructions.length <= 4000;
    case 3: return form.customerName.trim().length >= 2 && form.customerName.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim()) && form.customerEmail.length <= 254 && form.customerPhone.length <= 40;
    default: return false;
  }
}
export function customerQuoteRequest(form: QuoteFormData, requestId: string) {
  return { request_id: requestId, name: form.customerName.trim(), phone: form.customerPhone, quantity: form.quantity, description: form.description, category: form.category, shape: form.shape, special_fonts: form.specialFonts, special_instructions: form.specialInstructions, collection_date: form.collectionDate };
}
