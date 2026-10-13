export type FulfillOutcome =
  | "duplicate_event"
  | "paid"
  | "already_paid"
  | "paid_after_expiry"
  | "refund_required"
  | "ignored"

export type ReleaseOutcome =
  | "duplicate_event"
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
