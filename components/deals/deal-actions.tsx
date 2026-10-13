import Link from "next/link"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import type { CheckoutStatus } from "@/hooks/use-checkout"
import { cn } from "@/lib/utils"

interface DealActionsProps {
  status: CheckoutStatus
  onBuy(): void
  onNext(): void
}

export function DealActions({ status, onBuy, onNext }: DealActionsProps) {
  if (status === "idle" || status === "starting") {
    const starting = status === "starting"
    return (
      <div className="flex flex-col gap-2">
        <Button onClick={onBuy} disabled={starting} className="h-12 w-full text-base">
          {starting ? "Opening secure payment..." : "Buy now"}
        </Button>
        <Button
          variant="outline"
          onClick={onNext}
          disabled={starting}
          className="h-12 w-full text-base"
        >
          Show another deal
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onNext} className="h-12 w-full text-base">
        Show next deal
      </Button>
      {status === "owned" && (
        <Link
          href="/purchases"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 w-full text-base"
          )}
        >
          View my purchases
        </Link>
      )}
    </div>
  )
}
