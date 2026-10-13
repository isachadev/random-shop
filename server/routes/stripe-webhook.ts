import { Hono } from "hono"
import type Stripe from "stripe"
import { getPaymentEventService } from "../container"
import { serverEnv } from "../env"
import { getStripe } from "../stripe/stripe-client"

export const stripeWebhookRoutes = new Hono().post("/", async (c) => {
  const signature = c.req.header("stripe-signature")
  if (!signature) return c.json({ error: "Missing signature" }, 400)

  const rawBody = await c.req.text()

  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(
      rawBody,
      signature,
      serverEnv.stripeWebhookSecret
    )
  } catch {
    return c.json({ error: "Invalid signature" }, 400)
  }

  const outcome = await getPaymentEventService().handle(event)
  return c.json({ received: true, outcome })
})
