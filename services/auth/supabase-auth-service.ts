import type { SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js"
import { failure, success, type Result } from "@/domain/result"
import type { Credentials, User } from "@/domain/user"
import type { AuthListener, AuthService } from "./auth-service"

const toUser = (user: SupabaseUser): User => ({
  id: user.id,
  email: user.email ?? "",
})

export class SupabaseAuthService implements AuthService {
  constructor(private readonly supabase: SupabaseClient) {}

  async register(credentials: Credentials): Promise<Result<User>> {
    const { data, error } = await this.supabase.auth.signUp(credentials)
    if (error) return failure(error.message)
    if (!data.user) return failure("Could not create the account.")
    if (!data.session) {
      return failure("Check your email to confirm your account, then log in.")
    }
    return success(toUser(data.user))
  }

  async login(credentials: Credentials): Promise<Result<User>> {
    const { data, error } =
      await this.supabase.auth.signInWithPassword(credentials)
    if (error) return failure("Wrong email or password.")
    return success(toUser(data.user))
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut()
  }

  onAuthChange(listener: AuthListener): () => void {
    const { data } = this.supabase.auth.onAuthStateChange((_event, session) => {
      listener(session ? toUser(session.user) : null)
    })
    return () => data.subscription.unsubscribe()
  }
}
