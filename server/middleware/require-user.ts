import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { createClient } from "@/lib/supabase/server"
import type { AuthenticatedEnv } from "../types"

export const requireUser = createMiddleware<AuthenticatedEnv>(async (c, next) => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims?.sub) {
    throw new HTTPException(401, { message: "Sign in required" })
  }

  c.set("user", {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  })
  await next()
})
