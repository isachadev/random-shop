import type { Metadata } from "next"
import { Suspense } from "react"
import { PurchasesSkeleton } from "@/components/purchases/purchases-skeleton"
import { PurchasesView } from "@/components/purchases/purchases-view"

export const metadata: Metadata = { title: "My purchases" }

export const instant = false

export default function PurchasesPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">My purchases</h1>
        <p className="text-sm text-muted-foreground">
          Every deal you won, newest first.
        </p>
      </div>
      <Suspense fallback={<PurchasesSkeleton />}>
        <PurchasesView />
      </Suspense>
    </section>
  )
}
