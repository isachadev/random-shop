export interface Deal {
  id: string
  name: string
  emoji: string
  category: string
  originalPriceCents: number
  priceCents: number
  discountPercent: number
  stock: number
}
