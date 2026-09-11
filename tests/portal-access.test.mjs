import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
const owner = "00000000-0000-0000-0000-000000000001";
const staff = "00000000-0000-0000-0000-000000000002";
const stranger = "00000000-0000-0000-0000-000000000003";
const order = "00000000-0000-0000-0000-000000000010";
const db = new PGlite();
await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon, authenticated, service_role;
 grant execute on function auth.uid() to anon, authenticated, service_role;
 create type order_status as enum ('pending','confirmed','in_progress','completed','cancelled');
 create table public.orders(id uuid primary key,display_order_id text,status order_status,quantity integer,total_amount numeric,description text,special_instructions text);
 alter table public.orders enable row level security;
 grant select,insert,update,delete on public.orders to authenticated;
 grant insert on public.orders to anon;
 insert into auth.users values('${owner}','{}'),('${staff}','{}'),('${stranger}','{"is_admin":true}');
`);
await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/20260911115638_portal_access_and_notifications.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec(`
 insert into public.portal_members(user_id,email,role) values('${owner}','owner@example.test','owner'),('${staff}','staff@example.test','staff');
 create policy team_orders on public.orders for all to authenticated using(public.is_admin()) with check(public.is_admin());
 create policy customer_order on public.orders for insert to anon with check(status='pending');
`);
async function as(role, id, sql) {
  await db.exec(
    `set role ${role}; select set_config('request.jwt.claim.sub','${id}',false);`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
test("owner can view team; staff can see only their membership", async () => {
  assert.equal(
    (await as("authenticated", owner, "select * from portal_members")).rows
      .length,
    2,
  );
  assert.equal(
    (await as("authenticated", staff, "select * from portal_members")).rows
      .length,
    1,
  );
});
test("uninvited account cannot become admin using editable metadata", async () => {
  assert.equal(
    (await as("authenticated", stranger, "select public.is_admin() as allowed"))
      .rows[0].allowed,
    false,
  );
  await assert.rejects(
    as(
      "authenticated",
      stranger,
      `insert into portal_members(user_id,email,role) values('${stranger}','x@example.test','owner')`,
    ),
    /permission denied/,
  );
  await assert.rejects(
    as(
      "authenticated",
      staff,
      `update portal_members set role='owner' where user_id='${staff}'`,
    ),
    /permission denied/,
  );
});
test("customer insert creates one server event and durable push job", async () => {
  await as(
    "anon",
    "",
    `insert into orders(id,display_order_id,status,quantity) values('${order}','QU001','pending',12)`,
  );
  assert.equal((await db.query("select * from portal_events")).rows.length, 1);
  assert.equal(
    (await db.query("select * from private.portal_push_jobs")).rows.length,
    1,
  );
  await assert.rejects(
    as("anon", "", "select * from portal_events"),
    /permission denied/,
  );
});
test("staff can update orders; no-op save does not create duplicate activity", async () => {
  await as(
    "authenticated",
    staff,
    `update orders set status='confirmed' where id='${order}'`,
  );
  await as(
    "authenticated",
    staff,
    `update orders set status='confirmed' where id='${order}'`,
  );
  assert.equal((await db.query("select * from portal_events")).rows.length, 2);
});
test("revocation blocks operational access with the same JWT subject", async () => {
  assert.equal(
    (await as("authenticated", staff, "select * from orders")).rows.length,
    1,
  );
  await db.exec(
    `update portal_members set active=false where user_id='${staff}'`,
  );
  assert.equal(
    (await as("authenticated", staff, "select * from orders")).rows.length,
    0,
  );
  assert.equal(
    (await as("authenticated", staff, "select * from portal_events")).rows
      .length,
    0,
  );
  await assert.rejects(
    as(
      "authenticated",
      staff,
      `insert into orders(id,status) values('00000000-0000-0000-0000-000000000099','pending')`,
    ),
    /row-level security/,
  );
});
test("read receipts are private and cannot be forged for another account", async () => {
  await as(
    "authenticated",
    owner,
    `insert into portal_event_reads(user_id,event_id) values('${owner}',1)`,
  );
  await assert.rejects(
    as(
      "authenticated",
      stranger,
      `insert into portal_event_reads(user_id,event_id) values('${owner}',2)`,
    ),
    /row-level security/,
  );
  assert.equal(
    (await as("authenticated", stranger, "select * from portal_event_reads"))
      .rows.length,
    0,
  );
});
test("push jobs only callable by service role and not claimed twice", async () => {
  await assert.rejects(
    as("authenticated", owner, "select * from claim_portal_push_jobs()"),
    /permission denied/,
  );
  assert.equal(
    (await as("service_role", "", "select * from claim_portal_push_jobs()"))
      .rows.length,
    2,
  );
  assert.equal(
    (await as("service_role", "", "select * from claim_portal_push_jobs()"))
      .rows.length,
    0,
  );
  await as("service_role", "", "select finish_portal_push_job(1,true)");
  assert.ok(
    (
      await db.query(
        "select finished_at from private.portal_push_jobs where event_id=1",
      )
    ).rows[0].finished_at,
  );
});
test.after(async () => await db.close());
