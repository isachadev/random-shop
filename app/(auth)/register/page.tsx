import type { Metadata } from "next"
import { AuthCard } from "@/components/auth/auth-card"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = { title: "Create account" }

export const instant = false

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create account"
      description="Just an email and a password. That is all."
      footerText="Already have an account?"
      footerLinkLabel="Log in"
      footerLinkHref="/login"
    >
      <RegisterForm />
    </AuthCard>
  )
}
