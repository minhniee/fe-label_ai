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

function toast({ title, description, variant }: LegacyToastProps) {
  if (variant === 'destructive') {
    return sonnerToast.error(title ?? 'Error', { description })
  }
  // Default toast shows info icon to align with configured icons (no JSX in .ts file)
  return sonnerToast(title ?? '', { description, icon: React.createElement(InfoIcon, { className: 'size-4' }) })
}

// Expose typed helpers so existing and new calls get icons
toast.success = (message: string, opts?: { description?: string }) =>
  sonnerToast.success(message, { description: opts?.description })

toast.info = (message: string, opts?: { description?: string }) =>
  sonnerToast.info(message, { description: opts?.description })

toast.warning = (message: string, opts?: { description?: string }) =>
  sonnerToast.warning(message, { description: opts?.description })

toast.error = (message: string, opts?: { description?: string }) =>
  sonnerToast.error(message, { description: opts?.description })

toast.loading = (message: string, opts?: { description?: string }) =>
  sonnerToast.loading(message, { description: opts?.description })

function useToast() {
  return { toast }
}

export { useToast, toast }
