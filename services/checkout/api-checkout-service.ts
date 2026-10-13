import type { CheckoutResult } from "@/domain/checkout"
import type { Result } from "@/domain/result"
import { apiRequest } from "../http/api-client"
import type { CheckoutService } from "./checkout-service"

export class ApiCheckoutService implements CheckoutService {
  start(dealId: string, idempotencyKey: string): Promise<Result<CheckoutResult>> {
    return apiRequest<CheckoutResult>("/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ dealId }),
    })
  }
}
