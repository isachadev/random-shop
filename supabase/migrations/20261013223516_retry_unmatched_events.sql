create or replace function public.fulfill_paid_order(
  p_event_id text,
  p_event_type text,
  p_session_id text,
  p_payment_intent_id text,
  p_payload jsonb
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_outcome text;
begin
  if not public.record_stripe_event(p_event_id, p_event_type, p_payload) then
    return 'duplicate_event';
  end if;

  select * into v_order
  from public.orders o
  where o.stripe_checkout_session_id = p_session_id
  for update;

  if not found then
    raise exception 'stripe event %: no order for checkout session %', p_event_id, p_session_id
      using errcode = 'RS001';
  end if;

  if v_order.status in ('paid', 'refunded') then
    v_outcome := 'already_paid';
  elsif v_order.status = 'pending' then
    update public.orders o
    set status = 'paid', paid_at = now(), stripe_payment_intent_id = p_payment_intent_id
    where o.id = v_order.id;
    v_outcome := 'paid';
  elsif v_order.status = 'expired' then
    begin
      update public.deals d
      set stock = d.stock - 1
      where d.id = v_order.deal_id and d.stock > 0;

      if found then
        update public.orders o
        set status = 'paid', paid_at = now(), stripe_payment_intent_id = p_payment_intent_id
        where o.id = v_order.id;
        v_outcome := 'paid_after_expiry';
      else
        v_outcome := 'refund_required';
      end if;
    exception when unique_violation then
      v_outcome := 'refund_required';
    end;

    if v_outcome = 'refund_required' then
      update public.orders o
      set status = 'refund_required', stripe_payment_intent_id = p_payment_intent_id
      where o.id = v_order.id;

      insert into public.refunds (order_id, stripe_payment_intent_id, reason)
      values (v_order.id, p_payment_intent_id, 'sold_out');
    end if;
  else
    v_outcome := 'ignored';
  end if;

  if v_outcome in ('paid', 'paid_after_expiry') and p_payment_intent_id is not null then
    update public.refunds r
    set order_id = v_order.id
    where r.order_id is null and r.stripe_payment_intent_id = p_payment_intent_id;

    if found then
      perform public.settle_order_refunds(v_order.id);
    end if;
  end if;

  update public.stripe_events e
  set outcome = v_outcome, processed_at = now()
  where e.id = p_event_id;

  return v_outcome;
end;
$$;

create or replace function public.release_expired_order(
  p_event_id text,
  p_event_type text,
  p_session_id text,
  p_payload jsonb
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_outcome text;
begin
  if not public.record_stripe_event(p_event_id, p_event_type, p_payload) then
    return 'duplicate_event';
  end if;

  select * into v_order
  from public.orders o
  where o.stripe_checkout_session_id = p_session_id
  for update;

  if not found then
    raise exception 'stripe event %: no order for checkout session %', p_event_id, p_session_id
      using errcode = 'RS001';
  end if;

  if v_order.status = 'pending' then
    update public.orders o set status = 'expired' where o.id = v_order.id;
    update public.deals d set stock = d.stock + 1 where d.id = v_order.deal_id;
    v_outcome := 'released';
  else
    v_outcome := 'noop';
  end if;

  update public.stripe_events e
  set outcome = v_outcome, processed_at = now()
  where e.id = p_event_id;

  return v_outcome;
end;
$$;

create or replace function public.record_refund(
  p_stripe_refund_id text,
  p_status text,
  p_amount_cents integer,
  p_payment_intent_id text,
  p_refund_id uuid default null,
  p_event_id text default null,
  p_event_type text default null,
  p_payload jsonb default null
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_refund public.refunds;
  v_order_id uuid;
  v_outcome text;
begin
  if p_status not in ('requested', 'succeeded', 'failed') then
    raise exception 'unknown refund status %', p_status using errcode = '22023';
  end if;

  if p_event_id is not null
     and not public.record_stripe_event(p_event_id, p_event_type, p_payload) then
    return 'duplicate_event';
  end if;

  select r.order_id into v_order_id
  from public.refunds r
  where r.stripe_refund_id = p_stripe_refund_id or r.id = p_refund_id
  order by r.order_id nulls last
  limit 1;

  if v_order_id is null then
    select o.id into v_order_id
    from public.orders o
    where o.stripe_payment_intent_id = p_payment_intent_id;
  end if;

  if v_order_id is not null then
    perform 1 from public.orders o where o.id = v_order_id for update;
  end if;

  select * into v_refund from public.refunds r
  where r.stripe_refund_id = p_stripe_refund_id
  for update;

  if v_refund.id is null and p_refund_id is not null then
    select * into v_refund from public.refunds r where r.id = p_refund_id for update;
  end if;

  if v_refund.id is null then
    if v_order_id is null and p_payment_intent_id is null then
      raise exception 'stripe refund %: no order and no payment to match it', p_stripe_refund_id
        using errcode = 'RS001';
    end if;

    insert into public.refunds
      (order_id, stripe_refund_id, stripe_payment_intent_id, amount_cents, reason, status)
    values
      (v_order_id, p_stripe_refund_id, p_payment_intent_id, p_amount_cents, 'external', p_status)
    on conflict (stripe_refund_id) do nothing;

    select * into v_refund from public.refunds r
    where r.stripe_refund_id = p_stripe_refund_id
    for update;
  elsif v_refund.status <> 'requested' and p_status <> 'requested' and v_refund.status <> p_status then
    v_outcome := 'conflict';
  else
    update public.refunds r
    set stripe_refund_id = p_stripe_refund_id,
        amount_cents = coalesce(p_amount_cents, r.amount_cents),
        stripe_payment_intent_id = coalesce(r.stripe_payment_intent_id, p_payment_intent_id),
        order_id = coalesce(r.order_id, v_order_id),
        status = case when r.status = 'requested' then p_status else r.status end
    where r.id = v_refund.id
    returning * into v_refund;
  end if;

  if v_outcome is null then
    if v_refund.order_id is null then
      v_outcome := 'parked';
    elsif v_refund.status = 'succeeded' then
      v_outcome := public.settle_order_refunds(v_refund.order_id);
    elsif v_refund.status = 'failed' then
      update public.orders o
      set status = 'paid'
      where o.id = v_refund.order_id
        and o.status = 'refund_required'
        and o.paid_at is not null
        and not exists (
          select 1 from public.refunds r
          where r.order_id = o.id and r.status = 'requested'
        );
      v_outcome := 'failed';
    else
      v_outcome := 'recorded';
    end if;
  end if;

  if p_event_id is not null then
    update public.stripe_events e
    set outcome = v_outcome, processed_at = now()
    where e.id = p_event_id;
  end if;

  return v_outcome;
end;
$$;
