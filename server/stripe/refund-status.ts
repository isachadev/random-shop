import type { RefundStatus } from "../repositories/refund-repository"

export function toRefundStatus(stripeStatus: string | null): RefundStatus {
  if (stripeStatus === "succeeded") return "succeeded"
  if (stripeStatus === "failed" || stripeStatus === "canceled") return "failed"
  return "requested"
}
