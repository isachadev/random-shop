"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, startTransition, useState } from "react"
import { useOrderConfirmation } from "@/hooks/use-order-confirmation"
import { purchaseService } from "@/services/container"
import { OrderConfirmationBanner } from "./order-confirmation-banner"
import { PurchaseResults } from "./purchase-results"
import { PurchasesSkeleton } from "./purchases-skeleton"

export function PurchasesView() {
  const orderId = useSearchParams().get("order")
  const [request, setRequest] = useState(() => purchaseService.list())

  function reload() {
    const next = purchaseService.list()
    startTransition(() => setRequest(next))
  }

  const confirmation = useOrderConfirmation(orderId, reload)

  return (
    <div className="flex flex-col gap-4">
      {confirmation && <OrderConfirmationBanner state={confirmation} />}
      <Suspense fallback={<PurchasesSkeleton />}>
        <PurchaseResults request={request} onRetry={reload} />
      </Suspense>
    </div>
  )
}
