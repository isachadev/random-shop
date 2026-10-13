export type CheckoutResult =
  | { outcome: "redirect"; url: string }
  | { outcome: "sold_out" }
  | { outcome: "not_found" }
  | { outcome: "already_purchased" }
  | { outcome: "expired" }
