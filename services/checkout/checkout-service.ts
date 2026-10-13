import type { CheckoutResult } from "@/domain/checkout"
import type { Result } from "@/domain/result"

export interface CheckoutService {
  start(dealId: string, idempotencyKey: string): Promise<Result<CheckoutResult>>
}
