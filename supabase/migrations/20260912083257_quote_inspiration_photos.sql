begin;
alter table public.orders add column inspiration_upload_token uuid not null default gen_random_uuid();
-- A short-lived, unguessable upload capability permits guest uploads without exposing order reads.
create function private.can_upload_quote_photo(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.orders o where object_name in (
 o.id::text||'/'||o.inspiration_upload_token::text||'/1.jpg',
 o.id::text||'/'||o.inspiration_upload_token::text||'/2.jpg',
 o.id::text||'/'||o.inspiration_upload_token::text||'/3.jpg') and o.created_at>now()-interval '24 hours');
$$;
revoke all on function private.can_upload_quote_photo(text) from public;
grant usage on schema private to anon;
grant execute on function private.can_upload_quote_photo(text) to anon,authenticated;
create function private.can_read_quote_photo(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.orders o where split_part(object_name,'/',1)=o.id::text and (public.is_admin() or private.customer_owns_order(o.id)));
$$;
revoke all on function private.can_read_quote_photo(text) from public,anon;
grant execute on function private.can_read_quote_photo(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('quote-inspiration','quote-inspiration',false,2097152,array['image/jpeg']);
create policy "Upload with quote capability" on storage.objects for insert to anon,authenticated with check(bucket_id='quote-inspiration' and private.can_upload_quote_photo(name));
create policy "Participants read inspiration" on storage.objects for select to authenticated using(bucket_id='quote-inspiration' and private.can_read_quote_photo(name));
create policy "Team removes inspiration" on storage.objects for delete to authenticated using(bucket_id='quote-inspiration' and public.is_admin());
-- Extend the existing customer RPC without changing its verified ownership and idempotency checks.
create or replace function private.request_customer_quote(request jsonb) returns uuid language plpgsql security definer set search_path='' as $$
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
 insert into public.orders(customer_user_id,customer_request_id,customer_name,customer_email,customer_phone,quantity,description,category,shape,special_fonts,special_instructions,collection_date,total_amount,status,quote_priced,inspiration_upload_token)
 values(auth.uid(),request_key,trim(request->>'name'),verified_email,left(request->>'phone',40),qty,request->>'description',left(request->>'category',100),left(request->>'shape',100),left(request->>'special_fonts',1000),left(request->>'special_instructions',4000),nullif(request->>'collection_date','')::date,0,'pending',false,coalesce(nullif(request->>'inspiration_upload_token','')::uuid,gen_random_uuid())) returning id into result;
 return result;
 end;
$$;
commit;
