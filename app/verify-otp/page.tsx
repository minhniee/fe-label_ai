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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { verifyOTP, resendOTP } from "@/app/api/auth"
import { FPTLogo } from "@/components/fpt-logo"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function VerifyOTPPage() {
  const router = useRouter()
  const [otp, setOtp] = useState("")
  const [email, setEmail] = useState<string>("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)
  const [codeExpiresIn, setCodeExpiresIn] = useState(0)
  const [blockTimeLeft, setBlockTimeLeft] = useState(0)

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Get email from sessionStorage
    const pendingEmail = sessionStorage.getItem("pending_email")
    const expiresAtRaw = sessionStorage.getItem("otp_expires_at")
    if (expiresAtRaw) {
      const expiresAt = parseInt(expiresAtRaw, 10)
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setCodeExpiresIn(remaining || 0)
    } else {
      // Default 3 minutes if not present
      setCodeExpiresIn(180)
      sessionStorage.setItem("otp_expires_at", (Date.now() + 180000).toString())
    }

    if (!pendingEmail) {
      // No pending email, redirect to register
      router.push("/register")
      return
    }
    setEmail(pendingEmail)
  }, [router, mounted])

  // Countdown timers
  useEffect(() => {
    if (codeExpiresIn <= 0) return
    const timer = setInterval(() => {
      setCodeExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [codeExpiresIn])

  useEffect(() => {
    if (blockTimeLeft <= 0) return
    const timer = setInterval(() => {
      setBlockTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [blockTimeLeft])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (otp.length !== 6) {
      setError("Please enter a 6-digit code")
      return
    }

    if (codeExpiresIn <= 0) {
      toast.error("Verification code has expired. Please resend a new code.")
      return
    }

    setIsVerifying(true)
    setError("")

    try {
      await verifyOTP(email, otp)
      // Clear pending email
      sessionStorage.removeItem("pending_email")
      sessionStorage.removeItem("otp_expires_at")
      toast.success("Email verified successfully! You can now login.")
      router.push("/login")
    } catch (err: any) {
      const message = err?.message || "Invalid verification code. Please try again."
      const lower = message.toLowerCase()
      if (lower.includes("too many incorrect attempts") || lower.includes("blocked")) {
        setBlockTimeLeft(300)
        toast.error("Too many incorrect attempts. Please wait 5 minutes before retrying.")
      }
      setError(err?.message || "Invalid verification code. Please try again.")
      setOtp("") // Clear OTP on error
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      toast.error("Email not found. Please register again.")
      router.push("/register")
      return
    }

    setIsResending(true)
    setError("")

    try {
      await resendOTP(email)
      toast.success("Verification code has been resent to your email.")
      setOtp("") // Clear current OTP
      setCodeExpiresIn(180)
      sessionStorage.setItem("otp_expires_at", (Date.now() + 180000).toString())
      if (blockTimeLeft > 0) {
        setBlockTimeLeft(0)
      }
    } catch (err: any) {
      setError(err?.message || "Failed to resend code. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  if (!mounted || !email) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <FPTLogo size="lg" showText={true} />
          </div>
          <p className="text-muted-foreground text-sm">AI Labeling & Training Platform</p>
        </div>

        <Card className="shadow-lg border-0 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <Link href="/register" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to register</span>
              </Link>
            </div>
            <CardTitle>Enter verification code</CardTitle>
            <CardDescription>
              We sent a 6-digit code to {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="otp" className="text-center block">Verification code</FieldLabel>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                    >
                      <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <FieldDescription className="text-center">
                    {blockTimeLeft > 0
                      ? `Too many attempts. Please wait ${Math.floor(blockTimeLeft / 60)}:${(blockTimeLeft % 60).toString().padStart(2, "0")} before trying again.`
                      : codeExpiresIn > 0
                      ? `Code expires in ${Math.floor(codeExpiresIn / 60)}:${(codeExpiresIn % 60).toString().padStart(2, "0")}.`
                      : "Verification code has expired. Please resend to get a new code."}
                  </FieldDescription>
                  {error && (
                    <p className="text-sm text-destructive mt-2">{error}</p>
                  )}
                </Field>

                <FieldGroup>
                  <Field>
                    <Button type="submit" className="w-full" disabled={isVerifying || otp.length !== 6 || codeExpiresIn <= 0 || blockTimeLeft > 0}>
                      {isVerifying ? "Verifying..." : "Verify"}
                    </Button>
                    <FieldDescription className="text-center mt-4">
                      Didn&apos;t receive the code?{" "}
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending || blockTimeLeft > 0}
                        className="text-primary hover:text-primary/80 underline-offset-4 hover:underline disabled:opacity-50"
                      >
                        {isResending ? "Resending..." : "Resend"}
                      </button>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>© 2025 Label-AI Platform. All rights reserved.</p>
          <p className="mt-1">Internal Use Only - Label-AI Platform</p>
        </div>
      </div>
    </div>
  )
}

