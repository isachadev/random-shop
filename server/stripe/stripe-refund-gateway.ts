import type Stripe from "stripe"
import type { OpenRefund } from "../repositories/refund-repository"
import type { RefundGateway, RefundReceipt } from "./refund-gateway"
import { toRefundStatus } from "./refund-status"

export class StripeRefundGateway implements RefundGateway {
  constructor(private readonly stripe: Stripe) {}

  async refund({ refundId, paymentIntentId }: OpenRefund): Promise<RefundReceipt> {
    const refund = await this.stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        metadata: { refund_id: refundId },
      },
      { idempotencyKey: `refund-${refundId}` }
    )

    return {
      stripeRefundId: refund.id,
      status: toRefundStatus(refund.status),
      amountCents: refund.amount,
    }
  }
}
