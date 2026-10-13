import { Skeleton } from "@/components/ui/skeleton"

export function DealSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading deal">
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
