import assert from "node:assert/strict"
import { test } from "node:test"
import {
  countRows,
  createBuyer,
  createDeal,
  reserve,
  retireDeal,
  stockOf,
  times,
} from "./support/shop.mts"

test("simultaneous buyers of the last unit: exactly one order", async (t) => {
  const dealId = await createDeal(1)
  t.after(() => retireDeal(dealId))
  const buyers = await times(10, createBuyer)

  const results = await Promise.all(buyers.map((buyer) => reserve(buyer, dealId)))
  const outcomes = results.map((result) => result.outcome)

  assert.equal(outcomes.filter((outcome) => outcome === "reserved").length, 1)
  assert.equal(outcomes.filter((outcome) => outcome === "sold_out").length, 9)
  assert.equal(await stockOf(dealId), 0)
  assert.equal(await countRows("orders", "deal_id", dealId), 1)
})

test("the same click sent several times takes one unit", async (t) => {
  const dealId = await createDeal(3)
  t.after(() => retireDeal(dealId))
  const buyer = await createBuyer()
  const idempotencyKey = "same-click-key"

  const results = await times(5, () => reserve(buyer, dealId, idempotencyKey))
  const outcomes = results.map((result) => result.outcome)

  assert.equal(outcomes.filter((outcome) => outcome === "reserved").length, 1)
  assert.equal(outcomes.filter((outcome) => outcome === "replayed").length, 4)
  assert.equal(new Set(results.map((result) => result.orderId)).size, 1)
  assert.equal(await stockOf(dealId), 2)
})
