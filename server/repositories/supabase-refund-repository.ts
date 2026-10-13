import type { SupabaseClient } from "@supabase/supabase-js"
import { unwrap } from "../supabase/unwrap"
import type {
  OpenRefund,
  RefundRecordOutcome,
  RefundReport,
  RefundRepository,
  RefundRequest,
  RefundRequestOutcome,
} from "./refund-repository"

interface RefundRequestRow {
  outcome: RefundRequestOutcome
  refund_id: string | null
  payment_intent_id: string | null
}

export class SupabaseRefundRepository implements RefundRepository {
  constructor(private readonly db: SupabaseClient) {}

  async request(
    orderId: string,
    userId: string,
    maxAgeDays: number
  ): Promise<RefundRequest> {
    const row = unwrap(
      await this.db
        .rpc("request_refund", {
          p_order_id: orderId,
          p_user_id: userId,
          p_max_age: `${maxAgeDays} days`,
        })
        .single<RefundRequestRow>()
    )
    if (!row) throw new Error("request_refund returned no row")
    return {
      outcome: row.outcome,
      refundId: row.refund_id,
      paymentIntentId: row.payment_intent_id,
    }
  }

  async findOpenBySession(sessionId: string): Promise<OpenRefund | null> {
    const order = unwrap(
      await this.db
        .from("orders")
        .select("id")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle<{ id: string }>()
    )
    if (!order) return null

    const refund = unwrap(
      await this.db
        .from("refunds")
        .select("id, stripe_payment_intent_id")
        .eq("order_id", order.id)
        .eq("status", "requested")
        .neq("reason", "external")
        .maybeSingle<{ id: string; stripe_payment_intent_id: string | null }>()
    )
    if (!refund?.stripe_payment_intent_id) return null
    return { refundId: refund.id, paymentIntentId: refund.stripe_payment_intent_id }
  }

  async record(report: RefundReport): Promise<RefundRecordOutcome> {
    const outcome = unwrap(
      await this.db.rpc("record_refund", {
        p_stripe_refund_id: report.stripeRefundId,
        p_status: report.status,
        p_amount_cents: report.amountCents,
        p_payment_intent_id: report.paymentIntentId,
        p_refund_id: report.refundId ?? null,
        p_event_id: report.event?.id ?? null,
        p_event_type: report.event?.type ?? null,
        p_payload: report.event?.payload ?? null,
      })
    )
    return outcome as RefundRecordOutcome
  }
}
