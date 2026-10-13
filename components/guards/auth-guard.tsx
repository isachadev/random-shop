"use client"

import { redirect } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { ScreenLoader } from "./screen-loader"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()

  if (status === "guest") redirect("/login")
  return status === "authenticated" ? children : <ScreenLoader />
}
