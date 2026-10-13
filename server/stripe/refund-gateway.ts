import type { OpenRefund, RefundStatus } from "../repositories/refund-repository"

export interface RefundReceipt {
  stripeRefundId: string
  status: RefundStatus
  amountCents: number
}

export interface RefundGateway {
  refund(refund: OpenRefund): Promise<RefundReceipt>
}
