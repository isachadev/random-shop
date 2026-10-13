export interface AuthenticatedUser {
  id: string
  email: string | null
}

export type AuthenticatedEnv = {
  Variables: { user: AuthenticatedUser }
}
