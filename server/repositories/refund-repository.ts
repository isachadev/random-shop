export type RefundStatus = "requested" | "succeeded" | "failed"

export type RefundRequestOutcome =
  | "requested"
  | "already_requested"
  | "already_refunded"
  | "not_refundable"
  | "not_found"

export interface RefundRequest {
  outcome: RefundRequestOutcome
  refundId: string | null
  paymentIntentId: string | null
}

export interface OpenRefund {
  refundId: string
  paymentIntentId: string
}

export interface RefundReport {
  stripeRefundId: string
  status: RefundStatus
  amountCents: number | null
  paymentIntentId: string | null
  refundId?: string | null
  event?: { id: string; type: string; payload: Record<string, unknown> }
}

export type RefundRecordOutcome =
  | "duplicate_event"
  | "refunded"
  | "recorded"
  | "failed"
  | "parked"
  | "conflict"
  | "ignored"

export interface RefundRepository {
  request(orderId: string, userId: string, maxAgeDays: number): Promise<RefundRequest>
  findOpenBySession(sessionId: string): Promise<OpenRefund | null>
  record(report: RefundReport): Promise<RefundRecordOutcome>
}
