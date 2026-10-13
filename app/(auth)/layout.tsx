import { GuestGuard } from "@/components/guards/guest-guard"

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <GuestGuard>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Random Shop</h1>
          <p className="text-sm text-muted-foreground">
            Random products. Crazy discounts. First to buy wins.
          </p>
        </div>
        {children}
      </main>
    </GuestGuard>
  )
}
