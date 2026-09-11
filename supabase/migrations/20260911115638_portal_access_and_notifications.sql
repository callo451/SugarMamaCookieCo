-- Deploy only after inserting the owner's verified auth UUID into portal_members
-- in the same transaction (see supabase/PORTAL_SETUP.md). Never infer ownership
-- from the legacy, user-editable is_admin field.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
create table public.portal_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 role text not null check (role in ('owner','staff')),
 active boolean not null default true,
 invited_at timestamptz not null default now(),
 invited_by uuid references auth.users(id) on delete set null
);
create unique index portal_members_email_unique on public.portal_members(lower(email));
alter table public.portal_members enable row level security;
revoke all on public.portal_members from anon, authenticated;
grant select on public.portal_members to authenticated;
grant all on public.portal_members to service_role;
create function private.portal_role() returns text language sql stable security definer set search_path = '' as $$
 select role from public.portal_members where user_id = (select auth.uid()) and active;
$$;
revoke all on function private.portal_role() from public, anon;
grant execute on function private.portal_role() to authenticated, service_role;
create policy "Members read their access; owner reads team" on public.portal_members for select to authenticated
 using (user_id = (select auth.uid()) or (select private.portal_role()) = 'owner');
-- Existing operational policies call is_admin(), so changing its source also
-- removes access for revoked members with still-valid JWTs.
create or replace function public.is_admin() returns boolean language sql stable security invoker set search_path = '' as $$
 select coalesce((select private.portal_role()) in ('owner','staff'), false);
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
-- Remove legacy user-management entry points. Their old implementations trusted user metadata.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('toggle_user_admin','delete_user','create_user','create_admin_user','setup_admin_user','set_admin_status','check_is_admin','handle_new_contact_submission')
 loop execute format('revoke all on function %s from public, anon, authenticated', f.signature); end loop;
 if to_regclass('public.auth_users_view') is not null then execute 'revoke all on public.auth_users_view from public, anon, authenticated'; end if;
end $$;
alter table public.orders add column if not exists collection_date date;
create index if not exists orders_collection_date_idx on public.orders(collection_date) where collection_date is not null;
create table public.portal_events (
 id bigint generated always as identity primary key,
 order_id uuid references public.orders(id) on delete set null,
 kind text not null check(kind in ('new_order','order_updated')),
 title text not null,
 body text not null,
 created_at timestamptz not null default now()
);
alter table public.portal_events enable row level security;
grant select on public.portal_events to authenticated;
grant all on public.portal_events to service_role;
grant usage, select on sequence public.portal_events_id_seq to service_role;
create policy "Team reads activity" on public.portal_events for select to authenticated using ((select public.is_admin()));
create table public.portal_event_reads (
 user_id uuid not null references auth.users(id) on delete cascade,
 event_id bigint not null references public.portal_events(id) on delete cascade,
 primary key(user_id,event_id)
);
alter table public.portal_event_reads enable row level security;
grant select, insert on public.portal_event_reads to authenticated;
grant all on public.portal_event_reads to service_role;
create policy "Read own receipts" on public.portal_event_reads for select to authenticated using (user_id=(select auth.uid()) and (select public.is_admin()));
create policy "Mark own activity read" on public.portal_event_reads for insert to authenticated with check (user_id=(select auth.uid()) and (select public.is_admin()));
create table public.portal_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 p256dh text not null,
 auth text not null,
 new_orders boolean not null default true,
 order_updates boolean not null default true,
 created_at timestamptz not null default now()
);
create index on public.portal_push_subscriptions(user_id);
alter table public.portal_push_subscriptions enable row level security;
grant select, insert, update, delete on public.portal_push_subscriptions to authenticated;
grant all on public.portal_push_subscriptions to service_role;
create policy "Own device subscriptions" on public.portal_push_subscriptions for all to authenticated
 using(user_id=(select auth.uid()) and (select public.is_admin()))
 with check(user_id=(select auth.uid()) and (select public.is_admin()));
-- Outbox created in the order transaction. A scheduled worker retries failures.
create table private.portal_push_jobs (
 event_id bigint primary key references public.portal_events(id) on delete cascade,
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 locked_at timestamptz,
 finished_at timestamptz
);
alter table private.portal_push_jobs enable row level security;
grant all on private.portal_push_jobs to service_role;
create table public.portal_push_deliveries (
 event_id bigint not null references public.portal_events(id) on delete cascade,
 subscription_id uuid not null references public.portal_push_subscriptions(id) on delete cascade,
 sent_at timestamptz not null default now(), primary key(event_id,subscription_id)
);
alter table public.portal_push_deliveries enable row level security;
grant all on public.portal_push_deliveries to service_role;
create function private.record_order_event() returns trigger language plpgsql security definer set search_path = '' as $$
 declare event_id bigint; event_kind text; event_title text;
 begin
 if TG_OP='UPDATE' and row(new.status,new.collection_date,new.quantity,new.total_amount,new.description,new.special_instructions)
  is not distinct from row(old.status,old.collection_date,old.quantity,old.total_amount,old.description,old.special_instructions) then return new; end if;
 event_kind := case when TG_OP='INSERT' then 'new_order' else 'order_updated' end;
 event_title := case when TG_OP='INSERT' then 'New order received' else 'Order updated' end;
 insert into public.portal_events(order_id,kind,title,body) values(new.id,event_kind,event_title,
  coalesce(new.display_order_id,new.id::text)||' · '||replace(new.status::text,'_',' ')) returning id into event_id;
 insert into private.portal_push_jobs(event_id) values(event_id);
 return new;
 end;
$$;
revoke all on function private.record_order_event() from public, anon, authenticated;
create trigger portal_order_activity after insert or update on public.orders for each row execute function private.record_order_event();
-- Worker RPCs are service-role-only and cannot be called by portal users.
create function public.claim_portal_push_jobs() returns setof public.portal_events language sql security definer set search_path = '' as $$
 with due as (select event_id from private.portal_push_jobs where finished_at is null and attempts<8 and available_at<=now() and (locked_at is null or locked_at<now()-interval '5 minutes') order by event_id limit 20 for update skip locked),
 claimed as (update private.portal_push_jobs j set locked_at=now(),attempts=attempts+1 from due where j.event_id=due.event_id returning j.event_id)
 select e.* from public.portal_events e join claimed c on c.event_id=e.id;
$$;
create function public.finish_portal_push_job(job_id bigint, succeeded boolean) returns void language sql security definer set search_path = '' as $$
 update private.portal_push_jobs set locked_at=null, finished_at=case when succeeded then now() else null end,
 available_at=now()+interval '1 minute'*power(2,least(attempts,7)) where event_id=job_id;
$$;
revoke all on function public.claim_portal_push_jobs() from public, anon, authenticated;
revoke all on function public.finish_portal_push_job(bigint,boolean) from public, anon, authenticated;
grant execute on function public.claim_portal_push_jobs() to service_role;
grant execute on function public.finish_portal_push_job(bigint,boolean) to service_role;
commit;
