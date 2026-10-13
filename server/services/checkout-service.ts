import type { CheckoutResult } from "@/domain/checkout"
import type { OrderRepository } from "../repositories/order-repository"
import type { CheckoutGateway } from "../stripe/checkout-gateway"
import type { AuthenticatedUser } from "../types"

export interface StartCheckoutInput {
  user: AuthenticatedUser
  dealId: string
  idempotencyKey: string
  origin: string
}

export class CheckoutService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly gateway: CheckoutGateway
  ) {}

  async start(input: StartCheckoutInput): Promise<CheckoutResult> {
    const reservation = await this.orders.reserve({
      userId: input.user.id,
      dealId: input.dealId,
      idempotencyKey: input.idempotencyKey,
    })

    if (reservation.outcome === "sold_out") return { outcome: "sold_out" }
    if (reservation.outcome === "not_found") return { outcome: "not_found" }
    if (!reservation.orderId) throw new Error("Reservation has no order")

    const order = await this.orders.findForCheckout(reservation.orderId)
    if (!order) throw new Error(`Order ${reservation.orderId} not found`)
    if (order.status === "paid") return { outcome: "already_purchased" }
    if (order.status !== "pending") return { outcome: "expired" }

    const session = await this.gateway.createSession({
      order,
      customerEmail: input.user.email,
      origin: input.origin,
    })

    const attached = await this.orders.attachCheckoutSession(order.id, session.id)
    if (!attached) return { outcome: "expired" }

    return { outcome: "redirect", url: session.url }
  }
}
