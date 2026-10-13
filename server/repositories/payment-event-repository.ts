export type FulfillOutcome =
  | "duplicate_event"
  | "unknown_order"
  | "paid"
  | "already_paid"
  | "paid_after_expiry"
  | "refund_required"
  | "ignored"

export type ReleaseOutcome =
  | "duplicate_event"
  | "unknown_order"
  | "released"
  | "noop"

export interface PaymentEvent {
  eventId: string
  eventType: string
  sessionId: string
  payload: Record<string, unknown>
}

export interface PaidEvent extends PaymentEvent {
  paymentIntentId: string | null
}

export interface PaymentEventRepository {
  fulfillPaid(event: PaidEvent): Promise<FulfillOutcome>
  releaseExpired(event: PaymentEvent): Promise<ReleaseOutcome>
}
