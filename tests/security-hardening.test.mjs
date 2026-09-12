import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
const db=new PGlite();
const alice='00000000-0000-0000-0000-000000000001',bob='00000000-0000-0000-0000-000000000002',staff='00000000-0000-0000-0000-000000000003',unverified='00000000-0000-0000-0000-000000000004';
const order='00000000-0000-0000-0000-000000000011',other='00000000-0000-0000-0000-000000000012';
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function public.is_admin() returns boolean language sql stable as $$select auth.uid()='${staff}'::uuid$$;
 grant usage on schema auth,private,storage to authenticated,anon,service_role;
 create type order_status as enum('pending','confirmed','in_progress','completed','cancelled');
 create table orders(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),customer_name text,customer_email text,customer_phone text,quantity int,description text,category text,shape text,special_fonts text,special_instructions text,collection_date date,total_amount numeric,status order_status);
 create table order_items(id uuid primary key,order_id uuid references orders(id));create table pricing_settings(id int,base_price numeric,discount_12 numeric,discount_24 numeric,discount_50 numeric); insert into pricing_settings values(1,4.5,0.1,0.2,0.3);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table orders enable row level security;alter table order_items enable row level security;alter table pricing_settings enable row level security;alter table storage.objects enable row level security;
 grant select,insert,update,delete on orders,order_items,pricing_settings,storage.objects to authenticated;grant insert on orders to anon;
 create policy team on orders for all to authenticated using(is_admin()) with check(is_admin());
 insert into auth.users(id,email,email_confirmed_at) values('${alice}','alice@example.test',now()),('${bob}','bob@example.test',now()),('${staff}','faith@example.test',now()),('${unverified}','alice@example.test',null);
 insert into orders(id,customer_email,status,quantity,total_amount) values('${order}','Alice@example.test','pending',24,96),('${other}','bob@example.test','confirmed',12,48);
`);
await db.exec(await readFile(new URL('../supabase/migrations/20260912055640_customer_portal.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20260912083257_quote_inspiration_photos.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20260912085404_automatic_quote_pricing.sql',import.meta.url),'utf8'));
async function as(id,sql,role='authenticated'){await db.exec(`set role ${role};select set_config('request.jwt.claim.sub','${id}',false);select set_config('request.jwt.claim.role','${role}',false);`);try{return (await db.query(sql)).rows;}finally{await db.exec('reset role');}}

await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.jwt.claim.aal',true),'role',current_setting('request.jwt.claim.role',true))$$;
create table portal_members(user_id uuid primary key,role text,active boolean);alter table portal_members enable row level security;grant select on portal_members to authenticated;
insert into portal_members values('${staff}','owner',true);
create function private.portal_role() returns text language sql stable security definer set search_path='' as $$select role from public.portal_members where user_id=auth.uid() and active$$;
create policy "Members read their access; owner reads team" on portal_members for select to authenticated using(user_id=auth.uid());
alter table orders add column display_order_id text;
`);
await db.exec(await readFile(new URL('../supabase/migrations/20260912122135_security_hardening.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20260912122428_private_email_quota.sql',import.meta.url),'utf8'));
test('rollout guard protects legacy direct inserts and prevents timestamp quota evasion',async()=>{
 const id=crypto.randomUUID();
 await as('',`insert into orders(id,customer_name,customer_email,description,quantity,status,created_at) values('${id}','Guest','compat@example.test','Birthday cookies',12,'pending','2000-01-01')`,'anon');
 const row=(await db.query(`select created_at from orders where id='${id}'`)).rows[0];assert.ok(new Date(row.created_at).getTime()>Date.now()-60000);
 await assert.rejects(as('',"insert into orders(customer_name,customer_email,description,quantity,status) values('x','bad','short',12,'pending')",'anon'),/quote details/);
 await db.exec(`delete from orders where id='${id}'`);
 await db.exec(await readFile(new URL('../supabase/migrations/20260912122430_activate_staff_mfa.sql',import.meta.url),'utf8'));
});
const guest=(overrides={})=>({request_id:crypto.randomUUID(),inspiration_upload_token:crypto.randomUUID(),name:'Guest customer',email:'guest@example.test',quantity:12,description:'Floral birthday cookies',...overrides});
const submit=p=>as('',`select request_guest_quote('${JSON.stringify(p)}'::jsonb) as id`,'anon');
test('guest RPC fixes ownership/status/pricing and queues two emails once',async()=>{
 const p=guest({status:'completed',total_amount:.01,customer_user_id:bob});const id=(await submit(p))[0].id;
 assert.equal((await submit(p))[0].id,id);
 const row=(await db.query(`select * from orders where id='${id}'`)).rows[0];
 assert.equal(row.customer_user_id,null);assert.equal(row.status,'pending');assert.equal(Number(row.total_amount),48.6);
 assert.equal((await db.query(`select * from private.order_email_jobs where order_id='${id}'`)).rows.length,2);
 await assert.rejects(submit({...p,inspiration_upload_token:crypto.randomUUID()}),/duplicate key/);
});
test('guest writes and privileged jobs cannot bypass API access',async()=>{
 await assert.rejects(as('',"insert into orders(quantity,status) values(1,'pending')",'anon'),/permission denied/);
 await assert.rejects(as(alice,'select * from claim_order_emails()'),/permission denied/);
 await assert.rejects(as('',"select claim_contact_email('x')",'anon'),/permission denied/);
});
test('guest validation rejects missing fields, oversized data and invalid quantity',async()=>{
 for(const p of [guest({name:''}),guest({description:'short'}),guest({quantity:0}),guest({email:'bad'}),guest({description:'x'.repeat(4001)}),guest({request_id:null}),guest({inspiration_upload_token:null})]) await assert.rejects(submit(p));
});
test('guest email limit rejects fourth submission',async()=>{
 await submit(guest({email:'limited@example.test'}));await submit(guest({email:'limited@example.test'}));await submit(guest({email:'limited@example.test'}));
 await assert.rejects(submit(guest({email:'limited@example.test'})),/limit reached/);
});
test('MFA is enforced in database, while own membership supports enrollment',async()=>{
 await db.exec("select set_config('request.jwt.claim.aal','aal1',false)");
 assert.equal((await as(staff,'select is_admin() as allowed'))[0].allowed,false);
 assert.equal((await as(staff,'select * from portal_members')).length,1);
 assert.equal((await as(staff,'select * from orders')).length,0);
 await assert.rejects(as(staff,`select claim_order_email('${order}','customer')`),/Verified staff/);
 await db.exec("select set_config('request.jwt.claim.aal','aal2',false)");
 assert.equal((await as(staff,'select is_admin() as allowed'))[0].allowed,true);
 assert.ok((await as(staff,'select * from orders')).length>0);
 assert.equal((await as(alice,'select is_admin() as allowed'))[0].allowed,false);
 assert.equal((await as(staff,`select claim_order_email('${order}','customer') as ok`))[0].ok,true);
 assert.equal((await as(staff,`select claim_order_email('${order}','customer') as ok`))[0].ok,false);
});
test('contact quotas persist and service-only queue leases prevent duplicate concurrent claims',async()=>{
 const call=()=>as('',"select claim_contact_email('contact@example.test') as ok",'service_role');
 assert.equal((await call())[0].ok,true);assert.equal((await call())[0].ok,true);assert.equal((await call())[0].ok,true);assert.equal((await call())[0].ok,false);
 const jobs=await as('','select * from claim_order_emails()','service_role');assert.ok(jobs.length>0);
 assert.equal((await as('','select * from claim_order_emails()','service_role')).length,0);
 const job=jobs[0];await as('',`select finish_order_email('${job.order_data.id}','${job.kind}',true)`,'service_role');
 assert.ok((await db.query(`select finished_at from private.order_email_jobs where order_id='${job.order_data.id}' and kind='${job.kind}'`)).rows[0].finished_at);
});
test.after(()=>db.close());
