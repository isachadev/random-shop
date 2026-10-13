import "server-only"

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export const serverEnv = {
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY")
  },
  get stripeSecretKey() {
    return required("STRIPE_SECRET_KEY")
  },
  get stripeWebhookSecret() {
    return required("STRIPE_WEBHOOK_SECRET")
  },
}
