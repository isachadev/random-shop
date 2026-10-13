import { randomUUID } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"])

function connectToLocalDatabase(): SupabaseClient {
  try {
    process.loadEnvFile(".env.local")
  } catch {}

  const url = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.TEST_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, or the TEST_ versions.")
  }
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) {
    throw new Error(`Refusing to run against ${url}: these tests write data and only run on a local Supabase.`)
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export const db = connectToLocalDatabase()

export interface Call {
  outcome: string | null
  errorCode: string | null
}

export interface PaidOrder {
  orderId: string
  sessionId: string
  paymentIntentId: string
}

export const newId = (prefix: string) => `${prefix}_test_${randomUUID()}`

function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  if (result.data === null) throw new Error("Expected a row, got none")
  return result.data
}

async function call(name: string, args: Record<string, unknown>): Promise<Call> {
  const { data, error } = await db.rpc(name, args)
  return { outcome: typeof data === "string" ? data : null, errorCode: error?.code ?? null }
}

export async function createBuyer(): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({
    email: `test-${randomUUID()}@test.dev`,
    password: randomUUID(),
    email_confirm: true,
  })
  if (error) throw new Error(error.message)
  return data.user.id
}

export async function createDeal(stock: number): Promise<string> {
  const deal = must(
    await db
      .from("deals")
      .insert({
        name: `Test deal ${randomUUID().slice(0, 8)}`,
        emoji: "🧪",
        category: "Test",
        original_price_cents: 2000,
        price_cents: 1000,
        initial_stock: stock,
        stock,
      })
      .select("id")
      .single<{ id: string }>()
  )
  return deal.id
}

export async function retireDeal(dealId: string): Promise<void> {
  must(await db.from("deals").update({ is_active: false }).eq("id", dealId).select("id"))
}

export async function stockOf(dealId: string): Promise<number> {
  return must(
    await db.from("deals").select("stock").eq("id", dealId).single<{ stock: number }>()
  ).stock
}

export async function statusOf(orderId: string): Promise<string> {
  return must(
    await db.from("orders").select("status").eq("id", orderId).single<{ status: string }>()
  ).status
}

export async function countRows(table: string, column: string, value: string): Promise<number> {
  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function reserve(
  buyerId: string,
  dealId: string,
  idempotencyKey: string = randomUUID()
): Promise<{ outcome: string; orderId: string | null }> {
  const row = must(
    await db
      .rpc("reserve_deal", {
        p_user_id: buyerId,
        p_deal_id: dealId,
        p_idempotency_key: idempotencyKey,
      })
      .single<{ outcome: string; order_id: string | null }>()
  )
  return { outcome: row.outcome, orderId: row.order_id }
}

export async function attachSession(orderId: string, sessionId: string): Promise<void> {
  must(await db.rpc("attach_checkout_session", { p_order_id: orderId, p_session_id: sessionId }))
}

export function paymentWebhook(
  eventId: string,
  sessionId: string,
  paymentIntentId: string
): Promise<Call> {
  return call("fulfill_paid_order", {
    p_event_id: eventId,
    p_event_type: "checkout.session.completed",
    p_session_id: sessionId,
    p_payment_intent_id: paymentIntentId,
    p_payload: {},
  })
}

export function refundWebhook(
  eventId: string,
  stripeRefundId: string,
  amountCents: number,
  paymentIntentId: string | null
): Promise<Call> {
  return call("record_refund", {
    p_stripe_refund_id: stripeRefundId,
    p_status: "succeeded",
    p_amount_cents: amountCents,
    p_payment_intent_id: paymentIntentId,
    p_event_id: eventId,
    p_event_type: "refund.updated",
    p_payload: {},
  })
}

export async function reserveWithSession(
  buyerId: string,
  dealId: string
): Promise<PaidOrder> {
  const { orderId } = await reserve(buyerId, dealId)
  if (!orderId) throw new Error("Could not reserve the deal")

  const sessionId = newId("cs")
  await attachSession(orderId, sessionId)
  return { orderId, sessionId, paymentIntentId: newId("pi") }
}

export async function buy(buyerId: string, dealId: string): Promise<PaidOrder> {
  const order = await reserveWithSession(buyerId, dealId)
  await paymentWebhook(newId("evt"), order.sessionId, order.paymentIntentId)
  return order
}

export function times<T>(count: number, make: () => Promise<T>): Promise<T[]> {
  return Promise.all(Array.from({ length: count }, make))
}

export const countOf = (calls: Call[], outcome: string): number =>
  calls.filter((result) => result.outcome === outcome).length
