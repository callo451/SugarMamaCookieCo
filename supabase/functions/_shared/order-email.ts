import { readJson, RequestError } from './request.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4';
import { sendMail } from './zoho-mail.ts';
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
export function orderEmailHandler(kind: 'customer' | 'admin' | 'reminder') {
 return async (req: Request) => {
  const reply = (error: string, status: number) => Response.json({error},{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return reply('Method not allowed',405);
  try {
   const authorization=req.headers.get('authorization') || '';
   const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
   const {data:{user},error:authError}=await client.auth.getUser();
   if(authError||!user)return reply('Sign in required',401);
   const {data:staff,error:roleError}=await client.rpc('is_admin');
   if(roleError||!staff)return reply('Verified staff access required',403);
   const payload=await readJson(req);
   // Accept the old ID location during rollout; ignore all caller-supplied content.
   const id=payload?.order_id ?? (payload.orderData as {order_id?:unknown}|undefined)?.order_id;
   if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))return reply('A valid order ID is required',400);
   const {data:order,error}=await client.from('orders').select('id,display_order_id,customer_name,customer_email,description,quantity,total_amount,status,customer_phone,created_at,special_instructions').eq('id',id).single();
   if(error||!order)return reply('Order unavailable',404);
   const {data:permitted,error:limitError}=await client.rpc('claim_order_email',{order_key:id,email_kind:kind});
   if(limitError)return reply('Email service temporarily unavailable',503);
   if(!permitted)return reply('Please wait before sending another email for this order',429);
   await sendOrderEmail(order,kind,client);
   return Response.json({message:'Email sent successfully'},{headers});
  } catch (error) { if(error instanceof RequestError)return reply(error.message,error.status);console.error('order_email_failed');return reply('Email could not be sent. Please try again later.',502); }
 };
}
export async function sendOrderEmail(order: {id:string;display_order_id:string;customer_name:string;customer_email:string;description:string;quantity:number;total_amount:number;status:string;customer_phone?:string;created_at?:string;special_instructions?:string},kind:'customer'|'admin'|'reminder',client?:SupabaseClient) {
 const title=kind==='customer'?'Your quote / order':kind==='reminder'?'Order reminder':'New quote request';
 const ref=order.display_order_id || order.id.slice(0,8);
 const total=new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(order.total_amount);
 let html = `<div style="background:#faf7f1;color:#293d32;padding:32px;font-family:Arial,sans-serif;max-width:600px"><h1 style="font-family:Georgia,serif;font-weight:normal;color:#36513c">Sugar Mama</h1><p style="letter-spacing:3px;font-size:11px">COOKIE CO.</p><h2>${escapeHtml(title)} ${escapeHtml(ref)}</h2><p>Hello ${escapeHtml(order.customer_name)},</p><p>${escapeHtml(order.description)}</p><p>Quantity: ${escapeHtml(order.quantity)} · Total: ${escapeHtml(total)}</p><p>Status: ${escapeHtml(order.status)}</p><p>Thank you for choosing Sugar Mama Cookie Co.</p></div>`;
 if(client && (kind==='reminder' || (kind==='customer' && order.status==='confirmed'))) {
  const {data,error}=await client.from('email_templates').select('html_content').eq('name',kind==='reminder'?'admin_order_reminder':'order_confirmation').maybeSingle();
  if(error)throw Error('Template unavailable');
  if(data?.html_content) {
   const values:Record<string,string>={customer_name:escapeHtml(order.customer_name),customer_email:escapeHtml(order.customer_email),customer_phone:escapeHtml(order.customer_phone),ORDER_NUMBER:escapeHtml(ref),order_id:escapeHtml(ref),order_date:escapeHtml(order.created_at?new Date(order.created_at).toLocaleDateString('en-AU'):''),order_total:escapeHtml(total),order_notes:escapeHtml(order.special_instructions),order_items_table:`<p>${escapeHtml(order.description)} · ${escapeHtml(order.quantity)} cookies · ${escapeHtml(total)}</p>`};
   html=data.html_content.replace(/{{([a-zA-Z_]+)}}/g,(_match:string,key:string)=>values[key]??'');
  }
 }
 await sendMail({to:kind==='customer'?order.customer_email:'hello@sugarmamacookieco.com.au',subject:`${title} ${ref} · Sugar Mama Cookie Co.`,html});
}
