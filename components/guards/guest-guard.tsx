"use client"

import { redirect } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { ScreenLoader } from "./screen-loader"

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()

  if (status === "authenticated") redirect("/deals")
  return status === "guest" ? children : <ScreenLoader />
}
