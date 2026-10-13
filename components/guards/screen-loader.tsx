import { Skeleton } from "@/components/ui/skeleton"

export function ScreenLoader() {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
