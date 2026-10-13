"use client"

import { Button } from "@/components/ui/button"
import { useRefund } from "@/hooks/use-refund"
import { formatPrice } from "@/lib/format/money"

interface RefundControlProps {
  orderId: string
  priceCents: number
  retry: boolean
  onChanged(): void
}

export function RefundControl({
  orderId,
  priceCents,
  retry,
  onChanged,
}: RefundControlProps) {
  const { step, error, ask, cancel, confirm } = useRefund(orderId, onChanged)

  return (
    <div className="flex flex-col items-end gap-2">
      {step === "idle" ? (
        <Button variant="outline" onClick={ask} className="h-10 px-4">
          {retry ? "Retry refund" : "Refund"}
        </Button>
      ) : (
        <div className="flex w-full flex-col gap-2">
          <p className="text-sm">
            Refund {formatPrice(priceCents)}? The item goes back on sale.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={cancel}
              disabled={step === "sending"}
              className="h-10"
            >
              Keep it
            </Button>
            <Button
              onClick={confirm}
              disabled={step === "sending"}
              className="h-10"
            >
              {step === "sending" ? "Refunding..." : "Yes, refund"}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
