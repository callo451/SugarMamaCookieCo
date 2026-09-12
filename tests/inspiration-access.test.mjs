import { PGlite } from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
const db=new PGlite();const order='00000000-0000-0000-0000-000000000001',token='00000000-0000-0000-0000-000000000002',customer='00000000-0000-0000-0000-000000000003',other='00000000-0000-0000-0000-000000000004',owner='00000000-0000-0000-0000-000000000005';
await db.exec(`create role anon;create role authenticated;create schema private;create schema auth;create schema storage;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,private,storage to authenticated,anon;
create function public.is_admin() returns boolean language sql stable as $$select auth.uid()='${owner}'::uuid$$;
create table public.orders(id uuid primary key,created_at timestamptz default now(),customer_user_id uuid);
create function private.customer_owns_order(target uuid) returns boolean language sql stable as $$select exists(select 1 from public.orders where id=target and customer_user_id=auth.uid())$$;
create function private.request_customer_quote(request jsonb) returns uuid language sql as $$select null::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated,anon;
`);
await db.exec(await readFile(new URL('../supabase/migrations/20260912083257_quote_inspiration_photos.sql',import.meta.url),'utf8'));
await db.exec(`insert into orders(id,customer_user_id,inspiration_upload_token) values('${order}','${customer}','${token}')`);
async function as(role,user,sql){await db.exec(`set role ${role};select set_config('request.jwt.claim.sub','${user}',false);`);try{return (await db.query(sql)).rows;}finally{await db.exec('reset role');}}
const path=`${order}/${token}/1.jpg`;
test('guest upload needs correct token and one of three fixed JPG slots',async()=>{
 await as('anon','',`insert into storage.objects(bucket_id,name) values('quote-inspiration','${path}')`);
 for(const name of [`${order}/${other}/2.jpg`,`${order}/${token}/4.jpg`,`${order}/${token}/2.svg`])await assert.rejects(as('anon','',`insert into storage.objects(bucket_id,name) values('quote-inspiration','${name}')`),/row-level security/);
 await assert.rejects(as('anon','',`insert into storage.objects(bucket_id,name) values('quote-inspiration','${path}')`),/duplicate key/);
});
test('guests and other customers cannot read photos; customer and team can',async()=>{
 assert.equal((await as('anon','','select * from storage.objects')).length,0);
 assert.equal((await as('authenticated',other,'select * from storage.objects')).length,0);
 assert.equal((await as('authenticated',customer,'select * from storage.objects')).length,1);
 assert.equal((await as('authenticated',owner,'select * from storage.objects')).length,1);
});
test('capability expires and cannot overwrite existing files',async()=>{
 assert.equal((await as('anon','',`update storage.objects set name='changed' returning id`)).length,0);
 await db.exec(`update orders set created_at=now()-interval '25 hours'`);
 await assert.rejects(as('anon','',`insert into storage.objects(bucket_id,name) values('quote-inspiration','${order}/${token}/2.jpg')`),/row-level security/);
});
test.after(()=>db.close());
