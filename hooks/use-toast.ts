'use client'

// Thin compatibility wrapper around Sonner
import { toast as sonnerToast } from 'sonner'

type LegacyToastProps = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

function toast({ title, description, variant }: LegacyToastProps) {
  if (variant === 'destructive') {
    return sonnerToast.error(title ?? 'Error', { description })
  }
  return sonnerToast(title ?? '', { description })
}

function useToast() {
  return { toast }
}

export { useToast, toast }
