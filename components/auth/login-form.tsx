"use client"

import type { Credentials } from "@/domain/user"
import { useAuth } from "@/hooks/use-auth"
import { CredentialsForm } from "./credentials-form"

const DEMO_CREDENTIALS: Credentials = {
  email: "example@gmail.com",
  password: "example123",
}

export function LoginForm() {
  const { login } = useAuth()

  return (
    <CredentialsForm
      submitLabel="Log in"
      passwordAutoComplete="current-password"
      initialCredentials={DEMO_CREDENTIALS}
      onSubmit={login}
    />
  )
}
