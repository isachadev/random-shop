import type { SupabaseClient } from "@supabase/supabase-js"
import { unwrap } from "../supabase/unwrap"
import type {
  FulfillOutcome,
  PaidEvent,
  PaymentEvent,
  PaymentEventRepository,
  ReleaseOutcome,
} from "./payment-event-repository"

export class SupabasePaymentEventRepository implements PaymentEventRepository {
  constructor(private readonly db: SupabaseClient) {}

  async fulfillPaid(event: PaidEvent): Promise<FulfillOutcome> {
    const outcome = unwrap(
      await this.db.rpc("fulfill_paid_order", {
        p_event_id: event.eventId,
        p_event_type: event.eventType,
        p_session_id: event.sessionId,
        p_payment_intent_id: event.paymentIntentId,
        p_payload: event.payload,
      })
    )
    return outcome as FulfillOutcome
  }

  async releaseExpired(event: PaymentEvent): Promise<ReleaseOutcome> {
    const outcome = unwrap(
      await this.db.rpc("release_expired_order", {
        p_event_id: event.eventId,
        p_event_type: event.eventType,
        p_session_id: event.sessionId,
        p_payload: event.payload,
      })
    )
    return outcome as ReleaseOutcome
  }
}
