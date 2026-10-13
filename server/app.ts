import { Hono } from "hono"
import { handleError, handleNotFound } from "./middleware/error-handler"
import { checkoutRoutes } from "./routes/checkout"
import { dealRoutes } from "./routes/deals"
import { healthRoutes } from "./routes/health"
import { orderRoutes } from "./routes/orders"
import { stripeWebhookRoutes } from "./routes/stripe-webhook"

export const app = new Hono()
  .basePath("/api")
  .route("/health", healthRoutes)
  .route("/deals", dealRoutes)
  .route("/checkout", checkoutRoutes)
  .route("/orders", orderRoutes)
  .route("/webhooks/stripe", stripeWebhookRoutes)

app.notFound(handleNotFound)
app.onError(handleError)
