import { ShoppingBag, Shuffle, type LucideIcon } from "lucide-react"

export interface NavigationItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { href: "/deals", label: "Random deals", icon: Shuffle },
  { href: "/purchases", label: "My purchases", icon: ShoppingBag },
]
