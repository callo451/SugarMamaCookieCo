begin;
create function private.quote_total(qty integer) returns numeric language plpgsql stable security definer set search_path='' as $$
declare price numeric; discount numeric;
begin
 if qty is null or qty < 1 or qty > 10000 then raise exception 'Please choose a valid quantity.'; end if;
 select base_price, case when qty>=50 then discount_50 when qty>=24 then discount_24 when qty>=12 then discount_12 else 0 end into price,discount from public.pricing_settings limit 1;
 if price is null then raise exception 'Pricing is unavailable. Please try again shortly.'; end if;
 return round(qty * round(price * (1-coalesce(discount,0)),2),2);
end;
$$;
revoke all on function private.quote_total(integer) from public,anon,authenticated;
create function private.price_submitted_quote() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.quote_priced := true;
 if new.status='pending' and (auth.uid() is null or new.customer_request_id is not null or not public.is_admin()) then
   new.total_amount := private.quote_total(new.quantity);
 end if;
 return new;
end;
$$;
revoke all on function private.price_submitted_quote() from public,anon,authenticated;
create trigger price_submitted_quote before insert on public.orders for each row execute function private.price_submitted_quote();
-- Repair only unpriced, zero-total pending requests created by the customer RPC.
update public.orders set total_amount=private.quote_total(quantity),quote_priced=true where customer_request_id is not null and status='pending' and total_amount=0 and not quote_priced;
update public.orders set quote_priced=true where not quote_priced;
commit;
