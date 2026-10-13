import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { getCheckoutService } from "../container"
import { requireUser } from "../middleware/require-user"
import type { AuthenticatedEnv } from "../types"
import { isIdempotencyKey, isUuid } from "../validation/guards"

export const checkoutRoutes = new Hono<AuthenticatedEnv>()
  .use(requireUser)
  .post("/", async (c) => {
    const idempotencyKey = c.req.header("Idempotency-Key")
    if (!isIdempotencyKey(idempotencyKey)) {
      throw new HTTPException(400, { message: "Idempotency-Key header is required" })
    }

    const body: unknown = await c.req.json().catch(() => null)
    const dealId = (body as { dealId?: unknown } | null)?.dealId
    if (!isUuid(dealId)) {
      throw new HTTPException(400, { message: "dealId must be a UUID" })
    }

    const result = await getCheckoutService().start({
      user: c.get("user"),
      dealId,
      idempotencyKey,
      origin: new URL(c.req.url).origin,
    })
    return c.json(result)
  })
