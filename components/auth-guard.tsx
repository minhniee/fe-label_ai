"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface BackendUser {
  user_id: number
  username: string
  email: string
  role_id: number
  role_name?: string
}

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoleIds?: number[]
}

export function AuthGuard({ children, allowedRoleIds }: AuthGuardProps) {
  const [user, setUser] = useState<BackendUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (!userStr) {
      router.push("/")
      return
    }

    const parsed = JSON.parse(userStr) as BackendUser

    if (allowedRoleIds && allowedRoleIds.length > 0) {
      const isAllowed = allowedRoleIds.includes(parsed.role_id)
      if (!isAllowed) {
        router.push("/dashboard")
        return
      }
    }

    setUser(parsed)
    setLoading(false)
  }, [router, allowedRoleIds])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}

export function useAuth() {
  const [user, setUser] = useState<BackendUser | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) setUser(JSON.parse(userStr))
  }, [])

  const logout = () => {
    localStorage.removeItem("user")
    window.location.href = "/"
  }

  return { user, logout }
}
