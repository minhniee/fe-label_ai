"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff, GraduationCap, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Họ và tên là bắt buộc"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email là bắt buộc"
    } else if (!formData.email.includes("@fpt.edu.vn")) {
      newErrors.email = "Email phải có đuôi @fpt.edu.vn"
    }

    if (!formData.password) {
      newErrors.password = "Mật khẩu là bắt buộc"
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Xác nhận mật khẩu là bắt buộc"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp"
    }

    if (!formData.role) {
      newErrors.role = "Vui lòng chọn vai trò"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      // In a real app, you would send this to your backend
      console.log("Registration data:", {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      })

      // For demo purposes, show success and redirect
      alert("Đăng ký thành công! Vui lòng đăng nhập.")
      window.location.href = "/"

      setIsSubmitting(false)
    }, 1500)
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
              <div className="space-y-2">
                <Label htmlFor="name" className="text-card-foreground">
                  Họ và tên
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="bg-input border-border focus:ring-primary"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-card-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.name@fpt.edu.vn"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="bg-input border-border focus:ring-primary"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-card-foreground">
                  Vai trò
                </Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                  <SelectTrigger className="bg-input border-border focus:ring-primary">
                    <SelectValue placeholder="Chọn vai trò của bạn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labeler">Labeler - Người gán nhãn</SelectItem>
                    <SelectItem value="senior_labeler">Senior Labeler - Người gán nhãn cấp cao</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-card-foreground">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="bg-input border-border focus:ring-primary pr-10"
                  />
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
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
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
                    className="bg-input border-border focus:ring-primary pr-10"
                  />
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
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
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
