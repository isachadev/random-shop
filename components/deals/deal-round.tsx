"use client"

import { use } from "react"
import { LoadError } from "@/components/layout/load-error"
import type { Deal } from "@/domain/deal"
import type { Result } from "@/domain/result"
import { DealOffer } from "./deal-offer"
import { EmptyDeals } from "./empty-deals"

interface DealRoundProps {
  request: Promise<Result<Deal | null>>
  onNext(excludeId?: string): void
}

export function DealRound({ request, onNext }: DealRoundProps) {
  const result = use(request)

  if (!result.ok) {
    return <LoadError message={result.error} onRetry={() => onNext()} />
  }

  const deal = result.value
  if (!deal) return <EmptyDeals onRetry={() => onNext()} />

  return <DealOffer deal={deal} onNext={() => onNext(deal.id)} />
}
