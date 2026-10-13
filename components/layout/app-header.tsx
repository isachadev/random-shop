"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

export function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none">Random Shop</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {user?.email}
          </p>
        </div>
        <Button variant="outline" size="lg" onClick={logout}>
          <LogOut />
          Log out
        </Button>
      </div>
    </header>
  )
}
