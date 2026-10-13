import "server-only"
import { SupabaseDealRepository } from "./repositories/supabase-deal-repository"
import { SupabaseOrderRepository } from "./repositories/supabase-order-repository"
import { SupabasePaymentEventRepository } from "./repositories/supabase-payment-event-repository"
import { SupabaseRefundRepository } from "./repositories/supabase-refund-repository"
import { CheckoutService } from "./services/checkout-service"
import { PaymentEventService } from "./services/payment-event-service"
import { RefundService } from "./services/refund-service"
import { StripeCheckoutGateway } from "./stripe/stripe-checkout-gateway"
import { getStripe } from "./stripe/stripe-client"
import { StripeRefundGateway } from "./stripe/stripe-refund-gateway"
import { getAdminClient } from "./supabase/admin-client"


export const getDealRepository = () => new SupabaseDealRepository(getAdminClient())

export const getOrderRepository = () => new SupabaseOrderRepository(getAdminClient())

export const getCheckoutService = () =>
  new CheckoutService(getOrderRepository(), new StripeCheckoutGateway(getStripe()))

export const getRefundService = () =>
  new RefundService(
    new SupabaseRefundRepository(getAdminClient()),
    new StripeRefundGateway(getStripe())
  )

export const getPaymentEventService = () =>
  new PaymentEventService(
    new SupabasePaymentEventRepository(getAdminClient()),
    getRefundService()
  )
