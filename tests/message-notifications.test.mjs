import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema private;create table orders(id uuid primary key,display_order_id text);create table order_messages(id uuid primary key default gen_random_uuid(),order_id uuid,from_bakery boolean,body text);create table portal_events(id bigint generated always as identity primary key,order_id uuid references orders(id) on delete set null,kind text constraint portal_events_kind_check check(kind in ('new_order','order_updated')),title text,body text);create table portal_push_subscriptions(id uuid);create table private.portal_push_jobs(event_id bigint);insert into orders values('00000000-0000-0000-0000-000000000001','QU001');`);
await db.exec(readFileSync('supabase/migrations/20260912095717_customer_message_notifications.sql','utf8'));
test('each customer message queues independent email/push jobs; bakery replies do not',async()=>{
 await db.exec(`insert into order_messages(order_id,from_bakery,body) values('00000000-0000-0000-0000-000000000001',false,'Private customer text'),('00000000-0000-0000-0000-000000000001',true,'Bakery reply'),('00000000-0000-0000-0000-000000000001',false,'Customer reply');`);
 const rows=(await db.query('select * from portal_events')).rows;assert.equal(rows.length,2);assert.ok(rows.every(e=>e.kind==='customer_message'&&!e.body.includes('Private customer text')));
 assert.equal((await db.query('select * from private.portal_message_email_jobs')).rows.length,2);assert.equal((await db.query('select * from private.portal_push_jobs')).rows.length,2);
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from claim_portal_message_emails()'),/permission denied/);await db.exec('reset role;set role service_role');
 const claimed=(await db.query('select * from claim_portal_message_emails()')).rows;assert.equal(claimed.length,2);assert.equal((await db.query('select * from claim_portal_message_emails()')).rows.length,0);
 await db.exec(`select finish_portal_message_email(${claimed[0].id},true);select finish_portal_message_email(${claimed[1].id},false);reset role;`);
 const jobs=(await db.query('select * from private.portal_message_email_jobs order by event_id')).rows;assert.ok(jobs[0].finished_at);assert.equal(jobs[1].finished_at,null);assert.equal(jobs[1].locked_at,null);assert.equal(jobs[1].attempts,1);
});
test('email worker escapes content, retries failure and skips deleted orders',async()=>{
 const sent=[];globalThis.Deno={env:{get:()=> 'https://sugarmamacookieco.com.au'}};globalThis.testSend=async mail=>{sent.push(mail);if(sent.length===2)throw Error('transport failed');};
 const source=readFileSync('supabase/functions/push-dispatch/message-emails.ts','utf8').replace("import { sendMail } from '../_shared/zoho-mail.ts';",'const sendMail=globalThis.testSend;');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {dispatchMessageEmails}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 const finished=[];const admin={rpc:async(name,args)=>name==='claim_portal_message_emails'?{data:[{id:1,order_id:'abc',body:'<script> & customer'},{id:2,order_id:'def',body:'Next'},{id:3,order_id:null,body:'Deleted'}]}:(finished.push(args),{error:null})};
 const result=await dispatchMessageEmails(admin);assert.equal(result.failed,1);assert.equal(sent.length,2);assert.equal(sent[0].to,'hello@sugarmamacookieco.com.au');assert.ok(sent[0].html.includes('&lt;script&gt; &amp;'));assert.ok(sent[0].html.includes('/admin/orders/abc#conversation'));assert.deepEqual(finished.map(j=>j.succeeded),[true,false,true]);
 delete globalThis.Deno;delete globalThis.testSend;
});
