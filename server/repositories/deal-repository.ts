import type { Deal } from "@/domain/deal"

export interface DealRepository {
  findRandomAvailable(excludeId?: string): Promise<Deal | null>
}
