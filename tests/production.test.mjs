import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';
const {code}=await transformWithOxc(await readFile(new URL('../src/lib/production.ts',import.meta.url),'utf8'),'production.ts',{loader:'ts',format:'esm'});
const {businessToday,addDays,monday,productionGroups,cookieCount}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('Melbourne day is correct across UTC midnight and daylight saving',()=>{
 assert.equal(businessToday(new Date('2026-09-11T15:00:00Z')),'2026-09-12');
 assert.equal(businessToday(new Date('2026-12-31T13:00:00Z')),'2027-01-01');
 assert.equal(addDays('2026-10-03',2),'2026-10-05');
 assert.equal(monday('2026-09-13'),'2026-09-07');
 assert.equal(monday('2026-09-14'),'2026-09-14');
});
test('production excludes closed orders, sorts dates and retains unscheduled work',()=>{
 const orders=[{id:'a',collection_date:null,status:'pending',quantity:12},{id:'b',collection_date:'2026-09-15',status:'confirmed',quantity:24},{id:'c',collection_date:'2026-09-12',status:'in_progress',quantity:8},{id:'d',collection_date:'2026-09-12',status:'completed',quantity:99},{id:'e',collection_date:null,status:'cancelled',quantity:99}];
 const groups=productionGroups(orders);
 assert.deepEqual(groups.map(([day])=>day),['2026-09-12','2026-09-15','']);
 assert.equal(cookieCount(groups.flatMap(([,rows])=>rows)),44);
});
