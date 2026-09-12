begin;
alter table public.orders add column customer_user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column quote_priced boolean not null default true;
alter table public.orders add column customer_request_id uuid;
create index orders_customer_user_idx on public.orders(customer_user_id);
create unique index orders_customer_request_unique on public.orders(customer_user_id,customer_request_id) where customer_request_id is not null;
-- Email is read from the verified Auth record, never editable profile metadata or JWT email claims.
create function private.customer_owns_order(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.orders o join auth.users u on u.id=o.customer_user_id where o.id=target and u.id=auth.uid() and u.email_confirmed_at is not null);
$$;
revoke all on function private.customer_owns_order(uuid) from public,anon;
grant execute on function private.customer_owns_order(uuid) to authenticated;
create policy "Customers read own orders" on public.orders for select to authenticated using (private.customer_owns_order(id));
create policy "Customers read own items" on public.order_items for select to authenticated using (private.customer_owns_order(order_id));
create policy "Signed in visitors read pricing" on public.pricing_settings for select to authenticated using(true);
drop policy if exists "Public can submit orders" on public.orders;
create policy "Public can submit orders" on public.orders for insert to anon with check(status='pending' and customer_user_id is null and customer_request_id is null and quote_priced);
create function private.claim_customer_orders() returns integer language plpgsql security definer set search_path='' as $$
 declare verified_email text; affected integer;
 begin
 select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then raise exception 'Please verify your email before continuing.'; end if;
 update public.orders set customer_user_id=auth.uid() where customer_user_id is null and lower(customer_email)=verified_email;
 get diagnostics affected=row_count; return affected;
 end;
$$;
revoke all on function private.claim_customer_orders() from public,anon;
grant execute on function private.claim_customer_orders() to authenticated;
create function public.claim_customer_orders() returns integer language sql security invoker set search_path='' as $$select private.claim_customer_orders()$$;
revoke all on function public.claim_customer_orders() from public,anon;
grant execute on function public.claim_customer_orders() to authenticated;
create function private.request_customer_quote(request jsonb) returns uuid language plpgsql security definer set search_path='' as $$
 declare verified_email text; result uuid; qty integer; request_key uuid;
 begin
 select email into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then raise exception 'Please verify your email before requesting a quote.'; end if;
 request_key := (request->>'request_id')::uuid;
 if request_key is null then raise exception 'Missing request ID'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select id into result from public.orders where customer_user_id=auth.uid() and customer_request_id=request_key;
 if result is not null then return result; end if;
 if (select count(*) from public.orders where customer_user_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'You have reached the daily quote limit. Please message us about an existing request.'; end if;
 qty := (request->>'quantity')::integer;
 if qty is null or qty<1 or qty>10000 or length(trim(coalesce(request->>'name','')))<2 or length(request->>'name')>150 or length(trim(coalesce(request->>'description','')))<10 or length(request->>'description')>4000 or length(request::text)>12000 then raise exception 'Please check your name, quantity and design details.'; end if;
 if nullif(request->>'collection_date','')::date < (now() at time zone 'Australia/Melbourne')::date then raise exception 'Please choose a future collection date.'; end if;
 insert into public.orders(customer_user_id,customer_request_id,customer_name,customer_email,customer_phone,quantity,description,category,shape,special_fonts,special_instructions,collection_date,total_amount,status,quote_priced)
 values(auth.uid(),request_key,trim(request->>'name'),verified_email,left(request->>'phone',40),qty,request->>'description',left(request->>'category',100),left(request->>'shape',100),left(request->>'special_fonts',1000),left(request->>'special_instructions',4000),nullif(request->>'collection_date','')::date,0,'pending',false) returning id into result;
 return result;
 end;
$$;
revoke all on function private.request_customer_quote(jsonb) from public,anon;
grant execute on function private.request_customer_quote(jsonb) to authenticated;
create function public.request_customer_quote(request jsonb) returns uuid language sql security invoker set search_path='' as $$select private.request_customer_quote(request)$$;
revoke all on function public.request_customer_quote(jsonb) from public,anon;
grant execute on function public.request_customer_quote(jsonb) to authenticated;
create table public.order_messages (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 sender_id uuid references auth.users(id) on delete set null, from_bakery boolean not null default false,
 body text not null check(length(trim(body)) between 1 and 4000), created_at timestamptz not null default now()
);
create index order_messages_order_created_idx on public.order_messages(order_id,created_at);
create index order_messages_sender_idx on public.order_messages(sender_id);
alter table public.order_messages enable row level security;
grant select,insert on public.order_messages to authenticated;
grant all on public.order_messages to service_role;
create policy "Participants read messages" on public.order_messages for select to authenticated using(public.is_admin() or private.customer_owns_order(order_id));
create policy "Participants send messages" on public.order_messages for insert to authenticated with check(sender_id=auth.uid() and (public.is_admin() or private.customer_owns_order(order_id)));
create function private.stamp_customer_message() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is null then raise exception 'Sign in to send a message'; end if;
 if not (public.is_admin() or private.customer_owns_order(new.order_id)) then raise exception 'Order unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 if (select count(*) from public.order_messages where sender_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'Please wait a minute before sending more messages.'; end if;
 new.sender_id:=auth.uid(); new.from_bakery:=public.is_admin(); new.created_at:=now(); return new;
 end;
$$;
revoke all on function private.stamp_customer_message() from public,anon,authenticated;
create trigger stamp_customer_message before insert on public.order_messages for each row execute function private.stamp_customer_message();
create table public.order_documents (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 150), storage_path text not null unique,
 created_at timestamptz not null default now(),
 check(storage_path like order_id::text || '/%.pdf')
);
create index order_documents_order_idx on public.order_documents(order_id);
alter table public.order_documents enable row level security;
grant select,insert,delete on public.order_documents to authenticated;
grant all on public.order_documents to service_role;
create policy "Team manages invoices" on public.order_documents for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Customers read own invoices" on public.order_documents for select to authenticated using(private.customer_owns_order(order_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('customer-invoices','customer-invoices',false,10485760,array['application/pdf']);
create policy "Team uploads invoices" on storage.objects for insert to authenticated with check(bucket_id='customer-invoices' and public.is_admin());
create policy "Team removes invoices" on storage.objects for delete to authenticated using(bucket_id='customer-invoices' and public.is_admin());
create policy "Participants download invoices" on storage.objects for select to authenticated using(bucket_id='customer-invoices' and (public.is_admin() or exists(select 1 from public.order_documents d where d.storage_path=name and private.customer_owns_order(d.order_id))));
commit;
