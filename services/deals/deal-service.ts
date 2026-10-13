import type { Deal } from "@/domain/deal"
import type { Result } from "@/domain/result"

export interface DealService {
  getRandomDeal(excludeId?: string): Promise<Result<Deal | null>>
}
