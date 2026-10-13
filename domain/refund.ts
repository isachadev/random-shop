export type RefundResult =
  | { outcome: "refunded" }
  | { outcome: "pending" }
  | { outcome: "not_refundable" }
  | { outcome: "not_found" }
