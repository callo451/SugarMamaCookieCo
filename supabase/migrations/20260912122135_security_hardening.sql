begin;
create index if not exists orders_email_quota_idx on public.orders(lower(customer_email),created_at);
-- Server-side quotas: atomic fixed windows, with bounded retained state.
create table private.request_budgets (key text primary key, window_start timestamptz not null, used integer not null);
alter table private.request_budgets enable row level security;
revoke all on private.request_budgets from public,anon,authenticated;
create function private.take_budget(budget_key text, maximum integer, seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare used_count integer;
begin
 delete from private.request_budgets where window_start < now()-interval '2 days';
 insert into private.request_budgets as b values(budget_key,now(),1)
 on conflict(key) do update set window_start=case when b.window_start<=now()-make_interval(secs=>seconds) then now() else b.window_start end,
 used=case when b.window_start<=now()-make_interval(secs=>seconds) then 1 else b.used+1 end returning used into used_count;
 return used_count<=maximum;
end; $$;
revoke all on function private.take_budget(text,integer,integer) from public,anon,authenticated;
create function public.claim_contact_email(email_key text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not private.take_budget('contact:global',30,3600) then return false; end if;
 return private.take_budget('contact:'||md5(lower(email_key)),3,86400);
end; $$;
revoke all on function public.claim_contact_email(text) from public,anon,authenticated;
grant execute on function public.claim_contact_email(text) to service_role;
create function public.claim_order_email(order_key uuid,email_kind text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Verified staff access required'; end if;
 if email_kind not in ('customer','admin','reminder') or not exists(select 1 from public.orders where id=order_key) then return false; end if;
 if not private.take_budget('staff-email:global',100,3600) then return false; end if;
 return private.take_budget('order-email:'||order_key::text||':'||email_kind,1,300);
end; $$;
revoke all on function public.claim_order_email(uuid,text) from public,anon;
grant execute on function public.claim_order_email(uuid,text) to authenticated;

-- Guests can only use the validated request operation, never write an order directly.
-- Direct anonymous INSERT is revoked in the enforcement migration after the new frontend is deployed.
create function private.request_guest_quote(request jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare request_key uuid; token uuid; qty integer; email text; result uuid;
begin
 if request is null or jsonb_typeof(request)<>'object' or octet_length(request::text)>12000 then raise exception 'Invalid quote request'; end if;
 request_key := (request->>'request_id')::uuid; token := (request->>'inspiration_upload_token')::uuid;
 email := lower(trim(request->>'email')); qty := (request->>'quantity')::integer;
 if request_key is null or token is null or email is null or length(email)>254 or email !~ '^[^[:space:]@,<>]+@[^[:space:]@,<>]+\.[^[:space:]@,<>]+$' or qty is null or qty<1 or qty>10000
 or length(trim(coalesce(request->>'name','')))<2 or length(request->>'name')>150 or length(trim(coalesce(request->>'description','')))<10 or length(request->>'description')>4000
 or length(coalesce(request->>'phone',''))>40 or length(coalesce(request->>'special_fonts',''))>1000 or length(coalesce(request->>'special_instructions',''))>4000
 or length(coalesce(request->>'category',''))>100 or length(coalesce(request->>'shape',''))>100 then raise exception 'Please check your quote details'; end if;
 if nullif(request->>'collection_date','')::date < (now() at time zone 'Australia/Melbourne')::date then raise exception 'Please choose a future collection date'; end if;
 perform pg_advisory_xact_lock(hashtextextended('guest-quotes',0));
 select id into result from public.orders where id=request_key and inspiration_upload_token=token and customer_user_id is null and lower(customer_email)=email;
 if result is not null then return result; end if;
 -- Global budget bounds distributed automation too; no reliance on spoofable client IP headers.
 if (select count(*) from public.orders where customer_user_id is null and created_at>now()-interval '1 hour')>=20
 or (select count(*) from public.orders where customer_user_id is null and created_at>now()-interval '1 day')>=100
 or (select count(*) from public.orders where lower(customer_email)=email and created_at>now()-interval '1 day')>=3 then raise exception 'Quote request limit reached. Please contact the bakery about your request.'; end if;
 insert into public.orders(id,inspiration_upload_token,customer_name,customer_email,customer_phone,quantity,description,category,shape,special_fonts,special_instructions,collection_date,status,total_amount,quote_priced)
 values(request_key,token,trim(request->>'name'),email,request->>'phone',qty,request->>'description',request->>'category',request->>'shape',request->>'special_fonts',request->>'special_instructions',nullif(request->>'collection_date','')::date,'pending',private.quote_total(qty),true);
 return request_key;
end; $$;
revoke all on function private.request_guest_quote(jsonb) from public,authenticated;
grant execute on function private.request_guest_quote(jsonb) to anon;
create function public.request_guest_quote(request jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.request_guest_quote(request); $$;
revoke all on function public.request_guest_quote(jsonb) from public,authenticated;
grant execute on function public.request_guest_quote(jsonb) to anon;

-- Persist two independent delivery jobs per newly saved order. No caller can enqueue arbitrary mail.
create table private.order_email_jobs (
 order_id uuid references public.orders(id) on delete cascade, kind text check(kind in ('customer','admin')),
 attempts integer not null default 0,available_at timestamptz not null default now(),locked_at timestamptz,finished_at timestamptz,
 primary key(order_id,kind)
);
create index order_email_jobs_due_idx on private.order_email_jobs(available_at) where finished_at is null and attempts<8;
alter table private.order_email_jobs enable row level security;
revoke all on private.order_email_jobs from public,anon,authenticated;
create function private.queue_order_email() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into private.order_email_jobs(order_id,kind) values(new.id,'customer'),(new.id,'admin');return new;end; $$;
revoke all on function private.queue_order_email() from public,anon,authenticated;
create trigger queue_saved_order_email after insert on public.orders for each row execute function private.queue_order_email();
create function public.claim_order_emails() returns table(order_data jsonb,kind text) language sql security definer set search_path='' as $$
 with due as (select j.order_id,j.kind from private.order_email_jobs j where j.finished_at is null and j.attempts<8 and j.available_at<=now() and (j.locked_at is null or j.locked_at<now()-interval '5 minutes') order by j.available_at limit 10 for update skip locked),
 claimed as (update private.order_email_jobs j set locked_at=now(),attempts=attempts+1 from due d where j.order_id=d.order_id and j.kind=d.kind returning j.order_id,j.kind)
 select jsonb_build_object('id',o.id,'display_order_id',o.display_order_id,'customer_name',o.customer_name,'customer_email',o.customer_email,'description',o.description,'quantity',o.quantity,'total_amount',o.total_amount,'status',o.status,'customer_phone',o.customer_phone,'created_at',o.created_at,'special_instructions',o.special_instructions),c.kind from public.orders o join claimed c on c.order_id=o.id;
$$;
create function public.finish_order_email(order_key uuid,email_kind text,succeeded boolean) returns void language sql security definer set search_path='' as $$
 update private.order_email_jobs set locked_at=null,finished_at=case when succeeded then now() else null end,available_at=now()+interval '1 minute'*power(2,least(attempts,7)) where order_id=order_key and kind=email_kind;
$$;
revoke all on function public.claim_order_emails() from public,anon,authenticated;
revoke all on function public.finish_order_email(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_order_emails() to service_role;
grant execute on function public.finish_order_email(uuid,text,boolean) to service_role;

-- Compatibility guard protects the currently deployed guest form during rollout.
create function private.guard_guest_order() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'anon' then return new; end if;
 if length(trim(coalesce(new.customer_name,'')))<2 or length(new.customer_name)>150
 or coalesce(new.customer_email,'') !~ '^[^[:space:]@,<>]+@[^[:space:]@,<>]+\.[^[:space:]@,<>]+$' or length(new.customer_email)>254
 or length(coalesce(new.customer_phone,''))>40 or length(trim(coalesce(new.description,'')))<10 or length(new.description)>4000
 or length(coalesce(new.special_fonts,''))>1000 or length(coalesce(new.special_instructions,''))>4000
 or length(coalesce(new.category,''))>100 or length(coalesce(new.shape,''))>100
 or new.quantity is null or new.quantity<1 or new.quantity>10000 then raise exception 'Please check your quote details'; end if;
 if new.collection_date<(now() at time zone 'Australia/Melbourne')::date then raise exception 'Please choose a future collection date'; end if;
 perform pg_advisory_xact_lock(hashtextextended('guest-quotes',0));
 if (select count(*) from public.orders where customer_user_id is null and created_at>now()-interval '1 hour')>=20
 or (select count(*) from public.orders where customer_user_id is null and created_at>now()-interval '1 day')>=100
 or (select count(*) from public.orders where lower(customer_email)=lower(trim(new.customer_email)) and created_at>now()-interval '1 day')>=3 then raise exception 'Quote request limit reached. Please contact the bakery about your request.'; end if;
 -- Guests cannot forge historical timestamps to evade quotas or extend upload capabilities.
 new.created_at:=now();new.customer_email:=lower(trim(new.customer_email));
 return new;
end; $$;
revoke all on function private.guard_guest_order() from public,anon,authenticated;
create trigger guard_guest_order before insert on public.orders for each row execute function private.guard_guest_order();
commit;
