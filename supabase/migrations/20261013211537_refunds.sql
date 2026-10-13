
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete restrict,
  stripe_refund_id text unique,
  stripe_payment_intent_id text,
  amount_cents integer check (amount_cents > 0),
  reason text not null
    check (reason in ('sold_out', 'customer_request', 'external')),
  status text not null default 'requested'
    check (status in ('requested', 'succeeded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refunds_has_target
    check (order_id is not null or stripe_payment_intent_id is not null)
);

create unique index refunds_one_open_per_order
  on public.refunds (order_id)
  where status = 'requested' and reason <> 'external';

create index refunds_order_idx on public.refunds (order_id);
create index refunds_parked_idx on public.refunds (stripe_payment_intent_id)
  where order_id is null;

create function public.refunds_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger refunds_touch
  before update on public.refunds
  for each row execute function public.refunds_touch();

alter table public.refunds enable row level security;
revoke all on public.refunds from anon, authenticated;
grant select, insert, update on public.refunds to service_role;

create or replace function public.orders_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
     or new.user_id <> old.user_id
     or new.deal_id <> old.deal_id
     or new.amount_cents <> old.amount_cents
     or new.idempotency_key <> old.idempotency_key then
    raise exception 'orders: immutable column changed' using errcode = 'check_violation';
  end if;

  if old.stripe_checkout_session_id is not null
     and new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id then
    raise exception 'orders: checkout session cannot change' using errcode = 'check_violation';
  end if;

  if old.stripe_payment_intent_id is not null
     and new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id then
    raise exception 'orders: payment intent cannot change' using errcode = 'check_violation';
  end if;

  if new.status <> old.status and not (
       (old.status = 'pending' and new.status in ('paid', 'expired'))
    or (old.status = 'expired' and new.status in ('paid', 'refund_required'))
    or (old.status = 'paid' and new.status in ('refund_required', 'refunded'))
    or (old.status = 'refund_required' and new.status in ('refunded', 'paid'))
  ) then
    raise exception 'orders: invalid status change % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create function public.settle_order_refunds(p_order_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_refunded bigint;
begin
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    return 'unknown_order';
  end if;

  if v_order.status not in ('paid', 'refund_required') then
    return 'recorded';
  end if;

  select coalesce(sum(r.amount_cents), 0) into v_refunded
  from public.refunds r
  where r.order_id = p_order_id and r.status = 'succeeded';

  if v_refunded < v_order.amount_cents then
    return 'recorded';
  end if;

  update public.orders o set status = 'refunded' where o.id = p_order_id;

  if v_order.paid_at is not null then
    update public.deals d set stock = d.stock + 1 where d.id = v_order.deal_id;
  end if;

  update public.refunds r
  set status = 'failed'
  where r.order_id = p_order_id and r.status = 'requested';

  return 'refunded';
end;
$$;

create function public.request_refund(
  p_order_id uuid,
  p_user_id uuid,
  p_max_age interval
)
returns table (
  outcome text,
  refund_id uuid,
  payment_intent_id text
)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_order public.orders;
  v_refund public.refunds;
begin
  select * into v_order
  from public.orders o
  where o.id = p_order_id and o.user_id = p_user_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text;
    return;
  end if;

  select * into v_refund
  from public.refunds r
  where r.order_id = p_order_id and r.status = 'requested' and r.reason <> 'external';
  if found then
    return query select 'already_requested'::text, v_refund.id, v_order.stripe_payment_intent_id;
    return;
  end if;

  if v_order.status = 'refunded' then
    return query select 'already_refunded'::text, null::uuid, null::text;
    return;
  end if;

  if v_order.status <> 'paid'
     or v_order.stripe_payment_intent_id is null
     or v_order.paid_at < now() - p_max_age then
    return query select 'not_refundable'::text, null::uuid, null::text;
    return;
  end if;

  insert into public.refunds (order_id, stripe_payment_intent_id, reason)
  values (v_order.id, v_order.stripe_payment_intent_id, 'customer_request')
  returning * into v_refund;

  update public.orders o set status = 'refund_required' where o.id = v_order.id;

  return query select 'requested'::text, v_refund.id, v_order.stripe_payment_intent_id;
end;
$$;

create function public.record_refund(
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
      v_outcome := 'ignored';
    else
      insert into public.refunds
        (order_id, stripe_refund_id, stripe_payment_intent_id, amount_cents, reason, status)
      values
        (v_order_id, p_stripe_refund_id, p_payment_intent_id, p_amount_cents, 'external', p_status)
      on conflict (stripe_refund_id) do nothing;

      select * into v_refund from public.refunds r
      where r.stripe_refund_id = p_stripe_refund_id
      for update;
    end if;
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
    v_outcome := 'unknown_order';
  elsif v_order.status in ('paid', 'refunded') then
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

revoke all on function
  public.refunds_touch(),
  public.settle_order_refunds(uuid),
  public.request_refund(uuid, uuid, interval),
  public.record_refund(text, text, integer, text, uuid, text, text, jsonb)
from public, anon, authenticated;

grant execute on function
  public.settle_order_refunds(uuid),
  public.request_refund(uuid, uuid, interval),
  public.record_refund(text, text, integer, text, uuid, text, text, jsonb)
to service_role;
