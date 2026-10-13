# Random Shop

A small shop that shows one random discounted product at a time. Stock is limited and the first buyer gets it. Payments and refunds go through Stripe.

This is a demo. It runs on Stripe test mode and the products are sample data.

## Stack

- Next.js 16 (App Router) for the UI, with shadcn/ui
- Hono for the API, mounted at `/api` inside Next (`server/`)
- Supabase: Postgres for data, Supabase Auth for login
- Stripe Checkout and webhooks

## How a purchase works

1. The buyer clicks **Buy now**. `POST /api/checkout` calls the Postgres function `reserve_deal`.
2. `reserve_deal` takes one unit with a single `UPDATE ... WHERE stock > 0`. The loser of a race gets `sold_out` and is never charged.
3. The winner holds the unit for 5 minutes and is sent to Stripe Checkout.
4. Stripe calls `POST /api/webhooks/stripe`. The order becomes `paid` there, not on the redirect back.
5. A hold that is never paid is released by a `pg_cron` job every 30 seconds.

## Decisions

**Postgres decides who is first, not the app.** Two requests can reach two server instances at the same moment, so the check and the decrement must be one atomic statement. A `CHECK (stock >= 0)` backs it up.

**The unit is held at the click, not at the payment.** Holding at payment would let two people pay for the last unit. The cost is that someone can block a unit for 5 minutes without paying.

**Idempotency lives in the database.** The server can crash or be retried at any point, so each layer has its own key:

| Repeated thing | What stops it |
|---|---|
| Same click (retry, double click) | `Idempotency-Key` header, unique on `(user_id, idempotency_key)` |
| Same buyer, same deal | Unique index on open orders per `(user_id, deal_id)` |
| Same call to Stripe | Stripe idempotency key built from our order or refund id |
| Same webhook | Stripe event id is the primary key of `stripe_events` |
| Same refund | Stripe refund id is unique in `refunds` |

**A webhook is recorded and applied in one transaction.** If applying it fails, the record is rolled back too, so Stripe's retry is processed instead of being dropped as a duplicate.

**Webhooks can arrive in any order.**

- A refund we start is written to `refunds` before Stripe is called, so the row exists before any webhook mentions it.
- A refund webhook for a payment we do not know yet is stored ("parked") and applied when the payment arrives.
- Status only moves forward: a late `pending` never undoes `succeeded`.
- Marking an order refunded and returning its unit to stock happens in one function (`settle_order_refunds`), under a row lock, so it happens once.

**An event that matches nothing is not consumed.** If a payment event has no order, or a refund has neither an order nor a payment, the function raises, the transaction rolls back, and the endpoint answers 500 with a `console.error`. Stripe sends it again later. Sessions that were not created by this shop are ignored with a 200.

**Refunds have three sources and one path.** Automatic (paid after the last unit was gone), requested by the buyer (within 7 days), and made by hand in the Stripe Dashboard. A fully refunded paid order returns its unit to stock; a partial refund leaves the order as it is.

**The browser can only read.** Row Level Security lets a user read active deals and their own orders. Every write goes through a Postgres function that only the server (`service_role`) may call.

## Run locally

Requires Node 24, Docker, the Supabase CLI and the Stripe CLI.

```bash
npm install
supabase start
```

Create `.env.local` with the values `supabase start` prints and your Stripe test keys:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Forward Stripe events to the app. The CLI must use the same Stripe account as `STRIPE_SECRET_KEY`:

```bash
stripe listen --api-key "$STRIPE_SECRET_KEY" \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.expired,checkout.session.async_payment_failed,refund.created,refund.updated,refund.failed \
  --forward-to localhost:3000/api/webhooks/stripe
```

```bash
npm run dev
```

Pay with the test card `4242 4242 4242 4242`. `supabase db reset --local` rebuilds the database and reloads the sample deals.

## Tests

```bash
supabase start
npm test
```

The tests run against the local database, because that is where the guarantees live. They refuse to run against a database that is not local. They cover:

- ten simultaneous buyers of the last unit produce one order
- the same click sent five times takes one unit
- the same payment webhook three times pays the order once
- the same refund webhook three times refunds once and returns one unit
- a refund webhook that arrives before its payment is kept and applied later
- an event that matches nothing is not consumed, so its retry is processed

## Known limits

- A refund whose call to Stripe fails is retried only when the buyer presses "Retry refund" or Stripe redelivers the event. There is no background retry.
- Problems that need a person (an unmatched event, a refund Stripe reverses) are only written to the server log.
- Disputes and chargebacks are not handled.
- Each environment needs its own Stripe account or sandbox. If two environments share one, each receives the other's events and answers 500 for them.
- Cancelling on the Stripe page keeps the unit held until the 5 minutes pass.

## Layout

```
app/        routes and pages
components/ UI, one job per file
hooks/      client state for checkout, refunds and confirmation
services/   browser-side interfaces and their API implementations
domain/     types shared by browser and server
server/     Hono API: routes, services, repositories, Stripe gateways
supabase/   migrations and sample data
tests/      database tests
```
