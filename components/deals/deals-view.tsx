"use client"

import { Suspense, useState } from "react"
import type { Deal } from "@/domain/deal"
import type { Result } from "@/domain/result"
import { dealService } from "@/services/container"
import { DealRound } from "./deal-round"
import { DealSkeleton } from "./deal-skeleton"

interface Round {
  id: number
  request: Promise<Result<Deal | null>>
}

export function DealsView() {
  const [round, setRound] = useState<Round>(() => ({
    id: 0,
    request: dealService.getRandomDeal(),
  }))

  function showNext(excludeId?: string) {
    const request = dealService.getRandomDeal(excludeId)
    setRound((current) => ({ id: current.id + 1, request }))
  }

  return (
    <Suspense fallback={<DealSkeleton />}>
      <DealRound key={round.id} request={round.request} onNext={showNext} />
    </Suspense>
  )
}
