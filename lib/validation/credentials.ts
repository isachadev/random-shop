import type { Credentials } from "@/domain/user"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD_LENGTH = 6

export function validateCredentials({
  email,
  password,
}: Credentials): string | null {
  if (!EMAIL_PATTERN.test(email.trim())) {
    return "Enter a valid email address."
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must have at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return null
}
