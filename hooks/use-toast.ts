'use client'

// Thin compatibility wrapper around Sonner
import React from 'react'
import { toast as sonnerToast } from 'sonner'
import { InfoIcon } from 'lucide-react'

type LegacyToastProps = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

// Neutral (white) toast helper — ignore variant colors to keep consistent style
const neutralToast = (message: string, opts?: { description?: string }) =>
  sonnerToast(message, {
    description: opts?.description,
    // Keep neutral background/text; icons optional
    icon: React.createElement(InfoIcon, { className: 'size-4 text-muted-foreground' }),
  })

function toast({ title, description }: LegacyToastProps) {
  return neutralToast(title ?? '', { description })
}

// Expose typed helpers but keep neutral styling
toast.success = (message: string, opts?: { description?: string }) =>
  neutralToast(message, { description: opts?.description })

toast.info = (message: string, opts?: { description?: string }) =>
  neutralToast(message, { description: opts?.description })

toast.warning = (message: string, opts?: { description?: string }) =>
  neutralToast(message, { description: opts?.description })

toast.error = (message: string, opts?: { description?: string }) =>
  neutralToast(message, { description: opts?.description })

toast.loading = (message: string, opts?: { description?: string }) =>
  sonnerToast.loading(message, { description: opts?.description })

function useToast() {
  return { toast }
}

export { useToast, toast }
