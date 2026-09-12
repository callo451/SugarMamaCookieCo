begin;
create function private.customer_directory_accounts(page_offset integer default 0) returns table(id uuid,email text,verified boolean,joined_at timestamptz,is_team boolean) language plpgsql stable security definer set search_path='' as $$
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Bakery access required' using errcode='42501'; end if;
 if page_offset < 0 or page_offset is null then raise exception 'Invalid page'; end if;
 return query select u.id,u.email::text,u.email_confirmed_at is not null,u.created_at,exists(select 1 from public.portal_members m where m.user_id=u.id) from auth.users u order by u.id limit 500 offset page_offset;
end;
$$;
revoke all on function private.customer_directory_accounts(integer) from public,anon;
grant execute on function private.customer_directory_accounts(integer) to authenticated;
create function public.customer_directory_accounts(page_offset integer default 0) returns table(id uuid,email text,verified boolean,joined_at timestamptz,is_team boolean) language sql stable security invoker set search_path='' as $$select * from private.customer_directory_accounts(page_offset)$$;
revoke all on function public.customer_directory_accounts(integer) from public,anon;
grant execute on function public.customer_directory_accounts(integer) to authenticated;
commit;
