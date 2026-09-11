import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformWithEsbuild } from 'vite';
async function load(path) {
 const source = await readFile(new URL(path, import.meta.url), 'utf8');
 const {code} = await transformWithEsbuild(source, path, {loader:'ts',format:'esm'});
 return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const {authMessages} = await load('../supabase/functions/auth-email/messages.ts');
const project='https://example.supabase.co', app='https://shop.example.test';
const payload={user:{email:'owner@example.test'},email_data:{email_action_type:'recovery',token_hash:'private-hash',redirect_to:app+'/admin/set-password'}};
test('recovery preserves Supabase verification and callback',()=>{
 const [mail]=authMessages(payload,project,app,[app]);
 const link=new URL(mail.html.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&'));
 assert.equal(link.origin,project);
 assert.equal(link.searchParams.get('type'),'recovery');
 assert.equal(link.searchParams.get('token'),'private-hash');
 assert.equal(link.searchParams.get('redirect_to'),app+'/admin/set-password');
 assert.throws(()=>authMessages({...payload,email_data:{...payload.email_data,redirect_to:'https://attacker.test'}},project,app,[app]));
});
test('secure email changes send each hash to the correct address',()=>{
 const mails=authMessages({user:{email:'old@example.test',new_email:'new@example.test'},email_data:{...payload.email_data,email_action_type:'email_change',token_hash:'new-address-hash',token_hash_new:'old-address-hash'}},project,app,[app]);
 assert.equal(mails[0].to,'old@example.test'); assert.match(mails[0].html,/old-address-hash/);
 assert.equal(mails[1].to,'new@example.test'); assert.match(mails[1].html,/new-address-hash/);
});
test('Zoho refreshes server token, uses Australian endpoint and rejects provider failure',async()=>{
 globalThis.Deno={env:{get:key=>({ZOHO_CLIENT_ID:'client',ZOHO_CLIENT_SECRET:'secret',ZOHO_REFRESH_TOKEN:'refresh',ZOHO_ACCOUNT_ID:'123',ZOHO_FROM_EMAIL:'hello@example.test'})[key]}};
 const original=globalThis.fetch; let calls=[]; let fail=false;
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/oauth/')) return Response.json({access_token:'access',expires_in:3600});
  return Response.json({status:{code:fail?500:200},data:{messageId:'id'}});
 };
 try {
  const {sendMail}=await load('../supabase/functions/_shared/zoho-mail.ts');
  assert.equal((await sendMail({to:'owner@example.test',subject:'Test',html:'<p>Test</p>'})).id,'id');
  assert.equal(calls[0].url,'https://accounts.zoho.com.au/oauth/v2/token');
  assert.equal(calls[1].url,'https://mail.zoho.com.au/api/accounts/123/messages');
  assert.equal(calls[1].options.headers.Authorization,'Zoho-oauthtoken access');
  assert.equal(JSON.parse(calls[1].options.body).fromAddress,'hello@example.test');
  fail=true; await assert.rejects(()=>sendMail({to:'owner@example.test',subject:'Test',html:'Test'}));
  assert.equal(calls.length,3); // cached token; no ambiguous-send retry
  await assert.rejects(()=>sendMail({to:'bad\r\nBcc:x@example.test',subject:'Test',html:'Test'}));
 } finally {globalThis.fetch=original;}
});
