import type React from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard allowedRoleIds={[1]}>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  )
}

