import type React from "react"
import { AuthGuard } from "@/components/auth-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Allow by backend role_id as well: SuperAdmin=1, Admin=2
  return <AuthGuard allowedRoles={["admin", "superadmin"]} allowedRoleIds={[1, 2]}>{children}</AuthGuard>
}
