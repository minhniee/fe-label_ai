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

    const redirectToLogin = () => {
      // Preserve the current location so user returns after login
      const callbackUrl = typeof window !== 'undefined' ? window.location.href : "/"
      const encoded = encodeURIComponent(callbackUrl)
      if (!cancelled) {
        window.location.href = `/login?callback_url=${encoded}`
      }
    }

    const verify = async () => {
      try {
        let me: BackendUser | null = null

        // 1) Check for access token in localStorage (no HTTP-only cookies)
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
        if (!token) {
          // No token -> send to login with callback
          redirectToLogin()
          return
        }
        
        // 2) Validate token by calling backend (axios attaches Bearer token)
        try {
          const resp = await getMe()
          me = resp as unknown as BackendUser
          // Cache user data for UI purposes
          try { localStorage.setItem("user", JSON.stringify(me)) } catch {}
        } catch (error) {
          // Invalid/expired token -> clear and redirect to login
          try {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
          } catch {}
          redirectToLogin()
          return
        }

        // 3) Role-based access
        if (allowedRoleIds && allowedRoleIds.length > 0 && me) {
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
      // Clear local user data & tokens
      try { 
        localStorage.removeItem("user")
        localStorage.removeItem("user_picture")
        localStorage.removeItem("user_name")
        localStorage.removeItem("user_email")
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      } catch {}
      
      const callbackUrl = window.location.href
      const encodedCallbackUrl = encodeURIComponent(callbackUrl)
      window.location.href = `/login?callback_url=${encodedCallbackUrl}`
    }
  }

  return { user, logout }
}
