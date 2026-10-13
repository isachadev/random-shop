import type { ErrorHandler, NotFoundHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { UnknownUserError, UnmatchedEventError } from "../errors"

export const handleNotFound: NotFoundHandler = (c) =>
  c.json({ error: "Not found" }, 404)

export const handleError: ErrorHandler = (error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status)
  }
  if (error instanceof UnknownUserError) {
    return c.json({ error: error.message }, 401)
  }
  if (error instanceof UnmatchedEventError) {
    console.error(`Stripe webhook not applied, left for Stripe to retry: ${error.message}`)
    return c.json({ error: "Event cannot be matched yet" }, 500)
  }
  console.error(error)
  return c.json({ error: "Internal server error" }, 500)
}
