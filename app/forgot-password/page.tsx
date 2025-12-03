"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { requestPasswordReset } from "@/app/api/auth"
import { FPTLogo } from "@/components/fpt-logo"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [resendAvailableIn, setResendAvailableIn] = useState(0)
  const [isSuccess, setIsSuccess] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (resendAvailableIn > 0) {
      const timer = setInterval(() => {
        setResendAvailableIn((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resendAvailableIn])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await requestPasswordReset(email.trim().toLowerCase())
      setIsSuccess(true)
      setResendAvailableIn(response.resendAvailableIn)
      toast.success("Password reset code has been sent to your email")
      
      // Store email in sessionStorage for next step
      if (typeof window !== "undefined") {
        sessionStorage.setItem("reset_password_email", email.trim().toLowerCase())
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send password reset code. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (resendAvailableIn > 0) {
      toast.error(`Please wait ${resendAvailableIn} seconds before requesting another code`)
      return
    }

    await handleSubmit(new Event("submit") as any)
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-2">
              <FPTLogo size="lg" showText={true} />
            </div>
            <p className="text-muted-foreground text-sm">AI Labeling & Training Platform</p>
          </div>

          <Card className="shadow-lg border-0 backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-2">
                <div className="rounded-full bg-primary/10 p-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                We sent a password reset code to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  The code will expire in 5 minutes.
                </p>
                {resendAvailableIn > 0 && (
                  <p className="text-sm text-muted-foreground">
                    You can request a new code in {resendAvailableIn} seconds.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => router.push("/forgot-password/verify")}
                  className="w-full"
                >
                  Enter verification code
                </Button>
                {resendAvailableIn === 0 && (
                  <Button
                    variant="outline"
                    onClick={handleResend}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? "Sending..." : "Resend code"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsSuccess(false)
                    setEmail("")
                    setError("")
                  }}
                  className="w-full"
                >
                  Use a different email
                </Button>
              </div>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>© 2025 Label-AI Platform. All rights reserved.</p>
            <p className="mt-1">Internal Use Only - Label-AI Platform</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <FPTLogo size="lg" showText={true} />
          </div>
          <p className="text-muted-foreground text-sm">AI Labeling & Training Platform</p>
        </div>

        <Card className="shadow-lg border-0 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle>Forgot password?</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a code to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email address</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <FieldDescription>
                    We'll send a verification code to this email address.
                  </FieldDescription>
                </Field>

                <FieldGroup>
                  <Field>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={isSubmitting || !email.trim()}
                    >
                      {isSubmitting ? "Sending..." : "Send reset code"}
                    </Button>
                    <FieldDescription className="text-center mt-4">
                      Remember your password?{" "}
                      <Link
                        href="/login"
                        className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
                      >
                        Login now
                      </Link>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>© 2025 Label-AI Platform. All rights reserved.</p>
          <p className="mt-1">Internal Use Only - Label-AI Platform</p>
        </div>
      </div>
    </div>
  )
}

