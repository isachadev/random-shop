"use client"

import { BottomNavItem } from "./bottom-nav-item"
import { NAVIGATION_ITEMS } from "./navigation-items"

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid max-w-md grid-cols-2">
        {NAVIGATION_ITEMS.map((item) => (
          <BottomNavItem key={item.href} {...item} />
        ))}
      </div>
    </nav>
  )
}
