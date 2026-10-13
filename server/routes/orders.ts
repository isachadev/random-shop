import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { getOrderRepository, getRefundService } from "../container"
import { requireUser } from "../middleware/require-user"
import type { AuthenticatedEnv } from "../types"
import { isUuid } from "../validation/guards"

export const orderRoutes = new Hono<AuthenticatedEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const purchases = await getOrderRepository().listPurchases(c.get("user").id)
    return c.json({ purchases })
  })
  .get("/:id", async (c) => {
    const orderId = c.req.param("id")
    if (!isUuid(orderId)) {
      throw new HTTPException(400, { message: "Order id must be a UUID" })
    }

    const status = await getOrderRepository().findStatus(c.get("user").id, orderId)
    if (!status) throw new HTTPException(404, { message: "Order not found" })
    return c.json({ status })
  })
  .post("/:id/refund", async (c) => {
    const orderId = c.req.param("id")
    if (!isUuid(orderId)) {
      throw new HTTPException(400, { message: "Order id must be a UUID" })
    }

    const result = await getRefundService().requestByCustomer(c.get("user").id, orderId)
    return c.json(result)
  })
