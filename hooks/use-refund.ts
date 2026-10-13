"use client"

import { useState } from "react"
import { purchaseService } from "@/services/container"

export type RefundStep = "idle" | "confirming" | "sending"

export interface RefundFlow {
  step: RefundStep
  error: string | null
  ask(): void
  cancel(): void
  confirm(): Promise<void>
}

export function useRefund(orderId: string, onChanged: () => void): RefundFlow {
  const [step, setStep] = useState<RefundStep>("idle")
  const [error, setError] = useState<string | null>(null)

  function ask() {
    setError(null)
    setStep("confirming")
  }

  function cancel() {
    setStep("idle")
  }

  async function confirm() {
    setStep("sending")
    const result = await purchaseService.requestRefund(orderId)
    setStep("idle")

    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.value.outcome === "not_refundable") {
      setError("This purchase can no longer be refunded.")
    }
    onChanged()
  }

  return { step, error, ask, cancel, confirm }
}
