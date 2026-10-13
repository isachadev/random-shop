"use client"

import { useEffect, useEffectEvent, useState } from "react"
import type { OrderStatus } from "@/domain/order"
import { purchaseService } from "@/services/container"

export type OrderConfirmation = "confirming" | "paid" | "refunded" | "timeout"

const POLL_INTERVAL_MS = 1500
const MAX_ATTEMPTS = 20

const SETTLED: Partial<Record<OrderStatus, OrderConfirmation>> = {
  paid: "paid",
  refund_required: "refunded",
  refunded: "refunded",
}

export function useOrderConfirmation(
  orderId: string | null,
  onPaid: () => void
): OrderConfirmation | null {
  const [confirmation, setConfirmation] =
    useState<OrderConfirmation>("confirming")
  const notifyPaid = useEffectEvent(onPaid)

  useEffect(() => {
    if (!orderId) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0

    async function check(id: string) {
      const result = await purchaseService.getOrderStatus(id)
      if (cancelled) return

      attempts += 1
      const settled = result.ok ? SETTLED[result.value] : undefined
      if (settled) {
        setConfirmation(settled)
        if (settled === "paid") notifyPaid()
      } else if (attempts >= MAX_ATTEMPTS) {
        setConfirmation("timeout")
      } else {
        timer = setTimeout(() => void check(id), POLL_INTERVAL_MS)
      }
    }

    void check(orderId)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [orderId])

  return orderId ? confirmation : null
}
