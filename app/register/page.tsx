"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getMe } from "@/app/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"
import { registerUser, loginUser, persistAuth } from "@/app/api/auth"
import { FPTLogo } from "@/components/fpt-logo"

export default function RegisterPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user has valid token
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
        
        if (token) {
          // Verify token is valid by calling /auth/me
          try {
            await getMe()
            // User is already authenticated, redirect to projects
            setIsAuthenticated(true)
            router.replace("/projects")
            return
          } catch (error) {
            // Token is invalid, clear it and show register form
            console.log("Token invalid, showing register form")
            localStorage.removeItem("access_token")
            localStorage.removeItem("refresh_token")
            localStorage.removeItem("user")
          }
        }
        
        // No token or invalid token, show register form
        setIsChecking(false)
      } catch (error) {
        console.error("Auth check error:", error)
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [router])

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

      // 2) Auto-login
      const loginData = await loginUser(formData.email, formData.password)
      persistAuth(loginData)

      // Redirect to dashboard after successful login
      window.location.href = "/projects"
    } catch (err: any) {
      setServerError(err?.message || "An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking authentication
  if (isChecking || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 text-sm">
            {isAuthenticated ? "Redirecting to dashboard..." : "Checking authentication..."}
          </p>
        </div>
      </div>
    )
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
        <Card className="shadow-lg border-0  backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <CardTitle className="text-2xl text-card-foreground">Register Account</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Create a new account to access the Label-AI system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-card-foreground">
                  Username
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    type="text"
                    placeholder="your_username"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    onFocus={() => setIsNameFocused(true)}
                    onBlur={() => setIsNameFocused(false)}
                    className="bg-input border-border focus:ring-primary pl-10"
                  />
                  {isUsernameValid && (
                    <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  )}
                </div>
                {isNameFocused && (
                  <div className="space-y-1">
                    <p className={`text-xs ${isUsernameValid ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${isUsernameValid ? "text-emerald-500" : "text-muted-foreground"}`} />
                        3 - 50 characters
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-card-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    className="bg-input border-border focus:ring-primary pl-10"
                  />
                  {isEmailValid && (
                    <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  )}
                </div>
                {isEmailFocused && (
                  <div className="space-y-1">
                    <p className={`text-xs ${emailHasAt ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${emailHasAt ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Email must contain @
                      </span>
                    </p>
                    <p className={`text-xs ${isEmailValid ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${isEmailValid ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Valid email format
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {/* Role selection removed. Backend defaults to Labeler. */}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-card-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className="bg-input border-border focus:ring-primary pr-10 pl-10"
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
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <p className={` ${pwdLen ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${pwdLen ? "text-emerald-500" : "text-muted-foreground"}`} />
                        At least 8 characters
                      </span>
                    </p>
                    <p className={` ${pwdUpper ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${pwdUpper ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Has uppercase
                      </span>
                    </p>
                    <p className={` ${pwdLower ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${pwdLower ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Has lowercase
                      </span>
                    </p>
                    <p className={` ${pwdDigit ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${pwdDigit ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Has number
                      </span>
                    </p>
                    <p className={` ${pwdSpecial ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${pwdSpecial ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Has special character
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-card-foreground">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    onFocus={() => setIsConfirmFocused(true)}
                    onBlur={() => setIsConfirmFocused(false)}
                    className="bg-input border-border focus:ring-primary pr-10 pl-10"
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
                {isConfirmFocused && (
                  <div className="space-y-1">
                    <p className={`text-xs ${isConfirmValid ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${isConfirmValid ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Matches password
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registering..." : "Register"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:text-primary/80 underline-offset-4 hover:underline">
                  Login now
                </Link>
              </p>
            </div>
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
