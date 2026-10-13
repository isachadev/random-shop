"use client"

import { useEffect, useMemo, useState } from "react"
import type { Credentials, User } from "@/domain/user"
import { authService } from "@/services/container"
import { AuthContext, type AuthContextValue } from "./auth-context"

interface SessionState {
  loaded: boolean
  user: User | null
}

const login = (credentials: Credentials) => authService.login(credentials)
const register = (credentials: Credentials) => authService.register(credentials)
const logout = () => authService.logout()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    loaded: false,
    user: null,
  })

  useEffect(
    () =>
      authService.onAuthChange((user) => {
        setSession((current) =>
          current.loaded && current.user?.id === user?.id
            ? current
            : { loaded: true, user }
        )
      }),
    []
  )

  const value = useMemo<AuthContextValue>(() => {
    const status = !session.loaded
      ? "loading"
      : session.user
        ? "authenticated"
        : "guest"
    return { status, user: session.user, login, register, logout }
  }, [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
