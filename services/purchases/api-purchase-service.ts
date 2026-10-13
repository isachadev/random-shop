import type { OrderStatus } from "@/domain/order"
import type { Purchase } from "@/domain/purchase"
import type { RefundResult } from "@/domain/refund"
import { success, type Result } from "@/domain/result"
import { apiRequest } from "../http/api-client"
import type { PurchaseService } from "./purchase-service"

export class ApiPurchaseService implements PurchaseService {
  async list(): Promise<Result<Purchase[]>> {
    const result = await apiRequest<{ purchases: Purchase[] }>("/orders")
    return result.ok ? success(result.value.purchases) : result
  }

  async getOrderStatus(orderId: string): Promise<Result<OrderStatus>> {
    const result = await apiRequest<{ status: OrderStatus }>(
      `/orders/${encodeURIComponent(orderId)}`
    )
    return result.ok ? success(result.value.status) : result
  }

  requestRefund(orderId: string): Promise<Result<RefundResult>> {
    return apiRequest<RefundResult>(
      `/orders/${encodeURIComponent(orderId)}/refund`,
      { method: "POST" }
    )
  }
}
