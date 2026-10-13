import { createClient } from "@/lib/supabase/client"
import type { AuthService } from "./auth/auth-service"
import { SupabaseAuthService } from "./auth/supabase-auth-service"
import { ApiCheckoutService } from "./checkout/api-checkout-service"
import type { CheckoutService } from "./checkout/checkout-service"
import { ApiDealService } from "./deals/api-deal-service"
import type { DealService } from "./deals/deal-service"
import { ApiPurchaseService } from "./purchases/api-purchase-service"
import type { PurchaseService } from "./purchases/purchase-service"


export const authService: AuthService = new SupabaseAuthService(createClient())

export const dealService: DealService = new ApiDealService()

export const checkoutService: CheckoutService = new ApiCheckoutService()

export const purchaseService: PurchaseService = new ApiPurchaseService()
