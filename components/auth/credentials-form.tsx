"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Result } from "@/domain/result"
import type { Credentials } from "@/domain/user"
import { validateCredentials } from "@/lib/validation/credentials"

interface CredentialsFormProps {
  submitLabel: string
  passwordAutoComplete: "current-password" | "new-password"
  onSubmit(credentials: Credentials): Promise<Result<unknown>>
}

export function CredentialsForm({
  submitLabel,
  passwordAutoComplete,
  onSubmit,
}: CredentialsFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const credentials = { email, password }

    const validationError = validateCredentials(credentials)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setPending(true)
    try {
      const result = await onSubmit(credentials)
      if (!result.ok) setError(result.error)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={passwordAutoComplete}
          placeholder="At least 6 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-11 text-base">
        {pending ? "Please wait..." : submitLabel}
      </Button>
    </form>
  )
}
