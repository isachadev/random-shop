import { CircleCheck, CircleX } from "lucide-react"
import type { CheckoutStatus } from "@/hooks/use-checkout"

interface DealNoticeProps {
  status: CheckoutStatus
  error: string | null
}

export function DealNotice({ status, error }: DealNoticeProps) {
  if (error) {
    return (
      <p role="alert" className="text-center text-sm text-destructive">
        {error}
      </p>
    )
  }

  if (status === "sold_out") {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground"
      >
        <CircleX className="size-4" />
        Too late. Someone else bought it first.
      </p>
    )
  }

  if (status === "owned") {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 text-sm font-medium"
      >
        <CircleCheck className="size-4" />
        You already bought this one.
      </p>
    )
  }

  return (
    <p className="text-center text-xs text-muted-foreground">
      First to pay gets it. Be fast!
    </p>
  )
}
