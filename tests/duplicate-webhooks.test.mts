import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buy,
  countOf,
  countRows,
  createBuyer,
  createDeal,
  newId,
  paymentWebhook,
  refundWebhook,
  reserveWithSession,
  retireDeal,
  statusOf,
  stockOf,
  times,
} from "./support/shop.mts"

test("the same payment webhook 3 times: the order is paid once", async (t) => {
  const dealId = await createDeal(2)
  t.after(() => retireDeal(dealId))
  const order = await reserveWithSession(await createBuyer(), dealId)
  const eventId = newId("evt")

  const results = await times(3, () =>
    paymentWebhook(eventId, order.sessionId, order.paymentIntentId)
  )

  assert.equal(countOf(results, "paid"), 1)
  assert.equal(countOf(results, "duplicate_event"), 2)
  assert.equal(await statusOf(order.orderId), "paid")
  assert.equal(await countRows("stripe_events", "id", eventId), 1)
  assert.equal(await stockOf(dealId), 1)
})

test("the same refund webhook 3 times: one refund, the unit returns once", async (t) => {
  const dealId = await createDeal(2)
  t.after(() => retireDeal(dealId))
  const order = await buy(await createBuyer(), dealId)
  const eventId = newId("evt")
  const refundId = newId("re")

  const results = await times(3, () =>
    refundWebhook(eventId, refundId, 1000, order.paymentIntentId)
  )

  assert.equal(countOf(results, "refunded"), 1)
  assert.equal(countOf(results, "duplicate_event"), 2)
  assert.equal(await statusOf(order.orderId), "refunded")
  assert.equal(await countRows("refunds", "order_id", order.orderId), 1)
  assert.equal(await stockOf(dealId), 2)
})

test("a refund webhook that arrives before its payment is kept and applied later", async (t) => {
  const dealId = await createDeal(1)
  t.after(() => retireDeal(dealId))
  const order = await reserveWithSession(await createBuyer(), dealId)
  const eventId = newId("evt")
  const refundId = newId("re")

  const early = await times(3, () =>
    refundWebhook(eventId, refundId, 1000, order.paymentIntentId)
  )

  assert.equal(countOf(early, "parked"), 1)
  assert.equal(countOf(early, "duplicate_event"), 2)
  assert.equal(await statusOf(order.orderId), "pending")

  const payment = await paymentWebhook(newId("evt"), order.sessionId, order.paymentIntentId)

  assert.equal(payment.outcome, "paid")
  assert.equal(await statusOf(order.orderId), "refunded")
  assert.equal(await countRows("refunds", "order_id", order.orderId), 1)
  assert.equal(await stockOf(dealId), 1)
})
