"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getMe } from "@/app/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"
import { registerUser } from "@/app/api/auth"
import { FPTLogo } from "@/components/fpt-logo"

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isNameFocused, setIsNameFocused] = useState(false)
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isConfirmFocused, setIsConfirmFocused] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is already authenticated - redirect if logged in
  useEffect(() => {
    if (!mounted) return;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("access_token")
        
        if (token) {
          try {
            await getMe()
            router.replace("/projects")
          } catch (error) {
            localStorage.removeItem("access_token")
            localStorage.removeItem("refresh_token")
            localStorage.removeItem("user")
          }
        }
      } catch (error) {
        // Silent fail - show register form
      }
    }

    checkAuth()
  }, [router, mounted])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    const usernameVal = formData.name.trim()
    if (!usernameVal) {
      newErrors.name = "Username is required"
    } else if (usernameVal.length < 3) {
      newErrors.name = "Username must be at least 3 characters"
    } else if (usernameVal.length > 50) {
      newErrors.name = "Username must be less than 50 characters"
    }

    const emailVal = formData.email.trim()
    if (!emailVal) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      newErrors.email = "Invalid email format"
    }

    // Mirror backend password strength rules
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = "Password must have at least 1 uppercase letter"
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = "Password must have at least 1 lowercase letter"
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = "Password must have at least 1 number"
    } else if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(formData.password)) {
      newErrors.password = "Password must have at least 1 special character"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Password confirmation is required"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Password confirmation does not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Realtime validation flags for UX hints and green checks
  const usernameVal = formData.name.trim()
  const isUsernameValid = usernameVal.length >= 3 && usernameVal.length <= 50

  const emailVal = formData.email.trim()
  const emailHasAt = emailVal.includes("@")
  const isEmailValid = emailVal.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)

  const pwd = formData.password
  const pwdLen = pwd.length >= 8
  const pwdUpper = /[A-Z]/.test(pwd)
  const pwdLower = /[a-z]/.test(pwd)
  const pwdDigit = /[0-9]/.test(pwd)
  const pwdSpecial = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pwd)
  const isPasswordValid = pwdLen && pwdUpper && pwdLower && pwdDigit && pwdSpecial

  const isConfirmValid = formData.confirmPassword.length > 0 && formData.confirmPassword === formData.password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setServerError("")

    try {
      const username = formData.name.trim()

      await registerUser({
        username,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirmPassword,
      })

      // Store email temporarily for OTP verification
      sessionStorage.setItem("pending_email", formData.email)
      
      // Redirect to OTP verification page
      router.push("/verify-otp")
    } catch (err: any) {
      setServerError(err?.message || "An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
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

        {/* Registration Card */}
        <Card className="shadow-lg border-0 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <Link href="/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to login</span>
              </Link>
            </div>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>
              Enter your information below to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {serverError && (
                <p className="text-sm text-destructive mb-4">{serverError}</p>
              )}
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">User Name</FieldLabel>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your user name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      onFocus={() => setIsNameFocused(true)}
                      onBlur={() => setIsNameFocused(false)}
                      required
                      className={isUsernameValid ? "pl-10" : ""}
                    />
                    {isUsernameValid && (
                      <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                  {isNameFocused && (
                    <FieldDescription>
                      <span className={isUsernameValid ? "text-emerald-500" : ""}>
                        3 - 50 characters
                      </span>
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      onFocus={() => setIsEmailFocused(true)}
                      onBlur={() => setIsEmailFocused(false)}
                      required
                      className={isEmailValid ? "pl-10" : ""}
                    />
                    {isEmailValid && (
                      <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                  <FieldDescription>
                    We&apos;ll use this to contact you. We will not share your email with anyone else.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      required
                      className={isPasswordValid ? "pl-10 pr-10" : "pr-10"}
                    />
                    {isPasswordValid && (
                      <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {isPasswordFocused && (
                    <FieldDescription>
                      <div className="grid grid-cols-1 gap-1 text-xs">
                        <span className={pwdLen ? "text-emerald-500" : ""}>At least 8 characters</span>
                        <span className={pwdUpper ? "text-emerald-500" : ""}>Has uppercase</span>
                        <span className={pwdLower ? "text-emerald-500" : ""}>Has lowercase</span>
                        <span className={pwdDigit ? "text-emerald-500" : ""}>Has number</span>
                        <span className={pwdSpecial ? "text-emerald-500" : ""}>Has special character</span>
                      </div>
                    </FieldDescription>
                  )}
                  {!isPasswordFocused && (
                    <FieldDescription>
                      Must be at least 8 characters long.
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      placeholder="Re-enter your password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      onFocus={() => setIsConfirmFocused(true)}
                      onBlur={() => setIsConfirmFocused(false)}
                      required
                      className={isConfirmValid ? "pl-10 pr-10" : "pr-10"}
                    />
                    {isConfirmValid && (
                      <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <FieldDescription>
                    Please confirm your password.
                  </FieldDescription>
                </Field>

                <FieldGroup>
                  <Field>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Registering..." : "Create Account"}
                    </Button>
                    <FieldDescription className="px-6 text-center mt-4">
                      Already have an account?{" "}
                      <Link href="/login" className="text-primary hover:text-primary/80 underline-offset-4 hover:underline">
                        Sign in
                      </Link>
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
