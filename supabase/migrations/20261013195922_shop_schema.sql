
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  emoji text not null,
  category text not null,
  original_price_cents integer not null check (original_price_cents > 0),
  price_cents integer not null check (price_cents > 0),
  discount_percent integer generated always as (
    round(100 - price_cents * 100.0 / original_price_cents)::integer
  ) stored,
  initial_stock integer not null check (initial_stock > 0),
  stock integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint deals_price_below_original check (price_cents < original_price_cents),
  constraint deals_stock_in_range check (stock >= 0 and stock <= initial_stock)
);

create index deals_available_idx on public.deals (id)
  where is_active and stock > 0;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  deal_id uuid not null references public.deals (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'expired', 'refund_required', 'refunded')),
  amount_cents integer not null check (amount_cents > 0),
  idempotency_key text not null check (length(idempotency_key) between 1 and 255),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_user_idempotency_key unique (user_id, idempotency_key),
  constraint orders_paid_has_timestamp check (status <> 'paid' or paid_at is not null)
);

create unique index orders_one_active_per_user_deal
  on public.orders (user_id, deal_id)
  where status in ('pending', 'paid');

create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_deal_idx on public.orders (deal_id);
create index orders_pending_expiry_idx on public.orders (expires_at)
  where status = 'pending';

create function public.orders_guard_update()
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
    or (old.status = 'paid' and new.status = 'refunded')
    or (old.status = 'refund_required' and new.status = 'refunded')
  ) then
    raise exception 'orders: invalid status change % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_guard_update
  before update on public.orders
  for each row execute function public.orders_guard_update();

create table public.stripe_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  outcome text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.deals enable row level security;
alter table public.orders enable row level security;
alter table public.stripe_events enable row level security;

revoke all on public.deals, public.orders, public.stripe_events from anon, authenticated;

grant select on public.deals to authenticated;
grant select on public.orders to authenticated;

create policy deals_select_active on public.deals
  for select to authenticated
  using (is_active);

create policy orders_select_own on public.orders
  for select to authenticated
  using ((select auth.uid()) = user_id);


grant select, insert, update on public.deals, public.orders, public.stripe_events to service_role;

create function public.reserve_deal(
  p_user_id uuid,
  p_deal_id uuid,
  p_idempotency_key text,
  p_hold_seconds integer default 300
)
returns table (
  outcome text,
  order_id uuid,
  amount_cents integer,
  expires_at timestamptz
)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_order public.orders;
  v_price integer;
begin
  if p_hold_seconds not between 30 and 1800 then
    raise exception 'hold must be between 30 and 1800 seconds' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders o
  where o.user_id = p_user_id and o.idempotency_key = p_idempotency_key;
  if found then
    return query select 'replayed'::text, v_order.id, v_order.amount_cents, v_order.expires_at;
    return;
  end if;

  begin
    update public.deals d
    set stock = d.stock - 1
    where d.id = p_deal_id and d.is_active and d.stock > 0
    returning d.price_cents into v_price;

    if not found then
      return query select
        case when exists (select 1 from public.deals d where d.id = p_deal_id and d.is_active)
          then 'sold_out' else 'not_found' end,
        null::uuid, null::integer, null::timestamptz;
      return;
    end if;

    insert into public.orders (user_id, deal_id, amount_cents, idempotency_key, expires_at)
    values (p_user_id, p_deal_id, v_price, p_idempotency_key,
            now() + make_interval(secs => p_hold_seconds))
    returning * into v_order;
  exception when unique_violation then
    select * into v_order
    from public.orders o
    where o.user_id = p_user_id and o.idempotency_key = p_idempotency_key;
    if found then
      return query select 'replayed'::text, v_order.id, v_order.amount_cents, v_order.expires_at;
      return;
    end if;

    select * into v_order
    from public.orders o
    where o.user_id = p_user_id and o.deal_id = p_deal_id and o.status in ('pending', 'paid');
    return query select 'already_ordered'::text, v_order.id, v_order.amount_cents, v_order.expires_at;
    return;
  end;

  return query select 'reserved'::text, v_order.id, v_order.amount_cents, v_order.expires_at;
end;
$$;

create function public.attach_checkout_session(p_order_id uuid, p_session_id text)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update public.orders o
  set stripe_checkout_session_id = p_session_id
  where o.id = p_order_id
    and o.status = 'pending'
    and (o.stripe_checkout_session_id is null or o.stripe_checkout_session_id = p_session_id);
  return found;
end;
$$;

create function public.record_stripe_event(p_event_id text, p_type text, p_payload jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  insert into public.stripe_events (id, type, payload)
  values (p_event_id, p_type, p_payload)
  on conflict (id) do nothing;
  return found;
end;
$$;

create function public.fulfill_paid_order(
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
        update public.orders o
        set status = 'refund_required', stripe_payment_intent_id = p_payment_intent_id
        where o.id = v_order.id;
        v_outcome := 'refund_required';
      end if;
    exception when unique_violation then
      update public.orders o
      set status = 'refund_required', stripe_payment_intent_id = p_payment_intent_id
      where o.id = v_order.id;
      v_outcome := 'refund_required';
    end;
  else
    v_outcome := 'ignored';
  end if;

  update public.stripe_events e
  set outcome = v_outcome, processed_at = now()
  where e.id = p_event_id;

  return v_outcome;
end;
$$;

create function public.release_expired_order(
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
    v_outcome := 'unknown_order';
  elsif v_order.status = 'pending' then
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

create function public.expire_stale_orders(p_limit integer default 500)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not pg_try_advisory_xact_lock(hashtext('public.expire_stale_orders')) then
    return 0;
  end if;

  with stale as (
    select o.id
    from public.orders o
    where o.status = 'pending' and o.expires_at <= now()
    order by o.expires_at
    limit p_limit
    for update skip locked
  ), expired as (
    update public.orders o
    set status = 'expired'
    from stale s
    where o.id = s.id
    returning o.deal_id
  ), released as (
    select e.deal_id, count(*)::integer as units
    from expired e
    group by e.deal_id
  ), restocked as (
    update public.deals d
    set stock = d.stock + r.units
    from released r
    where d.id = r.deal_id
    returning d.id
  )
  select count(*)::integer into v_count from expired;

  return v_count;
end;
$$;

revoke all on function
  public.orders_guard_update(),
  public.reserve_deal(uuid, uuid, text, integer),
  public.attach_checkout_session(uuid, text),
  public.record_stripe_event(text, text, jsonb),
  public.fulfill_paid_order(text, text, text, text, jsonb),
  public.release_expired_order(text, text, text, jsonb),
  public.expire_stale_orders(integer)
from public, anon, authenticated;

grant execute on function
  public.reserve_deal(uuid, uuid, text, integer),
  public.attach_checkout_session(uuid, text),
  public.record_stripe_event(text, text, jsonb),
  public.fulfill_paid_order(text, text, text, text, jsonb),
  public.release_expired_order(text, text, text, jsonb),
  public.expire_stale_orders(integer)
to service_role;

create extension if not exists pg_cron;

select cron.schedule(
  'expire-stale-orders',
  '30 seconds',
  $$select public.expire_stale_orders()$$
);
