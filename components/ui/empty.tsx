"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Empty({ className, ...props }: EmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-lg border",
        "bg-gradient-to-b p-6",
        className
      )}
      {...props}
    />
  )
}

export function EmptyHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />
}

export function EmptyMedia({
  className,
  variant = "icon",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "icon" | "image" }) {
  return (
    <div
      className={cn(
        "mx-auto mb-2 flex items-center justify-center",
        variant === "icon" ? "h-10 w-10 text-muted-foreground" : "",
        className
      )}
      {...props}
    />
  )
}

export function EmptyTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold", className)} {...props} />
}

export function EmptyDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export function EmptyContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-3", className)} {...props} />
}


