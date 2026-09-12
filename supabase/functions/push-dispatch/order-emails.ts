import { sendOrderEmail } from '../_shared/order-email.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4';
export async function dispatchOrderEmails(admin: SupabaseClient) {
 const {data:jobs,error}=await admin.rpc('claim_order_emails');
 if(error)return {processed:0,failed:1};
 let failed=0;
 for(const job of jobs || []) {
  let succeeded=false;
  try { await sendOrderEmail(job.order_data,job.kind,admin);succeeded=true; } catch { console.error('queued_order_email_failed',{orderId:job.order_data.id,kind:job.kind}); }
  const {error:finishError}=await admin.rpc('finish_order_email',{order_key:job.order_data.id,email_kind:job.kind,succeeded});
  if(!succeeded||finishError)failed++;
 }
 return {processed:jobs?.length||0,failed};
}
