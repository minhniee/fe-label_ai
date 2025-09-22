"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface FrontendUserLegacy {
  email: string
  name: string
  role: "admin" | "senior_labeler" | "labeler"
}

interface BackendUser {
  user_id: number
  username: string
  email: string
  role_id: number
  role_name: string
}

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
  allowedRoleIds?: number[]
}

export function AuthGuard({ children, allowedRoles, allowedRoleIds }: AuthGuardProps) {
  const [user, setUser] = useState<BackendUser | FrontendUserLegacy | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/")
      return
    }

    const userData = JSON.parse(userStr) as BackendUser | FrontendUserLegacy

    // Authorization checks (supports both legacy and backend formats)
    if (allowedRoles || allowedRoleIds) {
      let isAllowed = true

      if ("role" in userData && allowedRoles) {
        isAllowed = allowedRoles.includes(userData.role)
      }

      if ("role_id" in userData && allowedRoleIds) {
        isAllowed = allowedRoleIds.includes(userData.role_id)
      }

      // Fallback: if only allowedRoles provided and we have backend user, compare by role_name (case-insensitive)
      if (!isAllowed && "role_name" in userData && allowedRoles) {
        isAllowed = allowedRoles.map((r) => r.toLowerCase()).includes(userData.role_name.toLowerCase())
      }

      if (!isAllowed) {
        router.push("/dashboard")
        return
      }
    }

    setUser(userData)
    setLoading(false)
  }, [router, allowedRoles])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  const logout = () => {
    localStorage.removeItem("user")
    window.location.href = "/"
  }

  return { user, logout }
}
