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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Get email from sessionStorage
    const pendingEmail = sessionStorage.getItem("pending_email")
    if (!pendingEmail) {
      // No pending email, redirect to register
      router.push("/register")
      return
    }
    setEmail(pendingEmail)
  }, [router, mounted])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (otp.length !== 6) {
      setError("Please enter a 6-digit code")
      return
    }

    setIsVerifying(true)
    setError("")

    try {
      await verifyOTP(email, otp)
      // Clear pending email
      sessionStorage.removeItem("pending_email")
      toast.success("Email verified successfully! You can now login.")
      router.push("/login")
    } catch (err: any) {
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
                    Enter the 6-digit code sent to your email.
                  </FieldDescription>
                  {error && (
                    <p className="text-sm text-destructive mt-2">{error}</p>
                  )}
                </Field>

                <FieldGroup>
                  <Field>
                    <Button type="submit" className="w-full" disabled={isVerifying || otp.length !== 6}>
                      {isVerifying ? "Verifying..." : "Verify"}
                    </Button>
                    <FieldDescription className="text-center mt-4">
                      Didn&apos;t receive the code?{" "}
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending}
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

