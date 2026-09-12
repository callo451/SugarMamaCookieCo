import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
const code=ts.transpileModule(fs.readFileSync('src/lib/customerDirectory.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {aggregateCustomers}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const account=(id,email,verified=true,is_team=false)=>({id,email,verified,is_team,joined_at:'2026-01-01'});
const order=(id,email,status='pending',owner=null)=>({id,customer_email:email,customer_user_id:owner,customer_name:'Name',created_at:'2026-02-01',status,total_amount:20});
test('includes empty accounts, excludes empty team logins, groups verified email without changing ownership',()=>{
 const rows=aggregateCustomers([account('a','a@test'),account('b','b@test',false),account('team','team@test',true,true)], [order('1',' A@test '),order('2','b@test'),order('3','old@test','completed','a'),order('4','a@test','cancelled')]);
 assert.equal(rows.length,3);const a=rows.find(r=>r.key==='a');assert.equal(a.quotes,1);assert.equal(a.orderCount,1);assert.equal(a.cancelled,1);assert.equal(a.completedValue,20);assert.equal(rows.find(r=>r.key==='b').orders.length,0);assert.equal(rows.find(r=>r.key==='guest:b@test').orders.length,1);
});
test('explicit ownership wins over another verified email',()=>{
 const rows=aggregateCustomers([account('a','a@test'),account('b','b@test')],[order('1','b@test','confirmed','a')]);assert.equal(rows.find(r=>r.key==='a').orderCount,1);assert.equal(rows.find(r=>r.key==='b').orders.length,0);
});
test('directory account API is restricted to bakery staff',async()=>{
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;create table auth.users(id uuid,email varchar(255),email_confirmed_at timestamptz,created_at timestamptz);create table portal_members(user_id uuid);create function is_admin() returns boolean language sql as $$select current_setting('test.staff',true)='yes'$$;grant usage on schema private to authenticated;insert into auth.users values('00000000-0000-0000-0000-000000000001','test@example.test',null,now());`);
 await db.exec(fs.readFileSync('supabase/migrations/20260912085925_customer_directory.sql','utf8'));
 await db.exec('set role anon');await assert.rejects(db.query('select * from customer_directory_accounts()'),/permission denied/);
 await db.exec('reset role;set role authenticated');await assert.rejects(db.query('select * from customer_directory_accounts()'),/Bakery access required/);
 await db.exec("set test.staff='yes'");const rows=(await db.query('select * from customer_directory_accounts()')).rows;assert.equal(rows.length,1);assert.equal(rows[0].verified,false);
 await db.exec("set test.staff='no'");await assert.rejects(db.query('select * from customer_directory_accounts()'),/Bakery access required/);await db.close();
});
