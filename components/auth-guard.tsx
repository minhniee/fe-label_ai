"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getMe, logout as apiLogout } from "@/app/api/auth"

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
        // With HTTP-only cookies, we can't check localStorage for tokens
        // Instead, we try to get user info from backend using cookies
        let me: BackendUser | null = null
        
        try {
          const resp = await getMe()
          me = resp as unknown as BackendUser
          // Cache user data in localStorage for UI purposes
          try { 
            localStorage.setItem("user", JSON.stringify(me)) 
          } catch {}
        } catch (error) {
          console.log("Authentication failed:", error)
          me = null
        }

        if (!me) {
          if (!cancelled) {
            // Clear any cached user data
            try { localStorage.removeItem("user") } catch {}
            router.push("/login")
          }
          return
        }

        if (allowedRoleIds && allowedRoleIds.length > 0) {
          const isAllowed = allowedRoleIds.includes(me.role_id)
          if (!isAllowed) {
            if (!cancelled) router.push("/dashboard")
            return
          }
        }

        if (!cancelled) setUser(me)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    verify()
    return () => { cancelled = true }
  }, [mounted, router, allowedRoleIds])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

  const logout = async () => {
    if (typeof window === 'undefined') return
    
    try {
      await apiLogout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local user data
      try { 
        localStorage.removeItem("user")
        localStorage.removeItem("user_picture")
        localStorage.removeItem("user_name")
        localStorage.removeItem("user_email")
      } catch {}
      
      // Redirect to login
      window.location.href = "/login"
    }
  }

  return { user, logout }
}
