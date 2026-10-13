"use client"

import { useAuth } from "@/hooks/use-auth"
import { CredentialsForm } from "./credentials-form"

export function LoginForm() {
  const { login } = useAuth()

  return (
    <CredentialsForm
      submitLabel="Log in"
      passwordAutoComplete="current-password"
      onSubmit={login}
    />
  )
}
