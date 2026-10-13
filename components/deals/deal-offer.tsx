"use client"

import type { Deal } from "@/domain/deal"
import { useCheckout } from "@/hooks/use-checkout"
import { DealActions } from "./deal-actions"
import { DealCard } from "./deal-card"
import { DealNotice } from "./deal-notice"

interface DealOfferProps {
  deal: Deal
  onNext(): void
}

export function DealOffer({ deal, onNext }: DealOfferProps) {
  const { status, error, buy } = useCheckout(deal.id)

  return (
    <div className="flex flex-col gap-4">
      <DealCard deal={deal} />
      <DealNotice status={status} error={error} />
      <DealActions status={status} onBuy={buy} onNext={onNext} />
    </div>
  )
}
