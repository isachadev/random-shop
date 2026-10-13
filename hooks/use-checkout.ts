"use client"

import { useEffect, useState } from "react"
import { checkoutService } from "@/services/container"

export type CheckoutStatus = "idle" | "starting" | "sold_out" | "owned"

export interface Checkout {
  status: CheckoutStatus
  error: string | null
  buy(): Promise<void>
}

export function useCheckout(dealId: string): Checkout {
  const [status, setStatus] = useState<CheckoutStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())

  useEffect(() => {
    const unlock = (event: PageTransitionEvent) => {
      if (event.persisted) setStatus("idle")
    }
    window.addEventListener("pageshow", unlock)
    return () => window.removeEventListener("pageshow", unlock)
  }, [])

  async function buy() {
    if (status !== "idle") return
    setStatus("starting")
    setError(null)

    const result = await checkoutService.start(dealId, idempotencyKey)
    if (!result.ok) {
      setError(result.error)
      setStatus("idle")
      return
    }

    switch (result.value.outcome) {
      case "redirect":
        window.location.assign(result.value.url)
        return
      case "sold_out":
      case "not_found":
        setStatus("sold_out")
        return
      case "already_purchased":
        setStatus("owned")
        return
      case "expired":
        setIdempotencyKey(crypto.randomUUID())
        setError("That attempt expired. Try again.")
        setStatus("idle")
    }
  }

  return { status, error, buy }
}
