import { Card, CardContent } from "@/components/ui/card"
import type { Purchase } from "@/domain/purchase"
import { formatDateTime } from "@/lib/format/date"
import { formatPrice } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import { PurchaseStatusBadge } from "./purchase-status-badge"
import { RefundControl } from "./refund-control"

interface PurchaseItemProps {
  purchase: Purchase
  onChanged(): void
}

export function PurchaseItem({ purchase, onChanged }: PurchaseItemProps) {
  const refunded = purchase.status === "refunded"
  const refundPending = purchase.status === "refund_pending"

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-xl border bg-muted text-3xl"
            aria-hidden="true"
          >
            {purchase.emoji}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate font-medium">{purchase.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(purchase.purchasedAt)}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <p
              className={cn(
                "font-semibold",
                refunded && "text-muted-foreground line-through"
              )}
            >
              {formatPrice(purchase.priceCents)}
            </p>
            <PurchaseStatusBadge purchase={purchase} />
          </div>
        </div>

        {(purchase.canRefund || refundPending) && (
          <RefundControl
            orderId={purchase.id}
            priceCents={purchase.priceCents}
            retry={refundPending}
            onChanged={onChanged}
          />
        )}
      </CardContent>
    </Card>
  )
}
