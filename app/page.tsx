"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getMe } from "@/app/api/auth"

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user has valid token
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
        
        if (token) {
          // Verify token is valid by calling /auth/me
          try {
            await getMe()
            // User is authenticated, redirect to dashboard
            router.replace("/dashboard")
            return
          } catch (error) {
            // Token is invalid, clear it and redirect to login
            console.log("Token invalid, redirecting to login")
            localStorage.removeItem("access_token")
            localStorage.removeItem("refresh_token")
            localStorage.removeItem("user")
          }
        }
        
        // No token or invalid token, redirect to login
        router.replace("/login")
      } catch (error) {
        console.error("Auth check error:", error)
        router.replace("/login")
      } finally {
        setChecking(false)
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 text-sm">
          {checking ? "Checking authentication..." : "Redirecting..."}
        </p>
      </div>
    </div>
  )
}