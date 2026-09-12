-- Apply after the frontend with StaffMfa and request_guest_quote is live.
begin;
drop policy if exists "Public can submit orders" on public.orders;
revoke insert on public.orders from anon;
-- Staff must complete MFA. Their own membership row remains readable for enrollment UI.
create or replace function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce((select private.portal_role()) in ('owner','staff') and (select auth.jwt()->>'aal')='aal2',false);
$$;
drop policy "Members read their access; owner reads team" on public.portal_members;
create policy "Members read their access; verified owner reads team" on public.portal_members for select to authenticated
 using(user_id=(select auth.uid()) or ((select private.portal_role())='owner' and (select auth.jwt()->>'aal')='aal2'));

commit;
