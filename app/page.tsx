"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getMe } from "@/app/api/auth"

export default function HomePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("access_token")
        
        if (token) {
          try {
            await getMe()
            router.replace("/projects")
            return
          } catch (error) {
            localStorage.removeItem("access_token")
            localStorage.removeItem("refresh_token")
            localStorage.removeItem("user")
          }
        }
        
        router.replace("/login")
      } catch (error) {
        router.replace("/login")
      }
    }

    checkAuth()
  }, [router, mounted])

  // Return null while redirecting
  return null
}