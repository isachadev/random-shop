import { AuthGuard } from "@/components/guards/auth-guard"
import { AppHeader } from "@/components/layout/app-header"
import { BottomNav } from "@/components/layout/bottom-nav"

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard>
      <AppHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-8">
        {children}
      </main>
      <BottomNav />
    </AuthGuard>
  )
}
