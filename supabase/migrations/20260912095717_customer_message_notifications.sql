begin;
alter table public.portal_events drop constraint portal_events_kind_check;
alter table public.portal_events add constraint portal_events_kind_check check(kind in ('new_order','order_updated','customer_message'));
alter table public.portal_push_subscriptions add column customer_messages boolean not null default true;
create table private.portal_message_email_jobs (
 event_id bigint primary key references public.portal_events(id) on delete cascade,
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 locked_at timestamptz,
 finished_at timestamptz
);
alter table private.portal_message_email_jobs enable row level security;
revoke all on private.portal_message_email_jobs from public,anon,authenticated;
grant all on private.portal_message_email_jobs to service_role;
create function private.record_customer_message_event() returns trigger language plpgsql security definer set search_path='' as $$
declare event_key bigint; reference text;
begin
 -- from_bakery is stamped by the existing BEFORE trigger, never trusted from client input.
 if new.from_bakery then return new; end if;
 select coalesce(display_order_id,id::text) into reference from public.orders where id=new.order_id;
 insert into public.portal_events(order_id,kind,title,body) values(new.order_id,'customer_message','New customer message',reference || ' · A customer sent a message. Open the conversation to reply.') returning id into event_key;
 insert into private.portal_push_jobs(event_id) values(event_key);
 insert into private.portal_message_email_jobs(event_id) values(event_key);
 return new;
end;
$$;
revoke all on function private.record_customer_message_event() from public,anon,authenticated;
create trigger customer_message_activity after insert on public.order_messages for each row execute function private.record_customer_message_event();
create function public.claim_portal_message_emails() returns setof public.portal_events language sql security definer set search_path='' as $$
 with due as (select event_id from private.portal_message_email_jobs where finished_at is null and attempts<8 and available_at<=now() and (locked_at is null or locked_at<now()-interval '5 minutes') order by event_id limit 10 for update skip locked),
 claimed as (update private.portal_message_email_jobs j set locked_at=now(),attempts=attempts+1 from due where j.event_id=due.event_id returning j.event_id)
 select e.* from public.portal_events e join claimed c on c.event_id=e.id;
$$;
create function public.finish_portal_message_email(job_id bigint,succeeded boolean) returns void language sql security definer set search_path='' as $$
 update private.portal_message_email_jobs set locked_at=null,finished_at=case when succeeded then now() else null end,available_at=now()+interval '1 minute'*power(2,least(attempts,7)) where event_id=job_id;
$$;
revoke all on function public.claim_portal_message_emails() from public,anon,authenticated;
revoke all on function public.finish_portal_message_email(bigint,boolean) from public,anon,authenticated;
grant execute on function public.claim_portal_message_emails() to service_role;
grant execute on function public.finish_portal_message_email(bigint,boolean) to service_role;
commit;
