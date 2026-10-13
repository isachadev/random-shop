import type Stripe from "stripe"
import type {
  PaymentEvent,
  PaymentEventRepository,
} from "../repositories/payment-event-repository"
import { toRefundStatus } from "../stripe/refund-status"
import { isUuid } from "../validation/guards"
import type { RefundService } from "./refund-service"

const idOf = (value: string | { id: string } | null): string | null =>
  typeof value === "string" ? value : (value?.id ?? null)

const toPaymentEvent = (
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): PaymentEvent => ({
  eventId: event.id,
  eventType: event.type,
  sessionId: session.id,
  payload: {
    created: event.created,
    livemode: event.livemode,
    payment_status: session.payment_status,
    amount_total: session.amount_total,
    order_id: session.client_reference_id,
  },
})

export class PaymentEventService {
  constructor(
    private readonly events: PaymentEventRepository,
    private readonly refunds: RefundService
  ) {}

  async handle(event: Stripe.Event): Promise<string> {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return this.onPaid(event, event.data.object)
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        return this.events.releaseExpired(toPaymentEvent(event, event.data.object))
      case "refund.created":
      case "refund.updated":
      case "refund.failed":
        return this.onRefund(event, event.data.object)
      default:
        return "ignored"
    }
  }

  private async onPaid(
    event: Stripe.Event,
    session: Stripe.Checkout.Session
  ): Promise<string> {
    if (session.payment_status !== "paid") return "awaiting_payment"

    const outcome = await this.events.fulfillPaid({
      ...toPaymentEvent(event, session),
      paymentIntentId: idOf(session.payment_intent),
    })

    if (outcome === "unknown_order") {
      console.error(`Stripe event ${event.id}: paid session ${session.id} has no order`)
    }

    await this.refunds.settleForSession(session.id)
    return outcome
  }

  private onRefund(event: Stripe.Event, refund: Stripe.Refund): Promise<string> {
    const ownRefundId = refund.metadata?.refund_id

    return this.refunds.recordReport({
      stripeRefundId: refund.id,
      status: toRefundStatus(refund.status),
      amountCents: refund.amount,
      paymentIntentId: idOf(refund.payment_intent),
      refundId: isUuid(ownRefundId) ? ownRefundId : null,
      event: {
        id: event.id,
        type: event.type,
        payload: {
          created: event.created,
          livemode: event.livemode,
          refund_status: refund.status,
          amount: refund.amount,
        },
      },
    })
  }
}
