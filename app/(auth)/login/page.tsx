import type { Metadata } from "next"
import { AuthCard } from "@/components/auth/auth-card"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "Log in" }

export const instant = false

export default function LoginPage() {
  return (
    <AuthCard
      title="Log in"
      description="Enter your email and password."
      footerText="New here?"
      footerLinkLabel="Create an account"
      footerLinkHref="/register"
    >
      <LoginForm />
    </AuthCard>
  )
}
