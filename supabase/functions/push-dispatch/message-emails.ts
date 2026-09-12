import { sendMail } from '../_shared/zoho-mail.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4';
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function dispatchMessageEmails(admin: SupabaseClient) {
 const {data:jobs,error}=await admin.rpc('claim_portal_message_emails');
 if(error)return {processed:0,failed:1};
 let failed=0;
 for(const job of jobs || []) {
  let succeeded=false;
  try {
   // An order may have been deleted after the message was queued.
   if(job.order_id) {
    const origin=new URL(Deno.env.get('PORTAL_APP_URL') || 'https://sugarmamacookieco.com.au');
    if(origin.protocol!=='https:')throw Error('HTTPS portal URL required');
    const url=new URL(`/admin/orders/${encodeURIComponent(job.order_id)}#conversation`,origin.origin).href;
    await sendMail({to:'hello@sugarmamacookieco.com.au',subject:'New customer message · Sugar Mama Cookie Co.',html:`<div style="background:#faf7f1;color:#293d32;padding:32px;font-family:Arial,sans-serif;max-width:600px"><h1 style="font-family:Georgia,serif;font-weight:normal;color:#36513c">Sugar Mama</h1><p style="letter-spacing:3px;font-size:11px">COOKIE CO.</p><h2>New customer message</h2><p>${escape(job.body)}</p><p><a style="display:inline-block;background:#36513c;color:white;padding:14px 20px;text-decoration:none" href="${escape(url)}">Open conversation</a></p><p style="font-size:12px">Reply inside the bakery workspace so the customer can see your response.</p></div>`});
   }
   succeeded=true;
  }catch{ /* Keep message content and provider credentials out of logs. */ }
  const {error:finishError}=await admin.rpc('finish_portal_message_email',{job_id:job.id,succeeded});
  if(!succeeded||finishError)failed++;
 }
 return {processed:jobs?.length || 0,failed};
}
