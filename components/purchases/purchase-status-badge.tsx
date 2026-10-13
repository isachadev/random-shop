import { Badge } from "@/components/ui/badge"
import type { Purchase } from "@/domain/purchase"

export function PurchaseStatusBadge({ purchase }: { purchase: Purchase }) {
  if (purchase.status === "refunded") {
    return <Badge variant="outline">Refunded</Badge>
  }
  if (purchase.status === "refund_pending") {
    return <Badge variant="outline">Refund in progress</Badge>
  }
  return <Badge variant="secondary">-{purchase.discountPercent}%</Badge>
}
