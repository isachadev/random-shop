import { PackageOpen } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export function EmptyPurchases() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
      <PackageOpen className="size-10 text-muted-foreground" />
      <div>
        <p className="font-medium">No purchases yet</p>
        <p className="text-sm text-muted-foreground">
          Win a random deal and it will show up here.
        </p>
      </div>
      <Link href="/deals" className={cn(buttonVariants(), "h-11 px-5")}>
        Find a deal
      </Link>
    </div>
  )
}
