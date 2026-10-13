import type Stripe from "stripe"
import type {
  CheckoutGateway,
  CheckoutSession,
  CheckoutSessionInput,
} from "./checkout-gateway"

const SESSION_LIFETIME_SECONDS = 35 * 60

export class StripeCheckoutGateway implements CheckoutGateway {
  constructor(private readonly stripe: Stripe) {}

  async createSession({
    order,
    customerEmail,
    origin,
  }: CheckoutSessionInput): Promise<CheckoutSession> {
    const createdAtSeconds = Math.floor(new Date(order.createdAt).getTime() / 1000)

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        allowed_payment_method_types: ["card"],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: order.amountCents,
              product_data: { name: `${order.dealEmoji} ${order.dealName}` },
            },
          },
        ],
        client_reference_id: order.id,
        metadata: { order_id: order.id },
        payment_intent_data: { metadata: { order_id: order.id } },
        customer_email: customerEmail ?? undefined,
        expires_at: createdAtSeconds + SESSION_LIFETIME_SECONDS,
        success_url: `${origin}/purchases?order=${order.id}`,
        cancel_url: `${origin}/deals`,
      },
      { idempotencyKey: `checkout-${order.id}` }
    )

    if (!session.url) throw new Error("Stripe returned a session without a URL")
    return { id: session.id, url: session.url }
  }
}
