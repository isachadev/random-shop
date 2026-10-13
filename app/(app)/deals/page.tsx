import type { Metadata } from "next"
import { DealsView } from "@/components/deals/deals-view"

export const metadata: Metadata = { title: "Random deals" }

export const instant = false

export default function DealsPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Random deal</h1>
        <p className="text-sm text-muted-foreground">
          Buy it before someone else does. First to pay wins.
        </p>
      </div>
      <DealsView />
    </section>
  )
}
