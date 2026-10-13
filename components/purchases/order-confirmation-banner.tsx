import { CircleCheck, CircleX, Loader2 } from "lucide-react"
import type { OrderConfirmation } from "@/hooks/use-order-confirmation"

const MESSAGES: Record<OrderConfirmation, string> = {
  confirming: "Confirming your payment...",
  paid: "Payment confirmed. It is yours!",
  refunded:
    "Sold out before your payment arrived. You will get a full refund.",
  timeout: "Still confirming your payment. Refresh this page in a moment.",
}

const ICONS: Record<OrderConfirmation, React.ReactNode> = {
  confirming: <Loader2 className="size-4 shrink-0 animate-spin" />,
  paid: <CircleCheck className="size-4 shrink-0" />,
  refunded: <CircleX className="size-4 shrink-0" />,
  timeout: <Loader2 className="size-4 shrink-0" />,
}

export function OrderConfirmationBanner({ state }: { state: OrderConfirmation }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-xl border bg-muted px-4 py-3 text-sm font-medium"
    >
      {ICONS[state]}
      {MESSAGES[state]}
    </p>
  )
}
