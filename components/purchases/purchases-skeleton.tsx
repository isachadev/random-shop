import { Skeleton } from "@/components/ui/skeleton"

export function PurchasesSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading purchases">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
