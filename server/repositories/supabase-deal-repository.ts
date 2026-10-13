import type { SupabaseClient } from "@supabase/supabase-js"
import type { Deal } from "@/domain/deal"
import { unwrap } from "../supabase/unwrap"
import type { DealRepository } from "./deal-repository"

interface DealRow {
  id: string
  name: string
  emoji: string
  category: string
  original_price_cents: number
  price_cents: number
  discount_percent: number
  stock: number
}

const toDeal = (row: DealRow): Deal => ({
  id: row.id,
  name: row.name,
  emoji: row.emoji,
  category: row.category,
  originalPriceCents: row.original_price_cents,
  priceCents: row.price_cents,
  discountPercent: row.discount_percent,
  stock: row.stock,
})

export class SupabaseDealRepository implements DealRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findRandomAvailable(excludeId?: string): Promise<Deal | null> {
    const other = await this.pick(excludeId ?? null)
    if (other || !excludeId) return other
    return this.pick(null)
  }

  private async pick(excludeId: string | null): Promise<Deal | null> {
    const row = unwrap(
      await this.db
        .rpc("random_available_deal", { p_exclude_id: excludeId })
        .maybeSingle<DealRow>()
    )
    return row ? toDeal(row) : null
  }
}
