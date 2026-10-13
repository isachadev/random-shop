import type { RefundResult } from "@/domain/refund"
import { REFUND_WINDOW_DAYS } from "../refund-policy"
import type {
  OpenRefund,
  RefundRecordOutcome,
  RefundReport,
  RefundRepository,
} from "../repositories/refund-repository"
import type { RefundGateway } from "../stripe/refund-gateway"

export class RefundService {
  constructor(
    private readonly refunds: RefundRepository,
    private readonly gateway: RefundGateway
  ) {}

  async requestByCustomer(userId: string, orderId: string): Promise<RefundResult> {
    const request = await this.refunds.request(orderId, userId, REFUND_WINDOW_DAYS)

    if (request.outcome === "not_found") return { outcome: "not_found" }
    if (request.outcome === "not_refundable") return { outcome: "not_refundable" }
    if (request.outcome === "already_refunded") return { outcome: "refunded" }
    if (!request.refundId || !request.paymentIntentId) {
      throw new Error(`Refund request for order ${orderId} has no payment`)
    }

    const outcome = await this.send({
      refundId: request.refundId,
      paymentIntentId: request.paymentIntentId,
    })
    return { outcome: outcome === "refunded" ? "refunded" : "pending" }
  }

  async settleForSession(sessionId: string): Promise<void> {
    const open = await this.refunds.findOpenBySession(sessionId)
    if (open) await this.send(open)
  }

  async recordReport(report: RefundReport): Promise<RefundRecordOutcome> {
    const outcome = await this.refunds.record(report)
    if (outcome === "conflict") {
      console.error(
        `Refund ${report.stripeRefundId}: Stripe now says "${report.status}" for a finished refund. Check it by hand.`
      )
    }
    return outcome
  }

  private async send(open: OpenRefund): Promise<RefundRecordOutcome> {
    const receipt = await this.gateway.refund(open)
    return this.refunds.record({ ...receipt, ...open })
  }
}
