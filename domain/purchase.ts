export type PurchaseStatus = "owned" | "refund_pending" | "refunded"

export interface Purchase {
  id: string
  name: string
  emoji: string
  category: string
  originalPriceCents: number
  priceCents: number
  discountPercent: number
  purchasedAt: string
  status: PurchaseStatus
  canRefund: boolean
}
