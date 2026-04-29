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

const MOCK_USER: BackendUser = {
  user_id: 1,
  username: "MockAdmin",
  email: "admin@example.com",
  role_id: 1,
  role_name: "Admin"
};

export function AuthGuard({ children, allowedRoleIds }: AuthGuardProps) {
  return <>{children}</>
}

export function useAuth() {
  const [user, setUser] = useState<BackendUser | null>(MOCK_USER)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Keep user as MOCK_USER or load from storage if preferred,
    // but MOCK_USER ensures consistent UI without login.
    setUser(MOCK_USER)
  }, [mounted])

  const logout = async () => {
    if (typeof window === 'undefined') return
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
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
