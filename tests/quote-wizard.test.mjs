import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';
const source=await readFile(new URL('../src/lib/quoteWizard.ts',import.meta.url),'utf8');
const {code}=await transformWithOxc(source,'quoteWizard.ts',{loader:'ts'});
const {validQuoteStep,customerQuoteRequest}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const form={quantity:24,description:'Pink floral birthday cookies',category:'birthday',shape:'circle',specialFonts:'Happy birthday',specialInstructions:'Box in sixes',customerName:' Jane Smith ',customerEmail:'jane@example.test',customerPhone:'0400000000',collectionDate:'2026-10-03'};
test('both flows require valid design and contacts before submission',()=>{
 assert.ok([0,1,2,3].every(i=>validQuoteStep(form,i,'2026-09-12')));
 for(const patch of [{quantity:0},{quantity:2.5},{quantity:10001},{description:'pink'}])assert.equal(validQuoteStep({...form,...patch},1,'2026-09-12'),false);
 assert.equal(validQuoteStep({...form,customerEmail:'invalid'},3,'2026-09-12'),false);
 assert.equal(validQuoteStep({...form,customerName:'J'},3,'2026-09-12'),false);
});
test('collection date is optional but cannot be in the past',()=>{
 assert.equal(validQuoteStep({...form,collectionDate:''},2,'2026-09-12'),true);
 assert.equal(validQuoteStep({...form,collectionDate:'2026-09-11'},2,'2026-09-12'),false);
});
test('signed-in submission preserves wizard details and retry key without accepting client identity or price',()=>{
 const request=customerQuoteRequest(form,'retry-key');
 assert.deepEqual(request,{request_id:'retry-key',name:'Jane Smith',phone:'0400000000',quantity:24,description:form.description,category:'birthday',shape:'circle',special_fonts:'Happy birthday',special_instructions:'Box in sixes',collection_date:'2026-10-03'});
 assert.equal('customer_email' in request,false);assert.equal('total_amount' in request,false);
 assert.deepEqual(customerQuoteRequest(form,'retry-key'),request);
});
