import { PackageX } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EmptyDeals({ onRetry }: { onRetry(): void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
      <PackageX className="size-10 text-muted-foreground" />
      <div>
        <p className="font-medium">Everything is sold out</p>
        <p className="text-sm text-muted-foreground">
          New deals can show up at any moment.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry} className="h-11 px-5">
        Check again
      </Button>
    </div>
  )
}
