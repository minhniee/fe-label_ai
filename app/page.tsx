"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, GraduationCap } from "lucide-react"
import Link from "next/link"
import { loginUser, persistAuth } from "@/api/auth"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    try {
      const token = await loginUser(identifier, password)
      persistAuth(token)
      const roleId = token.user?.role_id
      // Role mapping: 1: SuperAdmin, 2: Admin, 3: Manager, 4: Labeler
      if (roleId === 1 || roleId === 2) {
        window.location.href = "/dashboard"
      } else if (roleId === 3) {
        window.location.href = "/dashboard"
      } else {
        window.location.href = "/dashboard"
      }
    } catch (err: any) {
      setLoginError(err?.message || "Đăng nhập thất bại")
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

        {/* Login Card */}
        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-card-foreground">Đăng nhập</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Nhập thông tin đăng nhập để truy cập hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-card-foreground">
                  Tài khoản (Email hoặc Username)
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="your.email@example.com hoặc username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="bg-input border-border focus:ring-primary"
                />
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
              </div>

              {loginError && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{loginError}</div>}

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Đăng nhập
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="mt-2 text-center">
              <p className="text-sm text-muted-foreground">
                Chưa có tài khoản?{" "}
                <Link
                  href="/register"
                  className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
                >
                  Đăng ký ngay
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
