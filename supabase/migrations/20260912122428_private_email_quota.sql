begin;
-- Keep privileged implementation out of the exposed API schema.
alter function public.claim_order_email(uuid,text) set schema private;
create function public.claim_order_email(order_key uuid,email_kind text) returns boolean language sql security invoker set search_path='' as $$
 select private.claim_order_email(order_key,email_kind);
$$;
revoke all on function public.claim_order_email(uuid,text) from public,anon;
grant execute on function public.claim_order_email(uuid,text) to authenticated;
commit;
