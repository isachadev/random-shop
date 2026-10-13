import type { SupabaseClient } from "@supabase/supabase-js"
import type { OrderStatus } from "@/domain/order"
import type { Purchase, PurchaseStatus } from "@/domain/purchase"
import { UnknownUserError } from "../errors"
import { isWithinRefundWindow } from "../refund-policy"
import { unwrap } from "../supabase/unwrap"
import type {
  CheckoutOrder,
  OrderRepository,
  Reservation,
  ReserveInput,
  ReserveOutcome,
} from "./order-repository"

interface ReservationRow {
  outcome: ReserveOutcome
  order_id: string | null
}

interface CheckoutOrderRow {
  id: string
  status: OrderStatus
  amount_cents: number
  created_at: string
  deals: { name: string; emoji: string }
}

type PurchaseRowStatus = "paid" | "refund_required" | "refunded"

interface PurchaseRow {
  id: string
  status: PurchaseRowStatus
  amount_cents: number
  paid_at: string
  deals: {
    name: string
    emoji: string
    category: string
    original_price_cents: number
  }
}

const FOREIGN_KEY_VIOLATION = "23503"

const PURCHASE_STATUS: Record<PurchaseRowStatus, PurchaseStatus> = {
  paid: "owned",
  refund_required: "refund_pending",
  refunded: "refunded",
}

const toPurchase = (row: PurchaseRow): Purchase => ({
  id: row.id,
  name: row.deals.name,
  emoji: row.deals.emoji,
  category: row.deals.category,
  originalPriceCents: row.deals.original_price_cents,
  priceCents: row.amount_cents,
  discountPercent: Math.round(
    100 - (row.amount_cents * 100) / row.deals.original_price_cents
  ),
  purchasedAt: row.paid_at,
  status: PURCHASE_STATUS[row.status],
  canRefund: row.status === "paid" && isWithinRefundWindow(row.paid_at),
})

export class SupabaseOrderRepository implements OrderRepository {
  constructor(private readonly db: SupabaseClient) {}

  async reserve(input: ReserveInput): Promise<Reservation> {
    const result = await this.db
      .rpc("reserve_deal", {
        p_user_id: input.userId,
        p_deal_id: input.dealId,
        p_idempotency_key: input.idempotencyKey,
      })
      .single<ReservationRow>()

    if (
      result.error?.code === FOREIGN_KEY_VIOLATION &&
      result.error.message.includes("orders_user_id_fkey")
    ) {
      throw new UnknownUserError()
    }

    const row = unwrap(result)
    if (!row) throw new Error("reserve_deal returned no row")
    return { outcome: row.outcome, orderId: row.order_id }
  }

  async findForCheckout(orderId: string): Promise<CheckoutOrder | null> {
    const row = unwrap(
      await this.db
        .from("orders")
        .select("id, status, amount_cents, created_at, deals(name, emoji)")
        .eq("id", orderId)
        .maybeSingle<CheckoutOrderRow>()
    )
    if (!row) return null
    return {
      id: row.id,
      status: row.status,
      amountCents: row.amount_cents,
      createdAt: row.created_at,
      dealName: row.deals.name,
      dealEmoji: row.deals.emoji,
    }
  }

  async attachCheckoutSession(
    orderId: string,
    sessionId: string
  ): Promise<boolean> {
    const attached = unwrap(
      await this.db.rpc("attach_checkout_session", {
        p_order_id: orderId,
        p_session_id: sessionId,
      })
    )
    return attached === true
  }

  async listPurchases(userId: string): Promise<Purchase[]> {
    const rows = unwrap(
      await this.db
        .from("orders")
        .select(
          "id, status, amount_cents, paid_at, deals(name, emoji, category, original_price_cents)"
        )
        .eq("user_id", userId)
        .in("status", Object.keys(PURCHASE_STATUS))
        .not("paid_at", "is", null)
        .order("paid_at", { ascending: false })
        .overrideTypes<PurchaseRow[], { merge: false }>()
    )
    return (rows ?? []).map(toPurchase)
  }

  async findStatus(
    userId: string,
    orderId: string
  ): Promise<OrderStatus | null> {
    const row = unwrap(
      await this.db
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .eq("user_id", userId)
        .maybeSingle<{ status: OrderStatus }>()
    )
    return row?.status ?? null
  }
}
