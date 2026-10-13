import type { CheckoutOrder } from "../repositories/order-repository"

export interface CheckoutSessionInput {
  order: CheckoutOrder
  customerEmail: string | null
  origin: string
}

export interface CheckoutSession {
  id: string
  url: string
}

export interface CheckoutGateway {
  createSession(input: CheckoutSessionInput): Promise<CheckoutSession>
}
