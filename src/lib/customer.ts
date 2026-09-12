import { supabase } from './supabase';
export type CustomerOrder = {
 id:string; display_order_id?:string; created_at:string; updated_at:string; status:'pending'|'confirmed'|'in_progress'|'completed'|'cancelled';
 customer_name:string; customer_email:string; customer_phone?:string; collection_date?:string|null; quantity:number; total_amount:number; quote_priced:boolean;
 description:string; category:string; shape:string; special_fonts:string; special_instructions:string;
};
export const customerOrderFields='id,display_order_id,created_at,updated_at,status,customer_name,customer_email,customer_phone,collection_date,quantity,total_amount,quote_priced,description,category,shape,special_fonts,special_instructions';
export const customerDate=(value?:string|null)=>value ? new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric',timeZone:'Australia/Melbourne'}).format(new Date(value.length===10?`${value}T12:00:00+10:00`:value)):'To be arranged';
export const errorMessage=(error:unknown)=>error && typeof error==='object' && 'message' in error ? String(error.message):'Could not connect. Please try again.';
export type InvoiceDocument={id:string;order_id:string;title:string;storage_path:string;created_at:string};
export async function openInvoice(doc:InvoiceDocument) {
 const {data,error}=await supabase.storage.from('customer-invoices').download(doc.storage_path);
 if(error)throw error;
 const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=`${doc.title.replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
