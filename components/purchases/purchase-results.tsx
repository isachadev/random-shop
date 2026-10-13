"use client"

import { use } from "react"
import { LoadError } from "@/components/layout/load-error"
import type { Purchase } from "@/domain/purchase"
import type { Result } from "@/domain/result"
import { EmptyPurchases } from "./empty-purchases"
import { PurchaseList } from "./purchase-list"

interface PurchaseResultsProps {
  request: Promise<Result<Purchase[]>>
  onRetry(): void
}

export function PurchaseResults({ request, onRetry }: PurchaseResultsProps) {
  const result = use(request)

  if (!result.ok) return <LoadError message={result.error} onRetry={onRetry} />
  if (result.value.length === 0) return <EmptyPurchases />
  return <PurchaseList purchases={result.value} onChanged={onRetry} />
}
