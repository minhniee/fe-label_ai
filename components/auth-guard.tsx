"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getMe } from "@/app/api/auth"

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
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    let cancelled = false

    const verify = async () => {
      try {
        // Prefer cached user if available
        const cached = localStorage.getItem("user")
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as BackendUser
            if (!cancelled) setUser(parsed)
          } catch {}
        }

        // If we have a token, confirm with backend (fixes intermittent missing cached user)
        const token = localStorage.getItem("access_token")
        let me: BackendUser | null = null
        if (token) {
          try {
            const resp = await getMe()
            me = resp as unknown as BackendUser
            try { localStorage.setItem("user", JSON.stringify(me)) } catch {}
          } catch {
            me = null
          }
        }

        const effective = (me ?? (cached ? (JSON.parse(cached) as BackendUser) : null))

        if (!effective) {
          if (!cancelled) router.push("/")
          return
        }

        if (allowedRoleIds && allowedRoleIds.length > 0) {
          const isAllowed = allowedRoleIds.includes(effective.role_id)
          if (!isAllowed) {
            if (!cancelled) router.push("/dashboard")
            return
          }
        }

        if (!cancelled) setUser(effective)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    verify()
    return () => { cancelled = true }
  }, [mounted, router, allowedRoleIds])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 text-sm">Đang xác thực...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}

export function useAuth() {
  const [user, setUser] = useState<BackendUser | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    const userStr = localStorage.getItem("user")
    if (userStr) setUser(JSON.parse(userStr))
  }, [mounted])

  const logout = () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem("user")
    window.location.href = "/"
  }

  return { user, logout }
}
