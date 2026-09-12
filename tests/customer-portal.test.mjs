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
async function as(id,sql,role='authenticated'){await db.exec(`set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);try{return (await db.query(sql)).rows;}finally{await db.exec('reset role');}}
test('unverified accounts cannot claim orders',async()=>{await assert.rejects(as(unverified,'select claim_customer_orders()'),/verify your email/);});
test('verified email claims only matching unowned orders; customers isolated',async()=>{assert.equal((await as(alice,'select claim_customer_orders()')).length,1);await as(bob,'select claim_customer_orders()');assert.deepEqual((await as(alice,'select id from orders')).map(r=>r.id),[order]);assert.deepEqual((await as(bob,'select id from orders')).map(r=>r.id),[other]);assert.equal((await as(alice,`update orders set total_amount=1 where id='${order}' returning id`)).length,0);await assert.rejects(as(alice,`insert into orders(status) values('confirmed')`),/row-level security/);});
test('guest cannot assign an order to someone else',async()=>{await assert.rejects(as('',`insert into orders(status,customer_user_id,quantity) values('pending','${alice}',12)`,'anon'),/row-level security/);});
test('quote requests set ownership and ignore client prices and statuses; retry is idempotent',async()=>{const payload=JSON.stringify({request_id:'00000000-0000-0000-0000-000000000099',inspiration_upload_token:'00000000-0000-0000-0000-000000000088',name:'Alice',quantity:24,description:'Floral birthday cookies',total_amount:1,status:'confirmed',customer_user_id:bob});const sql=`select request_customer_quote('${payload}'::jsonb) as id`;const id=(await as(alice,sql))[0].id;assert.equal((await as(alice,sql))[0].id,id);const row=(await as(alice,`select * from orders where id='${id}'`))[0];assert.equal(row.customer_user_id,alice);assert.equal(row.status,'pending');assert.equal(Number(row.total_amount),86.4);assert.equal(row.quote_priced,true);assert.equal(row.inspiration_upload_token,'00000000-0000-0000-0000-000000000088');await assert.rejects(as(unverified,sql),/verify/);assert.equal((await as(bob,`select * from orders where id='${id}'`)).length,0);});
test('messages cannot cross orders or impersonate bakery, sender and timestamp stamped',async()=>{await as(alice,`insert into order_messages(order_id,sender_id,from_bakery,body,created_at) values('${order}','${staff}',true,'Hello','2000-01-01')`);const row=(await as(alice,'select * from order_messages'))[0];assert.equal(row.sender_id,alice);assert.equal(row.from_bakery,false);await assert.rejects(as(bob,`insert into order_messages(order_id,body) values('${order}','Intruder')`),/unavailable/);assert.equal((await as(bob,'select * from order_messages')).length,0);await as(staff,`insert into order_messages(order_id,body) values('${order}','Hello from bakery')`);assert.equal((await as(alice,'select * from order_messages where from_bakery')).length,1);});
test('invoices and storage objects are private to linked customer and staff',async()=>{const path=order+'/invoice.pdf';await as(staff,`insert into storage.objects(bucket_id,name) values('customer-invoices','${path}')`);await as(staff,`insert into order_documents(order_id,title,storage_path) values('${order}','INV-001','${path}')`);assert.equal((await as(alice,'select * from order_documents')).length,1);assert.equal((await as(bob,'select * from order_documents')).length,0);assert.equal((await as(alice,'select * from storage.objects')).length,1);assert.equal((await as(bob,'select * from storage.objects')).length,0);await assert.rejects(as(alice,`insert into order_documents(order_id,title,storage_path) values('${order}','Fake','${order}/fake.pdf')`),/row-level security/);await assert.rejects(as(alice,`insert into storage.objects(bucket_id,name) values('customer-invoices','${order}/fake.pdf')`),/row-level security/);});
test('claimed ownership does not follow email edits or user metadata',async()=>{await db.exec(`update auth.users set email='alice@example.test',raw_user_meta_data='{"is_admin":true}' where id='${bob}';`);await as(bob,'select claim_customer_orders()');assert.equal((await as(bob,`select * from orders where id='${order}'`)).length,0);assert.equal((await as(bob,'select is_admin() as allowed'))[0].allowed,false);});
test.after(()=>db.close());

test('guest quotes use published server pricing at each quantity tier', async()=>{
 for(const [qty,total] of [[6,27],[12,48.6],[24,86.4],[50,157.5]]) {
  const id=crypto.randomUUID();
  await as('',`insert into orders(id,quantity,status,total_amount) values('${id}',${qty},'pending',0.01)`, 'anon');
  const row=(await as(staff,`select total_amount,quote_priced from orders where id='${id}'`))[0];
  assert.equal(Number(row.total_amount),total);assert.equal(row.quote_priced,true);
 }
});
