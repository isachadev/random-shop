import assert from "node:assert/strict"
import { test } from "node:test"
import {
  attachSession,
  countRows,
  createBuyer,
  createDeal,
  newId,
  paymentWebhook,
  refundWebhook,
  reserve,
  retireDeal,
  statusOf,
} from "./support/shop.mts"

const UNMATCHED_EVENT = "RS001"

test("a payment event with no order is not consumed, so the retry is processed", async (t) => {
  const dealId = await createDeal(1)
  t.after(() => retireDeal(dealId))
  const eventId = newId("evt")
  const sessionId = newId("cs")
  const paymentIntentId = newId("pi")

  const tooEarly = await paymentWebhook(eventId, sessionId, paymentIntentId)

  assert.equal(tooEarly.errorCode, UNMATCHED_EVENT)
  assert.equal(await countRows("stripe_events", "id", eventId), 0)

  const { orderId } = await reserve(await createBuyer(), dealId)
  assert.ok(orderId)
  await attachSession(orderId, sessionId)

  const retry = await paymentWebhook(eventId, sessionId, paymentIntentId)

  assert.equal(retry.outcome, "paid")
  assert.equal(await statusOf(orderId), "paid")
})

test("a refund event that matches nothing is not consumed", async () => {
  const eventId = newId("evt")

  const first = await refundWebhook(eventId, newId("re"), 1000, null)
  const second = await refundWebhook(eventId, newId("re"), 1000, null)

  assert.equal(first.errorCode, UNMATCHED_EVENT)
  assert.equal(second.errorCode, UNMATCHED_EVENT)
  assert.equal(await countRows("stripe_events", "id", eventId), 0)
})
