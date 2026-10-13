import type { OrderStatus } from "@/domain/order"
import type { Purchase } from "@/domain/purchase"
import type { RefundResult } from "@/domain/refund"
import type { Result } from "@/domain/result"

export interface PurchaseService {
  list(): Promise<Result<Purchase[]>>
  getOrderStatus(orderId: string): Promise<Result<OrderStatus>>
  requestRefund(orderId: string): Promise<Result<RefundResult>>
}
