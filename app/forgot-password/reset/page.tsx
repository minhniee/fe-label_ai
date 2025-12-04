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
import { resetPassword } from "@/app/api/auth"
import { FPTLogo } from "@/components/fpt-logo"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [resetToken, setResetToken] = useState<string>("")
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  })

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Get reset token from sessionStorage
    const token = sessionStorage.getItem("reset_token")
    if (!token) {
      // No token found, redirect to forgot password
      router.push("/forgot-password")
      return
    }
    setResetToken(token)
  }, [router, mounted])

  const validatePassword = (password: string) => {
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    })
  }

  const handlePasswordChange = (value: string) => {
    setFormData((prev) => ({ ...prev, newPassword: value }))
    validatePassword(value)
  }

  const isPasswordValid = () => {
    return Object.values(passwordStrength).every((v) => v)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate password strength
    if (!isPasswordValid()) {
      setError("Password does not meet strength requirements")
      return
    }

    // Validate password match
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!resetToken) {
      setError("Reset token not found. Please start over.")
      router.push("/forgot-password")
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword(resetToken, formData.newPassword)
      // Clear sessionStorage
      sessionStorage.removeItem("reset_token")
      sessionStorage.removeItem("reset_password_email")
      toast.success("Password reset successfully! You can now login.")
      router.push("/login")
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted || !resetToken) {
    return null
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
            <div className="flex justify-center mb-2">
              <Link href="/forgot-password/verify" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back</span>
              </Link>
            </div>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              Enter your new password below
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
                  <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={formData.newPassword}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="bg-input border-border focus:ring-primary pr-10"
                      disabled={isSubmitting}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {formData.newPassword && (
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle
                          className={`h-3 w-3 ${
                            passwordStrength.length
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span
                          className={
                            passwordStrength.length
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        >
                          At least 8 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle
                          className={`h-3 w-3 ${
                            passwordStrength.uppercase
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span
                          className={
                            passwordStrength.uppercase
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        >
                          One uppercase letter
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle
                          className={`h-3 w-3 ${
                            passwordStrength.lowercase
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span
                          className={
                            passwordStrength.lowercase
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        >
                          One lowercase letter
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle
                          className={`h-3 w-3 ${
                            passwordStrength.number
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span
                          className={
                            passwordStrength.number
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        >
                          One number
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle
                          className={`h-3 w-3 ${
                            passwordStrength.special
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span
                          className={
                            passwordStrength.special
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          }
                        >
                          One special character
                        </span>
                      </div>
                    </div>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="bg-input border-border focus:ring-primary pr-10"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword &&
                    formData.newPassword !== formData.confirmPassword && (
                      <p className="text-xs text-destructive mt-1">
                        Passwords do not match
                      </p>
                    )}
                  {formData.confirmPassword &&
                    formData.newPassword === formData.confirmPassword && (
                      <p className="text-xs text-emerald-500 mt-1">
                        Passwords match
                      </p>
                    )}
                </Field>

                <FieldGroup>
                  <Field>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={
                        isSubmitting ||
                        !isPasswordValid() ||
                        formData.newPassword !== formData.confirmPassword
                      }
                    >
                      {isSubmitting ? "Resetting..." : "Reset password"}
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

