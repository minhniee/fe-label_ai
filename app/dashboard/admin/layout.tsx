"use client"
import type React from "react"
import { AuthGuard } from "@/components/auth-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // SuperAdmin=1, Admin=2
  return <AuthGuard allowedRoleIds={[1, 2]}>{children}</AuthGuard>
}
