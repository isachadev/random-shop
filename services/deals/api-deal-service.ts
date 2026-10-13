import type { Deal } from "@/domain/deal"
import { success, type Result } from "@/domain/result"
import { apiRequest } from "../http/api-client"
import type { DealService } from "./deal-service"

export class ApiDealService implements DealService {
  async getRandomDeal(excludeId?: string): Promise<Result<Deal | null>> {
    const query = excludeId ? `?exclude=${encodeURIComponent(excludeId)}` : ""
    const result = await apiRequest<{ deal: Deal | null }>(`/deals/random${query}`)
    return result.ok ? success(result.value.deal) : result
  }
}
