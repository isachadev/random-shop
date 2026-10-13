import type { Result } from "@/domain/result"
import type { Credentials, User } from "@/domain/user"

export type AuthListener = (user: User | null) => void

export interface AuthService {
  register(credentials: Credentials): Promise<Result<User>>
  login(credentials: Credentials): Promise<Result<User>>
  logout(): Promise<void>
  onAuthChange(listener: AuthListener): () => void
}
