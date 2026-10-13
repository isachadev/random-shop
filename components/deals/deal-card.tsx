import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Deal } from "@/domain/deal"
import { formatPrice } from "@/lib/format/money"

const stockLabel = (stock: number) =>
  stock === 1 ? "Last one!" : `${stock} left`

export function DealCard({ deal }: { deal: Deal }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <div
          className="flex size-28 items-center justify-center rounded-2xl border bg-muted text-6xl"
          aria-hidden="true"
        >
          {deal.emoji}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{deal.category}</Badge>
            <Badge variant="outline">{stockLabel(deal.stock)}</Badge>
          </div>
          <h2 className="text-xl font-semibold">{deal.name}</h2>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-4xl font-bold tracking-tight">
            {formatPrice(deal.priceCents)}
          </p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="line-through">
              {formatPrice(deal.originalPriceCents)}
            </span>
            <Badge>-{deal.discountPercent}%</Badge>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
