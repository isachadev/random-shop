"use client"

import { useAuth } from "@/hooks/use-auth"
import { CredentialsForm } from "./credentials-form"

export function RegisterForm() {
  const { register } = useAuth()

  return (
    <CredentialsForm
      submitLabel="Create account"
      passwordAutoComplete="new-password"
      onSubmit={register}
    />
  )
}
