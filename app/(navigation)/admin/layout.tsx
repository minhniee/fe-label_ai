import type React from "react"
import { AuthGuard } from "@/components/auth-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGuard allowedRoleIds={[1]}>{children}</AuthGuard>
}

