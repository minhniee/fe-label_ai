"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, GraduationCap, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"
import { registerUser, loginUser, persistAuth } from "@/api/auth"

export default function RegisterPage() {
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
      newErrors.name = "Username là bắt buộc"
    } else if (usernameVal.length < 3) {
      newErrors.name = "Username phải có ít nhất 3 ký tự"
    } else if (usernameVal.length > 50) {
      newErrors.name = "Username phải nhỏ hơn 50 ký tự"
    }

    const emailVal = formData.email.trim()
    if (!emailVal) {
      newErrors.email = "Email là bắt buộc"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      newErrors.email = "Email không hợp lệ"
    }

    // Mirror backend password strength rules
    if (!formData.password) {
      newErrors.password = "Mật khẩu là bắt buộc"
    } else if (formData.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự"
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = "Mật khẩu phải có ít nhất 1 chữ hoa"
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = "Mật khẩu phải có ít nhất 1 chữ thường"
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = "Mật khẩu phải có ít nhất 1 chữ số"
    } else if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(formData.password)) {
      newErrors.password = "Mật khẩu phải có ít nhất 1 ký tự đặc biệt"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Xác nhận mật khẩu là bắt buộc"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp"
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
      window.location.href = "/dashboard"
    } catch (err: any) {
      setServerError(err?.message || "Có lỗi xảy ra. Vui lòng thử lại.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary rounded-full p-3 mr-3">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">F-ALT</h1>
              <p className="text-sm text-muted-foreground">FPTU Admissions Platform</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">AI Labeling & Training Platform</p>
        </div>

        {/* Registration Card */}
        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <CardTitle className="text-2xl text-card-foreground">Đăng ký tài khoản</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Tạo tài khoản mới để truy cập hệ thống F-ALT
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
                        3 - 50 ký tự
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
                        Email phải có ký tự @
                      </span>
                    </p>
                    <p className={`text-xs ${isEmailValid ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${isEmailValid ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Định dạng email hợp lệ
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
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
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
                        Ít nhất 8 ký tự
                      </span>
                    </p>
                    <p className={` ${pwdUpper ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${pwdUpper ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Có chữ hoa
                      </span>
                    </p>
                    <p className={` ${pwdLower ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${pwdLower ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Có chữ thường
                      </span>
                    </p>
                    <p className={` ${pwdDigit ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${pwdDigit ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Có chữ số
                      </span>
                    </p>
                    <p className={` ${pwdSpecial ? "text-emerald-500" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${pwdSpecial ? "text-emerald-500" : "text-muted-foreground"}`} />
                        Có ký tự đặc biệt
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-card-foreground">
                  Xác nhận mật khẩu
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
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
                        Trùng với mật khẩu
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
                {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Đã có tài khoản?{" "}
                <Link href="/" className="text-primary hover:text-primary/80 underline-offset-4 hover:underline">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>© 2024 FPT University. All rights reserved.</p>
          <p className="mt-1">Internal Use Only - F-ALT Platform v1.0</p>
        </div>
      </div>
    </div>
  )
}
