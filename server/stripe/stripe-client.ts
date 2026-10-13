import "server-only"
import Stripe from "stripe"
import { serverEnv } from "../env"

let client: Stripe | undefined

export function getStripe(): Stripe {
  client ??= new Stripe(serverEnv.stripeSecretKey)
  return client
}
