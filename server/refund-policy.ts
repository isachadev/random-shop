export const REFUND_WINDOW_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export function isWithinRefundWindow(paidAt: string, now = Date.now()): boolean {
  return now - new Date(paidAt).getTime() < REFUND_WINDOW_DAYS * DAY_MS
}
