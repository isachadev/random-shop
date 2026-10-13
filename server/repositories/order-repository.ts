import type { OrderStatus } from "@/domain/order"
import type { Purchase } from "@/domain/purchase"

export type ReserveOutcome =
  | "reserved"
  | "replayed"
  | "already_ordered"
  | "sold_out"
  | "not_found"

export interface Reservation {
  outcome: ReserveOutcome
  orderId: string | null
}

export interface ReserveInput {
  userId: string
  dealId: string
  idempotencyKey: string
}

export interface CheckoutOrder {
  id: string
  status: OrderStatus
  amountCents: number
  createdAt: string
  dealName: string
  dealEmoji: string
}

export interface OrderRepository {
  reserve(input: ReserveInput): Promise<Reservation>
  findForCheckout(orderId: string): Promise<CheckoutOrder | null>
  attachCheckoutSession(orderId: string, sessionId: string): Promise<boolean>
  listPurchases(userId: string): Promise<Purchase[]>
  findStatus(userId: string, orderId: string): Promise<OrderStatus | null>
}
