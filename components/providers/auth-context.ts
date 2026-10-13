"use client"

import { createContext } from "react"
import type { Result } from "@/domain/result"
import type { Credentials, User } from "@/domain/user"

export type AuthStatus = "loading" | "authenticated" | "guest"

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login(credentials: Credentials): Promise<Result<User>>
  register(credentials: Credentials): Promise<Result<User>>
  logout(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
