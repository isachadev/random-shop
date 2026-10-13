"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { NavigationItem } from "./navigation-items"

export function BottomNavItem({ href, label, icon: Icon }: NavigationItem) {
  const active = usePathname() === href

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  )
}
