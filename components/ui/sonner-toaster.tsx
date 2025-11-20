"use client"

import { Toaster } from "@/components/ui/sonner"
import { useEffect, useState } from "react"

export function SonnerToaster() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by only rendering theme after mount
  if (!mounted) {
    return (
      <Toaster
        position="top-center"
        richColors
      />
    )
  }

  return (
    <Toaster
      position="top-center"
      richColors
      theme="system"
    />
  )
}


