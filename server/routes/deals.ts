import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { getDealRepository } from "../container"
import { requireUser } from "../middleware/require-user"
import type { AuthenticatedEnv } from "../types"
import { isUuid } from "../validation/guards"

export const dealRoutes = new Hono<AuthenticatedEnv>()
  .use(requireUser)
  .get("/random", async (c) => {
    const exclude = c.req.query("exclude")
    if (exclude !== undefined && !isUuid(exclude)) {
      throw new HTTPException(400, { message: "exclude must be a UUID" })
    }

    const deal = await getDealRepository().findRandomAvailable(exclude)
    return c.json({ deal })
  })
