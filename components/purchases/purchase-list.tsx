import type { Purchase } from "@/domain/purchase"
import { PurchaseItem } from "./purchase-item"

interface PurchaseListProps {
  purchases: Purchase[]
  onChanged(): void
}

export function PurchaseList({ purchases, onChanged }: PurchaseListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {purchases.map((purchase) => (
        <li key={purchase.id}>
          <PurchaseItem purchase={purchase} onChanged={onChanged} />
        </li>
      ))}
    </ul>
  )
}
